"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Topbar() {
  console.log("WC ID:", process.env.NEXT_PUBLIC_WC_PROJECT_ID)
  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-border bg-card shrink-0">
      {/* Mobile logo */}
      <div className="flex items-center gap-2.5 md:hidden">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-white font-bold text-xs">V</span>
        </div>
        <span className="font-semibold text-[15px]">VoyagerFi</span>
      </div>

      <div className="hidden md:block" />

      {/* Desktop: full ConnectButton */}
      <div className="hidden md:block">
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
      </div>

      {/* Mobile: compact ConnectButton */}
      <div className="md:hidden">
        <ConnectButton
          showBalance={false}
          chainStatus="none"
          accountStatus="avatar"
          label="Connect"
        />
      </div>
    </header>
  );
}
