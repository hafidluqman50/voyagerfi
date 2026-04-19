"use client";

import { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { PriceSparkline } from "@/components/charts/price-sparkline";
import { cn } from "@/lib/utils";
import { fmtPrice, fmtAgo } from "@/lib/format";
import { ETH_PTS_FALLBACK, BTC_PTS_FALLBACK, buildTradeRows } from "./helpers";
import { usePrices } from "@/hooks/usePrices";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { useDashboard } from "@/hooks/useDashboard";
import { useNews } from "@/hooks/useNews";
import type { NewsArticle } from "@/lib/types";

/* ── Stat bar item ── */
function StatItem({
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

/* ── Clickable market card ── */
function MarketCard({
  href,
  short,
  name,
  pair,
  iconBg,
  iconFg,
  price,
  symbol,
  fallback,
}: {
  href: string;
  short: string;
  name: string;
  pair: string;
  iconBg: string;
  iconFg: string;
  price: number;
  symbol: "ETHUSDT" | "BTCUSDT";
  fallback: number[];
}) {
  return (
    <Link
      href={href}
      className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: iconBg }}
          >
            <span className="text-[10px] font-bold" style={{ color: iconFg }}>
              {short}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pair}</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-2">
          <div>
            <p className="text-lg font-semibold font-mono">
              {price > 0 ? fmtPrice(price) : "—"}
            </p>
            <p className="text-xs font-mono mt-0.5 text-muted-foreground">
              Pyth Oracle · live
            </p>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground group-hover:text-primary transition-colors"
          >
            <path d="M6 3l5 5-5 5" />
          </svg>
        </div>
      </div>
      <div className="h-[100px] px-1 pb-3">
        <PriceSparkline symbol={symbol} fallbackPoints={fallback} />
      </div>
    </Link>
  );
}

export function DashboardUI() {
  const { data: prices } = usePrices();
  const { data: agentStatus } = useAgentStatus();
  const { data: dashboard } = useDashboard();
  const { data: newsArticles = [] } = useNews();
  const [showAllNews, setShowAllNews] = useState(false);

  const ethPrice = prices?.eth?.price ?? 0;
  const btcPrice = prices?.btc?.price ?? 0;

  const isRunning = agentStatus?.running ?? false;
  const winRate = agentStatus?.win_rate ?? 0;
  const totalTrades = agentStatus?.total_trades ?? 0;

  const openPositions = dashboard?.open_positions ?? [];
  const tradeRows = openPositions.length > 0 ? buildTradeRows(openPositions) : [];

  return (
    <AppLayout>
      <div className="flex flex-col gap-0 -mt-1">

        {/* ── Top stat bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 border border-border rounded-2xl overflow-hidden bg-card mb-5">
          <StatItem label="ETH Price" value={ethPrice > 0 ? fmtPrice(ethPrice) : "—"} sub="live · Pyth Oracle" />
          <StatItem label="BTC Price" value={btcPrice > 0 ? fmtPrice(btcPrice) : "—"} sub="live · Pyth Oracle" />
          <StatItem
            label="Win Rate"
            value={totalTrades > 0 ? `${(winRate * 100).toFixed(1)}%` : "—"}
            sub={`${totalTrades} trades`}
            positive={winRate >= 0.5 ? true : winRate > 0 ? false : undefined}
          />
          <div className="flex flex-col gap-1 px-5 py-4">
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              Agent
            </span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-2 h-2 rounded-full shrink-0",
                isRunning ? "bg-positive animate-pulse-dot" : "bg-muted-foreground"
              )} />
              <span className="text-xl font-semibold">{isRunning ? "Running" : "Offline"}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {totalTrades > 0
                ? `${(winRate * 100).toFixed(0)}% win rate · ${totalTrades} trades`
                : "Warming up…"}
            </span>
          </div>
        </div>

        {/* ── Market cards (clickable) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <MarketCard
            href="/trade/ETH-USD"
            short="ETH"
            name="Ethereum"
            pair="ETH / USD"
            iconBg="#ECF0FD"
            iconFg="#3B5BC4"
            price={ethPrice}
            symbol="ETHUSDT"
            fallback={ETH_PTS_FALLBACK}
          />
          <MarketCard
            href="/trade/BTC-USD"
            short="BTC"
            name="Bitcoin"
            pair="BTC / USD"
            iconBg="#FDF3E7"
            iconFg="#C4761A"
            price={btcPrice}
            symbol="BTCUSDT"
            fallback={BTC_PTS_FALLBACK}
          />
        </div>

        {/* ── Trades + News ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">

          {/* Trades table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <span className="text-sm font-semibold">Agent Positions</span>
              <span className="text-xs text-muted-foreground">
                {openPositions.length > 0 ? `${openPositions.length} open` : "Live"}
              </span>
            </div>
            {tradeRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <span className="text-muted-foreground text-sm">
                  {isRunning ? "Agent is warming up — no positions yet" : "Agent offline · no positions"}
                </span>
                {isRunning && (
                  <span className="text-xs text-muted-foreground">
                    Needs {5} price ticks per pair to start trading
                  </span>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Pair", "Direction", "Size", "Entry Price", "P&L", "Time"].map((h, i) => (
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
                  {tradeRows.map((t, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0 hover:bg-accent/40 transition-colors">
                      <td className="px-5 py-3 text-sm font-mono font-semibold">{t.pair}</td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md",
                            t.side === "Buy"
                              ? "bg-positive/10 text-positive"
                              : "bg-negative/10 text-negative"
                          )}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-mono text-muted-foreground">{t.size}</td>
                      <td className="px-5 py-3 text-sm font-mono text-muted-foreground">{t.entry}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={cn("text-sm font-mono font-medium", t.pos ? "text-positive" : "text-negative")}>
                          {t.pnl}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-mono text-muted-foreground">{t.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* News */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <span className="text-sm font-semibold">Market News</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse-dot" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {newsArticles.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Loading news…
                </div>
              ) : (
                <>
                  {(showAllNews ? newsArticles : newsArticles.slice(0, 4)).map((article: NewsArticle, index: number) => (
                    <a
                      key={index}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-accent/40 transition-colors block"
                    >
                      <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5 bg-border" />
                      <div className="min-w-0">
                        <p className="text-sm leading-snug text-foreground line-clamp-2">{article.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {article.source} · {fmtAgo(article.published_at)} ago
                        </p>
                      </div>
                    </a>
                  ))}
                  {newsArticles.length > 4 && (
                    <button
                      onClick={() => setShowAllNews(v => !v)}
                      className="w-full px-5 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors text-center"
                    >
                      {showAllNews ? "Show less" : `Load ${newsArticles.length - 4} more`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
