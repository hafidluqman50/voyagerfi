"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Vault", href: "/vault" },
  { label: "Agent", href: "/agent" },
  { label: "Logs", href: "/logs" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[180px] shrink-0 border-r border-border bg-card flex flex-col min-h-screen">
      <div className="h-12 flex items-center px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm font-medium text-foreground">VoyagerFi</span>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 p-2 pt-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  active ? "bg-primary" : "bg-border"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="text-[10px] text-muted-foreground">0G Mainnet</div>
      </div>
    </aside>
  );
}
