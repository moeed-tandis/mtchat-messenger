import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/layout/RequireRole";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/Skeletons";
import {
  listAuditLogs,
  listMessageLogs,
  listSecurityLogs,
  listSystemLogs,
} from "@/services/api/logs";
import { formatFull, logLevelLabels, toFa } from "@/utils/format";

export const Route = createFileRoute("/_authed/logs")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لاگ‌های سیستم | MTchat" },
      { name: "description", content: "بررسی لاگ‌های سیستم، پیام‌ها، امنیت و فعالیت کاربران MTchat." },
      { property: "og:title", content: "لاگ‌های سیستم | MTchat" },
      { property: "og:description", content: "پایش رخدادها و رویدادهای امنیتی." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  return (
    <AppShell title="لاگ‌ها">
      <RequireRole permission="logs.view">
        <LogsContent />
      </RequireRole>
    </AppShell>
  );
}

function LogsContent() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="جستجو در لاگ‌ها..."
          className="pe-9"
          aria-label="جستجو در لاگ‌ها"
        />
      </div>

      <Tabs defaultValue="system" onValueChange={() => setPage(1)}>
        <TabsList>
          <TabsTrigger value="system">سیستم</TabsTrigger>
          <TabsTrigger value="messages">پیام‌ها</TabsTrigger>
          <TabsTrigger value="security">امنیت</TabsTrigger>
          <TabsTrigger value="audit">فعالیت کاربران</TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <LogTable
            queryKey={["logs", "system", query, page]}
            fetcher={() => listSystemLogs({ query, page })}
            columns={["زمان", "سطح", "سرویس", "رویداد", "وضعیت"]}
            page={page}
            onPageChange={setPage}
            render={(log) => [
              formatFull(log.createdAt),
              <Badge
                key="level"
                variant={log.level === "ERROR" ? "destructive" : log.level === "WARNING" ? "secondary" : "outline"}
              >
                {logLevelLabels[log.level]}
              </Badge>,
              log.service,
              log.event,
              log.status,
            ]}
          />
        </TabsContent>

        <TabsContent value="messages">
          <LogTable
            queryKey={["logs", "messages", query, page]}
            fetcher={() => listMessageLogs({ query, page })}
            columns={["زمان", "مخاطب", "جهت", "وضعیت", "شناسه پیام"]}
            page={page}
            onPageChange={setPage}
            render={(log) => [
              formatFull(log.createdAt),
              log.contactName,
              log.direction === "INBOUND" ? "ورودی" : "خروجی",
              <Badge key="s" variant={log.status === "FAILED" ? "destructive" : "outline"}>
                {log.status === "FAILED" ? "ناموفق" : log.status === "PENDING" ? "در انتظار" : "موفق"}
              </Badge>,
              log.messageId,
            ]}
          />
        </TabsContent>

        <TabsContent value="security">
          <LogTable
            queryKey={["logs", "security", query, page]}
            fetcher={() => listSecurityLogs({ query, page })}
            columns={["زمان", "رویداد", "کاربر", "IP", "توضیح"]}
            page={page}
            onPageChange={setPage}
            render={(log) => [formatFull(log.createdAt), log.event, log.userName, log.ip, log.detail]}
          />
        </TabsContent>

        <TabsContent value="audit">
          <LogTable
            queryKey={["logs", "audit", query, page]}
            fetcher={() => listAuditLogs({ query, page })}
            columns={["زمان", "کاربر", "عملیات", "IP"]}
            page={page}
            onPageChange={setPage}
            render={(log) => [formatFull(log.createdAt), log.userName, log.action, log.ip]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LogTable<T extends { id: string }>({
  queryKey,
  fetcher,
  columns,
  render,
  page,
  onPageChange,
}: {
  queryKey: unknown[];
  fetcher: () => Promise<{ items: T[]; total: number; page: number; pageSize: number }>;
  columns: string[];
  render: (item: T) => React.ReactNode[];
  page: number;
  onPageChange: (page: number) => void;
}) {
  const { data, isLoading } = useQuery({ queryKey, queryFn: fetcher });
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border bg-card">
      {isLoading || !data ? (
        <TableSkeleton rows={6} cols={columns.length} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="لاگی یافت نشد." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="text-right">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  {render(item).map((cell, index) => (
                    <TableCell key={index} className="text-xs">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <span>
              صفحه {toFa(page)} از {toFa(pageCount)}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                قبلی
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => onPageChange(page + 1)}
              >
                بعدی
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
