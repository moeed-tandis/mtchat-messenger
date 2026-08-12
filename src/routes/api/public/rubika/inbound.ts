import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const profileSchema = z
  .object({
    guid: z.string().nullish(),
    name: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    username: z.string().nullish(),
    phone: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    avatarDataUrl: z.string().nullish(),
  })
  .passthrough();

const mediaSchema = z
  .object({
    fileName: z.string().nullish(),
    file_name: z.string().nullish(),
    name: z.string().nullish(),
    dataUrl: z.string().nullish(),
    url: z.string().nullish(),
  })
  .passthrough();

/**
 * The worker sends a rich payload; every field beyond chatGuid is optional so
 * different connector versions stay compatible.
 */
const messageSchema = z
  .object({
    chatGuid: z.string().min(1),
    chatTitle: z.string().nullish(),
    authorGuid: z.string().nullish(),
    username: z.string().nullish(),
    phone: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    messageId: z.union([z.string(), z.number()]).nullish(),
    type: z.string().nullish(),
    text: z.string().nullish(),
    caption: z.string().nullish(),
    fileName: z.string().nullish(),
    isMe: z.boolean().nullish(),
    createdAt: z.string().nullish(),
    author: profileSchema.nullish(),
    chat: profileSchema.nullish(),
    media: mediaSchema.nullish(),
  })
  .passthrough();

const chatSchema = z
  .object({
    guid: z.string().nullish(),
    objectGuid: z.string().nullish(),
    object_guid: z.string().nullish(),
    title: z.string().nullish(),
    name: z.string().nullish(),
    avatarUrl: z.string().nullish(),
  })
  .passthrough();

const statusSchema = z
  .object({
    state: z
      .enum([
        "OFFLINE",
        "CONNECTING",
        "AWAITING_PHONE",
        "AWAITING_CODE",
        "AWAITING_PASSWORD",
        "CONNECTED",
        "ERROR",
      ])
      .nullish(),
    guid: z.string().nullish(),
    phone: z.string().nullish(),
    error: z.string().nullish(),
    chats: z.array(chatSchema).nullish(),
  })
  .passthrough();

const bodySchema = z
  .object({
    status: statusSchema.nullish(),
    profile: profileSchema.nullish(),
    chats: z.array(chatSchema).nullish(),
    messages: z.array(messageSchema).max(200).nullish(),
  })
  .passthrough();

type Body = z.infer<typeof bodySchema>;

function nonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = (value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export function normalizeChats(list: Body["chats"] | z.infer<typeof statusSchema>["chats"]) {
  return (list ?? [])
    .map((chat) => ({
      guid: nonEmpty(chat.guid, chat.objectGuid, chat["object_guid"] as string | undefined),
      title: nonEmpty(chat.title, chat.name),
      avatarUrl: nonEmpty(chat.avatarUrl) || null,
    }))
    .filter((chat) => chat.guid);
}

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
          return response instanceof Response
            ? response
            : new Response("Unauthorized", { status: 401 });
        }

        let body: Body;
        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }

        const now = new Date().toISOString();
        const chats = normalizeChats(body.chats ?? body.status?.chats);
        const patch: Record<string, unknown> = { last_heartbeat_at: now, updated_at: now };
        if (body.status?.state) patch["state"] = body.status.state;
        if (body.status?.guid !== undefined) patch["guid"] = body.status.guid ?? null;
        if (body.status?.phone !== undefined) patch["phone"] = body.status.phone ?? null;
        if (body.status?.error !== undefined) patch["error"] = body.status.error ?? null;
        if (chats.length) patch["chats"] = chats;
        await admin.from("bridge_state").update(patch).eq("id", 1);

        let ingested = 0;
        for (const item of body.messages ?? []) {
          if (item.isMe) continue;
          const author = item.author ?? null;
          try {
            await ingestInbound({
              chatGuid: item.chatGuid,
              chatTitle: nonEmpty(
                author?.name,
                `${author?.firstName ?? ""} ${author?.lastName ?? ""}`,
                item.chat?.name,
                item.chatTitle,
                item.chatGuid,
              ),
              username: nonEmpty(item.username, author?.username) || undefined,
              phone: nonEmpty(item.phone, author?.phone) || undefined,
              avatarUrl:
                nonEmpty(
                  item.avatarUrl,
                  author?.avatarUrl,
                  author?.avatarDataUrl,
                  item.chat?.avatarUrl,
                ) || undefined,
              messageId: item.messageId != null ? String(item.messageId) : undefined,
              type: nonEmpty(item.type, "text").toLowerCase(),
              text: nonEmpty(item.text, item.caption),
              fileName:
                nonEmpty(
                  item.fileName,
                  item.media?.fileName,
                  item.media?.["file_name"] as string | undefined,
                  item.media?.name,
                ) || undefined,
              isMe: false,
              createdAt: nonEmpty(item.createdAt, now),
            });
            ingested += 1;
          } catch (error) {
            console.error("[rubika] ingest failed", error);
          }
        }

        if (ingested) {
          const { data: counters } = await admin
            .from("bridge_state")
            .select("inbound_count")
            .eq("id", 1)
            .maybeSingle();
          await admin
            .from("bridge_state")
            .update({ inbound_count: (counters?.inbound_count ?? 0) + ingested })
            .eq("id", 1);
        }

        return Response.json({ ok: true, ingested });
      },
    },
  },
});
