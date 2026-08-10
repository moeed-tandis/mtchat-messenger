import { createFileRoute } from "@tanstack/react-router";
import { drainWork, secretMatches, setStatus } from "@/lib/rubika-bridge";

/**
 * The rubpy worker long-polls this endpoint (every ~2s) to pick up
 * outgoing messages and account commands (login / code / logout).
 */
export const Route = createFileRoute("/api/public/rubika/outbox")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const expected = process.env["RUBIKA_BRIDGE_SECRET"];
        if (!secretMatches(request.headers.get("x-bridge-secret"), expected)) {
          return new Response("Unauthorized", { status: 401 });
        }
        return Response.json(drainWork());
      },
      /** Worker heartbeat / status report. */
      POST: async ({ request }) => {
        const expected = process.env["RUBIKA_BRIDGE_SECRET"];
        if (!secretMatches(request.headers.get("x-bridge-secret"), expected)) {
          return new Response("Unauthorized", { status: 401 });
        }
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        setStatus({
          ...(typeof body["state"] === "string"
            ? { state: body["state"] as never }
            : {}),
          ...(typeof body["guid"] === "string" ? { guid: body["guid"] } : {}),
          ...(typeof body["phone"] === "string" ? { phone: body["phone"] } : {}),
          error: typeof body["error"] === "string" ? body["error"] : null,
          ...(Array.isArray(body["chats"])
            ? {
                chats: (body["chats"] as Record<string, unknown>[]).flatMap((c) =>
                  typeof c?.["guid"] === "string"
                    ? [
                        {
                          guid: c["guid"] as string,
                          title: typeof c["title"] === "string" ? (c["title"] as string) : "",
                        },
                      ]
                    : [],
                ),
              }
            : {}),
        });
        return Response.json({ ok: true });
      },
    },
  },
});
