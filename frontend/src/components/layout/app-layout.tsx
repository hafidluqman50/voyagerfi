"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";

function Inner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0 transition-[margin] duration-200",
          collapsed ? "md:ml-[64px]" : "md:ml-[220px]"
        )}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 md:pb-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Inner>{children}</Inner>
    </SidebarProvider>
  );
}
