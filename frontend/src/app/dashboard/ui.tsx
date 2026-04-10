"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

interface DashboardUIProps {
  address?: string;
  dashboard: unknown;
  positions: unknown;
}

export function DashboardUI({ address, dashboard, positions }: DashboardUIProps) {
  void dashboard;
  void positions;

  return (
    <div className="min-h-screen p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">VoyagerFi Dashboard</h1>
        <div className="flex gap-4 items-center">
          <nav className="flex gap-2">
            <Link href="/vault" className="text-sm text-muted-foreground hover:text-foreground">
              Vault
            </Link>
            <Link href="/positions" className="text-sm text-muted-foreground hover:text-foreground">
              Positions
            </Link>
            <Link href="/logs" className="text-sm text-muted-foreground hover:text-foreground">
              Logs
            </Link>
          </nav>
          <ConnectButton />
        </div>
      </header>

      {!address ? (
        <div className="text-center py-20 text-muted-foreground">
          Connect your wallet to view dashboard
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-3xl font-bold">-- 0G</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Open Positions</p>
            <p className="text-3xl font-bold">--</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Total PnL</p>
            <p className="text-3xl font-bold">--</p>
          </div>
        </div>
      )}
    </div>
  );
}
