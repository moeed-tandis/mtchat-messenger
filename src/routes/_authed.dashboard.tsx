import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  MessagesSquare,
  Users as UsersIcon,
  Inbox,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/layout/RequireRole";
import { StatusBadge, Dot } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/common/ErrorState";
import { CardsSkeleton, ListSkeleton } from "@/components/common/Skeletons";
import { UserAvatar } from "@/components/common/UserAvatar";
import { getDashboard } from "@/services/api/dashboard";
import { formatNumber, formatRelative, toFa } from "@/utils/format";
import type { ConnectionStatus } from "@/types";

export const Route = createFileRoute("/_authed/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "داشبورد مدیریت | MTchat" },
      {
        name: "description",
        content: "آمار گفتگوها، پیام‌ها، کاربران فعال و سلامت سرویس‌های MTchat در یک نگاه.",
      },
      { property: "og:title", content: "داشبورد مدیریت | MTchat" },
      { property: "og:description", content: "نمای کلی عملکرد تیم پشتیبانی MTchat." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell title="داشبورد">
      <RequireRole permission="logs.view">
        <DashboardContent />
      </RequireRole>
    </AppShell>
  );
}

function DashboardContent() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 30_000,
  });

  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (isLoading || !data) return <CardsSkeleton count={6} />;

  const { stats, activity, recentConversations, recentActivity, health } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={UsersIcon} label="کل کاربران" value={formatNumber(stats.totalUsers)} hint={`${toFa(stats.activeUsers)} کاربر فعال`} />
        <StatCard icon={MessagesSquare} label="گفتگوهای باز" value={formatNumber(stats.openConversations)} />
        <StatCard icon={Inbox} label="گفتگوهای امروز" value={formatNumber(stats.todayConversations)} />
        <StatCard icon={Send} label="پیام‌های امروز" value={formatNumber(stats.todayMessages)} />
        <StatCard icon={AlertTriangle} label="پیام‌های ناموفق" value={formatNumber(stats.failedMessages)} tone="danger" />
        <StatCard icon={Activity} label="وضعیت سرویس" value="پایدار" hint="بروزرسانی هر ۳۰ ثانیه" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">فعالیت پیام‌ها (۷ روز اخیر)</h2>
          <div className="mt-5 flex h-48 items-end gap-3">
            {activity.map((point) => {
              const max = Math.max(...activity.map((p) => p.inbound + p.outbound), 1);
              return (
                <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-end justify-center gap-1" style={{ height: "8rem" }}>
                    <div
                      className="w-1/3 rounded-t bg-primary/80"
                      style={{ height: `${(point.inbound / max) * 100}%` }}
                      title={`ورودی: ${toFa(point.inbound)}`}
                    />
                    <div
                      className="w-1/3 rounded-t bg-chart-2/80"
                      style={{ height: `${(point.outbound / max) * 100}%` }}
                      title={`خروجی: ${toFa(point.outbound)}`}
                    />
                  </div>
                  <span className="truncate text-[10px] text-muted-foreground">{point.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> ورودی</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-2" /> خروجی</span>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">سلامت سیستم</h2>
          <div className="mt-4 space-y-3">
            <HealthRow label="سرور" status={health.server} />
            <HealthRow label="دیتابیس" status={health.database} />
            <HealthRow label="API" status={health.api} />
            <HealthRow label="اتصال روبیکا" status={health.messaging} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border bg-card">
          <h2 className="border-b px-4 py-3 text-sm font-semibold">گفتگوهای اخیر</h2>
          {recentConversations.length === 0 ? (
            <ListSkeleton rows={3} />
          ) : (
            <ul>
              {recentConversations.map((item) => (
                <li key={item.conversationId} className="border-b last:border-b-0">
                  <Link
                    to="/conversations/$conversationId"
                    params={{ conversationId: item.conversationId }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40"
                  >
                    <UserAvatar name={item.contactName} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.contactName}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {item.lastMessagePreview}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={item.status} />
                      <span className="text-[10px] text-muted-foreground">
                        {item.assignedUserName}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card">
          <h2 className="border-b px-4 py-3 text-sm font-semibold">فعالیت کاربران</h2>
          <ul>
            {recentActivity.map((item) => (
              <li key={item.id} className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0">
                <UserAvatar name={item.userName} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{item.userName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{item.action}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatRelative(item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "danger";
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={tone === "danger" ? "size-4 text-destructive" : "size-4 text-primary"} />
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function HealthRow({ label, status }: { label: string; status: ConnectionStatus }) {
  const tone = status === "CONNECTED" ? "success" : status === "DEGRADED" ? "warning" : "destructive";
  const text =
    status === "CONNECTED" ? "متصل" : status === "DEGRADED" ? "کیفیت پایین" : "قطع";
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 font-medium">
        <Dot tone={tone} />
        {text}
      </span>
    </div>
  );
}
