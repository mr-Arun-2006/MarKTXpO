import type { OHLCVCandle } from '../types/market';

export interface EodPriceChange {
  period: '1D' | '5D' | '1M' | '3M' | '1Y';
  percent: number | null;
}

export interface EodTechnicalSnapshot {
  ticker: string;
  companyName: string;
  source: string;
  retrievedAt: string;
  asOfDate: string;
  candleCount: number;
  latest: OHLCVCandle;
  priceChanges: EodPriceChange[];
  indicators: {
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    rsi14: number | null;
    macdLine: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    bollingerUpper: number | null;
    bollingerMiddle: number | null;
    bollingerLower: number | null;
    averageVolume20: number | null;
    volumeRatio20: number | null;
  };
  technicalBias: 'Bullish' | 'Bearish' | 'Mixed';
  signals: string[];
  limitations: string[];
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number | null, digits = 2): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  return mean(values.slice(-period));
}

function emaSeries(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const multiplier = 2 / (period + 1);
  const output = [values[0]];
  for (let i = 1; i < values.length; i += 1) {
    output.push(values[i] * multiplier + output[i - 1] * (1 - multiplier));
  }
  return output;
}

function rsi14(closes: number[]): number | null {
  if (closes.length < 15) return null;
  const changes = closes.slice(-15).slice(1).map((close, index) => close - closes.slice(-15)[index]);
  const gains = changes.map((change) => Math.max(change, 0));
  const losses = changes.map((change) => Math.max(-change, 0));
  const averageGain = mean(gains) ?? 0;
  const averageLoss = mean(losses) ?? 0;
  if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + averageGain / averageLoss);
}

function returnPercent(closes: number[], barsAgo: number): number | null {
  if (closes.length <= barsAgo) return null;
  const start = closes[closes.length - 1 - barsAgo];
  const latest = closes[closes.length - 1];
  if (!Number.isFinite(start) || start <= 0 || !Number.isFinite(latest)) return null;
  return ((latest / start) - 1) * 100;
}

function indiaMarketClock(date: Date): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    minutes: Number(value('hour')) * 60 + Number(value('minute')),
  };
}

/**
 * Produce a reproducible daily-bar report. It does not manufacture missing candles,
 * fundamentals, order-book information, or official-exchange status.
 */
