import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Decision } from "@/lib/types";

export function useDecisions(limit = 50) {
  return useQuery<Decision[]>({
    queryKey: ["decisions", limit],
    queryFn: async () => {
      const data = await api.getDecisions(limit);
      return data.decisions ?? [];
    },
    refetchInterval: 30_000,
    staleTime: 20_000,
    retry: 1,
  });
}
