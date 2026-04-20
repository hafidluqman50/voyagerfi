"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import Link from "next/link";

export function LandingUI() {
  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Nav ── */}
      <header className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-border bg-card">
        <div className="flex items-center gap-2.5">
          {/*<div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs tracking-tight">VF</span>
          </div>
          <span className="font-semibold text-[14px] tracking-tight">VoyagerFi</span>*/}
          <Image src={'/logo_voyagerfi_nobg.png'} width={200} height={200} draggable={false} alt="Logo VoyagerFi" />
        </div>
        <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-lg text-center space-y-6">

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-[48px] font-semibold tracking-tight leading-[1.1] text-foreground">
              Your crypto,
              <br />
              traded automatically.
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Deposit USDC.e. The AI monitors the market 24/7 and trades on your behalf. Every decision is recorded on-chain — nothing is hidden.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Open App
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 8h14M9 2l6 6-6 6" />
              </svg>
            </Link>
            <Link
              href="/logs"
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              View trade history
            </Link>
          </div>
        </div>

        {/* ── Trust stats ── */}
        <div className="mt-20 border border-border rounded-xl bg-card overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { value: "0G Chain",  label: "Settlement layer" },
              { value: "TEE",       label: "Verified AI inference" },
              { value: "24 / 7",    label: "Always running" },
            ].map((s) => (
              <div key={s.label} className="text-center px-10 py-5">
                <p className="text-lg font-semibold tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="flex items-center justify-center h-14 text-xs text-muted-foreground border-t border-border">
        Built for 0G APAC Hackathon · {new Date().getFullYear()}
      </footer>
    </div>
  );
}