import type { BacktestResult, BacktestTrade, CustomStrategy, OHLCVCandle, StrategyRule } from '../types/market';

export interface HistoricalBacktestOutcome {
  result: BacktestResult;
  source: string;
  startDate: string;
  endDate: string;
  candleCount: number;
  unsupportedRules: string[];
  slippagePercentPerSide: number;
}

interface Indicators {
  rsi: number | null;
  macdHistogram: number | null;
  sma50: number | null;
  sma200: number | null;
  bollingerDistance: number | null;
  volumeRatio: number | null;
}

const SLIPPAGE_PERCENT_PER_SIDE = 0.04;
const RISK_FREE_RATE_ANNUAL = 0.065;
const POSITION_ALLOCATION = 0.25;

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sma(values: number[], index: number, period: number): number | null {
  if (index < period - 1) return null;
  return mean(values.slice(index - period + 1, index + 1));
}

function emaSeries(values: number[], period: number): number[] {
  if (!values.length) return [];
  const multiplier = 2 / (period + 1);
  const output = [values[0]];
  for (let i = 1; i < values.length; i += 1) {
    output.push(values[i] * multiplier + output[i - 1] * (1 - multiplier));
  }
  return output;
}

function calculateRsi(closes: number[], index: number, period = 14): number | null {
  if (index < period) return null;
  let gain = 0;
  let loss = 0;
  for (let i = index - period + 1; i <= index; i += 1) {
    const change = closes[i] - closes[i - 1];
    gain += Math.max(change, 0);
    loss += Math.max(-change, 0);
  }
  const averageGain = gain / period;
  const averageLoss = loss / period;
  if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + averageGain / averageLoss);
}

function buildIndicators(candles: OHLCVCandle[]): Indicators[] {
  const closes = candles.map((candle) => candle.close);
  const fastEma = emaSeries(closes, 12);
  const slowEma = emaSeries(closes, 26);
  const macdLine = fastEma.map((fast, index) => fast - slowEma[index]);
  const macdSignal = emaSeries(macdLine, 9);

  return candles.map((candle, index) => {
    const average20 = sma(closes, index, 20);
    const last20 = closes.slice(Math.max(0, index - 19), index + 1);
    const middle = mean(last20);
    const standardDeviation = middle === null
      ? null
      : Math.sqrt(mean(last20.map((price) => (price - middle) ** 2)) ?? 0);
    const priorVolumes = index >= 20
      ? candles.slice(index - 20, index).map((bar) => bar.volume).filter((volume) => Number.isFinite(volume) && volume > 0)
      : [];
    const averageVolume = mean(priorVolumes);

    return {
      rsi: calculateRsi(closes, index),
      macdHistogram: macdLine[index] - macdSignal[index],
      sma50: sma(closes, index, 50),
      sma200: sma(closes, index, 200),
      bollingerDistance: average20 !== null && standardDeviation !== null
        ? candle.close - (average20 - 2 * standardDeviation)
        : null,
      volumeRatio: averageVolume && averageVolume > 0 && candle.volume > 0
        ? candle.volume / averageVolume
        : null,
    };
  });
}

function indicatorValue(rule: StrategyRule, candle: OHLCVCandle, indicator: Indicators): number | null {
  switch (rule.indicator) {
    case 'RSI': return indicator.rsi;
    case 'MACD': return indicator.macdHistogram;
    case 'DMA_50_CROSS': return indicator.sma50 === null ? null : candle.close - indicator.sma50;
    case 'DMA_200_CROSS': return indicator.sma200 === null ? null : candle.close - indicator.sma200;
    case 'BOLLINGER_BAND': return indicator.bollingerDistance;
    case 'VOLUME_SURGE': return indicator.volumeRatio;
    case 'NSE_BSE_SPREAD':
    case 'DELIVERY_PERCENT':
      return null;
  }
}

function rulePasses(
  rule: StrategyRule,
  currentCandle: OHLCVCandle,
  previousCandle: OHLCVCandle,
  current: Indicators,
  previous: Indicators,
): boolean {
  const value = indicatorValue(rule, currentCandle, current);
  const previousValue = indicatorValue(rule, previousCandle, previous);
  if (value === null || !Number.isFinite(value)) return false;

  switch (rule.operator) {
    case '<': return value < rule.value;
    case '<=': return value <= rule.value;
    case '>': return value > rule.value;
    case '>=': return value >= rule.value;
    case 'CROSSES_ABOVE':
      return previousValue !== null && previousValue <= rule.value && value > rule.value;
    case 'CROSSES_BELOW':
      return previousValue !== null && previousValue >= rule.value && value < rule.value;
  }
}

