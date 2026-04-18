import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Position } from "@/lib/types";

export function usePositions(wallet: string | undefined) {
  return useQuery<Position[]>({
    queryKey: ["positions", wallet],
    queryFn: async () => {
      const data = await api.getPositions(wallet!);
      return data.positions ?? [];
    },
    enabled: !!wallet,
    refetchInterval: 30_000,
    staleTime: 20_000,
    retry: 1,
  });
}

export function useOpenPositions(wallet: string | undefined) {
  return useQuery<Position[]>({
    queryKey: ["positions-open", wallet],
    queryFn: async () => {
      const data = await api.getOpenPositions(wallet!);
      return data.positions ?? [];
    },
    enabled: !!wallet,
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });
}
