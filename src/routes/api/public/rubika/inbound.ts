import { createFileRoute } from "@tanstack/react-router";
import { addInbound, secretMatches, setStatus } from "@/lib/rubika-bridge";

/**
 * The rubpy worker POSTs every new Rubika message here.
 *
 * curl -X POST https://<app>/api/public/rubika/inbound \
 *   -H "x-bridge-secret: $RUBIKA_BRIDGE_SECRET" \
 *   -H "content-type: application/json" \
 *   -d '{"messages":[{"chatGuid":"u0...","chatTitle":"محمد","authorGuid":"u0...",
 *        "messageId":"123","type":"Text","text":"سلام","isMe":false,
 *        "createdAt":"2026-08-10T00:00:00.000Z"}]}'
 */
export const Route = createFileRoute("/api/public/rubika/inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["RUBIKA_BRIDGE_SECRET"];
        if (!secretMatches(request.headers.get("x-bridge-secret"), expected)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        const raw = (body as { messages?: unknown }).messages;
        if (!Array.isArray(raw) || raw.length > 200) {
          return Response.json({ error: "invalid_messages" }, { status: 400 });
        }

        const items = raw.flatMap((entry) => {
          if (typeof entry !== "object" || entry === null) return [];
          const m = entry as Record<string, unknown>;
          const chatGuid = typeof m["chatGuid"] === "string" ? m["chatGuid"].slice(0, 128) : "";
          if (!chatGuid) return [];
          return [
            {
              chatGuid,
              chatTitle: typeof m["chatTitle"] === "string" ? m["chatTitle"].slice(0, 120) : chatGuid,
              authorGuid: typeof m["authorGuid"] === "string" ? m["authorGuid"].slice(0, 128) : "",
              messageId: typeof m["messageId"] === "string" ? m["messageId"].slice(0, 64) : "",
              type: typeof m["type"] === "string" ? m["type"].slice(0, 24) : "Text",
              text: typeof m["text"] === "string" ? m["text"].slice(0, 4000) : "",
              ...(typeof m["fileName"] === "string" ? { fileName: m["fileName"].slice(0, 200) } : {}),
              isMe: Boolean(m["isMe"]),
              createdAt:
                typeof m["createdAt"] === "string" ? m["createdAt"] : new Date().toISOString(),
            },
          ];
        });

        const seq = addInbound(items);
        setStatus({ state: "CONNECTED", error: null });
        return Response.json({ ok: true, accepted: items.length, seq });
      },
    },
  },
});
