import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { VaultEvent } from "@/lib/types";

export function useVaultPnl(wallet: string | undefined) {
  return useQuery<number | null>({
    queryKey: ["vault-pnl", wallet],
    queryFn: async () => {
      const data = await api.getVaultHistory(wallet!);
      const events: VaultEvent[] = data.events ?? [];
      if (events.length === 0) return null;
      return events.reduce((acc, e) => {
        const amt = parseInt(e.amount, 10) / 1e6;
        return e.event_type === "deposit" ? acc + amt : acc - amt;
      }, 0);
    },
    enabled: !!wallet,
    staleTime: 30_000,
    retry: 1,
  });
}
