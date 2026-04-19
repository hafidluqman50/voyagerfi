"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { RealtimeCandleChart, type ChartInterval } from "@/components/charts/price-chart";
import { useTicker24h } from "@/hooks/useTicker24h";
import { useFundingRate } from "@/hooks/useFundingRate";
import { cn } from "@/lib/utils";
import { fmtPrice, fmtCompact } from "@/lib/format";
import type { BinanceSymbol } from "@/hooks/useKlines";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const PAIR_META: Record<string, { ticker: BinanceSymbol; label: string }> = {
  "ETH-USD": { ticker: "ETHUSDT", label: "Ethereum" },
  "BTC-USD": { ticker: "BTCUSDT", label: "Bitcoin"  },
  "SOL-USD": { ticker: "SOLUSDT", label: "Solana"   },
  "ARB-USD": { ticker: "ARBUSDT", label: "Arbitrum" },
  "BNB-USD": { ticker: "BNBUSDT", label: "BNB"      },
};

/* label shown → Binance interval string */
const TIMEFRAMES: { label: string; interval: ChartInterval }[] = [
  { label: "1m",  interval: "1m"  },
  { label: "5m",  interval: "5m"  },
  { label: "15m", interval: "15m" },
  { label: "1H",  interval: "1h"  },
  { label: "4H",  interval: "4h"  },
  { label: "1D",  interval: "1d"  },
];

