import { createFileRoute } from "@tanstack/react-router";
import { enqueueCommand, enqueueOutbound, inboundSince, publicStatus } from "@/lib/rubika-bridge";

/**
 * Panel-facing bridge endpoint (same origin, behind the published-site auth).
 *
 *  GET  /api/rubika/state?since=<seq>   → status + new inbound messages
 *  POST /api/rubika/state               → { action: "send" | "command", ... }
 */
export const Route = createFileRoute("/api/rubika/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const since = Number(url.searchParams.get("since") ?? 0);
        return Response.json({
          status: publicStatus(),
          messages: inboundSince(Number.isFinite(since) ? since : 0),
        });
      },
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        if (body["action"] === "send") {
          const chatGuid = typeof body["chatGuid"] === "string" ? body["chatGuid"] : "";
          const text = typeof body["text"] === "string" ? body["text"] : "";
          if (!chatGuid || !text.trim()) {
            return Response.json({ error: "invalid_payload" }, { status: 400 });
          }
          return Response.json({ ok: true, job: enqueueOutbound(chatGuid, text.slice(0, 4000)) });
        }

        if (body["action"] === "command") {
          const type = body["type"];
          const allowed = ["login", "code", "password", "logout", "refresh_chats"] as const;
          if (typeof type !== "string" || !allowed.includes(type as never)) {
            return Response.json({ error: "invalid_command" }, { status: 400 });
          }
          const value = typeof body["value"] === "string" ? body["value"].slice(0, 64) : undefined;
          return Response.json({ ok: true, command: enqueueCommand(type as never, value) });
        }

        return Response.json({ error: "unknown_action" }, { status: 400 });
      },
    },
  },
});
