import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/Skeletons";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MessagesSquare } from "lucide-react";
import { formatSmart, toFa } from "@/utils/format";
import type { ConversationListItem, ConversationFilters } from "@/services/api/conversations";

const SCOPES: Array<{ key: NonNullable<ConversationFilters["scope"]>; label: string }> = [
  { key: "ALL", label: "همه" },
  { key: "MINE", label: "من" },
  { key: "UNREAD", label: "خوانده نشده" },
  { key: "OPEN", label: "باز" },
  { key: "PENDING", label: "در انتظار" },
  { key: "CLOSED", label: "بسته" },
];

export function ConversationList({
  items,
  loading,
  selectedId,
  onSelect,
  scope,
  onScopeChange,
  query,
  onQueryChange,
}: {
  items: ConversationListItem[];
  loading: boolean;
  selectedId?: string;
  onSelect: (id: string) => void;
  scope: NonNullable<ConversationFilters["scope"]>;
  onScopeChange: (scope: NonNullable<ConversationFilters["scope"]>) => void;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(25);
  const shown = items.slice(0, visible);

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="space-y-3 border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="جستجو در گفتگوها..."
            className="pe-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SCOPES.map((item) => (
            <button
              key={item.key}
              onClick={() => onScopeChange(item.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                scope === item.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <ListSkeleton rows={7} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="هنوز گفتگویی وجود ندارد."
            description="با دریافت پیام جدید، گفتگوها در این بخش نمایش داده می‌شوند."
          />
        ) : (
          <>
            {shown.map((conversation) => {
              const active = conversation.id === selectedId;
              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  className={cn(
                    "grid w-full grid-cols-[auto_minmax(0,1fr)] gap-3 border-b px-3 py-3 text-right transition-colors",
                    active ? "bg-accent/70" : "hover:bg-accent/40",
                  )}
                >
                  <UserAvatar name={conversation.contactName} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{conversation.contactName}</p>
                      <span className="ms-auto shrink-0 text-[10px] text-muted-foreground">
                        {formatSmart(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {conversation.contactPhone} · {conversation.contactRubikaId}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p
                        className={cn(
                          "min-w-0 flex-1 truncate text-xs",
                          conversation.unreadCount > 0
                            ? "font-medium text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {conversation.lastMessagePreview}
                      </p>
                      {conversation.unreadCount > 0 ? (
                        <Badge className="h-5 min-w-5 shrink-0 justify-center px-1 text-[10px]">
                          {toFa(conversation.unreadCount)}
                        </Badge>
                      ) : null}
                      <StatusBadge status={conversation.status} className="shrink-0" />
                    </div>
                  </div>
                </button>
              );
            })}
            {visible < items.length ? (
              <button
                onClick={() => setVisible((v) => v + 25)}
                className="w-full py-3 text-xs font-medium text-primary hover:bg-accent/40"
              >
                نمایش گفتگوهای بیشتر
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
