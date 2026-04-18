"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { BinanceSymbol } from "@/hooks/useKlines";

export type ChartInterval =
  | "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

const INTERVAL_LIMIT: Record<ChartInterval, number> = {
  "1m":  300,
  "5m":  288,
  "15m": 192,
  "1h":  168,
  "4h":  120,
  "1d":  90,
};

type Candle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

type KlineStream = {
  k: {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
    x: boolean;
  };
};

function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function RealtimeCandleChart({
  symbol,
  interval = "1m",
  height = 420,
  onLastPrice,
}: {
  symbol: BinanceSymbol;
  interval?: ChartInterval;
  height?: number;
  onLastPrice?: (price: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastPriceCbRef = useRef(onLastPrice);
  lastPriceCbRef.current = onLastPrice;

  // stable string key — avoids "deps array changed size" from HMR
  const depKey = `${symbol}::${interval}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const positive = readCssVar("--positive", "#16a34a");
    const negative = readCssVar("--negative", "#dc2626");
    const muted    = readCssVar("--muted-foreground", "#64748b");
    const border   = readCssVar("--border", "#e2e8f0");
    const limit    = INTERVAL_LIMIT[interval as ChartInterval] ?? 300;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: muted,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      },
      grid: {
        vertLines: { color: border, style: LineStyle.Dotted },
        horzLines: { color: border, style: LineStyle.Dotted },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: interval === "1m" || interval === "5m",
      },
      rightPriceScale: { borderVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:      positive,
      downColor:    negative,
      borderVisible: false,
      wickUpColor:   positive,
      wickDownColor: negative,
    });
    seriesRef.current = candleSeries;

    let disposed = false;
    let ws: WebSocket | null = null;

    fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    )
      .then((r) => r.json())
      .then((rows: unknown[][]) => {
        if (disposed) return;
        const data: Candle[] = rows.map((k) => ({
          time:  Math.floor(Number(k[0]) / 1000) as UTCTimestamp,
          open:  parseFloat(String(k[1])),
          high:  parseFloat(String(k[2])),
          low:   parseFloat(String(k[3])),
          close: parseFloat(String(k[4])),
        }));
        candleSeries.setData(data);
        chart.timeScale().fitContent();
        const last = data[data.length - 1];
        if (last) lastPriceCbRef.current?.(last.close);
      })
      .catch(() => {});

    ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
    );
    ws.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data) as KlineStream;
        const k = payload.k;
        const candle: Candle = {
          time:  Math.floor(k.t / 1000) as UTCTimestamp,
          open:  parseFloat(k.o),
          high:  parseFloat(k.h),
          low:   parseFloat(k.l),
          close: parseFloat(k.c),
        };
        candleSeries.update(candle);
        lastPriceCbRef.current?.(candle.close);
      } catch {}
    };

    return () => {
      disposed = true;
      ws?.close();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
