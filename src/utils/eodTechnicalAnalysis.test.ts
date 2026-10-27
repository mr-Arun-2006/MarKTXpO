import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateEodTechnicalSnapshot } from './eodTechnicalAnalysis.ts';
import type { OHLCVCandle } from '../types/market';

function buildCandles(count: number): OHLCVCandle[] {
  const rows: OHLCVCandle[] = [];
  const end = new Date('2026-10-23T00:00:00.000Z');
  for (let i = 0; i < count; i += 1) {
    const day = new Date(end);
    day.setUTCDate(day.getUTCDate() - (count - i - 1));
    const close = 100 + i * 0.25;
    rows.push({
      date: day.toISOString().slice(0, 10),
      open: close - 0.5,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1000 + i * 5,
    });
  }
  return rows;
}

test('EOD analysis derives moving averages from supplied daily candles', () => {
  const report = calculateEodTechnicalSnapshot(
    'TEST',
    'Test Company',
    buildCandles(260),
    new Date('2026-10-27T11:00:00.000Z'),
  );
  assert.ok(report);
  assert.equal(report.candleCount, 260);
  assert.equal(report.indicators.sma20, 162.38);
  assert.equal(report.indicators.sma50, 158.63);
  assert.equal(report.indicators.sma200, 139.88);
  assert.equal(report.asOfDate, '2026-10-23');
  assert.equal(report.technicalBias, 'Bullish');
});

test('EOD analysis does not invent a 200-session average for short history', () => {
  const report = calculateEodTechnicalSnapshot(
    'TEST',
    'Test Company',
    buildCandles(80),
    new Date('2026-10-27T11:00:00.000Z'),
  );
  assert.ok(report);
  assert.equal(report.indicators.sma200, null);
  assert.ok(report.limitations.some((item) => item.includes('200 completed daily candles')));
});

test('EOD analysis excludes an in-progress current-session daily bar before close buffer', () => {
  const rows = buildCandles(40);
  rows.push({
    date: '2026-10-27',
    open: 110,
    high: 112,
    low: 109,
    close: 111,
    volume: 100,
  });
  const report = calculateEodTechnicalSnapshot(
    'TEST',
    'Test Company',
    rows,
    new Date('2026-10-27T08:30:00.000Z'), // 14:00 IST
  );
  assert.ok(report);
  assert.equal(report.asOfDate, '2026-10-23');
  assert.ok(report.limitations.some((item) => item.includes('current-session daily candle was excluded')));
});

test('EOD analysis returns null when no valid daily candles are available', () => {
  assert.equal(calculateEodTechnicalSnapshot('TEST', 'Test Company', []), null);
});
