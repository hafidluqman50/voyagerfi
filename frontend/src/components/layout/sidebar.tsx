"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

const NAV: { label: string; href: string; icon: ReactNode }[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "Trade",
    href: "/trade",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10h14M13 5l5 5-5 5" />
      </svg>
    ),
  },
  {
    label: "Positions",
    href: "/positions",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 14l5-5 4 4 7-8" />
        <path d="M14 5h4v4" />
      </svg>
    ),
  },
  {
    label: "Verify",
    href: "/logs",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="1.5" width="14" height="17" rx="2" />
        <path d="M7 6.5h6M7 10h6M7 13.5h4" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <>
      {/* Desktop — sticky + collapsible */}
      <aside className={cn(
        "hidden md:flex shrink-0 flex-col fixed top-0 left-0 h-screen border-r border-border bg-sidebar z-40 transition-all duration-200",
        collapsed ? "w-[64px]" : "w-[220px]"
      )}>
        {/* Logo + collapse */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <div className={cn("flex items-center gap-3 overflow-hidden", collapsed && "justify-center w-full")}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            {!collapsed && <span className="font-semibold text-[15px] whitespace-nowrap">VoyagerFi</span>}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center h-10 text-muted-foreground hover:text-foreground transition-colors mx-auto mt-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
        )}

        {/* Nav */}
        <nav className={cn("flex-1 flex flex-col gap-1 p-3", collapsed && "items-center")}>
          {NAV.map(({ label, href, icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center rounded-lg font-medium transition-colors",
                  collapsed ? "w-10 h-10 justify-center" : "gap-3 px-3 py-2.5 text-[14px]",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {icon}
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* Status */}
        <div className={cn("py-4 border-t border-border", collapsed ? "flex justify-center" : "px-5")}>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-positive animate-pulse-dot shrink-0" />
            {!collapsed && <span className="text-[13px] text-muted-foreground">Agent Running</span>}
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden flex items-center justify-around h-16 bg-card border-t border-border z-50">
        {NAV.map(({ label, href, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {icon}
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
