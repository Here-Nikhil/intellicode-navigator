import type { ReactNode } from "react";
import { AppSidebar, MobileSidebarTrigger } from "@/components/disha/app-sidebar";

export function AppShell({ children, header }: { children: ReactNode; header?: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4 md:px-6">
          <MobileSidebarTrigger />
          <div className="min-w-0 flex-1">{header}</div>
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
