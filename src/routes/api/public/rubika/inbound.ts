import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const messageSchema = z.object({
  chatGuid: z.string().min(1),
  chatTitle: z.string().optional(),
  username: z.string().nullish(),
  phone: z.string().nullish(),
  avatarUrl: z.string().url().nullish(),
  messageId: z.string().nullish(),
  type: z.string().optional(),
  text: z.string().optional(),
  fileName: z.string().nullish(),
  isMe: z.boolean().optional(),
  createdAt: z.string().optional(),
});

const bodySchema = z.object({
  status: z
    .object({
      state: z.enum([
        "OFFLINE",
        "CONNECTING",
        "AWAITING_PHONE",
        "AWAITING_CODE",
        "AWAITING_PASSWORD",
        "CONNECTED",
        "ERROR",
      ]),
      guid: z.string().nullish(),
      phone: z.string().nullish(),
      error: z.string().nullish(),
      chats: z
        .array(z.object({ guid: z.string(), title: z.string(), avatarUrl: z.string().nullish() }))
        .optional(),
    })
    .optional(),
  messages: z.array(messageSchema).max(50).optional(),
});

/**
 * The Rubika connector worker posts its live status and any new messages here.
 * Authenticated with the connection token shown on the Rubika page.
 */
export const Route = createFileRoute("/api/public/rubika/inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { admin, assertBridgeToken, ingestInbound } = await import("@/lib/mtchat.server");
        try {
          await assertBridgeToken(request);
        } catch (response) {
          return response instanceof Response ? response : new Response("Unauthorized", { status: 401 });
        }

        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }

        const now = new Date().toISOString();
        if (body.status) {
          await admin
            .from("bridge_state")
            .update({
              state: body.status.state,
              guid: body.status.guid ?? null,
              phone: body.status.phone ?? null,
              error: body.status.error ?? null,
              chats: (body.status.chats ?? []) as never,
              last_heartbeat_at: now,
              updated_at: now,
            })
            .eq("id", 1);
        } else {
          await admin
            .from("bridge_state")
            .update({ last_heartbeat_at: now, updated_at: now })
            .eq("id", 1);
        }

        const results: Array<{ conversationId: string; messageId: string | null }> = [];
        for (const item of body.messages ?? []) {
          try {
            results.push(await ingestInbound(item));
          } catch (error) {
            console.error("[rubika] ingest failed", error);
          }
        }

        if (results.length) {
          const { data: counters } = await admin
            .from("bridge_state")
            .select("inbound_count")
            .eq("id", 1)
            .maybeSingle();
          await admin
            .from("bridge_state")
            .update({ inbound_count: (counters?.inbound_count ?? 0) + results.length })
            .eq("id", 1);
        }

        return Response.json({ ok: true, ingested: results.length });
      },
    },
  },
});
