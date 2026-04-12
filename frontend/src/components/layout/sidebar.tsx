"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Vault",     href: "/vault"     },
  { label: "Agent",     href: "/agent"     },
  { label: "Logs",      href: "/logs"      },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-48 shrink-0 flex flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="font-semibold text-sm tracking-tight">VoyagerFi</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 p-3 pt-4">
        {NAV.map(({ label, href }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  active ? "bg-primary" : "bg-border"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Network badge */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
          <span className="text-xs text-muted-foreground">0G Mainnet</span>
        </div>
      </div>
    </aside>
  );
}
