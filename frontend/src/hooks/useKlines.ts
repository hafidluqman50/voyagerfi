import { useQuery } from "@tanstack/react-query";

export type BinanceSymbol =
  | "ETHUSDT"
  | "BTCUSDT"
  | "SOLUSDT"
  | "ARBUSDT"
  | "BNBUSDT";

export type Kline = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export function useKlines(symbol: BinanceSymbol, limit = 60) {
  return useQuery<Kline[]>({
    queryKey: ["klines", symbol, limit],
    queryFn: async () => {
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("klines fetch failed");
      const rows: unknown[][] = await res.json();
      return rows.map((k) => ({
        time: Math.floor(Number(k[0]) / 1000),
        open: parseFloat(String(k[1])),
        high: parseFloat(String(k[2])),
        low: parseFloat(String(k[3])),
        close: parseFloat(String(k[4])),
      }));
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 1,
  });
}
