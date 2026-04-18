import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AgentStatus } from "@/lib/types";

export type { AgentStatus };

export function useAgentStatus() {
  return useQuery<AgentStatus>({
    queryKey: ["agent-status"],
    queryFn: () => api.getAgentStatus(),
    refetchInterval: 30_000,
    staleTime: 20_000,
    retry: 2,
  });
}
