import type {
  AgentStatus,
  DashboardData,
  DecisionsData,
  NewsData,
  PricesData,
  PositionsData,
  VaultHistoryData,
} from "@/lib/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

interface FetchOptions {
  method?: "GET" | "POST";
  body?: unknown;
}

async function fetcher<T>(path: string, wallet?: string, opts?: FetchOptions): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (wallet) {
    headers["Authorization"] = `Bearer ${wallet}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: opts?.method ?? "GET",
    headers,
    body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
  });
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

  getVaultHistory: (wallet: string): Promise<VaultHistoryData> =>
    fetcher<VaultHistoryData>("/vault/history", wallet),

  recordVaultEvent: (
    wallet: string,
    payload: { event_type: "deposit" | "withdraw"; amount: string; tx_hash: string },
  ): Promise<{ ok: boolean }> =>
    fetcher<{ ok: boolean }>("/vault/events", wallet, { method: "POST", body: payload }),

  getPositions: (wallet: string): Promise<PositionsData> =>
    fetcher<PositionsData>("/positions", wallet),

  getOpenPositions: (wallet: string): Promise<PositionsData> =>
    fetcher<PositionsData>("/positions/open", wallet),
};
