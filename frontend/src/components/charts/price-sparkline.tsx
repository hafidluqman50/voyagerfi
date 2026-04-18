"use client";

import { useKlines, type BinanceSymbol } from "@/hooks/useKlines";

function buildPath(points: number[]): { line: string; area: string } | null {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const mapped = points.map(
    (p, i) =>
      [
        (i / (points.length - 1)) * 100,
        4 + (1 - (p - min) / range) * 92,
      ] as [number, number]
  );
  const line = mapped
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L100,100 L0,100 Z`;
  return { line, area };
}

export function PriceSparkline({
  symbol,
  fallbackPoints,
}: {
  symbol: BinanceSymbol;
  fallbackPoints: number[];
}) {
  const { data } = useKlines(symbol, 60);
  const points = data && data.length > 0 ? data.map((k) => k.close) : fallbackPoints;

  const paths = buildPath(points);
  if (!paths) return null;

  const positive = points[points.length - 1] >= points[0];
  const color = positive ? "var(--positive)" : "var(--negative)";

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      <path d={paths.area} fill={color} opacity="0.08" />
      <path
        d={paths.line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
