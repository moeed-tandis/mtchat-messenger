import { cn } from "@/lib/utils";
import type { ConversationStatus } from "@/types";
import { statusLabels } from "@/utils/format";

const styles: Record<ConversationStatus, string> = {
  OPEN: "bg-success/12 text-success border-success/25",
  PENDING: "bg-warning/15 text-warning-foreground border-warning/35 dark:text-warning",
  CLOSED: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ConversationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        styles[status],
        className,
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

export function Dot({ tone = "success" }: { tone?: "success" | "warning" | "destructive" }) {
  const toneClass =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-destructive";
  return <span className={cn("inline-block size-2 rounded-full", toneClass)} />;
}