export function calculateEodTechnicalSnapshot(
  ticker: string,
  companyName: string,
  inputCandles: OHLCVCandle[],
  retrievedAt = new Date(),
  source = 'Yahoo Finance chart API (third-party; not an official NSE/BSE feed)',
): EodTechnicalSnapshot | null {
  const candles = inputCandles
    .filter((candle) =>
      typeof candle.date === 'string'
      && Number.isFinite(candle.close) && candle.close > 0
      && Number.isFinite(candle.open) && candle.open > 0
      && Number.isFinite(candle.high) && candle.high > 0
      && Number.isFinite(candle.low) && candle.low > 0
      && candle.high >= candle.low,
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  if (candles.length === 0) return null;

  // Before 15:45 IST, exclude today's daily candle because it may still be forming.
  // The buffer allows a provider to finish publishing the exchange close.
  const marketClock = indiaMarketClock(retrievedAt);
  const marketCloseConfirmed = marketClock.minutes >= (15 * 60 + 45);
  let usableCandles = candles;
  if (!marketCloseConfirmed && candles[candles.length - 1].date === marketClock.date) {
    usableCandles = candles.slice(0, -1);
  }
  if (usableCandles.length === 0) return null;

  const closes = usableCandles.map((candle) => candle.close);
  const latest = usableCandles[usableCandles.length - 1];
  const previous = usableCandles.length > 1 ? usableCandles[usableCandles.length - 2] : null;

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const rsi = rsi14(closes);

  const fastEma = emaSeries(closes, 12);
  const slowEma = emaSeries(closes, 26);
  const macdSeries = fastEma.map((fast, index) => fast - slowEma[index]);
  const signalSeries = emaSeries(macdSeries, 9);
  const macdLine = macdSeries.length ? macdSeries[macdSeries.length - 1] : null;
  const macdSignal = signalSeries.length ? signalSeries[signalSeries.length - 1] : null;
  const macdHistogram = macdLine !== null && macdSignal !== null ? macdLine - macdSignal : null;

  const last20 = closes.slice(-20);
  const middle = mean(last20);
  const standardDeviation = middle === null
    ? null
    : Math.sqrt((mean(last20.map((close) => (close - middle) ** 2)) ?? 0));
  const bollingerUpper = middle !== null && standardDeviation !== null ? middle + 2 * standardDeviation : null;
  const bollingerLower = middle !== null && standardDeviation !== null ? middle - 2 * standardDeviation : null;

  const priorVolumes = usableCandles.slice(-21, -1).map((candle) => candle.volume).filter((volume) => Number.isFinite(volume) && volume > 0);
  const averageVolume = mean(priorVolumes);
  const volumeRatio = averageVolume && averageVolume > 0 && latest.volume > 0
    ? latest.volume / averageVolume
    : null;

  const scoreParts = [
    sma20 === null ? 0 : latest.close > sma20 ? 1 : -1,
    sma50 === null ? 0 : latest.close > sma50 ? 1 : -1,
    sma20 === null || sma50 === null ? 0 : sma20 > sma50 ? 1 : -1,
    macdHistogram === null ? 0 : macdHistogram > 0 ? 1 : -1,
    rsi === null ? 0 : rsi >= 50 ? 1 : -1,
  ];
  const score = scoreParts.reduce((total, part) => total + part, 0);
  const technicalBias: EodTechnicalSnapshot['technicalBias'] = score >= 2
    ? 'Bullish'
    : score <= -2
      ? 'Bearish'
      : 'Mixed';

  const signals: string[] = [];
  if (sma20 !== null) signals.push(latest.close > sma20 ? 'Close is above the 20-session average.' : 'Close is below the 20-session average.');
  if (sma50 !== null) signals.push(latest.close > sma50 ? 'Close is above the 50-session average.' : 'Close is below the 50-session average.');
  if (sma20 !== null && sma50 !== null) signals.push(sma20 > sma50 ? 'The 20-session average is above the 50-session average.' : 'The 20-session average is at or below the 50-session average.');
  if (rsi !== null) signals.push(rsi >= 70 ? 'RSI is in a high-momentum zone (70 or above).' : rsi <= 30 ? 'RSI is in a low-momentum zone (30 or below).' : `RSI(14) is ${round(rsi, 1)}.`);
  if (macdHistogram !== null) signals.push(macdHistogram > 0 ? 'MACD histogram is positive.' : 'MACD histogram is negative or flat.');
  if (volumeRatio !== null) signals.push(`Latest volume is ${round(volumeRatio, 2)}× the prior 20-session average.`);

  const limitations: string[] = [
    'Source data is third-party historical market data; it is not an official exchange feed unless a licensed official provider is configured.',
    'Technical indicators describe historical prices and volume; they do not guarantee future outcomes or constitute a buy/sell recommendation.',
  ];
  if (sma200 === null) limitations.push('At least 200 completed daily candles are needed for the 200-session moving average.');
  if (!marketCloseConfirmed && candles[candles.length - 1].date === marketClock.date) {
    limitations.push('The current-session daily candle was excluded because the market-close buffer has not elapsed.');
  }

  const changes: EodPriceChange[] = [
    { period: '1D', percent: previous ? ((latest.close / previous.close) - 1) * 100 : null },
    { period: '5D', percent: returnPercent(closes, 5) },
    { period: '1M', percent: returnPercent(closes, 21) },
    { period: '3M', percent: returnPercent(closes, 63) },
    { period: '1Y', percent: returnPercent(closes, 252) },
  ];

  return {
    ticker,
    companyName,
    source,
    retrievedAt: retrievedAt.toISOString(),
    asOfDate: latest.date,
    candleCount: usableCandles.length,
    latest: {
      ...latest,
      open: round(latest.open) ?? latest.open,
      high: round(latest.high) ?? latest.high,
      low: round(latest.low) ?? latest.low,
      close: round(latest.close) ?? latest.close,
    },
    priceChanges: changes.map((item) => ({ ...item, percent: round(item.percent) })),
    indicators: {
      sma20: round(sma20),
      sma50: round(sma50),
      sma200: round(sma200),
      rsi14: round(rsi, 1),
      macdLine: round(macdLine),
      macdSignal: round(macdSignal),
      macdHistogram: round(macdHistogram),
      bollingerUpper: round(bollingerUpper),
      bollingerMiddle: round(middle),
      bollingerLower: round(bollingerLower),
      averageVolume20: round(averageVolume, 0),
      volumeRatio20: round(volumeRatio),
    },
    technicalBias,
    signals,
    limitations,
  };
}
