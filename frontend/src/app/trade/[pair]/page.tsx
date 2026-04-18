import { TradePairUI } from "./ui";

export default async function TradePairPage({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair } = await params;
  return <TradePairUI pair={decodeURIComponent(pair)} />;
}
