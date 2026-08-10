import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/stores/auth";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ورود به MTchat" },
      { name: "description", content: "ورود کارشناسان و مدیران به پنل پیام‌رسان تیمی MTchat." },
      { property: "og:title", content: "ورود به MTchat" },
      { property: "og:description", content: "ورود امن به داشبورد پیام‌رسان MTchat." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      void navigate({ to: isSuperAdmin ? "/dashboard" : "/conversations", replace: true });
    }
  }, [loading, isAuthenticated, isSuperAdmin, navigate]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!username.trim()) nextErrors.username = "نام کاربری را وارد کنید.";
    if (!password) nextErrors.password = "رمز عبور را وارد کنید.";
    else if (password.length < 4) nextErrors.password = "رمز عبور باید حداقل ۴ کاراکتر باشد.";
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const user = await login(username.trim(), password);
      void navigate({
        to: user.role === "SUPER_ADMIN" ? "/dashboard" : "/conversations",
        replace: true,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "ورود ناموفق بود.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MessagesSquare className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MTchat</h1>
            <p className="mt-1 text-sm text-muted-foreground">ورود به حساب کاربری</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="rounded-2xl border bg-card p-6 shadow-sm"
          aria-describedby={formError ? "login-error" : undefined}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">نام کاربری</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={Boolean(errors.username)}
                placeholder="مثلاً moeed"
              />
              {errors.username ? (
                <p className="text-xs text-destructive">{errors.username}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  className="pe-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password}</p>
              ) : null}
            </div>

            {formError ? (
              <div
                id="login-error"
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {formError}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              ورود به MTchat
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-[11px] leading-6 text-muted-foreground">
          ثبت‌نام عمومی وجود ندارد؛ حساب کاربری توسط مدیر ارشد ایجاد می‌شود.
        </p>
      </div>
    </main>
  );
}
