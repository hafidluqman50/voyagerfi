import type {
  AgentStatus,
  DashboardData,
  DecisionsData,
  NewsData,
  PricesData,
  PositionsData,
} from "@/lib/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

async function fetcher<T>(path: string, wallet?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (wallet) {
    headers["Authorization"] = `Bearer ${wallet}`;
  }
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getDashboard: (): Promise<DashboardData> =>
    fetcher<DashboardData>("/dashboard"),

  getPrices: (): Promise<PricesData> => fetcher<PricesData>("/prices"),

  getAgentStatus: (): Promise<AgentStatus> =>
    fetcher<AgentStatus>("/agent/status"),

  getDecisions: (limit = 50): Promise<DecisionsData> =>
    fetcher<DecisionsData>(`/decisions?limit=${limit}`),

  getNews: (): Promise<NewsData> => fetcher<NewsData>("/news"),

  getVaultHistory: (wallet: string) => fetcher("/vault/history", wallet),

  getPositions: (wallet: string): Promise<PositionsData> =>
    fetcher<PositionsData>("/positions", wallet),

  getOpenPositions: (wallet: string): Promise<PositionsData> =>
    fetcher<PositionsData>("/positions/open", wallet),
};
