import { createFileRoute } from "@tanstack/react-router";
import { normalizeChats } from "./inbound";

/**
 * The Rubika connector worker long-polls this endpoint to pick up outgoing
 * messages and account commands queued by the panel.
 */
export const Route = createFileRoute("/api/public/rubika/outbox")({
  server: {
    handlers: {
      // Some worker versions report status here instead of /inbound.
      POST: async ({ request }) => {
        const { admin, assertBridgeToken } = await import("@/lib/mtchat.server");
        try {
          await assertBridgeToken(request);
        } catch (response) {
          return response instanceof Response
            ? response
            : new Response("Unauthorized", { status: 401 });
        }
        let body: {
          status?: { state?: string; guid?: string | null; phone?: string | null; error?: string | null };
          chats?: unknown[];
        } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          body = {};
        }
        const now = new Date().toISOString();
        const patch: {
          last_heartbeat_at: string;
          updated_at: string;
          state?: string;
          guid?: string | null;
          phone?: string | null;
          error?: string | null;
          chats?: never;
        } = { last_heartbeat_at: now, updated_at: now };
        if (body.status?.state) patch.state = body.status.state;
        if (body.status?.guid !== undefined) patch.guid = body.status.guid ?? null;
        if (body.status?.phone !== undefined) patch.phone = body.status.phone ?? null;
        if (body.status?.error !== undefined) patch.error = body.status.error ?? null;
        const chats = normalizeChats((body.chats ?? []) as never);
        if (chats.length) patch.chats = chats as never;
        await admin.from("bridge_state").update(patch).eq("id", 1);
        return Response.json({ ok: true });
      },
      GET: async ({ request }) => {
        const { admin, assertBridgeToken } = await import("@/lib/mtchat.server");
        try {
          await assertBridgeToken(request);
        } catch (response) {
          return response instanceof Response ? response : new Response("Unauthorized", { status: 401 });
        }

        const { data: jobs, error } = await admin
          .from("bridge_outbox")
          .select("*")
          .is("delivered_at", null)
          .order("created_at", { ascending: true })
          .limit(25);
        if (error) return Response.json({ error: "db_error" }, { status: 500 });

        const ids = (jobs ?? []).map((job) => job.id);
        if (ids.length) {
          await admin
            .from("bridge_outbox")
            .update({ delivered_at: new Date().toISOString() })
            .in("id", ids);
        }

        return Response.json({
          jobs: (jobs ?? []).map((job) => ({
            id: job.id,
            kind: job.kind,
            chatGuid: job.chat_guid,
            text: job.text,
            commandType: job.command_type,
            commandValue: job.command_value,
          })),
        });
      },
    },
  },
});
