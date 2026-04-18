import { useQuery } from "@tanstack/react-query";
import type { PricesData } from "@/lib/types";

const ETH_ID = "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
const BTC_ID = "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

async function fetchPythPrices(): Promise<PricesData> {
  const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${ETH_ID}&ids[]=${BTC_ID}&parsed=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Pyth fetch failed");

  const data = await res.json();
  const parsed: Array<{
    id: string;
    price: { price: string; expo: number; publish_time: number };
  }> = data.parsed;

  const toFloat = (p: { price: string; expo: number }) =>
    parseFloat(p.price) * Math.pow(10, p.expo);

  const eth = parsed.find((p) => p.id === ETH_ID);
  const btc = parsed.find((p) => p.id === BTC_ID);

  return {
    eth: {
      price: eth ? toFloat(eth.price) : 0,
      timestamp: eth?.price.publish_time ?? 0,
    },
    btc: {
      price: btc ? toFloat(btc.price) : 0,
      timestamp: btc?.price.publish_time ?? 0,
    },
  };
}

export type { PricesData };

export function usePrices() {
  return useQuery<PricesData>({
    queryKey: ["prices"],
    queryFn: fetchPythPrices,
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 2,
  });
}
