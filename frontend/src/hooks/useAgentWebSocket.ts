import { useEffect, useRef, useState } from "react";
import type { AgentWsTick } from "@/lib/types";

const WEBSOCKET_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1")
    .replace(/^http/, "ws")
    .replace("/api/v1", "") + "/api/v1/ws";

export function useAgentWebSocket() {
  const [lastTick, setLastTick] = useState<AgentWsTick | null>(null);
  const [connected, setConnected] = useState(false);
  const connectionRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let disposed = false;

    function connect() {
      if (disposed) return;
      const socket = new WebSocket(WEBSOCKET_URL);
      connectionRef.current = socket;

      socket.onopen = () => { if (!disposed) setConnected(true); };

      socket.onmessage = (event) => {
        if (disposed) return;
        try {
          const data = JSON.parse(event.data) as AgentWsTick;
          if (data.type === "tick") setLastTick(data);
        } catch {}
      };

      socket.onclose = () => {
        if (disposed) return;
        setConnected(false);
        retryTimerRef.current = setTimeout(connect, 5_000);
      };

      socket.onerror = () => socket.close();
    }

    connect();

    return () => {
      disposed = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      connectionRef.current?.close();
    };
  }, []);

  return { lastTick, connected };
}
