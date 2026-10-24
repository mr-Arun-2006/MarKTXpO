import { StockData, OHLCVCandle } from '../types/market';

export interface BenchmarkIndex {
  name: string;
  exchange: 'NSE' | 'BSE';
  value: number;
  change: number;
  changePercent: number;
  isLive: boolean;
  source?: string;
}

export interface RealMarketResponse {
  success: boolean;
  count: number;
  dataSource: string;
  isLiveOfficial: boolean;
  timestamp: string;
  stocks: StockData[];
}

export interface RealBenchmarksResponse {
  success: boolean;
  dataSource: string;
  timestamp: string;
  benchmarks: BenchmarkIndex[];
}

export interface RealHistoryResponse {
  success: boolean;
  ticker: string;
  range: string;
  interval: string;
  count: number;
  dataSource: string;
  candles: OHLCVCandle[];
}

/**
 * Fetch 100% genuine real-time Indian equity stock quotes from NSE & BSE via server proxy
 */
export async function fetchRealStockQuotes(): Promise<RealMarketResponse | null> {
  try {
    const res = await fetch('/api/market/stocks');
    if (!res.ok) return null;
    const data: RealMarketResponse = await res.json();
    return data;
  } catch (err) {
    console.warn('[Market Client] Failed to fetch real stock quotes:', err);
    return null;
  }
}

/**
 * Fetch official benchmark indices (NIFTY 50, SENSEX, BANK NIFTY, NIFTY IT, INDIA VIX)
 */
export async function fetchRealBenchmarks(): Promise<BenchmarkIndex[]> {
  try {
    const res = await fetch('/api/market/benchmarks');
    if (!res.ok) return [];
    const data: RealBenchmarksResponse = await res.json();
    return data.benchmarks || [];
  } catch (err) {
    console.warn('[Market Client] Failed to fetch real benchmarks:', err);
    return [];
  }
}

/**
 * Fetch official multi-month historical EOD candles for a specific Indian stock
 */
export async function fetchRealStockHistory(
  ticker: string,
  range = '3mo',
  interval = '1d'
): Promise<OHLCVCandle[]> {
  try {
    const res = await fetch(`/api/market/history?ticker=${encodeURIComponent(ticker)}&range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`);
    if (!res.ok) return [];
    const data: RealHistoryResponse = await res.json();
    return data.candles || [];
  } catch (err) {
    console.warn(`[Market Client] Failed to fetch real history for ${ticker}:`, err);
    return [];
  }
}
