import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Menu, Moon, Search, Sun, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";
import { GlobalSearchDialog } from "./GlobalSearchDialog";
import { listNotifications, markAllNotificationsRead } from "@/services/api/notifications";
import { formatRelative, toFa } from "@/utils/format";
import { useTheme } from "@/stores/theme";
import { realtime } from "@/services/realtime";

export function AppHeader({ title }: { title: string }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const { mode, setMode, resolved } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    refetchInterval: 20_000,
  });

  useEffect(() => {
    return realtime.subscribe(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
    });
  }, [queryClient]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-3 sm:px-5">
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="منو">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0">
          <SheetTitle className="sr-only">منوی اصلی</SheetTitle>
          <AppSidebar onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>

      <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>

      <div className="ms-auto flex items-center gap-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent md:flex"
        >
          <Search className="size-4" />
          <span>جستجو در MTchat...</span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="جستجو"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="size-5" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="اعلان‌ها">
              <Bell className="size-5" />
              {unread > 0 ? (
                <span className="absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {toFa(unread)}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-sm font-semibold">اعلان‌ها</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={async () => {
                  await markAllNotificationsRead();
                  void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                }}
              >
                <Check className="size-3.5" />
                خوانده شد
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                  اعلانی برای نمایش وجود ندارد.
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (n.conversationId) {
                        void navigate({
                          to: "/conversations",
                          search: { c: n.conversationId },
                        });
                      }
                    }}
                    className="block w-full border-b px-3 py-3 text-right last:border-b-0 hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-2">
                      {!n.read ? <span className="size-2 rounded-full bg-primary" /> : null}
                      <p className="truncate text-xs font-medium">{n.title}</p>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatRelative(n.createdAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="حالت نمایش">
              {resolved === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setMode("light")}>
              <Sun className="size-4" /> روشن {mode === "light" ? "✓" : ""}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode("dark")}>
              <Moon className="size-4" /> تاریک {mode === "dark" ? "✓" : ""}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode("system")}>
              <Laptop className="size-4" /> سیستم {mode === "system" ? "✓" : ""}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Badge variant="outline" className="hidden lg:inline-flex">
          <Link to="/connections">Rubika متصل</Link>
        </Badge>
      </div>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <Input className="hidden" aria-hidden tabIndex={-1} />
    </header>
  );
}
