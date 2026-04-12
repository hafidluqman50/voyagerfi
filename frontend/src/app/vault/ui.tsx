"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const VAULT_HISTORY = [
  { type: "deposit", amount: "500 0G", time: "Apr 10, 14:32", tx: "0x7f2a...3e1b" },
  { type: "deposit", amount: "1,000 0G", time: "Apr 8, 09:14", tx: "0x3c1b...9a4f" },
  { type: "withdraw", amount: "200 0G", time: "Apr 5, 18:22", tx: "0x9d3e...2c7a" },
];

interface VaultUIProps {
  address?: string;
  balance?: bigint;
}

export function VaultUI({ address, balance: _ }: VaultUIProps) {
  return (
    <AppLayout>
      <div className="flex flex-col gap-3 max-w-2xl">

        {/* Balance card */}
        <Card className="bg-card border-border rounded-lg">
          <CardContent className="p-4 flex flex-col gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Your Balance</p>
              <p className="text-3xl font-medium text-foreground">1,300 <span className="text-lg text-muted-foreground">0G</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">≈ $6,266 USD</p>
            </div>

            <Separator className="bg-border" />

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-secondary rounded p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5">Available</p>
                <p className="text-sm font-medium text-foreground">1,050 0G</p>
              </div>
              <div className="bg-secondary rounded p-2.5">
                <p className="text-[10px] text-muted-foreground mb-0.5">Locked (margin)</p>
                <p className="text-sm font-medium text-foreground">250 0G</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/80 text-[#60a5fa] border border-[#1d4ed8] rounded-md text-sm h-9"
                disabled={!address}
              >
                Deposit
              </Button>
              <Button
                variant="outline"
                className="border-border bg-secondary hover:bg-accent text-muted-foreground rounded-md text-sm h-9"
                disabled={!address}
              >
                Withdraw
              </Button>
            </div>

            {!address && (
              <p className="text-[11px] text-muted-foreground text-center">Connect wallet to deposit or withdraw</p>
            )}
          </CardContent>
        </Card>

        {/* Vault info */}
        <Card className="bg-card border-border rounded-lg">
          <CardContent className="p-4 flex flex-col gap-2">
            {[
              { label: "Collateral type", value: "0G (native)" },
              { label: "Contract", value: "0x...vault" },
              { label: "Agent", value: "Authorized ✓", valueClass: "text-[#34d399]" },
              { label: "Risk level", value: "Medium" },
              { label: "Stop loss", value: "5%" },
              { label: "Max leverage", value: "10×" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center bg-secondary rounded px-3 py-2">
                <span className="text-[11px] text-muted-foreground">{row.label}</span>
                <span className={cn("text-[11px] font-medium text-foreground", row.valueClass)}>{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="bg-card border-border rounded-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col gap-0">
            {VAULT_HISTORY.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full",
                      item.type === "deposit"
                        ? "bg-[#0f2a1e] text-[#34d399]"
                        : "bg-[#2a1515] text-[#f87171]"
                    )}
                  >
                    {item.type.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-medium text-foreground">{item.amount}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-[10px] text-muted-foreground">{item.time}</span>
                  <span className="text-[10px] text-[#60a5fa] font-mono">{item.tx}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
