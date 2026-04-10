"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

interface PositionsUIProps {
  address?: string;
  positions: unknown;
}

export function PositionsUI({ address, positions }: PositionsUIProps) {
  void positions;

  return (
    <div className="min-h-screen p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Positions</h1>
        <ConnectButton />
      </header>

      {!address ? (
        <div className="text-center py-20 text-muted-foreground">
          Connect your wallet to view positions
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="p-4 text-left">Direction</th>
                <th className="p-4 text-left">Size</th>
                <th className="p-4 text-left">Leverage</th>
                <th className="p-4 text-left">Entry Price</th>
                <th className="p-4 text-left">PnL</th>
                <th className="p-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No positions yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