function fmtFundingCountdown(nextFundingTime: number): string {
  const now = Date.now();
  const diff = nextFundingTime - now;
  if (diff <= 0) return "—";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── Agent Activity Panel ── */
function AgentPanel({ pair }: { pair: string }) {
  const symbol = pair.replace("-", "/"); // "BTC-USD" → "BTC/USD"

  const { data: status } = useQuery({
    queryKey: ["agent-status"],
    queryFn: () => fetch(`${API}/agent/status`).then(r => r.json()),
    refetchInterval: 10_000,
  });

  const { data: decisions } = useQuery({
    queryKey: ["decisions"],
    queryFn: () => fetch(`${API}/decisions`).then(r => r.json()),
    refetchInterval: 10_000,
    select: (d: any) => (d.decisions ?? []).slice(0, 5),
  });

  const { data: positions } = useQuery({
    queryKey: ["positions-open"],
    queryFn: () => fetch(`${API}/positions/open`).then(r => r.json()).catch(() => ({ positions: [] })),
    refetchInterval: 10_000,
    select: (d: any) => d.positions ?? [],
  });

  const isRunning = status?.running ?? false;
  const lastTick  = status?.last_tick ? new Date(status.last_tick).toLocaleTimeString() : "—";
  const winRate   = status?.win_rate != null ? `${(status.win_rate * 100).toFixed(1)}%` : "—";

  return (
    <div className="flex flex-col gap-4">
      {/* Status */}
      <div className="bg-secondary rounded-xl px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Agent</span>
          <span className={cn("text-xs font-semibold flex items-center gap-1.5", isRunning ? "text-positive" : "text-muted-foreground")}>
            <span className={cn("w-1.5 h-1.5 rounded-full", isRunning ? "bg-positive animate-pulse" : "bg-muted-foreground")} />
            {isRunning ? "Running" : "Offline"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Last tick</p>
            <p className="font-mono font-medium">{lastTick}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Win rate</p>
            <p className="font-mono font-medium text-positive">{winRate}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total trades</p>
            <p className="font-mono font-medium">{status?.total_trades ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Watching</p>
            <p className="font-mono font-medium">{symbol}</p>
          </div>
        </div>
      </div>

      {/* Open positions */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-2">Open Positions</p>
        {positions?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {positions.map((p: any) => (
              <div key={p.id} className="bg-secondary rounded-xl px-3 py-2.5 text-xs flex items-center justify-between">
                <div>
                  <span className={cn("font-bold", p.direction === "long" ? "text-positive" : "text-negative")}>
                    {p.direction === "long" ? "↑ Long" : "↓ Short"}
                  </span>
                  <span className="text-muted-foreground ml-2">{p.leverage}×</span>
                </div>
                <div className="text-right">
                  <p className="font-mono">@ ${parseFloat(p.entry_price).toLocaleString()}</p>
                  <p className="text-muted-foreground">{p.size} USDC.e</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No open positions</p>
        )}
      </div>

      {/* Recent decisions */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-2">Recent Decisions</p>
        {decisions?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {decisions.map((d: any) => (
              <div key={d.id} className="bg-secondary rounded-xl px-3 py-2 text-xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn("font-semibold", d.action?.includes("long") ? "text-positive" : d.action?.includes("short") ? "text-negative" : "text-muted-foreground")}>
                    {d.action ?? "hold"}
                  </span>
                  <span className="text-muted-foreground">{new Date(d.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-muted-foreground line-clamp-2">{d.reasoning?.slice(0, 80)}…</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No decisions yet</p>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════ */
export function TradePairUI({ pair }: { pair: string }) {
  const router = useRouter();
  const [tf, setTf] = useState<{ label: string; interval: ChartInterval }>(TIMEFRAMES[0]);
  const [livePrice, setLivePrice] = useState<number | null>(null);

  const meta = PAIR_META[pair] ?? null;
  const { data: ticker }  = useTicker24h(meta?.ticker ?? "BTCUSDT");
  const { data: funding } = useFundingRate(meta?.ticker ?? "BTCUSDT");

  const price     = livePrice ?? ticker?.lastPrice ?? 0;
  const changePct = ticker?.priceChangePercent ?? 0;
  const up        = changePct >= 0;

  const fundingRate = funding?.lastFundingRate ?? null;
  const fundingUp   = fundingRate !== null && fundingRate >= 0;

  if (!meta) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-muted-foreground text-sm">Pair not found: {pair}</p>
          <button onClick={() => router.push("/trade")} className="text-primary text-sm underline">
            Back to Trade
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-4">

        {/* ── Header ── */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 5L7 10l6 5" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold">{pair.replace("-", "/")}</h1>
            <p className="text-xs text-muted-foreground">{meta.label} · Perpetual</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xl font-semibold font-mono">{fmtPrice(price)}</p>
            <p className={cn("text-xs font-mono", up ? "text-positive" : "text-negative")}>
              {up ? "+" : ""}{changePct.toFixed(2)}% · 24h
            </p>
          </div>
        </div>

        {/* ── 24h stats + funding rate bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-6 border border-border rounded-2xl overflow-hidden bg-card">
          {[
            { l: "24h High",    v: ticker ? fmtPrice(ticker.highPrice)    : "—" },
            { l: "24h Low",     v: ticker ? fmtPrice(ticker.lowPrice)     : "—" },
            { l: "24h Vol",     v: ticker ? `${ticker.volume.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${pair.split("-")[0]}` : "—" },
            { l: "Quote Vol",   v: ticker ? fmtCompact(ticker.quoteVolume): "—" },
          ].map(s => (
            <div key={s.l} className="flex flex-col gap-1 px-4 py-3 border-r border-border last:border-r-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{s.l}</span>
              <span className="text-sm font-semibold font-mono">{s.v}</span>
            </div>
          ))}

          {/* Funding Rate */}
          <div className="flex flex-col gap-1 px-4 py-3 border-r border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Funding Rate</span>
            <span className={cn("text-sm font-semibold font-mono", fundingRate === null ? "text-muted-foreground" : fundingUp ? "text-positive" : "text-negative")}>
              {fundingRate !== null
                ? `${fundingUp ? "+" : ""}${(fundingRate * 100).toFixed(4)}%`
                : "—"}
            </span>
          </div>

          {/* Next Funding */}
          <div className="flex flex-col gap-1 px-4 py-3">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Next Funding</span>
            <span className="text-sm font-semibold font-mono tabular-nums">
              {funding ? fmtFundingCountdown(funding.nextFundingTime) : "—"}
            </span>
          </div>
        </div>

        {/* ── Chart + Order form ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">

          {/* Chart */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              {/* Mobile: select dropdown */}
              <select
                className="md:hidden bg-secondary text-foreground text-xs font-semibold rounded-lg px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                value={tf.label}
                onChange={e => {
                  const found = TIMEFRAMES.find(t => t.label === e.target.value);
                  if (found) setTf(found);
                }}
              >
                {TIMEFRAMES.map(t => (
                  <option key={t.label} value={t.label}>{t.label}</option>
                ))}
              </select>

              {/* Desktop: pill buttons */}
              <div className="hidden md:flex items-center gap-1">
                {TIMEFRAMES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => setTf(t)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                      tf.label === t.label
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse-dot" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>
            <div className="p-3">
              <RealtimeCandleChart
                key={`${meta.ticker}-${tf.interval}`}
                symbol={meta.ticker}
                interval={tf.interval}
                height={360}
                onLastPrice={setLivePrice}
              />
            </div>
          </div>

          {/* Agent activity */}
          <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col h-[430px]">
            <p className="text-sm font-semibold px-5 py-3.5 border-b border-border shrink-0">Agent Activity</p>
            <div className="flex-1 overflow-y-auto p-5">
              <AgentPanel pair={pair} />
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
