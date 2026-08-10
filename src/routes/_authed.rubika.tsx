import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut, Phone, RefreshCw, Radio, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/layout/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dot } from "@/components/common/StatusBadge";
import { getBridgeState, sendBridgeCommand } from "@/services/api/rubika";
import { formatNumber, formatRelative } from "@/utils/format";

export const Route = createFileRoute("/_authed/rubika")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "اتصال روبیکا | MTchat" },
      {
        name: "description",
        content: "اتصال مستقیم حساب روبیکا به MTchat، ورود با شماره و کد تأیید، و پایش پیام‌ها.",
      },
      { property: "og:title", content: "اتصال روبیکا | MTchat" },
      { property: "og:description", content: "مدیریت مرکزی حساب روبیکا از پنل سوپر ادمین." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireRole permission="settings.manage">
      <RubikaPage />
    </RequireRole>
  ),
});

const STATE_LABELS: Record<string, string> = {
  OFFLINE: "خاموش — کارگر روبیکا در حال اجرا نیست",
  CONNECTING: "در حال اتصال…",
  AWAITING_PHONE: "در انتظار شماره موبایل",
  AWAITING_CODE: "در انتظار کد تأیید",
  AWAITING_PASSWORD: "در انتظار رمز دومرحله‌ای",
  CONNECTED: "متصل — دریافت پیام فعال است",
  ERROR: "خطا در اتصال",
};

function RubikaPage() {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const stateQuery = useQuery({
    queryKey: ["rubika-bridge"],
    queryFn: () => getBridgeState(0),
    refetchInterval: 4_000,
  });

  const command = useMutation({
    mutationFn: (input: {
      type: "login" | "code" | "password" | "logout" | "refresh_chats";
      value?: string;
    }) => sendBridgeCommand(input.type, input.value),
    onSuccess: () => {
      toast.success("دستور برای کارگر روبیکا ارسال شد.");
      void queryClient.invalidateQueries({ queryKey: ["rubika-bridge"] });
    },
    onError: () => toast.error("ارسال دستور ناموفق بود."),
  });

  const status = stateQuery.data?.status;
  const connected = status?.state === "CONNECTED";

  return (
    <AppShell title="اتصال روبیکا">
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Status */}
        <div className="glass-panel xl:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="glass-icon">
                <Radio className="size-5 text-primary" />
              </span>
              <div>
                <p className="text-sm font-semibold">وضعیت حساب روبیکا</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Dot
                    tone={
                      connected
                        ? "success"
                        : status?.state === "ERROR"
                          ? "destructive"
                          : "warning"
                    }
                  />
                  {STATE_LABELS[status?.state ?? "OFFLINE"]}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => command.mutate({ type: "refresh_chats" })}
            >
              <RefreshCw className="size-4" /> بازخوانی
            </Button>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="شناسه حساب" value={status?.guid ?? "—"} mono />
            <Metric label="شماره" value={status?.phone ?? "—"} mono />
            <Metric label="پیام ورودی" value={formatNumber(status?.counters.inbound ?? 0)} />
            <Metric label="پیام خروجی" value={formatNumber(status?.counters.outbound ?? 0)} />
            <Metric
              label="آخرین ضربان کارگر"
              value={status?.lastHeartbeatAt ? formatRelative(status.lastHeartbeatAt) : "—"}
            />
            <Metric label="در صف ارسال" value={formatNumber(status?.pendingOutbound ?? 0)} />
            <Metric label="گفتگوهای روبیکا" value={formatNumber(status?.chats.length ?? 0)} />
            <Metric label="خطا" value={status?.error ?? "—"} />
          </dl>
        </div>

        {/* Login */}
        <div className="glass-panel">
          <div className="flex items-center gap-3">
            <span className="glass-icon">
              <ShieldCheck className="size-5 text-primary" />
            </span>
            <div>
              <p className="text-sm font-semibold">ورود مرکزی به حساب</p>
              <p className="text-[11px] text-muted-foreground">
                فقط سوپر ادمین به این بخش دسترسی دارد.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rubika-phone">شماره موبایل حساب روبیکا</Label>
              <Input
                id="rubika-phone"
                inputMode="tel"
                dir="ltr"
                placeholder="989123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={!phone.trim() || command.isPending}
                onClick={() => command.mutate({ type: "login", value: phone.trim() })}
              >
                <Phone className="size-4" /> ارسال کد تأیید
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rubika-code">کد تأیید پیامک‌شده</Label>
              <Input
                id="rubika-code"
                inputMode="numeric"
                dir="ltr"
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button
                variant="secondary"
                className="w-full"
                disabled={!code.trim() || command.isPending}
                onClick={() => command.mutate({ type: "code", value: code.trim() })}
              >
                <KeyRound className="size-4" /> تأیید و اتصال
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rubika-pass">رمز دومرحله‌ای (اختیاری)</Label>
              <Input
                id="rubika-pass"
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={!password.trim() || command.isPending}
                onClick={() => command.mutate({ type: "password", value: password.trim() })}
              >
                ارسال رمز
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full text-destructive"
              onClick={() => command.mutate({ type: "logout" })}
            >
              <LogOut className="size-4" /> قطع اتصال حساب
            </Button>
          </div>
        </div>

        {/* Chats */}
        <div className="glass-panel xl:col-span-3">
          <p className="text-sm font-semibold">گفتگوهای موجود در حساب</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            هر گفتگوی روبیکا به‌صورت خودکار به یک مخاطب و گفتگوی داخلی تبدیل و بر اساس قوانین
            مسیریابی بین کاربران تقسیم می‌شود.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(status?.chats ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                گفتگویی دریافت نشده است. پس از اتصال، «بازخوانی» را بزنید.
              </p>
            ) : (
              status!.chats.map((chat) => (
                <div key={chat.guid} className="glass-row">
                  <span className="truncate text-xs font-medium">{chat.title || chat.guid}</span>
                  <span dir="ltr" className="truncate text-[10px] text-muted-foreground">
                    {chat.guid}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="glass-row flex-col items-start gap-1">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd
        className="w-full truncate text-xs font-semibold"
        {...(mono ? { dir: "ltr" as const } : {})}
      >
        {value}
      </dd>
    </div>
  );
}
