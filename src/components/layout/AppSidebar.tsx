import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Contact2,
  LogOut,
  MessagesSquare,
  Plug,
  ScrollText,
  Settings,
  Shuffle,
  User as UserIcon,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/stores/auth";
import { UserAvatar } from "@/components/common/UserAvatar";
import { roleLabels } from "@/utils/format";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  // typed by TanStack Router link paths
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "داشبورد", icon: BarChart3, adminOnly: true },
  { to: "/conversations", label: "گفتگوها", icon: MessagesSquare },
  { to: "/users", label: "کاربران", icon: Users, adminOnly: true },
  { to: "/contacts", label: "مخاطبین", icon: Contact2 },
  { to: "/connections", label: "ارتباط‌ها", icon: Plug, adminOnly: true },
  { to: "/routing", label: "مسیریابی", icon: Shuffle, adminOnly: true },
  { to: "/logs", label: "لاگ‌ها", icon: ScrollText, adminOnly: true },
  { to: "/settings", label: "تنظیمات", icon: Settings, adminOnly: true },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isSuperAdmin, logout } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV.filter((item) => !item.adminOnly || isSuperAdmin);

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <MessagesSquare className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">MTchat</p>
          <p className="truncate text-[11px] text-muted-foreground">پنل پیام‌رسان تیمی</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg p-2 text-right transition-colors hover:bg-sidebar-accent/60">
            <UserAvatar name={user?.fullName ?? "کاربر"} className="size-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.fullName}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user ? roleLabels[user.role] : ""}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/profile" onClick={onNavigate}>
                <UserIcon className="size-4" />
                پروفایل
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => void logout()}>
              <LogOut className="size-4" />
              خروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
