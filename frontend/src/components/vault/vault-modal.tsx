"use client";

import { useState, useEffect } from "react";
import { parseUnits, formatUnits } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VAULT_ADDRESS, VAULT_ABI, USDC_ADDRESS, USDC_ABI } from "@/lib/contracts";

const USDC_DECIMALS = 6;

type Tab = "deposit" | "withdraw";

function fmt(value: string | null) {
  if (!value) return "—";
  const n = parseFloat(value);
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function VaultModal({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const [open, setOpen]   = useState(false);
  const [tab, setTab]     = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ── Read: USDC wallet balance ─────────────────────────────────────────────
  const { data: usdcBalance, refetch: refetchUsdc } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // ── Read: USDC allowance ──────────────────────────────────────────────────
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "allowance",
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  // ── Read: user vault value ────────────────────────────────────────────────
  const { data: userValue, refetch: refetchUserValue } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "userValue",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // ── Read: vault liquid balance ────────────────────────────────────────────
  const { data: poolBalance } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "poolBalance",
    query: { refetchInterval: 10_000 },
  });

  const { data: deployedAmount } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "deployedAmount",
    query: { refetchInterval: 10_000 },
  });

  const liquidUsdc =
    poolBalance != null && deployedAmount != null
      ? (poolBalance as bigint) - (deployedAmount as bigint)
      : null;

  // ── Write ─────────────────────────────────────────────────────────────────
  const { writeContract, data: txHash, isPending: isSigning } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      refetchUsdc();
      refetchAllowance();
      refetchUserValue();
      setAmount("");
      setError(null);
    }
  }, [isSuccess, refetchUsdc, refetchAllowance, refetchUserValue]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const amountBig = amount ? parseUnits(amount, USDC_DECIMALS) : BigInt(0);
  const needsApprove = tab === "deposit" && (allowance as bigint ?? BigInt(0)) < amountBig;
  const isLoading = isSigning || isConfirming;

  const usdcBalanceFormatted = usdcBalance != null
    ? formatUnits(usdcBalance as bigint, USDC_DECIMALS)
    : null;
  const userValueFormatted = userValue != null
    ? formatUnits(userValue as bigint, USDC_DECIMALS)
    : null;
  const liquidFormatted = liquidUsdc != null
    ? formatUnits(liquidUsdc, USDC_DECIMALS)
    : null;

  function handleMax() {
    if (tab === "deposit" && usdcBalanceFormatted) {
      setAmount(parseFloat(usdcBalanceFormatted).toFixed(6));
    } else if (tab === "withdraw" && userValueFormatted) {
      setAmount(parseFloat(userValueFormatted).toFixed(6));
    }
  }

  function handleAction() {
    setError(null);
    if (!address || !amount || amountBig === BigInt(0)) return;

    if (tab === "deposit") {
      if (needsApprove) {
        writeContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: "approve",
          args: [VAULT_ADDRESS, amountBig],
        });
      } else {
        writeContract({
          address: VAULT_ADDRESS,
          abi: VAULT_ABI,
          functionName: "deposit",
          args: [amountBig],
        });
      }
    } else {
      // Withdraw — check liquidity first
      if (liquidUsdc != null && amountBig > liquidUsdc) {
        setError("Vault funds are currently deployed in active trades. Try again shortly.");
        return;
      }
      writeContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "withdraw",
        args: [amountBig],
      });
    }
  }

  const withdrawFee = amount ? parseFloat(amount) * 0.001 : 0;
  const withdrawReceive = amount ? parseFloat(amount) - withdrawFee : 0;

  const btnLabel = () => {
    if (isLoading) return "Confirming…";
    if (tab === "deposit" && needsApprove) return "Approve USDC";
    return tab === "deposit" ? "Deposit" : "Withdraw";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vault</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["deposit", "withdraw"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setAmount(""); setError(null); }}
              className={cn(
                "flex-1 py-2 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Balance info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Wallet USDC</p>
            <p className="text-sm font-mono font-semibold">{fmt(usdcBalanceFormatted)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Your Value</p>
            <p className="text-sm font-mono font-semibold">{fmt(userValueFormatted)}</p>
          </div>
        </div>

        {/* Amount input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Amount (USDC)</span>
            <button
              onClick={handleMax}
              className="text-xs text-primary hover:underline"
            >
              MAX
            </button>
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(null); }}
              className="font-mono pr-16"
              min="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              USDC
            </span>
          </div>
        </div>

        {/* Fee info (withdraw) */}
        {tab === "withdraw" && amount && parseFloat(amount) > 0 && (
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 space-y-1 text-xs font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>Withdrawal fee (0.1%)</span>
              <span>-${withdrawFee.toFixed(4)}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
              <span>You receive</span>
              <span>${withdrawReceive.toFixed(4)}</span>
            </div>
          </div>
        )}

        {/* Liquidity info (withdraw) */}
        {tab === "withdraw" && (
          <p className="text-xs text-muted-foreground">
            Liquid in vault: <span className="font-mono">{fmt(liquidFormatted)}</span>
            {" "}— withdraw only available when agent is not actively trading.
          </p>
        )}

        {/* Approve step hint (deposit) */}
        {tab === "deposit" && needsApprove && amountBig > BigInt(0) && (
          <p className="text-xs text-muted-foreground">
            Step 1 of 2 — approve USDC spending, then deposit in the next transaction.
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-destructive rounded-lg bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}

        {/* Success */}
        {isSuccess && (
          <p className="text-xs text-positive rounded-lg bg-positive/10 px-3 py-2">
            Transaction confirmed.
          </p>
        )}

        {/* Action button */}
        <Button
          onClick={handleAction}
          disabled={!address || !amount || parseFloat(amount) <= 0 || isLoading}
          className="w-full"
        >
          {!address ? "Connect wallet first" : btnLabel()}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
