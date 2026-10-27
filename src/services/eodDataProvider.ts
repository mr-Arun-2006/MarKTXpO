import type { OHLCVCandle } from '../types/market';
import { INDIAN_STOCKS_REGISTRY, getRealStockHistory } from './realMarketData.ts';

export interface EodHistoryResult {
  candles: OHLCVCandle[];
  provider: string;
  source: string;
}

function isValidSymbol(ticker: string): boolean {
  return /^[A-Z0-9][A-Z0-9.&_-]{0,19}$/.test(ticker);
}

/**
 * Market data is configurable because live/EOD entitlements depend on the provider's
 * contract. Yahoo is a best-effort third-party development source; Twelve Data can be
 * selected when the account has the appropriate NSE EOD data entitlement.
 */
export async function fetchEodHistory(ticker: string): Promise<EodHistoryResult> {
  if (!isValidSymbol(ticker)) throw new Error('Invalid ticker symbol.');

  const provider = (process.env.MARKET_DATA_PROVIDER || 'yahoo').trim().toLowerCase();
  const registryItem = INDIAN_STOCKS_REGISTRY.find((item) => item.ticker === ticker);
  if (provider === 'twelvedata') {
    const apiKey = process.env.TWELVE_DATA_API_KEY?.trim();
    if (!apiKey) throw new Error('MARKET_DATA_PROVIDER=twelvedata requires TWELVE_DATA_API_KEY on the server.');

    const url = new URL('https://api.twelvedata.com/time_series');
    url.searchParams.set('symbol', `${ticker}:NSE`);
    url.searchParams.set('interval', '1day');
    url.searchParams.set('outputsize', '1000');
    url.searchParams.set('timezone', 'Asia/Kolkata');
    url.searchParams.set('apikey', apiKey);

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Twelve Data returned HTTP ${response.status}.`);
    const payload: any = await response.json();
    if (!Array.isArray(payload?.values)) {
      const detail = typeof payload?.message === 'string' ? payload.message.slice(0, 180) : 'No daily candles were returned.';
      throw new Error(`Twelve Data could not return daily candles: ${detail}`);
    }

    const candles = (payload.values as Array<Record<string, unknown>>)
      .map((row): OHLCVCandle | null => {
        const date = typeof row.datetime === 'string' ? row.datetime.slice(0, 10) : '';
        const open = Number(row.open);
        const high = Number(row.high);
        const low = Number(row.low);
        const close = Number(row.close);
        const volume = row.volume == null ? 0 : Number(row.volume);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)
          || ![open, high, low, close, volume].every(Number.isFinite)
          || open <= 0 || high <= 0 || low <= 0 || close <= 0 || volume < 0) return null;
        return { date, open, high, low, close, volume, nseClose: close };
      })
      .filter((candle): candle is OHLCVCandle => candle !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (candles.length === 0) throw new Error('Twelve Data returned no valid daily candles for this symbol.');
    return {
      candles,
      provider: 'Twelve Data',
      source: 'Twelve Data API · NSE daily time series (account entitlement and distribution rights apply)',
    };
  }

  if (provider !== 'yahoo') {
    throw new Error('Unsupported MARKET_DATA_PROVIDER. Use "yahoo" or "twelvedata".');
  }

  const candles = await getRealStockHistory(ticker, '5y', '1d');
  if (candles.length === 0) {
    throw new Error(`Yahoo Finance did not return daily candles for ${ticker}.`);
  }
  return {
    candles,
    provider: 'Yahoo Finance',
    source: 'Yahoo Finance chart API · third-party reference data; not an official NSE/BSE feed',
  };
}
