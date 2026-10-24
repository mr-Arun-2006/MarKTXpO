import { StockData, OHLCVCandle, MarketAlert } from '../types/market';

export interface VolatilityMetric {
  ticker: string;
  stockName: string;
  currentPrice: number;
  intradayHigh: number;
  intradayLow: number;
  intradayRange: number; // in ₹
  intradayRangePercent: number; // in %
  average14DayRange: number; // in ₹
  average14DayRangePercent: number; // in %
  expansionRatio: number; // e.g. 1.25x
  expansionPercent: number; // e.g. +25%
  isExceeded: boolean;
  status: 'NORMAL' | 'ELEVATED' | 'EXCEEDED' | 'EXTREME';
  thresholdMultiplier: number;
}

/**
 * Calculates the 14-day average price range (High - Low) from daily OHLCV candles
 */
export function calculate14DayAverageRange(history: OHLCVCandle[]): number {
  if (!history || history.length === 0) return 0;
  // Use up to the last 14 candles
  const candles = history.slice(-14);
  if (candles.length === 0) return 0;

  const totalRange = candles.reduce((sum, c) => {
    const range = Math.max(0, (c.high ?? 0) - (c.low ?? 0));
    return sum + range;
  }, 0);

  return Math.round((totalRange / candles.length) * 100) / 100;
}

/**
 * Calculates current intraday price range (Today's High - Low)
 */
export function calculateIntradayRange(stock: StockData): {
  high: number;
  low: number;
  range: number;
  rangePercent: number;
} {
  const high = Math.max(stock.high || stock.currentPrice, stock.currentPrice);
  const low = Math.min(stock.low || stock.currentPrice, stock.currentPrice);
  const range = Math.max(0.05, Math.round((high - low) * 100) / 100);
  const rangePercent = stock.currentPrice > 0 ? Math.round((range / stock.currentPrice) * 10000) / 100 : 0;

  return {
    high,
    low,
    range,
    rangePercent,
  };
}

/**
 * Computes granular volatility metrics comparing intraday range against 14-day average
 */
export function computeStockVolatilityMetric(
  stock: StockData,
  thresholdMultiplier: number = 1.0
): VolatilityMetric {
  const { high, low, range: intradayRange, rangePercent: intradayRangePercent } = calculateIntradayRange(stock);
  const average14DayRange = calculate14DayAverageRange(stock.history);

  // Fallback if history is short: estimate 14-day baseline as ~1.8% of base price
  const effective14DayRange = average14DayRange > 0 ? average14DayRange : Math.round(stock.currentPrice * 0.018 * 100) / 100;

  const average14DayRangePercent =
    stock.currentPrice > 0
      ? Math.round((effective14DayRange / stock.currentPrice) * 10000) / 100
      : 1.8;

  const expansionRatio =
    effective14DayRange > 0
      ? Math.round((intradayRange / effective14DayRange) * 100) / 100
      : 1.0;

  const expansionPercent =
    effective14DayRange > 0
      ? Math.round(((intradayRange - effective14DayRange) / effective14DayRange) * 100)
      : 0;

  const isExceeded = intradayRange >= effective14DayRange * thresholdMultiplier;

  let status: VolatilityMetric['status'] = 'NORMAL';
  if (expansionRatio >= 1.5) {
    status = 'EXTREME';
  } else if (isExceeded) {
    status = 'EXCEEDED';
  } else if (expansionRatio >= 0.85) {
    status = 'ELEVATED';
  }

  return {
    ticker: stock.ticker,
    stockName: stock.name,
    currentPrice: stock.currentPrice,
    intradayHigh: high,
    intradayLow: low,
    intradayRange,
    intradayRangePercent,
    average14DayRange: effective14DayRange,
    average14DayRangePercent,
    expansionRatio,
    expansionPercent,
    isExceeded,
    status,
    thresholdMultiplier,
  };
}

/**
 * Creates a structured Volatility Expansion Alert object
 */
export function createVolatilityAlert(
  stock: StockData,
  metric: VolatilityMetric
): MarketAlert {
  const timestamp = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return {
    id: `alt-vol-${stock.ticker}-${Date.now()}`,
    ticker: stock.ticker,
    companyName: stock.name,
    type: 'VOLATILITY_EXPANSION',
    targetValue: metric.average14DayRange,
    currentValue: metric.intradayRange,
    intradayRange: metric.intradayRange,
    average14DayRange: metric.average14DayRange,
    expansionRatio: metric.expansionRatio,
    triggered: true,
    triggeredAt: timestamp,
    message: `Volatility Surge: Intraday price range ₹${metric.intradayRange.toFixed(
      2
    )} (${metric.intradayRangePercent}%) exceeded its 14-day average range of ₹${metric.average14DayRange.toFixed(
      2
    )} by ${metric.expansionPercent > 0 ? '+' : ''}${metric.expansionPercent}% (${metric.expansionRatio}x expansion).`,
  };
}

/**
 * Subtle toggleable audio chime synthesizer using Web Audio API
 */
export function playVolatilityChime(soundEnabled: boolean = true) {
  if (!soundEnabled || typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz) - Crisp attention tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.16);

    // Tone 2: A5 (880 Hz) - Harmonic melodic resolution
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.14);

    gain2.gain.setValueAtTime(0, now + 0.14);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.14);
    osc2.stop(now + 0.42);
  } catch (err) {
    // Graceful fallback if Web Audio is muted by browser policy
  }
}
