import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ListSkeleton } from "@/components/common/Skeletons";
import { listUsers } from "@/services/api/users";
import { assignConversation } from "@/services/api/conversations";
import { roleLabels } from "@/utils/format";
import { cn } from "@/lib/utils";

export function AssignDialog({
  open,
  onOpenChange,
  conversationId,
  currentUserId,
  currentUserName,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  conversationId: string;
  currentUserId: string | null;
  currentUserName: string | null;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(currentUserId);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (userId: string) => assignConversation(conversationId, userId),
    onSuccess: (conversation) => {
      toast.success(`گفتگو به ${conversation.assignedUserName} اختصاص یافت.`);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "اختصاص گفتگو ناموفق بود."),
  });

  const q = query.trim().toLowerCase();
  const filtered = users.filter(
    (user) =>
      user.status === "ACTIVE" &&
      (!q || user.fullName.toLowerCase().includes(q) || user.username.toLowerCase().includes(q)),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>اختصاص گفتگو</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          کاربر فعلی: <span className="font-medium text-foreground">{currentUserName ?? "—"}</span>
        </p>

        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی کاربر..."
            className="pe-9"
            aria-label="جستجوی کاربر"
          />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {isLoading ? (
            <ListSkeleton rows={4} />
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">کاربری پیدا نشد.</p>
          ) : (
            filtered.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelected(user.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-2 text-right transition-colors",
                  selected === user.id
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-accent/60",
                )}
              >
                <UserAvatar name={user.fullName} className="size-9" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.fullName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {roleLabels[user.role]} · {user.username}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            لغو
          </Button>
          <Button
            disabled={!selected || mutation.isPending}
            onClick={() => selected && mutation.mutate(selected)}
          >
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
