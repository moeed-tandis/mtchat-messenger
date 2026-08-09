import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/stores/auth";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MTchat — پنل پیام‌رسان تیمی" },
      {
        name: "description",
        content: "MTchat؛ داشبورد تیمی برای دریافت و پاسخ به پیام‌های مشتریان.",
      },
      { property: "og:title", content: "MTchat — پنل پیام‌رسان تیمی" },
      {
        property: "og:description",
        content: "مدیریت گفتگوها، کاربران و گزارش‌های پیام‌رسان در یک پنل.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { loading, isAuthenticated, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      void navigate({ to: "/login", replace: true });
      return;
    }
    void navigate({ to: isSuperAdmin ? "/dashboard" : "/conversations", replace: true });
  }, [loading, isAuthenticated, isSuperAdmin, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="w-64 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
