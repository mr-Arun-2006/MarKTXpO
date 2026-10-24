export type Exchange = 'NSE' | 'BSE' | 'BOTH';

export interface OHLCVCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bseClose?: number;
  nseClose?: number;
}

export interface StockData {
  ticker: string;
  bseCode: string;
  name: string;
  sector: string;
  nsePrice: number;
  bsePrice: number;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  bseVolume: number;
  nseVolume: number;
  marketCapCr: number; // in Crores
  pe: number;
  pb: number;
  dividendYield: number;
  high52: number;
  low52: number;
  beta: number;
  rsi: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    signal: 'Bullish' | 'Bearish' | 'Neutral';
  };
  dma20: number;
  dma50: number;
  dma200: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  deliveryPercent: number;
  upperCircuit: number;
  lowerCircuit: number;
  spreadPercent: number; // (NSE - BSE) / NSE * 100
  arbitrageDirection: 'BUY_BSE_SELL_NSE' | 'BUY_NSE_SELL_BSE' | 'PARITY';
  potentialArbitrageProfitPer1000Shares: number;
  sentiment: {
    score: number; // -100 to 100
    label: 'Very Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Very Bearish';
    confidence: number; // 0 - 100%
    newsScore: number;
    socialScore: number;
    institutionalScore: number;
    keyCatalyst: string;
  };
  history: OHLCVCandle[];
  isLiveOfficial?: boolean;
  dataSource?: string;
  lastLiveSync?: string;
  dayHigh?: number;
  dayLow?: number;
  hourlyChange?: number;
  hourlyChangePercent?: number;
  hourlyTrend?: 'UP' | 'DOWN' | 'NEUTRAL';
  annualDividendPerShare?: number;
  payoutRatio?: number;
  upcomingDividendDate?: string;
  upcomingDividendAmount?: number;
}

export type DividendType = 'Interim' | 'Final' | 'Special';
export type DividendStatus = 'Upcoming' | 'Announced' | 'Record_Date' | 'Paid';

export interface DividendRecord {
  id: string;
  ticker: string;
  companyName: string;
  bseCode: string;
  sector: string;
  exDate: string; // YYYY-MM-DD
  recordDate: string; // YYYY-MM-DD
  paymentDate: string; // YYYY-MM-DD
  dividendPerShare: number; // in ₹
  dividendYield: number; // in %
  type: DividendType;
  financialYear: string;
  status: DividendStatus;
  payoutRatio: number; // in %
  remarks?: string;
}

export interface WatchlistStockItem {
  ticker: string;
  addedAt: string;
  sharesHeld?: number;
  notes?: string;
  customTargetYield?: number;
}

export interface SectorIndex {
  name: string;
  changePercent: number;
  pe: number;
  marketCapRatio: number;
  status: 'Leading' | 'Improving' | 'Weakening' | 'Lagging';
  topStock: string;
  momentumScore: number;
  stocksCount: number;
}

export interface RuleStep {
  name: string;
  condition: string;
  passed: boolean;
  value: string;
  threshold: string;
  weight: number;
}

export interface StrategyRule {
  id: string;
  indicator: 'RSI' | 'MACD' | 'DMA_50_CROSS' | 'DMA_200_CROSS' | 'BOLLINGER_BAND' | 'VOLUME_SURGE' | 'NSE_BSE_SPREAD' | 'DELIVERY_PERCENT';
  operator: '<' | '<=' | '>' | '>=' | 'CROSSES_ABOVE' | 'CROSSES_BELOW';
  value: number;
  action: 'BUY' | 'SELL';
}

export interface CustomStrategy {
  id: string;
  name: string;
  description: string;
  rules: StrategyRule[];
  stopLossPercent: number;
  targetProfitPercent: number;
  trailingStopLoss: boolean;
  active: boolean;
}

export interface BacktestTrade {
  id: string;
  date: string;
  ticker: string;
  action: 'BUY' | 'SELL';
  price: number;
  exitDate?: string;
  exitPrice?: number;
  pnlPercent?: number;
  pnlRupees?: number;
  status: 'CLOSED' | 'OPEN';
  reason: string;
}

export interface BacktestResult {
  strategyName: string;
  durationYears: number;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  benchmarkReturn: number; // Nifty 50
  cagr: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  sharpeRatio: number;
  equityCurve: { date: string; equity: number; benchmark: number }[];
  trades: BacktestTrade[];
}

export interface MarketAlert {
  id: string;
  ticker: string;
  companyName: string;
  type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'RSI_OVERSOLD' | 'RSI_OVERBOUGHT' | 'VOLUME_SPIKE' | 'ARBITRAGE_SPREAD' | 'CIRCUIT_BREAKER' | 'VOLATILITY_EXPANSION';
  targetValue: number;
  currentValue: number;
  triggered: boolean;
  triggeredAt?: string;
  message: string;
  intradayRange?: number;
  average14DayRange?: number;
  expansionRatio?: number;
}

export interface PortfolioHolding {
  id: string;
  ticker: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  shares: number;
  averageBuyPrice: number;
  currentPrice: number;
  sector: string;
  beta: number;
}

export type SupportedLanguage = 'en' | 'hi' | 'gu' | 'ta' | 'mr' | 'bn';

export interface UserProfile {
  name: string;
  email: string;
  customApiKey: string;
  preferredExchange: 'NSE' | 'BSE';
  riskTolerance: 'Conservative' | 'Moderate' | 'Aggressive';
  soundAlerts: boolean;
  language: SupportedLanguage;
}
