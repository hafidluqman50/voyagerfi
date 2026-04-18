import { notFound } from "next/navigation";
import { MarketDetail, type MarketMeta } from "./ui";

const SYMBOLS: Record<string, MarketMeta> = {
  eth: {
    name: "Ethereum",
    ticker: "ETHUSDT",
    short: "ETH",
    long: "ETH / USD",
    accent: "#3B5BC4",
    bg: "#ECF0FD",
  },
  btc: {
    name: "Bitcoin",
    ticker: "BTCUSDT",
    short: "BTC",
    long: "BTC / USD",
    accent: "#C4761A",
    bg: "#FDF3E7",
  },
};

export default async function MarketPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const meta = SYMBOLS[symbol.toLowerCase()];
  if (!meta) notFound();
  return <MarketDetail meta={meta} />;
}
