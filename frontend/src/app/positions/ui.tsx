"use client";

import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { cn } from "@/lib/utils";
import type { Position } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function fmtPrice(s: string): string {
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return s || "—";
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function fmtSize(p: Position): string {
  const size = parseFloat(p.size);
  return Number.isFinite(size) ? size.toFixed(4) : p.size || "—";
}

function fmtPnl(n: number): string {
  return `${n >= 0 ? "+" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return "—"; }
}

export function PositionsUI() {
  const { data: positions = [], isLoading } = useQuery<Position[]>({
    queryKey: ["agent-positions"],
    queryFn: () => fetch(`${API}/agent/positions`).then(r => r.json()).then(d => d.positions ?? []),
    refetchInterval: 15_000,
  });

  const open = positions.filter(p => p.is_open);
  let unrealizedPnl = 0, totalPnl = 0;
  positions.forEach(p => {
    const n = parseFloat(p.pnl);
    if (Number.isFinite(n)) { totalPnl += n; if (p.is_open) unrealizedPnl += n; }
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-5">

        {/* ── Summary bar ── */}
        <div className="grid grid-cols-3 border border-border rounded-2xl overflow-hidden shadow-sm bg-card">
          <div className="px-5 py-4 border-r border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">Open Positions</p>
            <p className="text-xl font-semibold">{isLoading ? "—" : open.length}</p>
          </div>
          <div className="px-5 py-4 border-r border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">Unrealized P&L</p>
            <p className={cn("text-xl font-semibold font-mono", unrealizedPnl >= 0 ? "text-positive" : "text-negative")}>
              {isLoading ? "—" : fmtPnl(unrealizedPnl)}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">All-time P&L</p>
            <p className={cn("text-xl font-semibold font-mono", totalPnl >= 0 ? "text-positive" : "text-negative")}>
              {isLoading ? "—" : fmtPnl(totalPnl)}
            </p>
          </div>
        </div>

        {/* ── Table ── */}
        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl flex items-center justify-center py-24">
            <p className="text-muted-foreground text-sm animate-pulse">Loading agent positions…</p>
          </div>
        ) : positions.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center py-24 gap-2">
            <p className="text-muted-foreground text-sm">No positions yet</p>
            <p className="text-xs text-muted-foreground">Agent will open positions automatically when signals are strong</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <span className="text-sm font-semibold">Agent Positions</span>
              <span className="text-xs text-muted-foreground">{positions.length} total · {open.length} open</span>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Direction", "Size", "Leverage", "Entry", "Exit", "PnL", "Status", "Time"].map((h, i) => (
                      <th key={h} className={cn("text-[10px] text-muted-foreground uppercase tracking-widest font-medium px-5 py-2.5 text-left", i >= 5 && "text-right")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const pnl = parseFloat(p.pnl);
                    const pnlPos = pnl >= 0;
                    return (
                      <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-accent/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md", p.direction === "long" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative")}>
                            {p.direction === "long" ? "↑ Long" : "↓ Short"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">{fmtSize(p)}</td>
                        <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">{p.leverage}×</td>
                        <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">{fmtPrice(p.entry_price)}</td>
                        <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">{p.exit_price ? fmtPrice(p.exit_price) : "—"}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={cn("text-sm font-mono font-medium", pnlPos ? "text-positive" : "text-negative")}>
                            {Number.isFinite(pnl) ? fmtPnl(pnl) : p.pnl || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md", p.is_open ? "bg-positive/10 text-positive" : "bg-muted text-muted-foreground")}>
                            {p.is_open ? "Open" : "Closed"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs font-mono text-muted-foreground">{fmtTime(p.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {positions.map((p) => {
                const pnl = parseFloat(p.pnl);
                const pnlPos = pnl >= 0;
                return (
                  <div key={p.id} className="px-4 py-3.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md", p.direction === "long" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative")}>
                        {p.direction === "long" ? "↑ Long" : "↓ Short"}
                      </span>
                      <span className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md", p.is_open ? "bg-positive/10 text-positive" : "bg-muted text-muted-foreground")}>
                        {p.is_open ? "Open" : "Closed"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">@ {fmtPrice(p.entry_price)} · {p.leverage}× · {fmtSize(p)}</span>
                      <span className={cn("font-mono font-medium", pnlPos ? "text-positive" : "text-negative")}>
                        {Number.isFinite(pnl) ? fmtPnl(pnl) : p.pnl || "—"}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{fmtTime(p.created_at)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
