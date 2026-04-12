"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-5 pb-5">
        <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
        <p className={cn("text-2xl font-semibold tracking-tight", valueClassName ?? "text-foreground")}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Signal Bar ───────────────────────────────────────────────────────────────

function SignalRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "up" | "neutral" | "down";
}) {
  const trackColor =
    variant === "up" ? "bg-up" : variant === "down" ? "bg-down" : "bg-neutral";
  const textColor =
    variant === "up" ? "text-up" : variant === "down" ? "text-down" : "text-neutral";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", trackColor)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn("text-sm tabular-nums w-10 text-right shrink-0", textColor)}>
        {value}%
      </span>
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - ((p - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <polyline
        points={coords}
        fill="none"
        stroke={up ? "var(--up)" : "var(--down)"}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const TRADES = [
  { pair: "ETH-PERP", side: "Long",  size: "0.15 ETH", entry: "$3,265", pnl: "+$84.20",  pos: true  },
  { pair: "BTC-PERP", side: "Short", size: "0.008 BTC", entry: "$67,420", pnl: "+$32.10", pos: true  },
  { pair: "ETH-PERP", side: "Long",  size: "0.12 ETH", entry: "$3,210", pnl: "−$18.40",  pos: false },
];

const NEWS = [
  { title: "Fed signals rate hold, crypto reacts positively",      source: "Reuters",   ago: "2m",  sentiment: "Bullish" as const },
  { title: "ETH staking yield hits 4.2% amid validator surge",     source: "CoinDesk",  ago: "8m",  sentiment: "Bullish" as const },
  { title: "SEC delays decision on spot ETH ETF options",           source: "The Block", ago: "15m", sentiment: "Neutral" as const },
  { title: "BTC whale moves 2,400 BTC to exchange wallets",        source: "Glassnode", ago: "22m", sentiment: "Bearish" as const },
];

const PRICE_POINTS = [42, 45, 41, 47, 44, 50, 46, 53, 49, 55, 51, 58, 54, 61];

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardUI({ address }: { address?: string }) {
  return (
    <AppLayout>
      <div className="flex flex-col gap-5 max-w-7xl">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Portfolio Value"  value="1,300 0G"   sub="≈ $6,266 USD"          />
          <StatCard label="Total PnL"        value="+97.90 0G"  sub="Since inception" valueClassName="text-up" />
          <StatCard label="Win Rate"         value="68%"        sub="30 completed trades"   />
          <StatCard label="Agent Uptime"     value="14h 32m"    sub="Continuous"            />
        </div>

        {/* Chart + Agent status */}
        <div className="grid grid-cols-[1fr_280px] gap-4">

          {/* Chart card */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">ETH-PERP</CardTitle>
                  <p className="text-2xl font-bold tracking-tight mt-1">
                    $3,265 <span className="text-sm font-normal text-up">+3.1%</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {["1H","4H","1D"].map((t, i) => (
                    <button
                      key={t}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-md transition-colors",
                        i === 0
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-40 w-full">
                <Sparkline points={PRICE_POINTS} up />
              </div>
            </CardContent>
          </Card>

          {/* Agent status card */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="gap-1.5 border-transparent bg-up-muted text-up px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
                  Running
                </Badge>
                <span className="text-xs text-muted-foreground">→ Agent</span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">

              {/* Quick info */}
              <div className="flex flex-col gap-2">
                {[
                  { label: "Last action", value: "Long ETH",  className: "text-up"        },
                  { label: "Next cycle",  value: "in 3m 12s", className: "text-foreground" },
                  { label: "TEE",         value: "Verified",  className: "text-up"        },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className={cn("text-sm font-medium", r.className)}>{r.value}</span>
                  </div>
                ))}
              </div>

              <div className="h-px bg-border" />

              {/* Signal bars */}
              <div className="flex flex-col gap-2.5">
                <p className="text-xs text-muted-foreground">Current signals</p>
                <SignalRow label="Macro"     value={72} variant="up"      />
                <SignalRow label="Micro"     value={51} variant="neutral" />
                <SignalRow label="Technical" value={84} variant="up"      />
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Trades + News */}
        <div className="grid grid-cols-2 gap-4">

          {/* Recent trades */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="text-xs">Pair</TableHead>
                    <TableHead className="text-xs">Side</TableHead>
                    <TableHead className="text-xs">Size</TableHead>
                    <TableHead className="text-xs text-right">PnL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TRADES.map((t, i) => (
                    <TableRow key={i} className="border-border hover:bg-accent/40">
                      <TableCell className="font-medium text-sm">{t.pair}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs border-transparent",
                            t.side === "Long"
                              ? "bg-up-muted text-up"
                              : "bg-down-muted text-down"
                          )}
                        >
                          {t.side}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.size}</TableCell>
                      <TableCell className={cn("text-sm text-right font-medium tabular-nums", t.pos ? "text-up" : "text-down")}>
                        {t.pnl}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* News */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">News Feed</CardTitle>
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-0">
              {NEWS.map((item, i) => (
                <div key={i} className="py-3 border-b border-border last:border-0">
                  <p className="text-sm text-foreground/90 leading-snug mb-2">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{item.source} · {item.ago}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs border-transparent",
                        item.sentiment === "Bullish" && "bg-up-muted text-up",
                        item.sentiment === "Bearish" && "bg-down-muted text-down",
                        item.sentiment === "Neutral" && "bg-accent text-neutral",
                      )}
                    >
                      {item.sentiment}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

        {!address && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Connect your wallet to view live portfolio data
          </p>
        )}
      </div>
    </AppLayout>
  );
}
