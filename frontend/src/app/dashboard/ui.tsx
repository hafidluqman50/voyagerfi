"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

function MetricCard({ label, value, sub, valueClass }: MetricCardProps) {
  return (
    <Card className="bg-card border-border rounded-lg p-3 gap-0">
      <CardContent className="p-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
        <p className={cn("text-lg font-medium text-foreground", valueClass)}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

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
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] w-7 text-right shrink-0" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

const TRADE_HISTORY = [
  { pair: "ETH-PERP", side: "long", time: "14:32", pnl: "+$84.20", pos: true },
  { pair: "BTC-PERP", side: "short", time: "13:58", pnl: "+$32.10", pos: true },
  { pair: "ETH-PERP", side: "long", time: "13:21", pnl: "-$18.40", pos: false },
];

const NEWS_ITEMS = [
  { title: "Fed signals rate hold, crypto reacts positively", source: "Reuters · 2m", sentiment: "bull" },
  { title: "ETH staking yield hits 4.2% amid validator surge", source: "CoinDesk · 8m", sentiment: "bull" },
  { title: "SEC delays decision on spot ETH ETF options", source: "The Block · 15m", sentiment: "neut" },
  { title: "BTC whale moves 2,400 BTC to exchange wallets", source: "Glassnode · 22m", sentiment: "bear" },
];

const SENTIMENT_CONFIG = {
  bull: { label: "Bullish", className: "bg-[#0f2a1e] text-[#34d399] border-[#064e3b]" },
  neut: { label: "Neutral", className: "bg-[#1a1f2e] text-[#94a3b8] border-[#2d3748]" },
  bear: { label: "Bearish", className: "bg-[#2a1515] text-[#f87171] border-[#7f1d1d]" },
} as const;

interface DashboardUIProps {
  address?: string;
}

export function DashboardUI({ address }: DashboardUIProps) {
  return (
    <AppLayout>
      <div className="flex flex-col gap-3 max-w-6xl">

        {/* Metric cards */}
        <div className="grid grid-cols-4 gap-2">
          <MetricCard label="Portfolio" value="12,480 0G" sub="+2.4% today" />
          <MetricCard label="Total PnL" value="+1,240 0G" sub="Since inception" valueClass="text-[#34d399]" />
          <MetricCard label="Win Rate" value="68%" sub="30 trades" />
          <MetricCard label="Uptime" value="14h 32m" sub="Continuous" />
        </div>

        {/* Chart row */}
        <div className="grid grid-cols-[1fr_220px] gap-2">
          {/* Price chart placeholder */}
          <Card className="bg-card border-border rounded-lg">
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">ETH-PERP</CardTitle>
                <div className="flex gap-1">
                  {["1H", "4H", "1D"].map((tf, i) => (
                    <button
                      key={tf}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded",
                        i === 0
                          ? "bg-[#1e3a5f] text-[#60a5fa]"
                          : "text-muted-foreground"
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="h-[120px] bg-[#080a0f] rounded flex items-center justify-center">
                <ChartPlaceholder />
              </div>
            </CardContent>
          </Card>

          {/* Agent status card */}
          <Card className="bg-card border-border rounded-lg">
            <CardContent className="p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
                  <span className="text-xs text-[#34d399]">Running</span>
                </div>
                <span className="text-[10px] text-[#60a5fa] cursor-pointer">Detail ↗</span>
              </div>

              <div className="flex flex-col gap-1">
                {[
                  { label: "Last action", value: "LONG ETH · 2m", valueClass: "text-[#34d399]" },
                  { label: "Next cycle", value: "3m 12s", valueClass: "text-foreground" },
                  { label: "TEE", value: "Verified", valueClass: "text-[#34d399]" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center bg-secondary rounded px-2 py-1.5">
                    <span className="text-[11px] text-muted-foreground">{row.label}</span>
                    <span className={cn("text-[11px] font-medium", row.valueClass)}>{row.value}</span>
                  </div>
                ))}
              </div>

              <Separator className="bg-border" />

              <div className="flex flex-col gap-1.5">
                <SignalBar label="Macro" value={72} color="#34d399" />
                <SignalBar label="Micro" value={51} color="#fbbf24" />
                <SignalBar label="Technical" value={84} color="#3b82f6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Recent trades */}
          <Card className="bg-card border-border rounded-lg">
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Recent Trades</CardTitle>
                <span className="text-[10px] text-[#34d399]">+1,240 0G</span>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex flex-col gap-0">
              {TRADE_HISTORY.map((trade, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-foreground">{trade.pair}</span>
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full",
                        trade.side === "long"
                          ? "bg-[#0f2a1e] text-[#34d399]"
                          : "bg-[#2a1515] text-[#f87171]"
                      )}
                    >
                      {trade.side.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">{trade.time}</span>
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        trade.pos ? "text-[#34d399]" : "text-[#f87171]"
                      )}
                    >
                      {trade.pnl}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* News feed */}
          <Card className="bg-card border-border rounded-lg">
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">News Feed</CardTitle>
                <span className="text-[10px] text-muted-foreground">Live</span>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex flex-col gap-0">
              {NEWS_ITEMS.map((item, i) => {
                const cfg = SENTIMENT_CONFIG[item.sentiment as keyof typeof SENTIMENT_CONFIG];
                return (
                  <div
                    key={i}
                    className="py-2 border-b border-border last:border-0"
                  >
                    <p className="text-[11px] text-foreground/80 leading-snug mb-1">{item.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{item.source}</span>
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] px-1.5 py-0 rounded-full font-medium border", cfg.className)}
                      >
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {!address && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Connect wallet to see your portfolio data
          </p>
        )}
      </div>
    </AppLayout>
  );
}

function ChartPlaceholder() {
  const points = [18, 15, 16, 10, 12, 6, 4, 8, 5, 3, 7, 2];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 100;
  const h = 100;
  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <polyline
        points={coords}
        fill="none"
        stroke="#34d399"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
