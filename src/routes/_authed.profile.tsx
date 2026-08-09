import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ListSkeleton } from "@/components/common/Skeletons";
import { getUserStats } from "@/services/api/users";
import { useAuth } from "@/stores/auth";
import { formatFull, formatNumber, formatRelative, roleLabels } from "@/utils/format";

export const Route = createFileRoute("/_authed/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "پروفایل کاربری | MTchat" },
      { name: "description", content: "مشاهده اطلاعات حساب کاربری و آمار فعالیت شما در MTchat." },
      { property: "og:title", content: "پروفایل کاربری | MTchat" },
      { property: "og:description", content: "اطلاعات حساب و آمار فعالیت." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: () => getUserStats(user!.id),
    enabled: Boolean(user),
  });

  return (
    <AppShell title="پروفایل">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
          <UserAvatar name={user?.fullName ?? "کاربر"} className="size-16 text-base" />
          <div className="min-w-0">
            <p className="text-base font-semibold">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {user ? `${roleLabels[user.role]} · ${user.username}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              عضویت از {user ? formatFull(user.createdAt) : "—"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">آمار فعالیت</h2>
          {isLoading || !data ? (
            <ListSkeleton rows={3} />
          ) : (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Stat label="گفتگوهای فعال" value={formatNumber(data.activeConversations)} />
              <Stat label="گفتگوهای بسته‌شده" value={formatNumber(data.closedConversations)} />
              <Stat label="پیام‌های ارسالی" value={formatNumber(data.sentMessages)} />
              <Stat
                label="آخرین فعالیت"
                value={data.lastActivityAt ? formatRelative(data.lastActivityAt) : "—"}
              />
            </dl>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-bold">{value}</dd>
    </div>
  );
}
