import { Outlet, createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { ConversationList } from "@/components/conversations/ConversationList";
import { ErrorState } from "@/components/common/ErrorState";
import { listConversations, type ConversationFilters } from "@/services/api/conversations";
import { realtime } from "@/services/realtime";
import { useAuth } from "@/stores/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/conversations")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "گفتگوها | MTchat" },
      {
        name: "description",
        content: "مدیریت گفتگوهای ورودی روبیکا، پاسخ‌دهی سریع و اختصاص گفتگو به کارشناسان.",
      },
      { property: "og:title", content: "گفتگوها | MTchat" },
      { property: "og:description", content: "میزکار پیام‌رسانی تیمی MTchat." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConversationsLayout,
});

function ConversationsLayout() {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams({ strict: false }) as { conversationId?: string };
  const selectedId = params.conversationId;

  const [scope, setScope] = useState<NonNullable<ConversationFilters["scope"]>>("ALL");
  const [query, setQuery] = useState("");

  const filters: ConversationFilters = {
    scope,
    query,
    ...(user ? { currentUserId: user.id } : {}),
    ...(!isSuperAdmin && user ? { restrictToUserId: user.id } : {}),
  };

  const conversationsQuery = useQuery({
    queryKey: ["conversations", filters],
    queryFn: () => listConversations(filters),
  });

  useEffect(() => {
    return realtime.subscribe((event) => {
      if (event.type === "message.created" || event.type === "conversation.updated") {
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    });
  }, [queryClient]);

  return (
    <AppShell title="گفتگوها" padded={false}>
      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div
          className={cn(
            "min-h-0 border-e",
            selectedId ? "hidden xl:block" : "block",
          )}
        >
          {conversationsQuery.isError ? (
            <ErrorState onRetry={() => void conversationsQuery.refetch()} />
          ) : (
            <ConversationList
              items={conversationsQuery.data ?? []}
              loading={conversationsQuery.isLoading}
              {...(selectedId ? { selectedId } : {})}
              onSelect={(id) =>
                void navigate({
                  to: "/conversations/$conversationId",
                  params: { conversationId: id },
                })
              }
              scope={scope}
              onScopeChange={setScope}
              query={query}
              onQueryChange={setQuery}
            />
          )}
        </div>
        <div className={cn("min-h-0", selectedId ? "block" : "hidden xl:block")}>
          <Outlet />
        </div>
      </div>
    </AppShell>
  );
}
