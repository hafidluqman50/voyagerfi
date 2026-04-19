"use client";

import Link from "next/link";
import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { RealtimeCandleChart } from "@/components/charts/price-chart";
import { useTicker24h } from "@/hooks/useTicker24h";
import { cn } from "@/lib/utils";
import { fmtPrice, fmtCompact } from "@/lib/format";
import type { BinanceSymbol } from "@/hooks/useKlines";

export type MarketMeta = {
  name: string;
  ticker: BinanceSymbol;
  short: string;
  long: string;
  accent: string;
  bg: string;
};

function Stat({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 border-r border-border last:border-r-0">
      <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
        {label}
      </span>
      <span className="text-xl font-semibold font-mono tracking-tight">
        {value}
      </span>
      {sub && (
        <span
          className={cn(
            "text-xs font-mono",
            positive === true && "text-positive",
            positive === false && "text-negative",
            positive === undefined && "text-muted-foreground"
          )}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

export function MarketDetail({ meta }: { meta: MarketMeta }) {
  const { data: ticker } = useTicker24h(meta.ticker);
  const [livePrice, setLivePrice] = useState<number | null>(null);

  const price = livePrice ?? ticker?.lastPrice ?? 0;
  const change = ticker?.priceChange ?? 0;
  const changePct = ticker?.priceChangePercent ?? 0;
  const up = change >= 0;

  return (
    <AppLayout>
      <div className="flex flex-col gap-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Overview
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{meta.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: meta.bg }}
            >
              <span className="text-xs font-bold" style={{ color: meta.accent }}>
                {meta.short}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold leading-none">{meta.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{meta.long} · Live</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold font-mono">{fmtPrice(price)}</p>
            <p
              className={cn(
                "text-sm font-mono mt-0.5",
                up ? "text-positive" : "text-negative"
              )}
            >
              {up ? "+" : ""}
              {change.toLocaleString("en-US", { maximumFractionDigits: 2 })} (
              {up ? "+" : ""}
              {changePct.toFixed(2)}%) · 24h
            </p>
          </div>
        </div>

        {/* 24h stat bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 border border-border rounded-2xl overflow-hidden bg-card">
          <Stat
            label="24h High"
            value={ticker ? fmtPrice(ticker.highPrice) : "—"}
            sub="past 24 hours"
          />
          <Stat
            label="24h Low"
            value={ticker ? fmtPrice(ticker.lowPrice) : "—"}
            sub="past 24 hours"
          />
          <Stat
            label="24h Volume"
            value={ticker ? `${ticker.volume.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${meta.short}` : "—"}
            sub="base asset"
          />
          <Stat
            label="24h Quote Vol"
            value={ticker ? fmtCompact(ticker.quoteVolume) : "—"}
            sub="USDT"
          />
        </div>

        {/* Chart */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">1m Candles</span>
              <span className="text-xs text-muted-foreground">· Binance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse-dot" />
              <span className="text-xs text-muted-foreground">Live stream</span>
            </div>
          </div>
          <div className="p-3">
            <RealtimeCandleChart
              symbol={meta.ticker}
              height={460}
              onLastPrice={setLivePrice}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
