"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SignalBarProps {
  label: string;
  value: number;
  color: string;
}

function SignalBar({ label, value, color }: SignalBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-[3px] bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] w-7 text-right shrink-0" style={{ color }}>{value}%</span>
    </div>
  );
}

const EXEC_HISTORY = [
  {
    badge: "LONG",
    type: "buy",
    title: "ETH-PERP — 0.15 ETH @ $3,265",
    detail: "Signal: 84% bull · Macro+Technical · Tx 0x7f2a...3e1b · 14:32:06",
    pnl: "+$84.20",
    pos: true,
  },
  {
    badge: "ANALYZE",
    type: "analyze",
    title: "Market scan — no trade",
    detail: "Signal: 51% neutral · Micro only · 14:27:04",
    pnl: "—",
    pos: null,
  },
  {
    badge: "SHORT",
    type: "sell",
    title: "BTC-PERP — 0.008 BTC @ $67,420",
    detail: "Signal: 71% bear · Macro+Micro · Tx 0x3c1b...9a4f · 13:58:22",
    pnl: "+$32.10",
    pos: true,
  },
  {
    badge: "LONG",
    type: "buy",
    title: "ETH-PERP — 0.12 ETH @ $3,210",
    detail: "Signal: 76% bull · All signals · Tx 0x9d3e...2c7a · 13:21:44",
    pnl: "-$18.40",
    pos: false,
  },
];

const BADGE_CONFIG = {
  buy:     "bg-[#0f2a1e] text-[#34d399]",
  sell:    "bg-[#2a1515] text-[#f87171]",
  analyze: "bg-[#1a1f2e] text-[#94a3b8]",
} as const;

const LOG_LINES = [
  { time: "14:32:01", msg: "Fetching macro news...", color: "#60a5fa" },
  { time: "14:32:03", msg: "0G inference · 312 tokens", color: "#60a5fa" },
  { time: "14:32:04", msg: "Signal: LONG ETH · 84%", color: "#34d399" },
  { time: "14:32:05", msg: "Risk check passed", color: "#fbbf24" },
  { time: "14:32:06", msg: "Tx sent · 0x7f2a...3e1b", color: "#34d399" },
  { time: "14:27:01", msg: "Fetching micro news...", color: "#60a5fa" },
  { time: "14:27:04", msg: "Signal: HOLD · 51%", color: "#fbbf24" },
];

export function AgentUI() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-3 max-w-6xl">

        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
              <span className="text-xs text-[#34d399]">Running</span>
            </div>
            <span className="text-xs text-muted-foreground">14h 32m uptime</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 px-3 text-xs bg-[#2a1515] hover:bg-[#2a1515]/80 text-[#f87171] border border-[#7f1d1d] rounded-md"
            >
              Stop
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs border-border bg-secondary hover:bg-accent text-muted-foreground rounded-md"
            >
              Pause
            </Button>
            <Button
              size="sm"
              className="h-8 px-3 text-xs bg-[#1e3a5f] hover:bg-[#1e3a5f]/80 text-[#60a5fa] border border-[#1d4ed8] rounded-md"
            >
              Force Analyze
            </Button>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Parameters */}
          <Card className="bg-card border-border rounded-lg">
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Parameters</CardTitle>
                <span className="text-[10px] text-[#60a5fa] cursor-pointer">Edit</span>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex flex-col gap-1.5">
              {[
                { label: "Model", value: "DeepSeek v3 · 0G Compute" },
                { label: "Interval", value: "30s", editable: true },
                { label: "Max position", value: "10% balance", editable: true },
                { label: "Risk level", value: "Medium", editable: true },
                { label: "Stop loss", value: "5%", editable: true },
                { label: "Max leverage", value: "10×", editable: true },
                { label: "TEE verified", value: "Active", valueClass: "text-[#34d399]" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center bg-secondary rounded px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">{row.label}</span>
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      row.editable ? "text-[#60a5fa] border-b border-dashed border-[#1d4ed8]" : "text-foreground",
                      row.valueClass
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Signals + Live log */}
          <Card className="bg-card border-border rounded-lg">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Current Signals</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <SignalBar label="Macro" value={72} color="#34d399" />
                <SignalBar label="Micro" value={51} color="#fbbf24" />
                <SignalBar label="Technical" value={84} color="#3b82f6" />
              </div>

              <Separator className="bg-border" />

              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Live Log</p>
                <ScrollArea className="h-[140px]">
                  <div className="bg-[#080a0f] rounded p-2 flex flex-col gap-1 font-mono">
                    {LOG_LINES.map((line, i) => (
                      <div key={i} className="text-[10px] text-[#475569]">
                        [{line.time}]{" "}
                        <span style={{ color: line.color }}>{line.msg}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Execution history */}
        <Card className="bg-card border-border rounded-lg">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Execution History</CardTitle>
              <span className="text-[10px] text-muted-foreground">All agent actions</span>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 flex flex-col gap-0">
            {EXEC_HISTORY.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-2.5 border-b border-border last:border-0"
              >
                <span
                  className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full shrink-0 mt-0.5",
                    BADGE_CONFIG[item.type as keyof typeof BADGE_CONFIG]
                  )}
                >
                  {item.badge}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.detail}</p>
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium shrink-0",
                    item.pos === true ? "text-[#34d399]" : item.pos === false ? "text-[#f87171]" : "text-muted-foreground"
                  )}
                >
                  {item.pnl}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
