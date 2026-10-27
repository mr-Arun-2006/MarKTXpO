import type { OHLCVCandle, StockData } from '../types/market';

export interface IndianStockSymbolConfig {
  ticker: string;
  nseSymbol: string;
  bseSymbol: string;
  bseCode: string;
  name: string;
  sector: string;
  marketCapCr: number;
  pe: number;
  pb: number;
  dividendYield: number;
  beta: number;
}

export const INDIAN_STOCKS_REGISTRY: IndianStockSymbolConfig[] = [
  {
    ticker: 'RELIANCE',
    nseSymbol: 'RELIANCE.NS',
    bseSymbol: 'RELIANCE.BO',
    bseCode: '500325',
    name: 'Reliance Industries Ltd.',
    sector: 'Energy & Telecom',
    marketCapCr: 1980000,
    pe: 26.8,
    pb: 2.4,
    dividendYield: 0.35,
    beta: 1.05,
  },
  {
    ticker: 'TCS',
    nseSymbol: 'TCS.NS',
    bseSymbol: 'TCS.BO',
    bseCode: '532540',
    name: 'Tata Consultancy Services',
    sector: 'Information Tech',
    marketCapCr: 1485000,
    pe: 31.2,
    pb: 12.8,
    dividendYield: 1.25,
    beta: 0.78,
  },
  {
    ticker: 'HDFCBANK',
    nseSymbol: 'HDFCBANK.NS',
    bseSymbol: 'HDFCBANK.BO',
    bseCode: '500180',
    name: 'HDFC Bank Ltd.',
    sector: 'Banking & Financials',
    marketCapCr: 1280000,
    pe: 18.5,
    pb: 2.6,
    dividendYield: 1.15,
    beta: 1.12,
  },
  {
    ticker: 'INFY',
    nseSymbol: 'INFY.NS',
    bseSymbol: 'INFY.BO',
    bseCode: '500209',
    name: 'Infosys Ltd.',
    sector: 'Information Tech',
    marketCapCr: 785000,
    pe: 27.4,
    pb: 7.9,
    dividendYield: 2.1,
    beta: 0.88,
  },
  {
    ticker: 'ICICIBANK',
    nseSymbol: 'ICICIBANK.NS',
    bseSymbol: 'ICICIBANK.BO',
    bseCode: '532174',
    name: 'ICICI Bank Ltd.',
    sector: 'Banking & Financials',
    marketCapCr: 885000,
    pe: 17.6,
    pb: 2.8,
    dividendYield: 0.85,
    beta: 1.18,
  },
  {
    ticker: 'BHARTIARTL',
    nseSymbol: 'BHARTIARTL.NS',
    bseSymbol: 'BHARTIARTL.BO',
    bseCode: '532454',
    name: 'Bharti Airtel Ltd.',
    sector: 'Telecommunications',
    marketCapCr: 940000,
    pe: 45.2,
    pb: 8.6,
    dividendYield: 0.45,
    beta: 0.85,
  },
  {
    ticker: 'SBIN',
    nseSymbol: 'SBIN.NS',
    bseSymbol: 'SBIN.BO',
    bseCode: '500112',
    name: 'State Bank of India',
    sector: 'Banking & Financials',
    marketCapCr: 745000,
    pe: 10.8,
    pb: 1.45,
    dividendYield: 1.6,
    beta: 1.25,
  },
  {
    ticker: 'ITC',
    nseSymbol: 'ITC.NS',
    bseSymbol: 'ITC.BO',
    bseCode: '500875',
    name: 'ITC Ltd.',
    sector: 'FMCG & Consumer',
    marketCapCr: 585000,
    pe: 27.5,
    pb: 7.1,
    dividendYield: 2.9,
    beta: 0.62,
  },
  {
    ticker: 'HINDUNILVR',
    nseSymbol: 'HINDUNILVR.NS',
    bseSymbol: 'HINDUNILVR.BO',
    bseCode: '500696',
    name: 'Hindustan Unilever Ltd.',
    sector: 'FMCG & Consumer',
    marketCapCr: 565000,
    pe: 52.4,
    pb: 10.8,
    dividendYield: 1.55,
    beta: 0.58,
  },
  {
    ticker: 'LT',
    nseSymbol: 'LT.NS',
    bseSymbol: 'LT.BO',
    bseCode: '500510',
    name: 'Larsen & Toubro Ltd.',
    sector: 'Capital Goods & Infra',
    marketCapCr: 495000,
    pe: 33.6,
    pb: 4.8,
    dividendYield: 0.95,
    beta: 1.15,
  },
  {
    ticker: 'TMCV',
    nseSymbol: 'TMCV.NS',
    bseSymbol: 'TMCV.BO',
    bseCode: '500570',
    name: 'Tata Motors Commercial Vehicles Ltd.',
    sector: 'Automobile & EV',
    marketCapCr: 215000,
    pe: 14.2,
    pb: 3.1,
    dividendYield: 0.8,
    beta: 1.35,
  },
  {
    ticker: 'SUNPHARMA',
    nseSymbol: 'SUNPHARMA.NS',
    bseSymbol: 'SUNPHARMA.BO',
    bseCode: '524715',
    name: 'Sun Pharmaceutical Industries Ltd.',
    sector: 'Healthcare & Pharma',
    marketCapCr: 425000,
    pe: 38.2,
    pb: 6.2,
    dividendYield: 0.75,
    beta: 0.65,
  },
  {
    ticker: 'BAJFINANCE',
    nseSymbol: 'BAJFINANCE.NS',
    bseSymbol: 'BAJFINANCE.BO',
    bseCode: '500034',
    name: 'Bajaj Finance Ltd.',
    sector: 'Banking & Financials',
    marketCapCr: 440000,
    pe: 29.5,
    pb: 6.8,
    dividendYield: 0.48,
    beta: 1.32,
  },
  {
    ticker: 'MARUTI',
    nseSymbol: 'MARUTI.NS',
    bseSymbol: 'MARUTI.BO',
    bseCode: '532500',
    name: 'Maruti Suzuki India Ltd.',
    sector: 'Automobile & EV',
    marketCapCr: 365000,
    pe: 26.4,
    pb: 4.1,
    dividendYield: 1.05,
    beta: 0.92,
  },
  {
    ticker: 'TITAN',
    nseSymbol: 'TITAN.NS',
    bseSymbol: 'TITAN.BO',
    bseCode: '500114',
    name: 'Titan Company Ltd.',
    sector: 'FMCG & Consumer',
    marketCapCr: 310000,
    pe: 78.5,
    pb: 19.2,
    dividendYield: 0.35,
    beta: 0.98,
  },
  {
    ticker: 'WIPRO',
    nseSymbol: 'WIPRO.NS',
    bseSymbol: 'WIPRO.BO',
    bseCode: '507685',
    name: 'Wipro Ltd.',
    sector: 'Information Tech',
    marketCapCr: 245000,
    pe: 22.8,
    pb: 3.4,
    dividendYield: 0.3,
    beta: 0.84,
  },
  {
    ticker: 'ADANIENT',
    nseSymbol: 'ADANIENT.NS',
    bseSymbol: 'ADANIENT.BO',
    bseCode: '512599',
    name: 'Adani Enterprises Ltd.',
    sector: 'Commodities & Metals',
    marketCapCr: 345000,
    pe: 74.2,
    pb: 7.9,
    dividendYield: 0.15,
    beta: 1.82,
  },
  {
    ticker: 'NTPC',
    nseSymbol: 'NTPC.NS',
    bseSymbol: 'NTPC.BO',
    bseCode: '532555',
    name: 'NTPC Ltd.',
    sector: 'Energy & Telecom',
    marketCapCr: 385000,
    pe: 17.5,
    pb: 2.15,
    dividendYield: 2.1,
    beta: 0.88,
  },
  {
    ticker: 'POWERGRID',
    nseSymbol: 'POWERGRID.NS',
    bseSymbol: 'POWERGRID.BO',
    bseCode: '532898',
    name: 'Power Grid Corporation of India Ltd.',
    sector: 'Energy & Telecom',
    marketCapCr: 295000,
    pe: 18.2,
    pb: 2.9,
    dividendYield: 3.4,
    beta: 0.72,
  },
  {
    ticker: 'TATASTEEL',
    nseSymbol: 'TATASTEEL.NS',
    bseSymbol: 'TATASTEEL.BO',
    bseCode: '500470',
    name: 'Tata Steel Ltd.',
    sector: 'Commodities & Metals',
    marketCapCr: 195000,
    pe: 38.5,
    pb: 1.85,
    dividendYield: 2.3,
    beta: 1.48,
  },
  {
    ticker: 'KOTAKBANK',
    nseSymbol: 'KOTAKBANK.NS',
    bseSymbol: 'KOTAKBANK.BO',
    bseCode: '500247',
    name: 'Kotak Mahindra Bank Ltd.',
    sector: 'Banking & Financials',
    marketCapCr: 365000,
    pe: 21.2,
    pb: 2.7,
    dividendYield: 0.12,
    beta: 0.95,
  },
  {
    ticker: 'AXISBANK',
    nseSymbol: 'AXISBANK.NS',
    bseSymbol: 'AXISBANK.BO',
    bseCode: '532215',
    name: 'Axis Bank Ltd.',
    sector: 'Banking & Financials',
    marketCapCr: 355000,
    pe: 13.8,
    pb: 1.95,
    dividendYield: 0.1,
    beta: 1.22,
  },
  {
    ticker: 'BAJAJFINSV',
    nseSymbol: 'BAJAJFINSV.NS',
    bseSymbol: 'BAJAJFINSV.BO',
    bseCode: '532978',
    name: 'Bajaj Finserv Ltd.',
    sector: 'Banking & Financials',
    marketCapCr: 295000,
    pe: 34.6,
    pb: 4.6,
    dividendYield: 0.08,
    beta: 1.28,
  },
  {
    ticker: 'HCLTECH',
    nseSymbol: 'HCLTECH.NS',
    bseSymbol: 'HCLTECH.BO',
    bseCode: '532281',
    name: 'HCL Technologies Ltd.',
    sector: 'Information Tech',
    marketCapCr: 485000,
    pe: 27.2,
    pb: 6.9,
    dividendYield: 3.1,
    beta: 0.74,
  },
  {
    ticker: 'TECHM',
    nseSymbol: 'TECHM.NS',
    bseSymbol: 'TECHM.BO',
    bseCode: '532755',
    name: 'Tech Mahindra Ltd.',
    sector: 'Information Tech',
    marketCapCr: 155000,
    pe: 42.1,
    pb: 4.8,
    dividendYield: 2.6,
    beta: 0.98,
  },
  {
    ticker: 'HAL',
    nseSymbol: 'HAL.NS',
    bseSymbol: 'HAL.BO',
    bseCode: '541154',
    name: 'Hindustan Aeronautics Ltd.',
    sector: 'Capital Goods & Infra',
    marketCapCr: 335000,
    pe: 39.5,
    pb: 11.2,
    dividendYield: 0.9,
    beta: 1.12,
  },
  {
    ticker: 'BEL',
    nseSymbol: 'BEL.NS',
    bseSymbol: 'BEL.BO',
    bseCode: '500049',
    name: 'Bharat Electronics Ltd.',
    sector: 'Capital Goods & Infra',
    marketCapCr: 215000,
    pe: 48.2,
    pb: 12.8,
    dividendYield: 0.8,
    beta: 1.08,
  },
  {
    ticker: 'DMART',
    nseSymbol: 'DMART.NS',
    bseSymbol: 'DMART.BO',
    bseCode: '540376',
    name: 'Avenue Supermarts Ltd.',
    sector: 'FMCG & Consumer',
    marketCapCr: 220000,
    pe: 82.5,
    pb: 11.5,
    dividendYield: 0.0,
    beta: 0.82,
  },
  {
    ticker: 'TRENT',
    nseSymbol: 'TRENT.NS',
    bseSymbol: 'TRENT.BO',
    bseCode: '500251',
    name: 'Trent Ltd.',
    sector: 'FMCG & Consumer',
    marketCapCr: 185000,
    pe: 112.0,
    pb: 28.5,
    dividendYield: 0.08,
    beta: 1.25,
  },
];

