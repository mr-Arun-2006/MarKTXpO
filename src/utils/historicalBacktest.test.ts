import assert from 'node:assert/strict';
import test from 'node:test';
import type { CustomStrategy, OHLCVCandle } from '../types/market';
import { runHistoricalBacktest } from './historicalBacktest.ts';

const strategy: CustomStrategy = {
  id: 'test',
  name: 'RSI educational strategy',
  description: 'Unit test strategy.',
  rules: [{ id: 'rsi', indicator: 'RSI', operator: '<', value: 35, action: 'BUY' }],
  stopLossPercent: 3,
  targetProfitPercent: 6,
  trailingStopLoss: true,
  active: true,
};

function syntheticDailyCandles(count: number): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  const start = new Date('2022-01-01T00:00:00.000Z');
  for (let index = 0; index < count; index += 1) {
    const close = 100 + index * 0.04 + Math.sin(index / 4) * 4 + Math.sin(index / 17) * 2;
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    candles.push({
      date: date.toISOString().slice(0, 10),
      open: close * 0.998,
      high: close * 1.015,
      low: close * 0.985,
      close,
      volume: 1000 + (index % 13) * 100,
    });
  }
  return candles;
}

test('historical backtest is deterministic for the same input candles', () => {
  const candles = syntheticDailyCandles(1300);
  const first = runHistoricalBacktest('TEST', candles, strategy, 3, 500000, 'Unit-test fixture');
  const second = runHistoricalBacktest('TEST', candles, strategy, 3, 500000, 'Unit-test fixture');
  assert.deepEqual(first, second);
  assert.equal(first.candleCount, first.result.equityCurve.length);
  assert.ok(first.result.equityCurve.every((point) => Number.isFinite(point.equity) && Number.isFinite(point.benchmark)));
});

test('historical backtest rejects insufficient history', () => {
  assert.throws(
    () => runHistoricalBacktest('TEST', syntheticDailyCandles(120), strategy, 1, 500000, 'Unit-test fixture'),
    /At least 205 valid daily candles/,
  );
});

test('unsupported market fields are reported rather than guessed', () => {
  const unsupported: CustomStrategy = {
    ...strategy,
    rules: [{ id: 'spread', indicator: 'NSE_BSE_SPREAD', operator: '>', value: 0.1, action: 'BUY' }],
  };
  const output = runHistoricalBacktest('TEST', syntheticDailyCandles(1300), unsupported, 3, 500000, 'Unit-test fixture');
  assert.deepEqual(output.unsupportedRules, ['NSE_BSE_SPREAD']);
  assert.equal(output.result.totalTrades, 0);
});
