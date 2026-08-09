import { useState, type KeyboardEvent } from "react";
import { Loader2, Paperclip, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function MessageComposer({
  disabled,
  sending,
  onSend,
}: {
  disabled?: boolean;
  sending?: boolean;
  onSend: (text: string) => Promise<void> | void;
}) {
  const [text, setText] = useState("");

  const submit = async () => {
    const value = text.trim();
    if (!value || disabled || sending) return;
    setText("");
    await onSend(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="border-t bg-card p-3">
      {disabled ? (
        <p className="mb-2 text-center text-[11px] text-muted-foreground">
          این گفتگو بسته است؛ برای ارسال پیام آن را باز کنید.
        </p>
      ) : null}
      <div className="flex items-end gap-2 rounded-xl border bg-background p-2 focus-within:ring-1 focus-within:ring-ring">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          aria-label="متن پیام"
          placeholder="پیام خود را بنویسید..."
          className="max-h-32 min-h-9 resize-none border-0 bg-transparent px-1 py-1.5 shadow-none focus-visible:ring-0"
        />
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label="پیوست فایل"
          disabled={disabled}
          onClick={() => toast.info("ارسال پیوست در نسخه بعدی فعال می‌شود.")}
        >
          <Paperclip className="size-4" />
        </Button>
        <Button
          size="icon"
          type="button"
          aria-label="ارسال پیام"
          disabled={disabled || sending || text.trim().length === 0}
          onClick={() => void submit()}
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SendHorizonal className="size-4 rtl:rotate-180" />
          )}
        </Button>
      </div>
    </div>
  );
}
