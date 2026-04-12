"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DECISION_LOGS = [
  {
    id: 1,
    time: "14:32:06",
    date: "Apr 12",
    action: "LONG",
    pair: "ETH-PERP",
    hash: "0x3a7f...c2b1",
    storageRoot: "0xf4e2...1a9c",
    txHash: "0x7f2a...3e1b",
    signals: { macro: 72, micro: 51, technical: 84 },
    reasoning: "Strong bullish momentum confirmed by technical indicators. RSI at 32 indicating oversold, MACD crossover positive. Macro: Fed rate hold reduces risk-off pressure.",
    action_type: "open",
  },
  {
    id: 2,
    time: "14:27:04",
    date: "Apr 12",
    action: "HOLD",
    pair: "—",
    hash: "0x8b1c...d4e7",
    storageRoot: "0xa3c1...7f2e",
    txHash: null,
    signals: { macro: 51, micro: 48, technical: 55 },
    reasoning: "Mixed signals across all sources. Insufficient conviction to open new position. Monitoring for clearer directional signal.",
    action_type: "hold",
  },
  {
    id: 3,
    time: "13:58:22",
    date: "Apr 12",
    action: "SHORT",
    pair: "BTC-PERP",
    hash: "0x2d9a...8e3f",
    storageRoot: "0xb7f3...2d1a",
    txHash: "0x3c1b...9a4f",
    signals: { macro: 38, micro: 29, technical: 42 },
    reasoning: "BTC whale movement of 2,400 BTC to exchange wallets — historically bearish signal. Macro sentiment negative following SEC news. Technical: price at upper Bollinger band.",
    action_type: "open",
  },
];

const ACTION_CONFIG = {
  LONG:  { className: "bg-[#0f2a1e] text-[#34d399] border-[#064e3b]" },
  SHORT: { className: "bg-[#2a1515] text-[#f87171] border-[#7f1d1d]" },
  HOLD:  { className: "bg-[#1a1f2e] text-[#94a3b8] border-[#2d3748]" },
} as const;

export function LogsUI() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-3 max-w-5xl">

        {/* Header info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              Every decision is hashed on-chain via{" "}
              <span className="text-[#60a5fa]">DecisionLog.sol</span>
              {" "}and stored in{" "}
              <span className="text-[#60a5fa]">0G Storage</span>.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
            <span className="text-[10px] text-[#34d399]">Verifiable</span>
          </div>
        </div>

        {/* Log entries */}
        <div className="flex flex-col gap-2">
          {DECISION_LOGS.map((log) => {
            const actionCfg = ACTION_CONFIG[log.action as keyof typeof ACTION_CONFIG];
            return (
              <Card key={log.id} className="bg-card border-border rounded-lg">
                <CardHeader className="p-3 pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] px-2 py-0.5 rounded-full font-medium border", actionCfg.className)}
                      >
                        {log.action}
                      </Badge>
                      {log.pair !== "—" && (
                        <span className="text-xs font-medium text-foreground">{log.pair}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{log.date} · {log.time}</span>
                    </div>
                    {log.txHash && (
                      <span className="text-[10px] text-[#60a5fa] font-mono">Tx {log.txHash} ↗</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3 flex flex-col gap-2.5">

                  {/* Signals mini */}
                  <div className="flex gap-4">
                    {[
                      { label: "Macro", value: log.signals.macro, color: log.signals.macro > 60 ? "#34d399" : log.signals.macro > 40 ? "#fbbf24" : "#f87171" },
                      { label: "Micro", value: log.signals.micro, color: log.signals.micro > 60 ? "#34d399" : log.signals.micro > 40 ? "#fbbf24" : "#f87171" },
                      { label: "Technical", value: log.signals.technical, color: log.signals.technical > 60 ? "#34d399" : log.signals.technical > 40 ? "#fbbf24" : "#f87171" },
                    ].map((sig) => (
                      <div key={sig.label} className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">{sig.label}</span>
                        <span className="text-[10px] font-medium" style={{ color: sig.color }}>{sig.value}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Reasoning */}
                  <p className="text-[11px] text-foreground/70 leading-relaxed bg-[#080a0f] rounded px-3 py-2">
                    {log.reasoning}
                  </p>

                  {/* On-chain proofs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-secondary rounded px-3 py-2">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">Decision Hash</p>
                      <p className="text-[10px] font-mono text-[#60a5fa]">{log.hash}</p>
                    </div>
                    <div className="bg-secondary rounded px-3 py-2">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">0G Storage Root</p>
                      <p className="text-[10px] font-mono text-[#60a5fa]">{log.storageRoot}</p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>

      </div>
    </AppLayout>
  );
}
