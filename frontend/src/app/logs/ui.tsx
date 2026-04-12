"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DECISIONS = [
  {
    id: 1,
    time: "Apr 12, 14:32",
    action: "Long" as const,
    pair: "ETH-PERP",
    signals: { macro: 72, micro: 51, technical: 84 },
    reasoning:
      "Strong bullish momentum confirmed by technical indicators. RSI at 32 (oversold), MACD crossover positive. Macro: Fed rate hold reduces risk-off pressure on risk assets.",
    decisionHash: "0x3a7f8b2c...d4e1",
    storageRoot:  "0xf4e2a91c...3b7f",
    txHash:       "0x7f2a3e1b...c4d9",
  },
  {
    id: 2,
    time: "Apr 12, 14:27",
    action: "Hold" as const,
    pair: null,
    signals: { macro: 51, micro: 48, technical: 55 },
    reasoning:
      "Mixed signals across all sources. Insufficient conviction to open a new position. Monitoring for a clearer directional signal before next cycle.",
    decisionHash: "0x8b1cd4e7...2a3f",
    storageRoot:  "0xa3c17f2e...9b1d",
    txHash:       null,
  },
  {
    id: 3,
    time: "Apr 12, 13:58",
    action: "Short" as const,
    pair: "BTC-PERP",
    signals: { macro: 38, micro: 29, technical: 42 },
    reasoning:
      "BTC whale moved 2,400 BTC to exchange wallets — historically a distribution signal. SEC news added negative macro sentiment. Price sitting at upper Bollinger band.",
    decisionHash: "0x2d9a8e3f...c1b7",
    storageRoot:  "0xb7f32d1a...e4c8",
    txHash:       "0x3c1b9a4f...d2e6",
  },
];

const ACTION_STYLE = {
  Long:  { badge: "bg-up-muted text-up border-transparent",      dot: "bg-up"      },
  Short: { badge: "bg-down-muted text-down border-transparent",   dot: "bg-down"    },
  Hold:  { badge: "bg-accent text-neutral border-transparent",    dot: "bg-neutral" },
} as const;

function signalVariant(v: number) {
  if (v >= 65) return "text-up";
  if (v <= 40) return "text-down";
  return "text-neutral";
}

export function LogsUI() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-5 max-w-4xl">

        {/* Page header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-lg font-semibold">Decision Logs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Every trade decision is hashed on-chain and stored in 0G Storage — fully verifiable.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-up">
            <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
            Verifiable
          </div>
        </div>

        {/* Decision cards */}
        <div className="flex flex-col gap-3">
          {DECISIONS.map((d) => {
            const style = ACTION_STYLE[d.action];
            return (
              <Card key={d.id} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Badge variant="outline" className={cn("text-xs px-2.5 py-0.5", style.badge)}>
                        {d.action}
                      </Badge>
                      {d.pair && (
                        <span className="text-sm font-medium">{d.pair}</span>
                      )}
                      <span className="text-sm text-muted-foreground">{d.time}</span>
                    </div>
                    {d.txHash && (
                      <span className="text-xs text-primary font-mono hover:underline cursor-pointer">
                        Tx {d.txHash} ↗
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4 pt-0">

                  {/* Signals inline */}
                  <div className="flex items-center gap-6">
                    {[
                      { label: "Macro",     v: d.signals.macro     },
                      { label: "Micro",     v: d.signals.micro     },
                      { label: "Technical", v: d.signals.technical },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">{s.label}</span>
                        <span className={cn("text-sm font-medium tabular-nums", signalVariant(s.v))}>
                          {s.v}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Reasoning */}
                  <p className="text-sm text-foreground/80 leading-relaxed bg-secondary rounded-lg px-4 py-3">
                    {d.reasoning}
                  </p>

                  {/* On-chain proofs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-secondary px-4 py-3">
                      <p className="text-xs text-muted-foreground mb-1">Decision Hash</p>
                      <p className="text-sm font-mono text-primary">{d.decisionHash}</p>
                    </div>
                    <div className="rounded-lg bg-secondary px-4 py-3">
                      <p className="text-xs text-muted-foreground mb-1">0G Storage Root</p>
                      <p className="text-sm font-mono text-primary">{d.storageRoot}</p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