// In-memory cache for live quotes (TTL 20 seconds for high responsiveness)
interface LiveQuoteCache {
  data: any;
  timestamp: number;
}
let stocksCache: LiveQuoteCache | null = null;
let benchmarksCache: LiveQuoteCache | null = null;
const historyCache = new Map<string, LiveQuoteCache>();

const CACHE_TTL_MS = 20 * 1000; // 20 seconds
const HISTORY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_HISTORY_CACHE_ENTRIES = 1_000;

function setHistoryCache(key: string, data: OHLCVCandle[]): void {
  if (historyCache.size >= MAX_HISTORY_CACHE_ENTRIES && !historyCache.has(key)) {
    const oldestKey = historyCache.keys().next().value;
    if (oldestKey !== undefined) historyCache.delete(oldestKey);
  }
  historyCache.set(key, { data, timestamp: Date.now() });
}

// Fetch real single quote from Yahoo Finance API
async function fetchYahooQuote(symbol: string) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.chart?.result?.[0]?.meta || null;
  } catch (err) {
    return null;
  }
}

// Fetch benchmark index quotes from the third-party provider
export async function getRealBenchmarks() {
  if (benchmarksCache && Date.now() - benchmarksCache.timestamp < CACHE_TTL_MS) {
    return benchmarksCache.data;
  }

  const indexConfigs = [
    { name: 'NIFTY 50', symbol: '^NSEI', exchange: 'NSE' as const },
    { name: 'SENSEX', symbol: '^BSESN', exchange: 'BSE' as const },
    { name: 'BANK NIFTY', symbol: '^NSEBANK', exchange: 'NSE' as const },
    { name: 'NIFTY IT', symbol: '^CNXIT', exchange: 'NSE' as const },
    { name: 'INDIA VIX', symbol: '^INDIAVIX', exchange: 'NSE' as const },
  ];

  try {
    const results = (await Promise.all(
      indexConfigs.map(async (idx) => {
        const meta = await fetchYahooQuote(idx.symbol);
        if (meta && meta.regularMarketPrice) {
          const price = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose || price;
          const change = price - prev;
          const pct = prev > 0 ? (change / prev) * 100 : 0;
          return {
            name: idx.name,
            exchange: idx.exchange,
            value: Math.round(price * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(pct * 100) / 100,
            isLive: true,
            source: 'Yahoo Finance quote metadata (third-party provider)',
          };
        }
        // Missing index data is unavailable, not a numeric quote to be guessed.
        return null;
      })
    )).filter((item): item is NonNullable<typeof item> => item !== null);

    benchmarksCache = {
      data: results,
      timestamp: Date.now(),
    };
    return results;
  } catch (e) {
    return [];
  }
}

// Calculate indicators from observed closing prices only. Do not fabricate history.
function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const alpha = 2 / (period + 1);
  const result = [values[0]];
  for (let i = 1; i < values.length; i += 1) {
    result.push(values[i] * alpha + result[i - 1] * (1 - alpha));
  }
  return result;
}

