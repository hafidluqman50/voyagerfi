"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { formatEther } from "viem";

interface VaultUIProps {
  address?: string;
  balance?: bigint;
  history: unknown;
}

export function VaultUI({ address, balance, history }: VaultUIProps) {
  void history;

  return (
    <div className="min-h-screen p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Vault</h1>
        <ConnectButton />
      </header>

      {!address ? (
        <div className="text-center py-20 text-muted-foreground">
          Connect your wallet to manage your vault
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-6">
          <div className="rounded-lg border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-4xl font-bold mt-2">
              {balance ? formatEther(balance) : "0"} 0G
            </p>
          </div>

          <div className="flex gap-4">
            <Button className="flex-1" size="lg">
              Deposit
            </Button>
            <Button variant="outline" className="flex-1" size="lg">
              Withdraw
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
