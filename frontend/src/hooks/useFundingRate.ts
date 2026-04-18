import { useQuery } from "@tanstack/react-query";
import type { BinanceSymbol } from "./useKlines";

export type FundingInfo = {
  markPrice: number;
  indexPrice: number;
  lastFundingRate: number;
  nextFundingTime: number;
};

export function useFundingRate(symbol: BinanceSymbol) {
  return useQuery<FundingInfo>({
    queryKey: ["fundingRate", symbol],
    queryFn: async () => {
      const url = `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("funding fetch failed");
      const raw = await res.json();
      return {
        markPrice:       parseFloat(raw.markPrice),
        indexPrice:      parseFloat(raw.indexPrice),
        lastFundingRate: parseFloat(raw.lastFundingRate),
        nextFundingTime: Number(raw.nextFundingTime),
      };
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 1,
  });
}
