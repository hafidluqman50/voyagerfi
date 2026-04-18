"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useKlines, type BinanceSymbol } from "@/hooks/useKlines";
import { useTicker24h } from "@/hooks/useTicker24h";
import { useVaultBalance } from "@/hooks/useVaultBalance";
import { VAULT_ADDRESS, VAULT_ABI } from "@/lib/contracts";
import { cn } from "@/lib/utils";

const PAIRS: {
  symbol: string;
  label: string;
  ticker: BinanceSymbol;
}[] = [
  { symbol: "ETH/USD", label: "Ethereum", ticker: "ETHUSDT" },
  { symbol: "SOL/USD", label: "Solana",   ticker: "SOLUSDT" },
  { symbol: "ARB/USD", label: "Arbitrum", ticker: "ARBUSDT" },
  { symbol: "BNB/USD", label: "BNB",      ticker: "BNBUSDT" },
];

const RISK_PROFILES = [
  { id: "conservative", label: "Conservative", leverage: 2,  sl: 3,  tp: 6  },
  { id: "balanced",     label: "Balanced",     leverage: 5,  sl: 5,  tp: 10 },
  { id: "aggressive",   label: "Aggressive",   leverage: 10, sl: 8,  tp: 20 },
] as const;

function fmtPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 10000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
}

