import { createFileRoute } from "@tanstack/react-router";

/**
 * The Rubika connector worker long-polls this endpoint to pick up outgoing
 * messages and account commands queued by the panel.
 */
export const Route = createFileRoute("/api/public/rubika/outbox")({
  server: {
    handlers: {
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
