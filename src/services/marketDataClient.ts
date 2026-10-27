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
 * Fetch Indian equity quote metadata from the configured server API
 */
export async function fetchRealStockQuotes(): Promise<RealMarketResponse | null> {
  try {
    const res = await fetch('/api/market/stocks', { cache: 'no-store' });
    if (!res.ok) return null;
    const data: RealMarketResponse = await res.json();
    return data;
  } catch (err) {
    console.warn('[Market Client] Failed to fetch real stock quotes:', err);
    return null;
  }
}

/**
 * Fetch benchmark index quote metadata
 */
export async function fetchRealBenchmarks(): Promise<BenchmarkIndex[]> {
  try {
    const res = await fetch('/api/market/benchmarks', { cache: 'no-store' });
    if (!res.ok) return [];
    const data: RealBenchmarksResponse = await res.json();
    return data.benchmarks || [];
  } catch (err) {
    console.warn('[Market Client] Failed to fetch real benchmarks:', err);
    return [];
  }
}

/**
 * Fetch third-party historical candles for a specific Indian stock
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