function fmtTime(t: number): string {
  return new Date(t * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/* ── Sparkline (SVG, lightweight) ── */
function Sparkline({ pts, positive }: { pts: number[]; positive: boolean }) {
  if (pts.length < 2) return null;
  const max = Math.max(...pts), min = Math.min(...pts), range = max - min || 1;
  const mapped = pts.map((p, i) => [
    (i / (pts.length - 1)) * 100,
    4 + (1 - (p - min) / range) * 92,
  ] as [number, number]);
  const d = mapped.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fill = `${d} L100,100 L0,100 Z`;
  const color = positive ? "var(--positive)" : "var(--negative)";
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <path d={fill} fill={color} opacity="0.1" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-mono font-semibold">${payload[0].value.toLocaleString()}</p>
    </div>
  );
}

/* ── BTC live chart card (clickable → /trade/BTC-USD) ── */
function BtcLiveChartCard() {
  const { data: klines } = useKlines("BTCUSDT", 60);
  const { data: ticker } = useTicker24h("BTCUSDT");

  const data =
    klines?.map((k) => ({ t: fmtTime(k.time), p: k.close })) ?? [];
  const price = ticker?.lastPrice ?? klines?.[klines.length - 1]?.close ?? 0;
  const changePct = ticker?.priceChangePercent ?? 0;
  const up = changePct >= 0;

  return (
    <Link
      href="/trade/BTC-USD"
      className="group block bg-card border border-border rounded-2xl shadow-sm overflow-hidden hover:border-primary/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F7931A]/15 flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#F7931A]">BTC</span>
          </div>
          <div>
            <span className="text-base font-semibold font-mono">{fmtPrice(price)}</span>
            <span
              className={cn(
                "text-xs font-mono ml-2",
                up ? "text-positive" : "text-negative"
              )}
            >
              {up ? "+" : ""}
              {changePct.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse-dot" />
            <span className="text-xs text-muted-foreground">BTC / USD · live</span>
          </div>
          <svg
            width="14" height="14" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="text-muted-foreground group-hover:text-primary transition-colors"
          >
            <path d="M6 3l5 5-5 5" />
          </svg>
        </div>
      </div>
      <div className="h-[180px] px-2 py-3">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="btcLiveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={up ? "var(--positive)" : "var(--negative)"} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={up ? "var(--positive)" : "var(--negative)"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
              <YAxis domain={["auto","auto"]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={40} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="p"
                stroke={up ? "var(--positive)" : "var(--negative)"}
                strokeWidth={2}
                fill="url(#btcLiveGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            Loading live BTC data…
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── Live pair card ── */
function LivePairCard({
  symbol,
  ticker,
}: {
  symbol: string;
  ticker: BinanceSymbol;
}) {
  const { data: klines } = useKlines(ticker, 30);
  const { data: tickerData } = useTicker24h(ticker);

  const points = klines?.map((k) => k.close) ?? [];
  const lastPrice = tickerData?.lastPrice ?? points[points.length - 1] ?? 0;
  const change = tickerData?.priceChangePercent ?? 0;
  const positive = change >= 0;
  const href = `/trade/${symbol.replace("/", "-")}`;

  return (
    <Link
      href={href}
      className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden hover:border-primary/40 transition-colors block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-sm font-semibold">{symbol}</span>
        <span className={cn("text-xs font-mono font-medium", positive ? "text-positive" : "text-negative")}>
          {positive ? "+" : ""}{change.toFixed(2)}%
        </span>
      </div>
      <div className="h-[60px] px-1">
        {points.length > 1 ? (
          <Sparkline pts={points} positive={positive} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
            …
          </div>
        )}
      </div>
      <div className="px-4 pb-3">
        <p className="text-sm font-mono font-semibold">{fmtPrice(lastPrice)}</p>
      </div>
    </Link>
  );
}

/* ── Deposit Dialog ── */
function DepositDialog() {
  const [amt, setAmt] = useState("");
  const [open, setOpen] = useState(false);
  const valid = !!amt && parseFloat(amt) > 0;

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function handleDeposit() {
    if (!valid) return;
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "deposit",
      value: parseEther(amt),
    });
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) { setAmt(""); reset(); }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button className="px-6 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
            Add funds
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Deposit ETH</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <p className="text-xs text-muted-foreground">
            Deposit native ETH to your VoyagerFi vault on 0G Chain. The agent will use this balance for trading.
          </p>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Amount (ETH)</label>
            <Input
              value={amt}
              onChange={e => setAmt(e.target.value)}
              placeholder="0.00"
              className="font-mono h-11"
              type="number"
              min="0"
              step="0.001"
            />
          </div>

          {isSuccess ? (
            <div className="bg-positive/10 text-positive rounded-xl px-4 py-3 text-sm font-medium text-center">
              Deposit confirmed ✓
            </div>
          ) : (
            <Button
              disabled={!valid || isPending || isConfirming}
              onClick={handleDeposit}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              {isPending ? "Confirm in wallet…" : isConfirming ? "Confirming…" : "Deposit ETH"}
            </Button>
          )}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

/* ── Withdraw Dialog ── */
function WithdrawDialog({ available }: { available: string | null }) {
  const [amt, setAmt] = useState("");
  const [open, setOpen] = useState(false);
  const maxEth = available ?? "0";
  const valid = !!amt && parseFloat(amt) > 0 && parseFloat(amt) <= parseFloat(maxEth);

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function handleWithdraw() {
    if (!valid) return;
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "withdraw",
      args: [parseEther(amt)],
    });
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) { setAmt(""); reset(); }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button className="px-6 h-11 rounded-xl bg-transparent text-foreground font-semibold text-sm hover:bg-white/5 transition-colors border border-white/20">
            Withdraw
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Withdraw ETH</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Amount (ETH)</label>
            <div className="relative">
              <Input
                value={amt}
                onChange={e => setAmt(e.target.value)}
                placeholder="0.00"
                className="font-mono h-11 pr-16"
                type="number"
                min="0"
                step="0.001"
                max={maxEth}
              />
              <button
                onClick={() => setAmt(maxEth)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary font-medium"
              >
                Max
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available: {maxEth ? `${parseFloat(maxEth).toFixed(4)} ETH` : "—"}
            </p>
          </div>

          {isSuccess ? (
            <div className="bg-positive/10 text-positive rounded-xl px-4 py-3 text-sm font-medium text-center">
              Withdrawal confirmed ✓
            </div>
          ) : (
            <Button
              disabled={!valid || isPending || isConfirming}
              onClick={handleWithdraw}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              {isPending ? "Confirm in wallet…" : isConfirming ? "Confirming…" : "Withdraw ETH"}
            </Button>
          )}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

/* ── Bot Setup (floating) ── */
function BotSetupDialog() {
  const [risk, setRisk] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [enabled, setEnabled] = useState(false);
  const sel = RISK_PROFILES.find(p => p.id === risk)!;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button className={cn(
            "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 md:px-5 px-3 py-3 rounded-2xl font-semibold text-sm shadow-lg transition-all",
            enabled
              ? "bg-positive text-white"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="14" height="11" rx="2.5" />
              <circle cx="7.5" cy="11" r="1.5" /><circle cx="12.5" cy="11" r="1.5" />
              <path d="M10 2v3" /><circle cx="10" cy="1.5" r="1" />
            </svg>
            <span className="hidden md:inline">{enabled ? "Bot Active" : "Setup Bot"}</span>
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Auto Trading Bot</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <p className="text-xs text-muted-foreground">
            The AI agent will trade automatically using your available balance. Choose a risk profile.
          </p>

          <div className="flex flex-col gap-2">
            {RISK_PROFILES.map(p => (
              <button key={p.id} onClick={() => setRisk(p.id)}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all",
                  risk === p.id
                    ? "border-primary bg-primary/8 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <span className="font-semibold">{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.leverage}× max · {p.sl}% SL · {p.tp}% TP</span>
              </button>
            ))}
          </div>

          <div className="bg-secondary rounded-xl px-4 py-3 flex flex-col gap-1.5 text-sm">
            {[
              { l: "AI Model",   v: "DeepSeek v3 (0G Compute)" },
              { l: "Execution",  v: "TEE Verified on-chain"    },
              { l: "Interval",   v: "Every 5 minutes"          },
            ].map(r => (
              <div key={r.l} className="flex justify-between">
                <span className="text-muted-foreground">{r.l}</span>
                <span className="font-medium">{r.v}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setEnabled(!enabled)}
            className={cn(
              "w-full py-3 rounded-xl font-bold text-sm transition-all",
              enabled
                ? "bg-negative/10 text-negative border-2 border-negative"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {enabled ? "Stop Bot" : `Enable Bot — ${sel.label}`}
          </button>
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function fmtEth(v: string | null): string {
  if (v === null) return "—";
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(4)} ETH`;
}

/* ══════════════════════════════════════ */
export function TradeUI() {
  const { address } = useAccount();
  const { total, available, locked, isLoading: balLoading } = useVaultBalance(address);

  return (
    <AppLayout>
      <div className="flex flex-col gap-5">

        {/* ── BTC live chart (clickable) ── */}
        <BtcLiveChartCard />

        {/* ── Balance + CTA ── */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
            <div className="px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-0.5">Total Balance</p>
              <p className={cn("text-base font-semibold font-mono", balLoading && "animate-pulse text-muted-foreground")}>
                {address ? fmtEth(total) : "—"}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-0.5">Available</p>
              <p className={cn("text-base font-semibold font-mono text-positive", balLoading && "animate-pulse text-muted-foreground")}>
                {address ? fmtEth(available) : "—"}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-0.5">In Positions</p>
              <p className={cn("text-base font-semibold font-mono", balLoading && "animate-pulse text-muted-foreground")}>
                {address ? fmtEth(locked) : "—"}
              </p>
            </div>
          </div>
          {/* Actions row */}
          <div className="flex items-center justify-end gap-3 px-4 py-3">
            <WithdrawDialog available={available} />
            <DepositDialog />
          </div>
        </div>

        {/* ── Live pair grid ── */}
        <div>
          <p className="text-sm font-semibold mb-3">Markets · Live</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PAIRS.map(pair => (
              <LivePairCard
                key={pair.symbol}
                symbol={pair.symbol}
                ticker={pair.ticker}
              />
            ))}
          </div>
        </div>

      </div>

      <BotSetupDialog />
    </AppLayout>
  );
}
