"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function SignalRow({ label, value, variant }: { label: string; value: number; variant: "up" | "neutral" | "down" }) {
  const trackColor = variant === "up" ? "bg-up" : variant === "down" ? "bg-down" : "bg-neutral";
  const textColor  = variant === "up" ? "text-up" : variant === "down" ? "text-down" : "text-neutral";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", trackColor)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn("text-sm tabular-nums w-10 text-right shrink-0", textColor)}>{value}%</span>
    </div>
  );
}

const LOG_LINES = [
  { time: "14:32:01", msg: "Fetching macro news...",        color: "text-primary"        },
  { time: "14:32:03", msg: "0G inference · 312 tokens",    color: "text-primary"        },
  { time: "14:32:04", msg: "Signal: LONG ETH · 84%",       color: "text-up"             },
  { time: "14:32:05", msg: "Risk check passed",             color: "text-muted-foreground" },
  { time: "14:32:06", msg: "Tx sent · 0x7f2a...3e1b",      color: "text-up"             },
  { time: "14:27:01", msg: "Fetching micro news...",        color: "text-primary"        },
  { time: "14:27:04", msg: "Signal: HOLD · 51%",           color: "text-muted-foreground" },
  { time: "14:22:01", msg: "Fetching macro news...",        color: "text-primary"        },
  { time: "14:22:04", msg: "Signal: SHORT BTC · 71%",      color: "text-down"           },
  { time: "14:22:05", msg: "Risk check passed",             color: "text-muted-foreground" },
  { time: "14:22:06", msg: "Tx sent · 0x3c1b...9a4f",      color: "text-up"             },
];

const EXEC_HISTORY = [
  { badge: "Long",    type: "up",      pair: "ETH-PERP", detail: "0.15 ETH @ $3,265 · 84% bull",  time: "14:32", pnl: "+$84.20", pos: true  },
  { badge: "Analyze", type: "neutral", pair: "—",         detail: "51% neutral · no trade",          time: "14:27", pnl: "—",       pos: null  },
  { badge: "Short",   type: "down",    pair: "BTC-PERP", detail: "0.008 BTC @ $67,420 · 71% bear", time: "13:58", pnl: "+$32.10", pos: true  },
  { badge: "Long",    type: "up",      pair: "ETH-PERP", detail: "0.12 ETH @ $3,210 · 76% bull",  time: "13:21", pnl: "−$18.40", pos: false },
];

export function AgentUI() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-5 max-w-7xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5 border-transparent bg-up-muted text-up px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
              Running
            </Badge>
            <span className="text-sm text-muted-foreground">14h 32m uptime</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground hover:bg-accent">
              Pause
            </Button>
            <Button variant="outline" size="sm" className="border-down/40 text-down hover:bg-down-muted hover:border-down/60">
              Stop
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Force Analyze
            </Button>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-2 gap-4">

          {/* Parameters */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Parameters</CardTitle>
                <button className="text-xs text-primary hover:underline">Edit</button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-0 pb-0">
              <Table>
                <TableBody>
                  {[
                    { label: "AI Model",      value: "DeepSeek v3 · 0G Compute" },
                    { label: "Interval",      value: "30s"                       },
                    { label: "Max position",  value: "10% balance"               },
                    { label: "Risk level",    value: "Medium"                    },
                    { label: "Stop loss",     value: "5%"                        },
                    { label: "Max leverage",  value: "10×"                       },
                    { label: "TEE",           value: "Verified", special: "up"   },
                  ].map((r) => (
                    <TableRow key={r.label} className="border-border hover:bg-accent/40">
                      <TableCell className="text-sm text-muted-foreground">{r.label}</TableCell>
                      <TableCell className={cn("text-sm font-medium text-right", r.special === "up" ? "text-up" : "text-foreground")}>
                        {r.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Signals + live log */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Current Signals</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2.5">
                <SignalRow label="Macro"     value={72} variant="up"      />
                <SignalRow label="Micro"     value={51} variant="neutral" />
                <SignalRow label="Technical" value={84} variant="up"      />
              </div>

              <div className="h-px bg-border" />

              <div>
                <p className="text-xs text-muted-foreground mb-2.5">Live Log</p>
                <ScrollArea className="h-[160px] rounded-md bg-secondary">
                  <div className="p-3 flex flex-col gap-1.5 font-mono">
                    {LOG_LINES.map((line, i) => (
                      <p key={i} className="text-xs">
                        <span className="text-muted-foreground">[{line.time}]</span>{" "}
                        <span className={line.color}>{line.msg}</span>
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Execution history */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Execution History</CardTitle>
              <span className="text-xs text-muted-foreground">All agent actions</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Pair</TableHead>
                  <TableHead className="text-xs">Detail</TableHead>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs text-right">PnL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EXEC_HISTORY.map((r, i) => (
                  <TableRow key={i} className="border-border hover:bg-accent/40">
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs border-transparent",
                          r.type === "up"      && "bg-up-muted text-up",
                          r.type === "down"    && "bg-down-muted text-down",
                          r.type === "neutral" && "bg-accent text-neutral",
                        )}
                      >
                        {r.badge}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{r.pair}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.detail}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.time}</TableCell>
                    <TableCell className={cn("text-sm font-medium text-right tabular-nums", r.pos === true ? "text-up" : r.pos === false ? "text-down" : "text-muted-foreground")}>
                      {r.pnl}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
