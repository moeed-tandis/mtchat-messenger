import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth, type Permission } from "@/stores/auth";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

/**
 * Route-level permission gate. Rendered inside authenticated pages so the
 * route itself verifies access, not only the sidebar links.
 */
export function RequireRole({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (can(permission)) return <>{children}</>;
  return (
    <EmptyState
      icon={ShieldAlert}
      title="دسترسی به این بخش برای شما مجاز نیست."
      description="این صفحه تنها برای مدیر ارشد قابل مشاهده است."
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/conversations">بازگشت به گفتگوها</Link>
        </Button>
      }
    />
  );
}
