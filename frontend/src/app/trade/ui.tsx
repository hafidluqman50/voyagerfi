"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAccount, useWaitForTransactionReceipt, useWriteContract, useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { useDeposit } from "@/hooks/useDeposit";
import { useWithdraw } from "@/hooks/useWithdraw";
import { useVaultPnl } from "@/hooks/useVaultPnl";
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
import { VAULT_ADDRESS, VAULT_ABI, USDC_ADDRESS, USDC_ABI } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { fmtPrice } from "@/lib/format";

const USDC_DECIMALS = 6;

const PAIRS: { symbol: string; label: string; ticker: BinanceSymbol }[] = [
  { symbol: "ETH/USDC",  label: "Ethereum",        ticker: "ETHUSDT" },
  { symbol: "WBTC/USDC", label: "Wrapped Bitcoin",  ticker: "BTCUSDT" },
  { symbol: "ARB/USDC",  label: "Arbitrum",         ticker: "ARBUSDT" },
];

const RISK_PROFILES = [
  { id: "conservative", label: "Conservative", sl: 3,  tp: 6  },
  { id: "balanced",     label: "Balanced",     sl: 5,  tp: 10 },
  { id: "aggressive",   label: "Aggressive",   sl: 8,  tp: 20 },
] as const;

function fmtUsdc(v: string | null): string {
  if (!v) return "—";
  const n = parseFloat(v);
  return Number.isFinite(n) ? `${n.toFixed(2)} USDC` : "—";
}

