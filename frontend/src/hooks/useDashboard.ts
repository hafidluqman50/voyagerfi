import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardData, Decision, Position } from "@/lib/types";

export type { DashboardData, Decision, Position };

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
    refetchInterval: 30_000,
    staleTime: 20_000,
    retry: 2,
  });
}
