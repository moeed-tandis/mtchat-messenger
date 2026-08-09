import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Contact2, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/Skeletons";
import { listContacts } from "@/services/api/contacts";
import { listConversations } from "@/services/api/conversations";
import { useAuth } from "@/stores/auth";
import { formatRelative, toFa } from "@/utils/format";

export const Route = createFileRoute("/_authed/contacts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "مخاطبین | MTchat" },
      {
        name: "description",
        content: "فهرست مخاطبین روبیکا همراه با شماره تماس، برچسب‌ها و آخرین زمان ارتباط.",
      },
      { property: "og:title", content: "مخاطبین | MTchat" },
      { property: "og:description", content: "مدیریت مخاطبین و تاریخچه ارتباط." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContactsPage,
});

function ContactsPage() {
  const { user, isSuperAdmin } = useAuth();
  const [query, setQuery] = useState("");

  const contactsQuery = useQuery({
    queryKey: ["contacts", query],
    queryFn: () => listContacts(query),
  });
  const conversationsQuery = useQuery({
    queryKey: ["conversations", "all-for-contacts"],
    queryFn: () => listConversations({}),
  });

  const visible = (contactsQuery.data ?? []).filter(
    (contact) => isSuperAdmin || contact.assignedUserId === user?.id || contact.lastActiveAgentId === user?.id,
  );

  const conversationOf = (contactId: string) =>
    (conversationsQuery.data ?? []).find((c) => c.contactId === contactId)?.id;

  return (
    <AppShell title="مخاطبین">
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی نام، شماره یا شناسه..."
            className="pe-9"
            aria-label="جستجوی مخاطب"
          />
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          {contactsQuery.isError ? (
            <ErrorState onRetry={() => void contactsQuery.refetch()} />
          ) : contactsQuery.isLoading ? (
            <ListSkeleton rows={6} />
          ) : visible.length === 0 ? (
            <EmptyState icon={Contact2} title="مخاطبی یافت نشد." />
          ) : (
            <ul>
              {visible.map((contact) => {
                const conversationId = conversationOf(contact.id);
                const body = (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <UserAvatar name={contact.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{contact.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {contact.phone} · {contact.rubikaId}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {contact.lastMessagePreview}
                      </p>
                    </div>
                    <div className="hidden shrink-0 flex-wrap gap-1 sm:flex">
                      {contact.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-[10px] text-muted-foreground">
                        {formatRelative(contact.lastContactAt)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {toFa(contact.conversationCount)} گفتگو
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li key={contact.id} className="border-b last:border-b-0 hover:bg-accent/40">
                    {conversationId ? (
                      <Link
                        to="/conversations/$conversationId"
                        params={{ conversationId }}
                        className="block"
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