function calculateTechnicalIndicators(candles: OHLCVCandle[]) {
  const closes = candles
    .map((candle) => candle.close)
    .filter((close) => Number.isFinite(close) && close > 0);

  // A 200-day baseline is required to avoid presenting short-history guesses as indicators.
  if (closes.length < 200) return null;

  const dma20 = mean(closes.slice(-20));
  const dma50 = mean(closes.slice(-50));
  const dma200 = mean(closes.slice(-200));
  const last20 = closes.slice(-20);
  const variance = mean(last20.map((close) => (close - dma20) ** 2));
  const standardDeviation = Math.sqrt(variance);

  const recentCloses = closes.slice(-15);
  const recentChanges = recentCloses.slice(1).map((close, index) => close - recentCloses[index]);
  const averageGain = mean(recentChanges.map((change) => Math.max(change, 0)));
  const averageLoss = mean(recentChanges.map((change) => Math.max(-change, 0)));
  const rsi = averageLoss === 0 ? (averageGain === 0 ? 50 : 100) : 100 - 100 / (1 + averageGain / averageLoss);

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdSeries = closes.map((_close, index) => ema12[index] - ema26[index]);
  const signalSeries = ema(macdSeries, 9);
  const macdLine = macdSeries[macdSeries.length - 1];
  const signalLine = signalSeries[signalSeries.length - 1];
  const histogram = macdLine - signalLine;

  return {
    rsi: Math.round(rsi * 10) / 10,
    dma20: Math.round(dma20 * 100) / 100,
    dma50: Math.round(dma50 * 100) / 100,
    dma200: Math.round(dma200 * 100) / 100,
    macdLine: Math.round(macdLine * 100) / 100,
    signalLine: Math.round(signalLine * 100) / 100,
    histogram: Math.round(histogram * 100) / 100,
    bollingerUpper: Math.round((dma20 + 2 * standardDeviation) * 100) / 100,
    bollingerLower: Math.round((dma20 - 2 * standardDeviation) * 100) / 100,
  };
}