function round(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function runHistoricalBacktest(
  ticker: string,
  inputCandles: OHLCVCandle[],
  strategy: CustomStrategy,
  durationYears: number,
  initialCapital: number,
  source: string,
): HistoricalBacktestOutcome {
  const validCandles = inputCandles
    .filter((candle) =>
      /^\d{4}-\d{2}-\d{2}$/.test(candle.date)
      && [candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite)
      && candle.open > 0 && candle.high > 0 && candle.low > 0 && candle.close > 0
      && candle.high >= candle.low && candle.volume >= 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  // Exclude today's daily bar until the 15:45 India-time close buffer has elapsed.
  const indiaParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const part = (key: string) => indiaParts.find((item) => item.type === key)?.value || '';
  const indiaDate = part('year') + '-' + part('month') + '-' + part('day');
  const indiaMinutes = Number(part('hour')) * 60 + Number(part('minute'));
  const latestInputDate = validCandles[validCandles.length - 1]?.date;
  const completedCandles = indiaMinutes < 945 && latestInputDate === indiaDate
    ? validCandles.slice(0, -1)
    : validCandles;

  if (completedCandles.length < 205) {
    throw new Error('At least 205 valid daily candles are required for this backtest. No simulated substitute is used.');
  }
  if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
    throw new Error('Initial capital must be a positive finite amount.');
  }
  if (![1, 3, 5].includes(durationYears)) {
    throw new Error('Choose a supported backtest period: 1, 3, or 5 years.');
  }

  const lastDate = new Date(completedCandles[completedCandles.length - 1].date + 'T00:00:00Z');
  const earliest = new Date(lastDate);
  earliest.setUTCFullYear(earliest.getUTCFullYear() - durationYears);
  const candles = completedCandles.filter((candle) =>
    new Date(candle.date + 'T00:00:00Z') >= earliest,
  );
  if (candles.length < 205) {
    throw new Error('The source returned too little daily history for the selected period.');
  }

  const indicatorSeries = buildIndicators(candles);
  const unsupportedRules = [...new Set(strategy.rules
    .filter((rule) => rule.indicator === 'NSE_BSE_SPREAD' || rule.indicator === 'DELIVERY_PERCENT')
    .map((rule) => rule.indicator))];

  let realizedEquity = initialCapital;
  let position: {
    entryDate: string;
    entryPrice: number;
    allocation: number;
    stopPrice: number;
    targetPrice: number;
    peakClose: number;
  } | null = null;
  let pendingEntry = false;
  let pendingExit = false;
  let grossWins = 0;
  let grossLosses = 0;
  let wins = 0;
  let losses = 0;
  let maxDrawdown = 0;
  let peakEquity = initialCapital;
  let nextTradeId = 1;
  const trades: BacktestTrade[] = [];
  const equityCurve: { date: string; equity: number; benchmark: number }[] = [];
  const firstClose = candles[0].close;
  const slippage = SLIPPAGE_PERCENT_PER_SIDE / 100;

  const closePosition = (date: string, rawExitPrice: number, reason: string) => {
    if (!position) return;
    const exitPrice = rawExitPrice * (1 - slippage);
    const pnlPercent = (exitPrice / position.entryPrice - 1) * 100;
    const pnlRupees = position.allocation * pnlPercent / 100;
    realizedEquity += pnlRupees;
    if (pnlRupees >= 0) {
      wins += 1;
      grossWins += pnlRupees;
    } else {
      losses += 1;
      grossLosses += Math.abs(pnlRupees);
    }
    trades.push({
      id: 'trade-' + nextTradeId++,
      date: position.entryDate,
      ticker,
      action: 'BUY',
      price: round(position.entryPrice),
      exitDate: date,
      exitPrice: round(exitPrice),
      pnlPercent: round(pnlPercent),
      pnlRupees: round(pnlRupees),
      status: 'CLOSED',
      reason,
    });
    position = null;
    pendingExit = false;
  };

  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];
    const previousCandle = candles[index - 1];
    const currentIndicators = indicatorSeries[index];
    const previousIndicators = indicatorSeries[index - 1];

    // Signals formed after a close execute at the following session's open.
    if (pendingExit && position) closePosition(candle.date, candle.open, 'Sell rule at next session open');
    if (pendingEntry && !position) {
      const entryPrice = candle.open * (1 + slippage);
      position = {
        entryDate: candle.date,
        entryPrice,
        allocation: realizedEquity * POSITION_ALLOCATION,
        stopPrice: entryPrice * (1 - strategy.stopLossPercent / 100),
        targetPrice: entryPrice * (1 + strategy.targetProfitPercent / 100),
        peakClose: entryPrice,
      };
    }
    pendingEntry = false;

    // Without intraday ticks, assume the stop executes first if stop and target
    // are both touched within the same daily candle.
    if (position) {
      const effectiveStop = strategy.trailingStopLoss
        ? Math.max(position.stopPrice, position.peakClose * (1 - strategy.stopLossPercent / 100))
        : position.stopPrice;
      const stopHit = candle.open <= effectiveStop || candle.low <= effectiveStop;
      const targetHit = candle.open >= position.targetPrice || candle.high >= position.targetPrice;
      if (stopHit) {
        closePosition(candle.date, candle.open <= effectiveStop ? candle.open : effectiveStop, 'Stop / trailing stop');
      } else if (targetHit) {
        closePosition(candle.date, candle.open >= position.targetPrice ? candle.open : position.targetPrice, 'Target band');
      }
    }

    if (position) position.peakClose = Math.max(position.peakClose, candle.close);

    if (position) {
      const sellRules = strategy.rules.filter((rule) => rule.action === 'SELL');
      if (sellRules.some((rule) => rulePasses(rule, candle, previousCandle, currentIndicators, previousIndicators))) {
        pendingExit = true;
      }
    } else {
      const buyRules = strategy.rules.filter((rule) => rule.action === 'BUY');
      if (buyRules.length > 0 && buyRules.every((rule) =>
        rulePasses(rule, candle, previousCandle, currentIndicators, previousIndicators),
      )) {
        pendingEntry = true;
      }
    }

    const unrealizedPnl = position
      ? position.allocation * (candle.close / position.entryPrice - 1)
      : 0;
    const markedEquity = realizedEquity + unrealizedPnl;
    peakEquity = Math.max(peakEquity, markedEquity);
    const drawdown = peakEquity > 0 ? (peakEquity - markedEquity) / peakEquity * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    const benchmark = initialCapital * candle.close / firstClose * (1 - 2 * slippage);
    equityCurve.push({
      date: candle.date,
      equity: round(markedEquity),
      benchmark: round(benchmark),
    });
  }

  const lastCandle = candles[candles.length - 1];
  if (position) {
    closePosition(lastCandle.date, lastCandle.close, 'End of available history');
    const lastPoint = equityCurve[equityCurve.length - 1];
    if (lastPoint) lastPoint.equity = round(realizedEquity);
  }
  if (equityCurve.length === 0) {
    equityCurve.push({ date: lastCandle.date, equity: initialCapital, benchmark: initialCapital });
  }

  const finalCapital = round(realizedEquity);
  const totalReturn = (finalCapital / initialCapital - 1) * 100;
  const benchmarkReturn = (equityCurve[equityCurve.length - 1].benchmark / initialCapital - 1) * 100;
  const startMs = new Date(candles[0].date + 'T00:00:00Z').getTime();
  const endMs = new Date(lastCandle.date + 'T00:00:00Z').getTime();
  const actualYears = Math.max((endMs - startMs) / (365.25 * 24 * 60 * 60 * 1000), 1 / 252);
  const cagr = finalCapital > 0 ? (Math.pow(finalCapital / initialCapital, 1 / actualYears) - 1) * 100 : -100;
  const dailyReturns = equityCurve.slice(1).map((point, index) => {
    const prior = equityCurve[index].equity;
    return prior > 0 ? point.equity / prior - 1 : 0;
  }).filter(Number.isFinite);
  const dailyMean = mean(dailyReturns);
  const dailyStdDev = dailyReturns.length > 1 && dailyMean !== null
    ? Math.sqrt(dailyReturns.reduce((sum, value) => sum + (value - dailyMean) ** 2, 0) / (dailyReturns.length - 1))
    : 0;
  const dailyRiskFree = Math.pow(1 + RISK_FREE_RATE_ANNUAL, 1 / 252) - 1;
  const sharpeRatio = dailyStdDev > 0 && dailyMean !== null
    ? (dailyMean - dailyRiskFree) / dailyStdDev * Math.sqrt(252)
    : 0;

  return {
    result: {
      strategyName: strategy.name,
      durationYears,
      initialCapital: round(initialCapital),
      finalCapital,
      totalReturn: round(totalReturn, 1),
      benchmarkReturn: round(benchmarkReturn, 1),
      cagr: round(cagr, 1),
      maxDrawdown: round(maxDrawdown, 1),
      winRate: trades.length ? round(wins / trades.length * 100, 1) : 0,
      profitFactor: grossLosses > 0 ? round(grossWins / grossLosses, 2) : grossWins > 0 ? 999 : 0,
      totalTrades: trades.length,
      winningTrades: wins,
      losingTrades: losses,
      sharpeRatio: round(sharpeRatio, 2),
      equityCurve,
      trades: trades.reverse(),
    },
    source,
    startDate: candles[0].date,
    endDate: lastCandle.date,
    candleCount: candles.length,
    unsupportedRules,
    slippagePercentPerSide: SLIPPAGE_PERCENT_PER_SIDE,
  };
}
