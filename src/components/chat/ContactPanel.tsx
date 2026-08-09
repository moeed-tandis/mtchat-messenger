import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/common/UserAvatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/Skeletons";
import { addContactNote, getContact } from "@/services/api/contacts";
import { getConversation } from "@/services/api/conversations";
import { listUsers } from "@/services/api/users";
import { useAuth } from "@/stores/auth";
import { formatRelative, formatFull, toFa } from "@/utils/format";

export function ContactPanel({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const conversationQuery = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation(conversationId),
  });
  const contactId = conversationQuery.data?.contactId;

  const contactQuery = useQuery({
    queryKey: ["contact", contactId],
    queryFn: () => getContact(contactId!),
    enabled: Boolean(contactId),
  });

  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const nameOf = (id: string | null | undefined) =>
    users.find((u) => u.id === id)?.fullName ?? "—";

  const noteMutation = useMutation({
    mutationFn: (body: string) => addContactNote(contactId!, user!.id, body),
    onSuccess: () => {
      setNote("");
      toast.success("یادداشت ذخیره شد.");
      void queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
    },
    onError: (error: Error) => toast.error(error.message || "ذخیره یادداشت ناموفق بود."),
  });

  if (conversationQuery.isError || contactQuery.isError) {
    return (
      <div className="p-4">
        <ErrorState
          onRetry={() => {
            void conversationQuery.refetch();
            void contactQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (!conversationQuery.data || !contactQuery.data) {
    return <ListSkeleton rows={5} />;
  }

  const conversation = conversationQuery.data;
  const contact = contactQuery.data;

  return (
    <div className="h-full overflow-y-auto bg-card">
      <div className="flex flex-col items-center gap-2 border-b p-5 text-center">
        <UserAvatar name={contact.name} className="size-16 text-base" />
        <p className="text-sm font-semibold">{contact.name}</p>
        <p className="text-[11px] text-muted-foreground">{contact.phone}</p>
        <p className="text-[11px] text-muted-foreground">{contact.rubikaId}</p>
      </div>

      <Section title="گفتگو">
        <Row label="وضعیت" value={<StatusBadge status={conversation.status} />} />
        <Row label="کاربر مسئول" value={conversation.assignedUserName ?? "اختصاص نیافته"} />
        <Row label="آخرین کاربر فعال" value={nameOf(contact.lastActiveAgentId)} />
        <Row label="تعداد گفتگو" value={toFa(contact.conversationCount)} />
        <Row label="آخرین ارتباط" value={formatRelative(contact.lastContactAt)} />
        <Row label="اولین ارتباط" value={formatFull(contact.firstContactAt)} />
      </Section>

      {contact.tags.length > 0 ? (
        <Section title="برچسب‌ها">
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[11px]">
                {tag}
              </Badge>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="یادداشت‌ها">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          aria-label="یادداشت جدید"
          placeholder="یادداشت داخلی برای این مخاطب..."
          className="resize-none text-xs"
        />
        <Button
          size="sm"
          className="w-full"
          disabled={!note.trim() || noteMutation.isPending}
          onClick={() => noteMutation.mutate(note.trim())}
        >
          {noteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <StickyNote className="size-4" />}
          افزودن یادداشت
        </Button>
        <div className="space-y-2">
          {contact.notes.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">یادداشتی ثبت نشده است.</p>
          ) : (
            contact.notes.map((item) => (
              <div key={item.id} className="rounded-lg border bg-background p-2.5">
                <p className="text-xs leading-6">{item.body}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {nameOf(item.authorId)} · {formatRelative(item.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </Section>

      <Separator />
      <Section title="فعالیت اخیر">
        <p className="text-[11px] leading-6 text-muted-foreground">
          آخرین پیام: {contact.lastMessagePreview || "—"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          آخرین بروزرسانی گفتگو: {formatRelative(conversation.lastMessageAt)}
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5 border-b p-4 last:border-b-0">
      <p className="text-[11px] font-semibold text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium">{value}</span>
    </div>
  );
}
