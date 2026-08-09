import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plug } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Dot } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { CardsSkeleton } from "@/components/common/Skeletons";
import { listConnections } from "@/services/api/connections";
import { formatNumber, formatRelative } from "@/utils/format";

export const Route = createFileRoute("/_authed/connections")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ارتباط‌ها | MTchat" },
      { name: "description", content: "وضعیت اتصال به پیام‌رسان روبیکا و آمار پیام‌های ورودی و خروجی." },
      { property: "og:title", content: "ارتباط‌ها | MTchat" },
      { property: "og:description", content: "پایش اتصال سرویس پیام‌رسان." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["connections"],
    queryFn: listConnections,
    refetchInterval: 30_000,
  });

  return (
    <AppShell title="ارتباط‌ها">
      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <CardsSkeleton count={3} />
      ) : data.length === 0 ? (
        <EmptyState icon={Plug} title="اتصالی ثبت نشده است." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((connection) => (
            <div key={connection.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{connection.name}</p>
                <Dot
                  tone={
                    connection.status === "CONNECTED"
                      ? "success"
                      : connection.status === "DEGRADED"
                        ? "warning"
                        : "destructive"
                  }
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{connection.provider}</p>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">پیام ورودی</dt>
                  <dd className="font-medium">{formatNumber(connection.inboundCount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">پیام خروجی</dt>
                  <dd className="font-medium">{formatNumber(connection.outboundCount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">آخرین پیام</dt>
                  <dd className="font-medium">{formatRelative(connection.lastMessageAt)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
