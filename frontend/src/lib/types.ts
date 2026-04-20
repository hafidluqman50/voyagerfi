export interface PriceInfo {
  price: number;
  timestamp: number;
  error?: string;
}

export interface PricesData {
  eth: PriceInfo;
  btc: PriceInfo;
}

export interface AgentStatus {
  running: boolean;
  last_tick: string;
  total_trades: number;
  win_rate: number;
  last_price: number;
  total_ticks: number;
}

export interface Decision {
  id: number;
  decision_hash: string;
  storage_root: string;
  action: string;        // "open_long" | "open_short" | "close" | "hold"
  reasoning: string;
  signal_ids: string;
  tx_hash: string;
  created_at: string;
}

export interface Position {
  id: number;
  trader: string;
  pair: string;
  direction: "long" | "short";
  size: string;
  leverage: number;
  entry_price: string;
  exit_price: string;
  margin: string;
  pnl: string;
  is_open: boolean;
  tx_hash: string;
  position_id: number;
  created_at: string;
  closed_at: string | null;
}

export interface DashboardData {
  recent_decisions: Decision[];
  open_positions: Position[] | null;
}

export interface PositionsData {
  positions: Position[];
}

export interface DecisionsData {
  decisions: Decision[];
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  sentiment: string;
}

export interface NewsData {
  news: NewsArticle[];
}

export type AgentWsTick = {
  type: "tick";
  price: number;
  direction: string;
  strength: number;
  action: string;
  timestamp: string;
};
