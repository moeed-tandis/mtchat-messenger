import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export function AppShell({
  title,
  children,
  padded = true,
}: {
  title: string;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface">
      <aside className="hidden w-64 shrink-0 border-e lg:block">
        <AppSidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader title={title} />
        <main className={padded ? "flex-1 overflow-y-auto p-4 sm:p-6" : "flex min-h-0 flex-1"}>
          {children}
        </main>
      </div>
    </div>
  );
}
