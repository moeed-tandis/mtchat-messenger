import { createFileRoute } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/_authed/conversations/")({
  ssr: false,
  component: ConversationsIndex,
});

function ConversationsIndex() {
  return (
    <div className="flex h-full items-center justify-center bg-surface">
      <EmptyState
        icon={MessagesSquare}
        title="یک گفتگو را انتخاب کنید"
        description="برای مشاهده تاریخچه پیام‌ها و پاسخ‌دهی، از فهرست سمت راست یک گفتگو انتخاب کنید."
      />
    </div>
  );
}
