"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const TX_HISTORY = [
  { type: "Deposit",  amount: "500 0G",   time: "Apr 10, 14:32", tx: "0x7f2a...3e1b" },
  { type: "Deposit",  amount: "1,000 0G", time: "Apr 8, 09:14",  tx: "0x3c1b...9a4f" },
  { type: "Withdraw", amount: "200 0G",   time: "Apr 5, 18:22",  tx: "0x9d3e...2c7a" },
];

export function VaultUI({ address }: { address?: string }) {
  return (
    <AppLayout>
      <div className="flex flex-col gap-5 max-w-3xl">

        {/* Balance */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
            <p className="text-4xl font-bold tracking-tight">
              1,300 <span className="text-xl font-normal text-muted-foreground">0G</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">≈ $6,266 USD</p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-xs text-muted-foreground mb-1">Available</p>
                <p className="text-lg font-semibold">1,050 <span className="text-sm font-normal text-muted-foreground">0G</span></p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-xs text-muted-foreground mb-1">Locked (margin)</p>
                <p className="text-lg font-semibold">250 <span className="text-sm font-normal text-muted-foreground">0G</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Deposit</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Amount (0G)</p>
                <Input
                  placeholder="0.00"
                  className="bg-secondary border-border text-foreground"
                  disabled={!address}
                />
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={!address}
              >
                Deposit
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Withdraw</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-muted-foreground">Amount (0G)</p>
                  <button className="text-xs text-primary">Max</button>
                </div>
                <Input
                  placeholder="0.00"
                  className="bg-secondary border-border text-foreground"
                  disabled={!address}
                />
              </div>
              <Button
                variant="outline"
                className="w-full border-border hover:bg-accent hover:text-foreground"
                disabled={!address}
              >
                Withdraw
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Vault params */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Vault Parameters</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0 pb-0">
            <Table>
              <TableBody>
                {[
                  { label: "Collateral type", value: "0G (native)"    },
                  { label: "Agent wallet",    value: "Authorized",     special: "up"  },
                  { label: "Risk level",      value: "Medium"          },
                  { label: "Stop loss",       value: "5%"              },
                  { label: "Max leverage",    value: "10×"             },
                  { label: "TEE verified",    value: "Active",          special: "up"  },
                ].map((r) => (
                  <TableRow key={r.label} className="border-border hover:bg-accent/40">
                    <TableCell className="text-sm text-muted-foreground">{r.label}</TableCell>
                    <TableCell
                      className={cn(
                        "text-sm font-medium text-right",
                        r.special === "up" ? "text-up" : "text-foreground"
                      )}
                    >
                      {r.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs text-right">Tx</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TX_HISTORY.map((t, i) => (
                  <TableRow key={i} className="border-border hover:bg-accent/40">
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs border-transparent",
                          t.type === "Deposit"
                            ? "bg-up-muted text-up"
                            : "bg-down-muted text-down"
                        )}
                      >
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{t.amount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.time}</TableCell>
                    <TableCell className="text-sm text-right text-primary font-mono">{t.tx}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {!address && (
          <p className="text-sm text-muted-foreground text-center">
            Connect your wallet to manage your vault
          </p>
        )}
      </div>
    </AppLayout>
  );
}
