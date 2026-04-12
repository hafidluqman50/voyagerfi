"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Topbar() {
  return (
    <header className="h-14 flex items-center justify-end px-6 border-b border-border bg-card shrink-0">
      <ConnectButton
        showBalance={false}
        chainStatus="none"
        accountStatus="address"
      />
    </header>
  );
}