// Fetch real live quotes for all registered Indian stocks
export async function getRealIndianStockQuotes(): Promise<StockData[]> {
  if (stocksCache && Date.now() - stocksCache.timestamp < CACHE_TTL_MS) {
    return stocksCache.data;
  }

  // Fetch in bounded batches. A stock is excluded if either exchange quote or
  // sufficient observed history is unavailable; no random/default prices are substituted.
  const batchSize = 6;
  const quotesList: StockData[] = [];

  for (let i = 0; i < INDIAN_STOCKS_REGISTRY.length; i += batchSize) {
    const batch = INDIAN_STOCKS_REGISTRY.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (st) => {
        try {
          const [nseMeta, bseMeta, history] = await Promise.all([
            fetchYahooQuote(st.nseSymbol),
            fetchYahooQuote(st.bseSymbol),
            getRealStockHistory(st.ticker, '1y', '1d'),
          ]);

          const nsePrice = nseMeta?.regularMarketPrice;
          const bsePrice = bseMeta?.regularMarketPrice;
          const prevClose = nseMeta?.chartPreviousClose;

          if (
            !Number.isFinite(nsePrice) || (nsePrice as number) <= 0 ||
            !Number.isFinite(bsePrice) || (bsePrice as number) <= 0 ||
            !Number.isFinite(prevClose) || (prevClose as number) <= 0
          ) {
            return null;
          }

          const indicators = calculateTechnicalIndicators(history);
          if (!indicators) return null;

          const validNsePrice = nsePrice as number;
          const validBsePrice = bsePrice as number;
          const validPrevClose = prevClose as number;
          const change = Math.round((validNsePrice - validPrevClose) * 100) / 100;
          const changePercent = Math.round((change / validPrevClose) * 10000) / 100;
          const spreadPercent = Math.round((((validNsePrice - validBsePrice) / validNsePrice) * 100) * 1000) / 1000;
          const dayHigh = nseMeta?.regularMarketDayHigh;
          const dayLow = nseMeta?.regularMarketDayLow;
          const dayOpen = nseMeta?.regularMarketOpen;
          const high52 = nseMeta?.fiftyTwoWeekHigh;
          const low52 = nseMeta?.fiftyTwoWeekLow;

          // Required day OHLC fields must be present; do not substitute the quote for them.
          if (
            !Number.isFinite(dayHigh) || !Number.isFinite(dayLow) || !Number.isFinite(dayOpen) ||
            (dayHigh as number) < (dayLow as number)
          ) {
            return null;
          }
          const nseVol = nseMeta?.regularMarketVolume ?? 0;
          const bseVol = bseMeta?.regularMarketVolume ?? 0;
          const totalVol = nseVol + bseVol;
          const arbitrageDirection = spreadPercent > 0.03
            ? 'BUY_BSE_SELL_NSE'
            : spreadPercent < -0.03
              ? 'BUY_NSE_SELL_BSE'
              : 'PARITY';

          const stockObj: StockData = {
            ticker: st.ticker,
            bseCode: st.bseCode,
            name: st.name,
            sector: st.sector,
            nsePrice: Math.round(validNsePrice * 100) / 100,
            bsePrice: Math.round(validBsePrice * 100) / 100,
            currentPrice: Math.round(validNsePrice * 100) / 100,
            previousClose: Math.round(validPrevClose * 100) / 100,
            change,
            changePercent,
            open: Math.round(dayOpen * 100) / 100,
            high: Math.round(dayHigh * 100) / 100,
            low: Math.round(dayLow * 100) / 100,
            dayHigh: Math.round(dayHigh * 100) / 100,
            dayLow: Math.round(dayLow * 100) / 100,
            high52,
            low52,
            volume: totalVol,
            nseVolume: nseVol,
            bseVolume: bseVol,
            spreadPercent,
            marketCapCr: st.marketCapCr,
            pe: st.pe,
            pb: st.pb,
            dividendYield: st.dividendYield,
            beta: st.beta,
            rsi: indicators.rsi,
            macd: {
              macdLine: indicators.macdLine,
              signalLine: indicators.signalLine,
              histogram: indicators.histogram,
              signal: indicators.histogram > 0 ? 'Bullish' : indicators.histogram < 0 ? 'Bearish' : 'Neutral',
            },
            dma20: indicators.dma20,
            dma50: indicators.dma50,
            dma200: indicators.dma200,
            bollingerBands: {
              upper: indicators.bollingerUpper,
              middle: indicators.dma20,
              lower: indicators.bollingerLower,
            },
            arbitrageDirection,
            potentialArbitrageProfitPer1000Shares: Math.round(Math.abs(validNsePrice - validBsePrice) * 1000),
            sentiment: {
              score: 0,
              label: 'Neutral',
              confidence: 0,
              newsScore: 0,
              socialScore: 0,
              institutionalScore: 0,
              keyCatalyst: 'Verified news, social, and institutional-flow data are not connected.',
            },
            history,
            isLiveOfficial: false,
            dataSource: 'Yahoo Finance quote/history metadata; registry fundamentals are reference estimates; not a direct NSE/BSE official feed',
            lastLiveSync: new Date().toISOString(),
          };

          return stockObj;
        } catch {
          return null;
        }
      })
    );

    quotesList.push(...(batchResults.filter(Boolean) as StockData[]));
  }

  if (quotesList.length > 0) {
    stocksCache = {
      data: quotesList,
      timestamp: Date.now(),
    };
    return quotesList;
  }

  return [];
}

