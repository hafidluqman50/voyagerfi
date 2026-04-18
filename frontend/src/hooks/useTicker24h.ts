import { useQuery } from "@tanstack/react-query";
import type { BinanceSymbol } from "./useKlines";

export type Ticker24h = {
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
};

export function useTicker24h(symbol: BinanceSymbol) {
  return useQuery<Ticker24h>({
    queryKey: ["ticker24h", symbol],
    queryFn: async () => {
      const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("ticker fetch failed");
      const raw = await res.json();
      return {
        lastPrice: parseFloat(raw.lastPrice),
        priceChange: parseFloat(raw.priceChange),
        priceChangePercent: parseFloat(raw.priceChangePercent),
        highPrice: parseFloat(raw.highPrice),
        lowPrice: parseFloat(raw.lowPrice),
        volume: parseFloat(raw.volume),
        quoteVolume: parseFloat(raw.quoteVolume),
      };
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });
}
