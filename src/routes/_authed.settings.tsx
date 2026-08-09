import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/layout/RequireRole";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/stores/theme";

export const Route = createFileRoute("/_authed/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تنظیمات | MTchat" },
      { name: "description", content: "تنظیمات ظاهر پنل، حالت نمایش و پیکربندی سرویس پیام‌رسان." },
      { property: "og:title", content: "تنظیمات | MTchat" },
      { property: "og:description", content: "پیکربندی پنل MTchat." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { mode, setMode } = useTheme();
  return (
    <AppShell title="تنظیمات">
      <RequireRole permission="settings.manage">
        <div className="mx-auto max-w-2xl space-y-4">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">حالت نمایش</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              انتخاب پوسته روشن، تاریک یا هم‌گام با سیستم.
            </p>
            <div className="mt-4 flex gap-2">
              {(["light", "dark", "system"] as const).map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={mode === value ? "default" : "outline"}
                  onClick={() => setMode(value)}
                >
                  {value === "light" ? "روشن" : value === "dark" ? "تاریک" : "سیستم"}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">اتصال پیام‌رسان</h2>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">آدرس وب‌هوک ورودی</Label>
              <p dir="ltr" className="rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs">
                https://api.mtchat.local/webhooks/rubika
              </p>
            </div>
            <p className="text-[11px] leading-6 text-muted-foreground">
              کلید API و توکن‌های سرویس در محیط سرور نگهداری می‌شوند و در این پنل نمایش داده نمی‌شوند.
            </p>
          </section>
        </div>
      </RequireRole>
    </AppShell>
  );
}
