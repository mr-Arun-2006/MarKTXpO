export interface MarketNewsItem {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  publishedAt: string; // ISO string or relative time
  timeAgo: string;
  summary: string;
  category: 'Market Movers' | 'Earnings & Deals' | 'Macro & RBI' | 'Sectors & Infra' | 'Regulatory & SEBI' | 'FII / DII Flows';
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  impactLevel: 'HIGH' | 'MODERATE' | 'LOW';
  relatedTickers: string[]; // e.g. ['RELIANCE', 'TCS']
  isBreaking?: boolean;
}

export const MAJOR_NEWS_SOURCES = [
  { name: 'All Sources', id: 'ALL' },
  { name: 'Economic Times', id: 'Economic Times', color: '#EA580C', icon: 'ET' },
  { name: 'Moneycontrol', id: 'Moneycontrol', color: '#0284C7', icon: 'MC' },
  { name: 'Livemint', id: 'Livemint', color: '#D97706', icon: 'Mint' },
  { name: 'Business Standard', id: 'Business Standard', color: '#DC2626', icon: 'BS' },
  { name: 'CNBC-TV18', id: 'CNBC-TV18', color: '#16A34A', icon: 'CNBC' },
  { name: 'Financial Express', id: 'Financial Express', color: '#4F46E5', icon: 'FE' },
] as const;

export const INITIAL_MARKET_NEWS: MarketNewsItem[] = [];
