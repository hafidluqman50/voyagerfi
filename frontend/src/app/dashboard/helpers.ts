import { fmtTime } from "@/lib/format";
import type { Position } from "@/lib/types";

export const ETH_PTS_FALLBACK = [3180, 3210, 3195, 3240, 3225, 3265, 3250, 3290, 3275, 3310, 3295, 3340, 3320, 3349];
export const BTC_PTS_FALLBACK = [66800, 67100, 66900, 67400, 67200, 67500, 67300, 67600, 67100, 66900, 66700, 66500, 66400, 66618];

export function buildTradeRows(positions: Position[]) {
  return positions.slice(0, 5).map((p) => {
    const entry = `$${parseFloat(p.entry_price).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
    const pnlStr = p.pnl || (p.is_open ? "—" : "0%");
    const marginUsdc = parseFloat(p.margin ?? "0") / 1e6;
    return {
      pair: p.pair ?? "ETH/USDC",
      size: Number.isFinite(marginUsdc) && marginUsdc > 0 ? `${marginUsdc.toFixed(2)} USDC` : "—",
      entry,
      pnl: pnlStr,
      pos: !pnlStr.startsWith("-"),
      time: fmtTime(p.created_at),
    };
  });
}