function fmtTime(t: number): string {
  return new Date(t * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/* ── Sparkline ── */
function Sparkline({ pts, positive }: { pts: number[]; positive: boolean }) {
  if (pts.length < 2) return null;
  const max = Math.max(...pts), min = Math.min(...pts), range = max - min || 1;
  const mapped = pts.map((p, i) => [(i / (pts.length - 1)) * 100, 4 + (1 - (p - min) / range) * 92] as [number, number]);
  const d = mapped.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const color = positive ? "var(--positive)" : "var(--negative)";
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <path d={`${d} L100,100 L0,100 Z`} fill={color} opacity="0.1" />
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

/* ── BTC live chart card ── */
function BtcLiveChartCard() {
  const { data: klines } = useKlines("BTCUSDT", 60);
  const { data: ticker } = useTicker24h("BTCUSDT");
  const data = klines?.map((k) => ({ t: fmtTime(k.time), p: k.close })) ?? [];
  const price = ticker?.lastPrice ?? klines?.[klines.length - 1]?.close ?? 0;
  const changePct = ticker?.priceChangePercent ?? 0;
  const up = changePct >= 0;

  return (
    <Link href="/trade/BTC-USD" className="group block bg-card border border-border rounded-2xl shadow-sm overflow-hidden hover:border-primary/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F7931A]/15 flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#F7931A]">BTC</span>
          </div>
          <div>
            <span className="text-base font-semibold font-mono">{fmtPrice(price)}</span>
            <span className={cn("text-xs font-mono ml-2", up ? "text-positive" : "text-negative")}>
              {up ? "+" : ""}{changePct.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse-dot" />
            <span className="text-xs text-muted-foreground">WBTC / USDC · live</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-primary transition-colors">
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
              <Area type="monotone" dataKey="p" stroke={up ? "var(--positive)" : "var(--negative)"} strokeWidth={2} fill="url(#btcLiveGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Loading live BTC data…</div>
        )}
      </div>
    </Link>
  );
}

/* ── Live pair card ── */
function LivePairCard({ symbol, ticker }: { symbol: string; ticker: BinanceSymbol }) {
  const { data: klines } = useKlines(ticker, 30);
  const { data: tickerData } = useTicker24h(ticker);
  const points = klines?.map((k) => k.close) ?? [];
  const lastPrice = tickerData?.lastPrice ?? points[points.length - 1] ?? 0;
  const change = tickerData?.priceChangePercent ?? 0;
  const positive = change >= 0;

  return (
    <Link href={`/trade/${symbol.replace("/", "-")}`} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden hover:border-primary/40 transition-colors block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-sm font-semibold">{symbol}</span>
        <span className={cn("text-xs font-mono font-medium", positive ? "text-positive" : "text-negative")}>
          {positive ? "+" : ""}{change.toFixed(2)}%
        </span>
      </div>
      <div className="h-[60px] px-1">
        {points.length > 1 ? <Sparkline pts={points} positive={positive} /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">…</div>}
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
  const { address } = useAccount();
  const { mutate: deposit, isPending, isSuccess, error, reset } = useDeposit();
  const valid = !!amt && parseFloat(amt) > 0;

  const { data: walletBalance = BigInt(0) } = useReadContract({
    address: USDC_ADDRESS, abi: USDC_ABI, functionName: "balanceOf",
    args: [address!], query: { enabled: !!address },
  });
  const walletBalanceUsdc = (Number(walletBalance as bigint) / 1e6).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setAmt(""); reset(); } }}>
      <DialogTrigger render={<button className="px-5 h-9 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">Deposit</button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Deposit USDC</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <div className="bg-secondary/50 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Wallet balance</span>
            <span className="text-sm font-mono font-semibold">{walletBalanceUsdc} USDC</span>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-muted-foreground">Amount (USDC)</label>
              <button onClick={() => setAmt(walletBalanceUsdc)} className="text-xs text-primary font-medium">Max</button>
            </div>
            <Input value={amt} onChange={e => setAmt(e.target.value)} placeholder="0.00" className="font-mono h-11" type="number" min="0" />
          </div>
          <p className="text-xs text-muted-foreground">Managed by AI agent on Arbitrum · no lock-up period · 0.1% exit fee on withdraw</p>
          {error && <p className="text-xs text-negative text-center">{(error as Error).message}</p>}
          {isSuccess ? (
            <div className="bg-positive/10 text-positive rounded-xl px-4 py-3 text-sm font-medium text-center">Deposit confirmed ✓</div>
          ) : (
            <Button disabled={!valid || isPending} onClick={() => deposit(amt)} className="w-full h-10 rounded-xl">
              {isPending ? "Processing…" : "Deposit USDC"}
            </Button>
          )}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

/* ── Withdraw Dialog ── */
interface WithdrawDialogProps {
  available: string | null;
  totalValue: string | null;
  userInPool: number | null;
  userInTrades: number | null;
  netDeposited: number | null;
  pnl: number | null;
}

function WithdrawDialog({ available, totalValue, userInPool, userInTrades, netDeposited, pnl }: WithdrawDialogProps) {
  const [amt, setAmt] = useState("");
  const [open, setOpen] = useState(false);

  const maxWithdrawable = Math.min(
    parseFloat(totalValue ?? "0"),
    parseFloat(available ?? "0"),
  );
  const maxUsdc = maxWithdrawable.toFixed(6);

  const amtNum = parseFloat(amt) || 0;
  const valid = !!amt && amtNum > 0 && amtNum <= maxWithdrawable;
  const exitFee = valid ? amtNum * 0.001 : 0;
  const youReceive = valid ? amtNum - exitFee : 0;
  const hasDeployed = userInTrades != null && userInTrades > 0.000001;

  const { mutate: withdraw, isPending, isSuccess, error, reset } = useWithdraw();

  const fmtPnl = (v: number) => {
    const sign = v >= 0 ? "+" : "";
    return `${sign}${v.toFixed(4)} USDC`;
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setAmt(""); reset(); } }}>
      <DialogTrigger render={<button className="px-5 h-9 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-secondary transition-colors">Withdraw</button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Withdraw USDC</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4 py-1">

          {/* Vault breakdown */}
          <div className="bg-secondary/50 rounded-xl px-4 py-3 flex flex-col gap-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Your vault value</span>
              <span className="font-mono font-semibold text-sm">{fmtUsdc(totalValue)}</span>
            </div>
            <div className="border-t border-border pt-2 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-positive inline-block" />
                  In Pool (liquid)
                </span>
                <span className="font-mono text-positive">
                  {userInPool != null ? `${userInPool.toFixed(2)} USDC` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  In Active Trades
                </span>
                <span className="font-mono text-amber-500">
                  {userInTrades != null ? `${userInTrades.toFixed(2)} USDC` : "—"}
                </span>
              </div>
            </div>
            {netDeposited != null && (
              <div className="border-t border-border pt-2 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Net Deposited</span>
                  <span className="font-mono">{netDeposited.toFixed(4)} USDC</span>
                </div>
                {pnl != null && (
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-muted-foreground">Profit / Loss</span>
                    <span className={cn("font-mono", pnl >= 0 ? "text-positive" : "text-negative")}>
                      {fmtPnl(pnl)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {hasDeployed && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 text-xs text-amber-500">
              Part of your funds are in active trades. Only liquid portion is withdrawable now.
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-muted-foreground">Amount (USDC)</label>
              <button onClick={() => setAmt(maxUsdc)} className="text-xs text-primary font-medium">
                Max · {maxWithdrawable.toFixed(2)} USDC
              </button>
            </div>
            <Input value={amt} onChange={e => setAmt(e.target.value)} placeholder="0.00" className="font-mono h-11" type="number" min="0" max={maxUsdc} />
          </div>

          {valid && (
            <div className="bg-secondary/50 rounded-xl px-4 py-3 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Exit fee (0.1%)</span>
                <span className="font-mono">−{exitFee.toFixed(4)} USDC</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-border pt-1.5 mt-0.5">
                <span>You receive</span>
                <span className="font-mono">{youReceive.toFixed(4)} USDC</span>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-negative text-center">{(error as Error).message}</p>}
          {isSuccess ? (
            <div className="bg-positive/10 text-positive rounded-xl px-4 py-3 text-sm font-medium text-center">Withdrawal confirmed ✓</div>
          ) : (
            <Button disabled={!valid || isPending} onClick={() => withdraw(amt)} className="w-full h-10 rounded-xl">
              {isPending ? "Processing…" : "Withdraw USDC"}
            </Button>
          )}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

/* ── My Portfolio card ── */
function PortfolioCard() {
  const { address } = useAccount();
  const { userValue: total, liquidBalance: available, poolBalance, deployedAmount, isLoading } = useVaultBalance(address);
  const { data: netDeposited } = useVaultPnl(address);

  const poolBal = parseFloat(poolBalance ?? "0");
  const userInPool = poolBal > 0 && total != null
    ? parseFloat(total) * parseFloat(available ?? "0") / poolBal
    : null;
  const userInTrades = userInPool != null && total != null
    ? parseFloat(total) - userInPool
    : null;
  const pnl = netDeposited != null && total != null
    ? parseFloat(total) - netDeposited
    : null;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div>
          <p className="text-sm font-semibold">My Portfolio</p>
          {address && (
            <p className={cn("text-xs font-mono mt-0.5", isLoading ? "text-muted-foreground animate-pulse" : "text-positive")}>
              {isLoading ? "Loading…" : `${parseFloat(total ?? "0").toFixed(2)} USDC deposited`}
            </p>
          )}
        </div>
        {address ? (
          <div className="flex items-center gap-2">
            <WithdrawDialog
              available={available}
              totalValue={total}
              userInPool={userInPool}
              userInTrades={userInTrades}
              netDeposited={netDeposited ?? null}
              pnl={pnl}
            />
            <DepositDialog />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Connect wallet to deposit</p>
        )}
      </div>

      {/* Risk profile */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Risk Profile</p>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">Coming Soon</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {RISK_PROFILES.map(p => (
            <div key={p.id}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border text-xs cursor-not-allowed select-none",
                p.id === "balanced"
                  ? "border-primary bg-primary/8 text-foreground"
                  : "border-border text-muted-foreground opacity-35"
              )}
            >
              <span className="font-semibold">{p.label}</span>
              <span className="text-[10px] text-muted-foreground">{p.sl}% SL · {p.tp}% TP</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Currently running: <span className="text-foreground font-medium">Balanced</span></p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════ */
export function TradeUI() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-5">
        <BtcLiveChartCard />
        <PortfolioCard />
        <div>
          <p className="text-sm font-semibold mb-3">Markets · Live</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PAIRS.map(pair => (
              <LivePairCard key={pair.symbol} symbol={pair.symbol} ticker={pair.ticker} />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
