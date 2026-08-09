import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCheck,
  Clock,
  Info,
  MessagesSquare,
  MoreVertical,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/common/UserAvatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { MessagesSkeleton } from "@/components/common/Skeletons";
import { MessageComposer } from "./MessageComposer";
import { AssignDialog } from "./AssignDialog";
import {
  getConversation,
  markConversationRead,
  updateConversationStatus,
} from "@/services/api/conversations";
import { listMessages, retryMessage, sendMessage } from "@/services/api/messages";
import { realtime } from "@/services/realtime";
import { useAuth } from "@/stores/auth";
import type { Message } from "@/types";
import { formatDay, formatTime } from "@/utils/format";
import { cn } from "@/lib/utils";

export function ChatPanel({
  conversationId,
  onBack,
  onOpenContact,
}: {
  conversationId: string;
  onBack?: () => void;
  onOpenContact?: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationQuery = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation(conversationId),
  });

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => listMessages(conversationId),
  });

  const unreadAtOpen = useRef<number | null>(null);
  if (unreadAtOpen.current === null && conversationQuery.data) {
    unreadAtOpen.current = conversationQuery.data.unreadCount;
  }

  useEffect(() => {
    unreadAtOpen.current = null;
  }, [conversationId]);

  // Mark read when opened.
  useEffect(() => {
    if (!conversationQuery.data || conversationQuery.data.unreadCount === 0) return;
    void markConversationRead(conversationId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
    });
  }, [conversationQuery.data, conversationId, queryClient]);

  // Realtime updates for the open conversation.
  useEffect(() => {
    return realtime.subscribe((event) => {
      if (event.type === "message.created" && event.payload.conversationId === conversationId) {
        void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      }
      if (event.type === "conversation.updated") {
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    });
  }, [conversationId, queryClient]);

  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, conversationId]);

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      sendMessage({ conversationId, text, authorUserId: user!.id }),
    onMutate: async (text) => {
      const key = ["messages", conversationId];
      const previous = queryClient.getQueryData<Message[]>(key) ?? [];
      const optimistic: Message = {
        id: `tmp-${Date.now()}`,
        conversationId,
        direction: "OUTBOUND",
        type: "text",
        text,
        authorUserId: user?.id ?? null,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Message[]>(key, [...previous, optimistic]);
      return { previous };
    },
    onError: (error: Error) => {
      toast.error(error.message || "ارسال پیام ناموفق بود.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: "OPEN" | "PENDING" | "CLOSED") =>
      updateConversationStatus(conversationId, status),
    onSuccess: (conversation) => {
      toast.success(
        conversation.status === "CLOSED"
          ? "گفتگو بسته شد."
          : conversation.status === "PENDING"
            ? "گفتگو به انتظار منتقل شد."
            : "گفتگو باز شد.",
      );
      void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
    onError: (error: Error) => toast.error(error.message || "تغییر وضعیت ناموفق بود."),
  });

  const retryMutation = useMutation({
    mutationFn: (messageId: string) => retryMessage(messageId),
    onSuccess: () => {
      toast.success("پیام دوباره ارسال شد.");
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
    onError: (error: Error) => toast.error(error.message || "تلاش مجدد ناموفق بود."),
  });

  const firstUnreadId = useMemo(() => {
    const count = unreadAtOpen.current ?? 0;
    if (!count) return null;
    const inbound = messages.filter((m) => m.direction === "INBOUND");
    return inbound[Math.max(0, inbound.length - count)]?.id ?? null;
  }, [messages]);

  if (conversationQuery.isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState onRetry={() => void conversationQuery.refetch()} />
      </div>
    );
  }

  const conversation = conversationQuery.data;

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-3 sm:px-4">
        {onBack ? (
          <Button variant="ghost" size="icon" aria-label="بازگشت" onClick={onBack} className="xl:hidden">
            <ArrowRight className="size-5" />
          </Button>
        ) : null}
        <UserAvatar name={conversation?.contactName ?? "—"} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{conversation?.contactName ?? "..."}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {conversation?.contactPhone} · {conversation?.contactRubikaId}
          </p>
        </div>
        {conversation ? <StatusBadge status={conversation.status} /> : null}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => setAssignOpen(true)}
          >
            <UserPlus className="size-4" />
            اختصاص
          </Button>
          {conversation?.status !== "CLOSED" ? (
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate("CLOSED")}
            >
              بستن
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate("OPEN")}
            >
              باز کردن
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="بیشتر">
                <MoreVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => setAssignOpen(true)}>
                <UserPlus className="size-4" /> اختصاص گفتگو
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => statusMutation.mutate("PENDING")}>
                <Clock className="size-4" /> انتقال به انتظار
              </DropdownMenuItem>
              {conversation?.status !== "CLOSED" ? (
                <DropdownMenuItem onClick={() => statusMutation.mutate("CLOSED")}>
                  بستن گفتگو
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => statusMutation.mutate("OPEN")}>
                  باز کردن گفتگو
                </DropdownMenuItem>
              )}
              {onOpenContact ? (
                <DropdownMenuItem onClick={onOpenContact} className="xl:hidden">
                  <Info className="size-4" /> اطلاعات مخاطب
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {messagesQuery.isLoading ? (
          <MessagesSkeleton />
        ) : messagesQuery.isError ? (
          <ErrorState onRetry={() => void messagesQuery.refetch()} />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="هنوز پیامی در این گفتگو نیست."
            description="اولین پیام را برای این مخاطب بنویسید."
          />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const newDay =
                !previous ||
                new Date(previous.createdAt).toDateString() !==
                  new Date(message.createdAt).toDateString();
              return (
                <div key={message.id} className="flex flex-col gap-2">
                  {newDay ? <DateSeparator iso={message.createdAt} /> : null}
                  {firstUnreadId === message.id ? (
                    <div className="flex items-center gap-2 py-1">
                      <span className="h-px flex-1 bg-primary/30" />
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        پیام‌های خوانده‌نشده
                      </span>
                      <span className="h-px flex-1 bg-primary/30" />
                    </div>
                  ) : null}
                  <MessageBubble
                    message={message}
                    onRetry={() => retryMutation.mutate(message.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MessageComposer
        disabled={conversation?.status === "CLOSED" || !user}
        sending={sendMutation.isPending}
        onSend={async (text) => {
          try {
            await sendMutation.mutateAsync(text);
          } catch {
            /* handled in onError */
          }
        }}
      />

      {conversation ? (
        <AssignDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          conversationId={conversation.id}
          currentUserId={conversation.assignedUserId}
          currentUserName={conversation.assignedUserName}
        />
      ) : null}
    </div>
  );
}

function DateSeparator({ iso }: { iso: string }) {
  const today = new Date().toDateString() === new Date(iso).toDateString();
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="h-px flex-1 bg-border" />
      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        {today ? "امروز" : formatDay(iso)}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function MessageBubble({ message, onRetry }: { message: Message; onRetry: () => void }) {
  const outbound = message.direction === "OUTBOUND";
  return (
    <div className={cn("flex", outbound ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-6 shadow-sm sm:max-w-[70%]",
          outbound
            ? "rounded-bs-sm bg-primary text-primary-foreground"
            : "rounded-be-sm border bg-card text-card-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <div
          className={cn(
            "mt-1 flex items-center gap-1.5 text-[10px]",
            outbound ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          <span>{formatTime(message.createdAt)}</span>
          {outbound ? <MessageTick message={message} /> : null}
          {message.status === "FAILED" ? (
            <button
              onClick={onRetry}
              className="ms-1 inline-flex items-center gap-1 rounded px-1 py-0.5 underline-offset-2 hover:underline"
            >
              <RotateCcw className="size-3" />
              تلاش مجدد
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MessageTick({ message }: { message: Message }) {
  if (message.status === "PENDING") return <Clock className="size-3" />;
  if (message.status === "FAILED") return <AlertCircle className="size-3" />;
  if (message.status === "READ" || message.status === "DELIVERED")
    return <CheckCheck className="size-3" />;
  return <Check className="size-3" />;
}
