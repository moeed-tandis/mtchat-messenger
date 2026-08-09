import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/layout/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { TableSkeleton } from "@/components/common/Skeletons";
import {
  createRoutingRule,
  deleteRoutingRule,
  getRoutingSettings,
  listRoutingRules,
  updateRoutingSettings,
} from "@/services/api/routing";
import { listUsers } from "@/services/api/users";
import { formatFull } from "@/utils/format";

export const Route = createFileRoute("/_authed/routing")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "قوانین مسیریابی | MTchat" },
      { name: "description", content: "تعیین کارشناس مسئول هر شماره و فعال‌سازی منطق آخرین کارشناس فعال." },
      { property: "og:title", content: "قوانین مسیریابی | MTchat" },
      { property: "og:description", content: "مسیریابی هوشمند گفتگوهای ورودی." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoutingPage,
});

function RoutingPage() {
  return (
    <AppShell title="مسیریابی">
      <RequireRole permission="routing.manage">
        <RoutingContent />
      </RequireRole>
    </AppShell>
  );
}

function RoutingContent() {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const rulesQuery = useQuery({ queryKey: ["routing-rules"], queryFn: listRoutingRules });
  const settingsQuery = useQuery({ queryKey: ["routing-settings"], queryFn: getRoutingSettings });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const createMutation = useMutation({
    mutationFn: () => createRoutingRule(phone.trim(), userId),
    onSuccess: () => {
      toast.success("قانون مسیریابی ایجاد شد.");
      setPhone("");
      setUserId("");
      void queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoutingRule(id),
    onSuccess: () => {
      toast.success("قانون حذف شد.");
      void queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (useLastActiveAgent: boolean) => updateRoutingSettings({ useLastActiveAgent }),
    onSuccess: () => {
      toast.success("تنظیمات مسیریابی ذخیره شد.");
      void queryClient.invalidateQueries({ queryKey: ["routing-settings"] });
    },
  });

  const submit = () => {
    setError(null);
    if (!/^09\d{9}$/.test(phone.trim())) return setError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.");
    if (!userId) return setError("کارشناس مسئول را انتخاب کنید.");
    createMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">استفاده از آخرین کارشناس فعال</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              اگر فعال باشد، پیام جدید به آخرین کارشناسی که با مخاطب گفتگو کرده اختصاص می‌یابد.
            </p>
          </div>
          <Switch
            aria-label="آخرین کارشناس فعال"
            checked={settingsQuery.data?.useLastActiveAgent ?? false}
            onCheckedChange={(checked) => settingsMutation.mutate(checked)}
          />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">افزودن قانون جدید</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Label htmlFor="rulePhone">شماره موبایل</Label>
            <Input
              id="rulePhone"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09121234567"
              maxLength={11}
            />
          </div>
          <div className="space-y-2">
            <Label>کارشناس مسئول</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger aria-label="کارشناس مسئول">
                <SelectValue placeholder="انتخاب کارشناس" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((user) => user.status === "ACTIVE")
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={submit} disabled={createMutation.isPending} className="w-full sm:w-auto">
              <Plus className="size-4" />
              افزودن
            </Button>
          </div>
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </section>

      <div className="overflow-hidden rounded-xl border bg-card">
        {rulesQuery.isError ? (
          <ErrorState onRetry={() => void rulesQuery.refetch()} />
        ) : rulesQuery.isLoading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : (rulesQuery.data ?? []).length === 0 ? (
          <EmptyState icon={Shuffle} title="قانونی ثبت نشده است." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">شماره</TableHead>
                <TableHead className="text-right">کارشناس</TableHead>
                <TableHead className="text-right">تاریخ ایجاد</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rulesQuery.data ?? []).map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell dir="ltr" className="text-xs">{rule.phone}</TableCell>
                  <TableCell className="text-xs">{rule.userName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatFull(rule.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="حذف قانون"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(rule.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
