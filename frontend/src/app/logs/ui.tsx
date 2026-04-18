"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { useDecisions } from "@/hooks/useDecisions";
import { useAgentWebSocket } from "@/hooks/useAgentWebSocket";
import { cn } from "@/lib/utils";
import type { Decision } from "@/lib/types";

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

function shortHash(h: string): string {
  if (!h || h.length < 12) return h || "—";
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

function actionLabel(action: string): { label: string; style: string } {
  switch (action) {
    case "open_long":  return { label: "Long",  style: "border-positive/30 text-positive bg-positive/5"   };
    case "open_short": return { label: "Short", style: "border-negative/30 text-negative bg-negative/5"   };
    case "close":      return { label: "Close", style: "border-primary/30 text-primary bg-primary/5"      };
    case "hold":
    default:           return { label: "Hold",  style: "border-border text-muted-foreground"               };
  }
}

function DecisionCard({ d }: { d: Decision }) {
  const { label, style } = actionLabel(d.action);
  const explorerBase = "https://chainscan.0g.ai/tx/";

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
      <div className="flex flex-col gap-4">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn(
              "inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-md border",
              style
            )}>
              {label}
            </span>
            <span className="text-sm text-muted-foreground">{fmtTime(d.created_at)}</span>
          </div>
          {d.tx_hash && (
            <a
              href={`${explorerBase}${d.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors shrink-0"
            >
              {shortHash(d.tx_hash)} ↗
            </a>
          )}
        </div>

        {/* Reasoning */}
        {d.reasoning && (
          <p className="text-sm text-muted-foreground leading-relaxed">{d.reasoning}</p>
        )}

        {/* Hash footer */}
        <div className="flex flex-col sm:flex-row gap-x-8 gap-y-1.5 pt-3 border-t border-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">Decision Hash</span>
            <span className="text-[11px] font-mono text-muted-foreground/70 truncate">
              {d.decision_hash || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">Storage Root</span>
            <span className="text-[11px] font-mono text-muted-foreground/70 truncate">
              {d.storage_root || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LogsUI() {
  const { data: decisions = [], isLoading } = useDecisions(50);
  const { connected, lastTick } = useAgentWebSocket();

  return (
    <AppLayout>
      <div className="flex flex-col gap-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Decision Logs</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Every decision is hashed on-chain and stored on 0G Storage for verification.
            </p>
          </div>
          <div className="flex flex-row sm:flex-col sm:items-end items-center gap-2 sm:gap-1 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                connected ? "bg-positive animate-pulse-dot" : "bg-muted-foreground"
              )} />
              <span className="text-xs text-muted-foreground">
                {connected ? "Agent live" : "Offline"}
              </span>
            </div>
            {lastTick && (
              <span className="text-[10px] font-mono text-muted-foreground">
                Last: {lastTick.action} · strength {(lastTick.strength * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 border border-border rounded-2xl overflow-hidden bg-card">
          <div className="px-5 py-4 border-r border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1">Total Decisions</p>
            <p className="text-xl font-semibold">{decisions.length}</p>
          </div>
          <div className="px-5 py-4 border-r border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1">Trades Executed</p>
            <p className="text-xl font-semibold text-primary">
              {decisions.filter((d) => d.action !== "hold").length}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1">Verified On-chain</p>
            <p className="text-xl font-semibold text-positive">
              {decisions.filter((d) => !!d.tx_hash).length}
            </p>
          </div>
        </div>

        {/* Decision list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground text-sm animate-pulse">Loading decisions…</p>
          </div>
        ) : decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 bg-card border border-border rounded-2xl">
            <p className="text-muted-foreground text-sm">No decisions yet</p>
            <p className="text-xs text-muted-foreground">Agent will log decisions here as it runs</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {decisions.map((d) => (
              <DecisionCard key={d.id} d={d} />
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