// Fetch real historical daily candles from Yahoo Finance
export async function getRealStockHistory(
  ticker: string,
  range = '3mo',
  interval = '1d'
): Promise<OHLCVCandle[]> {
  const cacheKey = `${ticker}_${range}_${interval}`;
  const cached = historyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < HISTORY_CACHE_TTL_MS) {
    return cached.data;
  }

  const reg = INDIAN_STOCKS_REGISTRY.find((s) => s.ticker === ticker);
  const nseSymbol = reg ? reg.nseSymbol : `${ticker}.NS`;

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(nseSymbol)}?interval=${interval}&range=${range}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (!res.ok) return [];

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    const timestamps: number[] = result?.timestamp || [];
    const quotes = result?.indicators?.quote?.[0];

    if (!quotes || timestamps.length === 0) return [];

    const candles: OHLCVCandle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const open = quotes.open?.[i];
      const high = quotes.high?.[i];
      const low = quotes.low?.[i];
      const close = quotes.close?.[i];
      const volume = quotes.volume?.[i] ?? 0;

      // Skip invalid NaN entries
      if (open == null || high == null || low == null || close == null) continue;

      const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      candles.push({
        date: dateStr,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: volume,
        nseClose: Math.round(close * 100) / 100,
      });
    }

    setHistoryCache(cacheKey, candles);

    return candles;
  } catch (err) {
    return [];
  }
}


