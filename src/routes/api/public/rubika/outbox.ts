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
        // Accept both the current worker's flat status payload and the older
        // nested `{ status: ... }` shape.
        const status: {
          state?: string;
          guid?: string | null;
          phone?: string | null;
          error?: string | null;
        } = body.status ?? body;
        if (status.state) patch.state = status.state;
        if (status.guid !== undefined) patch.guid = status.guid ?? null;
        if (status.phone !== undefined) patch.phone = status.phone ?? null;
        if (status.error !== undefined) patch.error = status.error ?? null;
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

        const normalizedJobs = (jobs ?? []).map((job) => ({
            id: job.id,
            kind: job.kind,
            chatGuid: job.chat_guid,
            text: job.text,
            commandType: job.command_type,
            commandValue: job.command_value,
          }));
        return Response.json({
          // `jobs` remains for backwards compatibility. The Python worker
          // consumes the explicit message/command collections.
          jobs: normalizedJobs,
          messages: normalizedJobs
            .filter((job) => job.kind === "send")
            .map((job) => ({ id: job.id, chatGuid: job.chatGuid, text: job.text })),
          commands: normalizedJobs
            .filter((job) => job.kind === "command")
            .map((job) => ({ id: job.id, type: job.commandType, value: job.commandValue })),
        });
      },
    },
  },
});
