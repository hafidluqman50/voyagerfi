const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

async function fetcher<T>(path: string, wallet?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (wallet) {
    headers["Authorization"] = `Bearer ${wallet}`;
  }

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getDashboard: () => fetcher("/dashboard"),
  getVaultHistory: (wallet: string) => fetcher("/vault/history", wallet),
  getPositions: (wallet: string) => fetcher("/positions", wallet),
  getOpenPositions: (wallet: string) => fetcher("/positions/open", wallet),
};
