"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function LandingUI() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tight">VoyagerFi</h1>
        <p className="text-xl text-muted-foreground max-w-lg">
          Autonomous quant trading agent on 0G Chain. Deposit, sleep, profit.
        </p>
      </div>

      <div className="flex gap-4 items-center">
        <ConnectButton />
        <Link href="/dashboard">
          <Button variant="outline" size="lg">
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
