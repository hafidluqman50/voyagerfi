"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";

export function Topbar() {
  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-border bg-card shrink-0">
      {/* Mobile logo */}
      <div className="flex items-center gap-2.5 md:hidden">
        <Image src={'/logo_voyagerfi_nobg.png'} width={200} height={200} draggable={false} alt="Logo VoyagerFi" />
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
