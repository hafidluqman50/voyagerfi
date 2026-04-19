"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits } from "viem";
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

const USDC_DECIMALS = 6;

const PAIRS: { symbol: string; label: string; ticker: BinanceSymbol }[] = [
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

function fmtUsdc(v: string | null): string {
  if (!v) return "—";
  const n = parseFloat(v);
  return Number.isFinite(n) ? `${n.toFixed(2)} USDC.e` : "—";
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
            <span className="text-xs text-muted-foreground">BTC / USD · live</span>
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
  const valid = !!amt && parseFloat(amt) > 0;
  const amountWei = valid ? parseUnits(amt, USDC_DECIMALS) : BigInt(0);

  const { data: allowance = BigInt(0), refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS, abi: USDC_ABI, functionName: "allowance",
    args: [address!, VAULT_ADDRESS], query: { enabled: !!address },
  });

  const needsApprove = valid && (allowance as bigint) < amountWei;
  const { writeContract: approve, data: approveTx, isPending: isApproving, reset: resetApprove } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveTx, onReplaced: () => refetchAllowance() });
  const { writeContract: deposit, data: depositTx, isPending: isDepositing, reset: resetDeposit } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositDone } = useWaitForTransactionReceipt({ hash: depositTx });

  const isBusy = isApproving || isApproveConfirming || isDepositing || isDepositConfirming;

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setAmt(""); resetApprove(); resetDeposit(); } }}>
      <DialogTrigger render={<button className="px-5 h-9 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">Deposit</button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Deposit USDC.e</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <p className="text-xs text-muted-foreground">Your USDC.e will be managed by the AI agent on 0G Chain.</p>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Amount (USDC.e)</label>
            <Input value={amt} onChange={e => setAmt(e.target.value)} placeholder="0.00" className="font-mono h-11" type="number" min="0" />
          </div>
          {isDepositDone ? (
            <div className="bg-positive/10 text-positive rounded-xl px-4 py-3 text-sm font-medium text-center">Deposit confirmed ✓</div>
          ) : needsApprove || (!isApproved && !allowance) ? (
            <Button disabled={!valid || isBusy} onClick={() => approve({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: "approve", args: [VAULT_ADDRESS, amountWei] })} className="w-full h-10 rounded-xl">
              {isApproving ? "Confirm in wallet…" : isApproveConfirming ? "Approving…" : "Approve USDC.e"}
            </Button>
          ) : (
            <Button disabled={!valid || isBusy} onClick={() => deposit({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "deposit", args: [amountWei] })} className="w-full h-10 rounded-xl">
              {isDepositing ? "Confirm in wallet…" : isDepositConfirming ? "Confirming…" : "Deposit USDC.e"}
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
  const maxUsdc = available ?? "0";
  const valid = !!amt && parseFloat(amt) > 0 && parseFloat(amt) <= parseFloat(maxUsdc);

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setAmt(""); reset(); } }}>
      <DialogTrigger render={<button className="px-5 h-9 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-secondary transition-colors">Withdraw</button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Withdraw USDC.e</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <div className="relative">
            <Input value={amt} onChange={e => setAmt(e.target.value)} placeholder="0.00" className="font-mono h-11 pr-16" type="number" min="0" max={maxUsdc} />
            <button onClick={() => setAmt(maxUsdc)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary font-medium">Max</button>
          </div>
          <p className="text-xs text-muted-foreground">Available: {fmtUsdc(available)}</p>
          {isSuccess ? (
            <div className="bg-positive/10 text-positive rounded-xl px-4 py-3 text-sm font-medium text-center">Withdrawal confirmed ✓</div>
          ) : (
            <Button disabled={!valid || isPending || isConfirming}
              onClick={() => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "withdraw", args: [parseUnits(amt, USDC_DECIMALS)] })}
              className="w-full h-10 rounded-xl">
              {isPending ? "Confirm in wallet…" : isConfirming ? "Confirming…" : "Withdraw USDC.e"}
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
  const { total, available, isLoading } = useVaultBalance(address);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div>
          <p className="text-sm font-semibold">My Portfolio</p>
          {address && (
            <p className={cn("text-xs font-mono mt-0.5", isLoading ? "text-muted-foreground animate-pulse" : "text-positive")}>
              {isLoading ? "Loading…" : `${parseFloat(total ?? "0").toFixed(2)} USDC.e deposited`}
            </p>
          )}
        </div>
        {address ? (
          <div className="flex items-center gap-2">
            <WithdrawDialog available={available} />
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
              <span className="text-[10px] text-muted-foreground">{p.leverage}× · {p.sl}% SL</span>
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
