"use client";

import { useAccount } from "wagmi";
import { AppLayout } from "@/components/layout/app-layout";
import { usePositions } from "@/hooks/usePositions";
import { cn } from "@/lib/utils";
import type { Position } from "@/lib/types";

function fmtPrice(s: string): string {
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return s || "—";
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function fmtSize(p: Position): string {
  const size = parseFloat(p.size);
  if (!Number.isFinite(size)) return p.size || "—";
  return `${size.toFixed(4)}`;
}

function calcSummary(positions: Position[]) {
  const open = positions.filter((p) => p.is_open);
  let unrealizedPnl = 0;
  let totalPnl = 0;
  positions.forEach((p) => {
    const pnl = parseFloat(p.pnl);
    if (Number.isFinite(pnl)) {
      totalPnl += pnl;
      if (p.is_open) unrealizedPnl += pnl;
    }
  });
  return { openCount: open.length, unrealizedPnl, totalPnl };
}

function fmtPnl(n: number): string {
  const prefix = n >= 0 ? "+" : "";
  return `${prefix}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

export function PositionsUI() {
  const { address } = useAccount();
  const { data: positions = [], isLoading } = usePositions(address);

  const { openCount, unrealizedPnl, totalPnl } = calcSummary(positions);

  return (
    <AppLayout>
      <div className="flex flex-col gap-5">

        {/* ── Summary bar ── */}
        <div className="grid grid-cols-3 border border-border rounded-2xl overflow-hidden shadow-sm bg-card">
          <div className="px-5 py-4 border-r border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">Open Positions</p>
            <p className="text-xl font-semibold">{address ? openCount : "—"}</p>
          </div>
          <div className="px-5 py-4 border-r border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">Unrealized P&L</p>
            <p className={cn(
              "text-xl font-semibold font-mono",
              unrealizedPnl >= 0 ? "text-positive" : "text-negative"
            )}>
              {address ? fmtPnl(unrealizedPnl) : "—"}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">All-time P&L</p>
            <p className={cn(
              "text-xl font-semibold font-mono",
              totalPnl >= 0 ? "text-positive" : "text-negative"
            )}>
              {address ? fmtPnl(totalPnl) : "—"}
            </p>
          </div>
        </div>

        {/* ── Table ── */}
        {!address ? (
          <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center py-24 gap-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-muted-foreground text-sm">Connect your wallet to view positions</p>
          </div>
        ) : isLoading ? (
          <div className="bg-card border border-border rounded-2xl flex items-center justify-center py-24">
            <p className="text-muted-foreground text-sm animate-pulse">Loading positions…</p>
          </div>
        ) : positions.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center py-24 gap-2">
            <p className="text-muted-foreground text-sm">No positions found for this wallet</p>
            <p className="text-xs text-muted-foreground">The agent will open positions automatically when signals are strong</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <span className="text-sm font-semibold">All Positions</span>
              <span className="text-xs text-muted-foreground">{positions.length} total · {openCount} open</span>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Direction", "Size", "Leverage", "Entry", "PnL", "Status", "Time"].map((h, i) => (
                      <th
                        key={h}
                        className={cn(
                          "text-[10px] text-muted-foreground uppercase tracking-widest font-medium px-5 py-2.5 text-left",
                          i >= 4 && "text-right"
                        )}
                      >
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
                          <span className={cn(
                            "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md",
                            p.direction === "long"
                              ? "bg-positive/10 text-positive"
                              : "bg-negative/10 text-negative"
                          )}>
                            {p.direction === "long" ? "↑ Long" : "↓ Short"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">{fmtSize(p)}</td>
                        <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">{p.leverage}×</td>
                        <td className="px-5 py-3.5 text-sm font-mono text-muted-foreground">{fmtPrice(p.entry_price)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={cn("text-sm font-mono font-medium", pnlPos ? "text-positive" : "text-negative")}>
                            {Number.isFinite(pnl) ? fmtPnl(pnl) : p.pnl || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={cn(
                            "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md",
                            p.is_open
                              ? "bg-positive/10 text-positive"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {p.is_open ? "Open" : "Closed"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs font-mono text-muted-foreground">
                          {fmtTime(p.created_at)}
                        </td>
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
                      <span className={cn(
                        "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md",
                        p.direction === "long"
                          ? "bg-positive/10 text-positive"
                          : "bg-negative/10 text-negative"
                      )}>
                        {p.direction === "long" ? "↑ Long" : "↓ Short"}
                      </span>
                      <span className={cn(
                        "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md",
                        p.is_open ? "bg-positive/10 text-positive" : "bg-muted text-muted-foreground"
                      )}>
                        {p.is_open ? "Open" : "Closed"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Entry {fmtPrice(p.entry_price)} · {p.leverage}× · {fmtSize(p)}</span>
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
