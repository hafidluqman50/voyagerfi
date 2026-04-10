"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

interface LogsUIProps {
  dashboard: unknown;
}

export function LogsUI({ dashboard }: LogsUIProps) {
  void dashboard;

  return (
    <div className="min-h-screen p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Decision Logs</h1>
        <ConnectButton />
      </header>

      <p className="text-sm text-muted-foreground mb-4">
        Verifiable trade decisions — each entry is hashed on-chain via DecisionLog and stored in 0G Storage.
      </p>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b text-sm text-muted-foreground">
              <th className="p-4 text-left">Time</th>
              <th className="p-4 text-left">Action</th>
              <th className="p-4 text-left">Decision Hash</th>
              <th className="p-4 text-left">Reasoning</th>
              <th className="p-4 text-left">Tx</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="p-8 text-center text-muted-foreground">
                No decisions yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
