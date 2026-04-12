"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Badge } from "@/components/ui/badge";

export function Topbar() {
  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="text-[10px] px-2 py-0.5 rounded-full border-[#064e3b] bg-[#0f2a1e] text-[#34d399] font-normal"
        >
          0G Mainnet
        </Badge>
      </div>
      <ConnectButton
        showBalance={false}
        chainStatus="none"
        accountStatus="address"
      />
    </header>
  );
}
