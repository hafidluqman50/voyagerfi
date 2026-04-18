"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { RealtimeCandleChart, type ChartInterval } from "@/components/charts/price-chart";
import { Input } from "@/components/ui/input";
import { useTicker24h } from "@/hooks/useTicker24h";
import { useFundingRate } from "@/hooks/useFundingRate";
import { cn } from "@/lib/utils";
import type { BinanceSymbol } from "@/hooks/useKlines";

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

function fmtPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 10_000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1)      return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
}

function fmtCompact(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtFundingCountdown(nextFundingTime: number): string {
  const now = Date.now();
  const diff = nextFundingTime - now;
  if (diff <= 0) return "—";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── Order form ── */
function OrderForm({ price }: { price: number }) {
  const [dir, setDir] = useState<"long" | "short">("long");
  const [size, setSize] = useState("");
  const [lev, setLev]  = useState(5);

  const margin   = size ? `$${(parseFloat(size) / lev).toFixed(2)}` : "—";
  const notional = size ? `$${parseFloat(size).toLocaleString()}` : "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        {(["long", "short"] as const).map(d => (
          <button
            key={d}
            onClick={() => setDir(d)}
            className={cn(
              "py-2.5 rounded-xl text-sm font-semibold border transition-all capitalize",
              dir === d
                ? d === "long"
                  ? "bg-positive/15 text-positive border-positive"
                  : "bg-negative/15 text-negative border-negative"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {d === "long" ? "↑ Long" : "↓ Short"}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Size (USDC.e)</label>
        <Input
          value={size}
          onChange={e => setSize(e.target.value)}
          placeholder="0.00"
          className="bg-secondary font-mono h-10 rounded-xl"
        />
      </div>

      <div className="bg-secondary rounded-xl px-4 py-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-muted-foreground">Leverage</span>
          <span className="text-sm font-bold font-mono text-primary">{lev}×</span>
        </div>
        <input
          type="range" min={1} max={50} value={lev}
          onChange={e => setLev(+e.target.value)}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-border"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>1×</span><span>10×</span><span>25×</span><span>50×</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-secondary rounded-xl px-3 py-2.5">
          <p className="text-muted-foreground mb-0.5">Margin</p>
          <p className="font-mono font-semibold">{margin}</p>
        </div>
        <div className="bg-secondary rounded-xl px-3 py-2.5">
          <p className="text-muted-foreground mb-0.5">Notional</p>
          <p className="font-mono font-semibold">{notional}</p>
        </div>
      </div>

      <button className={cn(
        "w-full py-3 rounded-xl font-bold text-sm transition-all",
        dir === "long"
          ? "bg-positive text-white hover:bg-positive/90"
          : "bg-negative text-white hover:bg-negative/90"
      )}>
        {dir === "long" ? "↑ Open Long" : "↓ Open Short"}
      </button>

      <p className="text-[10px] text-muted-foreground text-center">
        Mark price: <span className="font-mono">{fmtPrice(price)}</span>
      </p>
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

          {/* Order form */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
            <p className="text-sm font-semibold mb-4">Place Order</p>
            <OrderForm price={price} />
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
