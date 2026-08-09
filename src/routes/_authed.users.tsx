import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus, Search, UserCog } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/layout/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ErrorState } from "@/components/common/ErrorState";
import { TableSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import {
  createUser,
  listUsers,
  resetPassword,
  setUserStatus,
  updateUser,
} from "@/services/api/users";
import type { Role, User, UserStatus } from "@/types";
import { formatFull, formatRelative, roleLabels } from "@/utils/format";

export const Route = createFileRoute("/_authed/users")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "مدیریت کاربران | MTchat" },
      {
        name: "description",
        content: "ایجاد و ویرایش کارشناسان، تعیین نقش، فعال‌سازی حساب و بازنشانی رمز عبور.",
      },
      { property: "og:title", content: "مدیریت کاربران | MTchat" },
      { property: "og:description", content: "کنترل کامل حساب‌های تیم پشتیبانی." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  return (
    <AppShell title="کاربران">
      <RequireRole permission="users.manage">
        <UsersContent />
      </RequireRole>
    </AppShell>
  );
}

function UsersContent() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["users"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) => setUserStatus(id, status),
    onSuccess: (user) => {
      toast.success(user.status === "ACTIVE" ? "حساب فعال شد." : "حساب غیرفعال شد.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (user) =>
        (roleFilter === "ALL" || user.role === roleFilter) &&
        (!q ||
          user.fullName.toLowerCase().includes(q) ||
          user.username.toLowerCase().includes(q)),
    );
  }, [users, query, roleFilter]);

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی نام یا نام کاربری..."
            className="pe-9"
            aria-label="جستجوی کاربر"
          />
        </div>
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as "ALL" | Role)}>
          <SelectTrigger className="w-40" aria-label="فیلتر نقش">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">همه نقش‌ها</SelectItem>
            <SelectItem value="SUPER_ADMIN">مدیر ارشد</SelectItem>
            <SelectItem value="AGENT">کارشناس</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          کاربر جدید
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={UserCog} title="کاربری یافت نشد." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">کاربر</TableHead>
                <TableHead className="text-right">نقش</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right">آخرین ورود</TableHead>
                <TableHead className="text-right">تاریخ ایجاد</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.fullName} className="size-9" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.fullName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{user.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "SUPER_ADMIN" ? "default" : "secondary"}>
                      {roleLabels[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.status === "ACTIVE"}
                        aria-label="فعال یا غیرفعال"
                        onCheckedChange={(checked) =>
                          statusMutation.mutate({
                            id: user.id,
                            status: checked ? "ACTIVE" : "DISABLED",
                          })
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {user.status === "ACTIVE" ? "فعال" : "غیرفعال"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {user.lastLoginAt ? formatRelative(user.lastLoginAt) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatFull(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" aria-label="ویرایش" onClick={() => setEditing(user)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="بازنشانی رمز"
                        onClick={() => setResetting(user)}
                      >
                        <KeyRound className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onDone={invalidate} />
      <EditUserDialog user={editing} onClose={() => setEditing(null)} onDone={invalidate} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onDone: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("AGENT");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createUser({ fullName: fullName.trim(), username: username.trim(), password, role, status: "ACTIVE" }),
    onSuccess: () => {
      toast.success("کاربر جدید ایجاد شد.");
      setFullName("");
      setUsername("");
      setPassword("");
      setRole("AGENT");
      onDone();
      onOpenChange(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = () => {
    setError(null);
    if (fullName.trim().length < 3) return setError("نام کامل باید حداقل ۳ کاراکتر باشد.");
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username.trim()))
      return setError("نام کاربری باید ۳ تا ۳۲ کاراکتر انگلیسی باشد.");
    if (password.length < 6) return setError("رمز عبور باید حداقل ۶ کاراکتر باشد.");
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ایجاد کاربر جدید</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="fullName">نام کامل</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newUsername">نام کاربری</Label>
            <Input
              id="newUsername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
              maxLength={32}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">رمز عبور</Label>
            <Input
              id="newPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              maxLength={64}
            />
          </div>
          <div className="space-y-2">
            <Label>نقش</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AGENT">کارشناس</SelectItem>
                <SelectItem value="SUPER_ADMIN">مدیر ارشد</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            لغو
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            ایجاد کاربر
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onClose,
  onDone,
}: {
  user: User | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "AGENT");

  const mutation = useMutation({
    mutationFn: () => updateUser(user!.id, { fullName: fullName.trim(), role }),
    onSuccess: () => {
      toast.success("اطلاعات کاربر بروزرسانی شد.");
      onDone();
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog
      open={Boolean(user)}
      onOpenChange={(open) => {
        if (!open) onClose();
        else if (user) {
          setFullName(user.fullName);
          setRole(user.role);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ویرایش کاربر</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="editName">نام کامل</Label>
            <Input
              id="editName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={user?.fullName}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label>نقش</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AGENT">کارشناس</SelectItem>
                <SelectItem value="SUPER_ADMIN">مدیر ارشد</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            لغو
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || fullName.trim().length < 3}
          >
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => resetPassword(user!.id, password),
    onSuccess: () => {
      toast.success("رمز عبور بازنشانی شد.");
      setPassword("");
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>بازنشانی رمز عبور {user?.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="resetPassword">رمز عبور جدید</Label>
          <Input
            id="resetPassword"
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={64}
          />
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            لغو
          </Button>
          <Button
            disabled={password.length < 6 || mutation.isPending}
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
          >
            بازنشانی
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