export interface RealDividendEvent {
  ticker: string;
  exDate: string;
  amountPerShare: number;
  source: string;
}

/** Return provider-reported historical dividend events only; future events are never inferred. */
export async function getRealStockDividends(
  ticker: string,
  range: '1y' | '5y' | '10y' = '5y',
): Promise<RealDividendEvent[]> {
  if (!/^[A-Z0-9][A-Z0-9.&_-]{0,19}$/.test(ticker)) {
    throw new Error('Invalid ticker symbol.');
  }

  const stock = INDIAN_STOCKS_REGISTRY.find((item) => item.ticker === ticker);
  const symbol = stock ? stock.nseSymbol : ticker + '.NS';
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/'
    + encodeURIComponent(symbol)
    + '?interval=1d&range=' + range + '&events=dividends';
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Yahoo Finance returned HTTP ' + response.status + ' for historical dividend events.');

  const payload: any = await response.json();
  if (payload?.chart?.error) throw new Error('The provider returned an error for this ticker.');
  const rawEvents = payload?.chart?.result?.[0]?.events?.dividends;
  if (!rawEvents || typeof rawEvents !== 'object') return [];

  return Object.values(rawEvents)
    .map((event: any) => {
      const dateSeconds = Number(event?.date);
      const amountPerShare = Number(event?.amount);
      if (!Number.isFinite(dateSeconds) || !Number.isFinite(amountPerShare) || amountPerShare < 0) return null;
      return {
        ticker,
        exDate: new Date(dateSeconds * 1000).toISOString().slice(0, 10),
        amountPerShare,
        source: 'Yahoo Finance historical dividend events (third-party; not an official exchange feed)',
      };
    })
    .filter((event): event is RealDividendEvent => event !== null)
    .sort((a, b) => b.exDate.localeCompare(a.exDate));
}
