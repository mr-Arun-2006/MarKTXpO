import React, { useState, useMemo } from 'react';
import { StockData, SupportedLanguage } from '../types/market';
import {
  INITIAL_MARKET_NEWS,
  MAJOR_NEWS_SOURCES,
  MarketNewsItem,
} from '../data/marketNewsData';
import {
  Newspaper,
  ExternalLink,
  Flame,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  Sparkles,
  Clock,
  Radio,
  CheckCircle2,
  ChevronRight,
  Layers,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';

export interface MarketNewsProps {
  stocks: StockData[];
  selectedStock?: StockData;
  onSelectStock?: (stock: StockData) => void;
  openAIExplanation?: (stock: StockData) => void;
  language?: SupportedLanguage;
  compact?: boolean;
}

export const MarketNews: React.FC<MarketNewsProps> = ({
  stocks,
  selectedStock,
  onSelectStock,
  openAIExplanation,
  language = 'en',
  compact = false,
}) => {
  const [newsItems, setNewsItems] = useState<MarketNewsItem[]>(INITIAL_MARKET_NEWS);
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSentiment, setSelectedSentiment] = useState<'ALL' | 'Bullish' | 'Bearish' | 'Neutral'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlySelectedStock, setOnlySelectedStock] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  // Handle refresh simulation to fetch fresh headlines
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshed('Just now');
    }, 600);
  };

  // Filtered news items
  const filteredNews = useMemo(() => {
    let list = [...newsItems];

    // Filter by selected stock if toggled
    if (onlySelectedStock && selectedStock) {
      list = list.filter((item) => item.relatedTickers.includes(selectedStock.ticker));
    }

    // Filter by news source
    if (selectedSource !== 'ALL') {
      list = list.filter((item) => item.source === selectedSource);
    }

    // Filter by category
    if (selectedCategory === 'HIGH_IMPACT') {
      list = list.filter((item) => item.impactLevel === 'HIGH');
    } else if (selectedCategory !== 'ALL') {
      list = list.filter((item) => item.category === selectedCategory);
    }

    // Filter by sentiment
    if (selectedSentiment !== 'ALL') {
      list = list.filter((item) => item.sentiment === selectedSentiment);
    }

    // Keyword search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.relatedTickers.some((t) => t.toLowerCase().includes(q)) ||
          item.source.toLowerCase().includes(q)
      );
    }

    return list;
  }, [newsItems, selectedSource, selectedCategory, selectedSentiment, searchQuery, onlySelectedStock, selectedStock]);

  // Breaking news banner item
  const breakingItem = useMemo(() => {
    return newsItems.find((n) => n.isBreaking) || newsItems[0];
  }, [newsItems]);

  // Helper to color source tags
  const getSourceBadgeStyle = (source: string) => {
    switch (source) {
      case 'Economic Times':
        return 'bg-orange-950/70 text-orange-300 border-orange-500/40';
      case 'Moneycontrol':
        return 'bg-sky-950/70 text-sky-300 border-sky-500/40';
      case 'Livemint':
        return 'bg-amber-950/70 text-amber-300 border-amber-500/40';
      case 'Business Standard':
        return 'bg-rose-950/70 text-rose-300 border-rose-500/40';
      case 'CNBC-TV18':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40';
      case 'Financial Express':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-500/40';
      default:
        return 'bg-purple-950/70 text-purple-300 border-purple-500/40';
    }
  };

  return (
    <div className="rounded-2xl bg-[#1A1816] border border-[#D96B43]/25 p-4 sm:p-6 space-y-5 shadow-xl text-[#F7EEDB]">
      {/* Component Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D96B43]/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#D96B43]/15 border border-[#D96B43]/30 text-[#D96B43]">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#F7EEDB] tracking-tight">
                Market News &amp; Dalal Street Wire
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D96B43]/15 text-[#D96B43] border border-[#D96B43]/30 font-bold font-mono">
                MAJOR INDIAN SOURCES
              </span>
            </div>
            <p className="text-xs text-[#F7EEDB]/60 mt-0.5">
              Aggregated financial headlines from Economic Times, Moneycontrol, Livemint, Business Standard, and CNBC-TV18.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] font-mono text-[#F7EEDB]/50">
            Updated {lastRefreshed}
          </span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131211] hover:bg-[#25221F] border border-[#D96B43]/20 hover:border-[#D96B43]/50 text-xs font-semibold text-[#F7EEDB] transition active:scale-95"
            title="Refresh news wire"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D96B43] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Breaking Flash News Alert Ribbon */}
      {breakingItem && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-red-950/70 via-[#1A1816] to-[#1A1816] border border-red-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
            <span className="px-2 py-0.5 rounded-md bg-red-500 text-[#131211] font-black font-mono text-[10px] uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              BREAKING
            </span>
            <span className="font-semibold text-[#F7EEDB] leading-snug line-clamp-1">
              {breakingItem.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${getSourceBadgeStyle(breakingItem.source)}`}>
              {breakingItem.source}
            </span>
            {breakingItem.relatedTickers.length > 0 && onSelectStock && (
              <button
                onClick={() => {
                  const st = stocks.find((s) => s.ticker === breakingItem.relatedTickers[0]);
                  if (st) onSelectStock(st);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#D96B43] hover:brightness-110 text-[#131211] font-bold text-xs flex items-center gap-1 transition"
              >
                <span>{breakingItem.relatedTickers[0]}</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Control Bar */}
      <div className="space-y-3">
        {/* Source Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-[#F7EEDB]/50 shrink-0 mr-1 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-[#D96B43]" />
            Sources:
          </span>
          {MAJOR_NEWS_SOURCES.map((source) => (
            <button
              key={source.id}
              onClick={() => setSelectedSource(source.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition ${
                selectedSource === source.id
                  ? 'bg-[#D96B43] text-[#131211] font-bold shadow-sm'
                  : 'bg-[#131211] text-[#F7EEDB]/70 hover:text-[#F7EEDB] border border-[#D96B43]/15'
              }`}
            >
              {source.name}
            </button>
          ))}
        </div>

        {/* Secondary Filter Line: Categories, Sentiment, Active Stock Toggle, and Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Category & Sentiment Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All News' },
              { id: 'HIGH_IMPACT', label: '🔥 High Impact' },
              { id: 'Macro & RBI', label: 'Macro & RBI' },
              { id: 'Earnings & Deals', label: 'Earnings & Deals' },
              { id: 'FII / DII Flows', label: 'FII / DII' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedCategory === cat.id
                    ? 'bg-[#25221F] text-[#F7EEDB] border border-[#D96B43]/40 font-bold'
                    : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                }`}
              >
                {cat.label}
              </button>
            ))}

            {/* Selected Stock Quick Toggle */}
            {selectedStock && (
              <button
                onClick={() => setOnlySelectedStock(!onlySelectedStock)}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold transition flex items-center gap-1.5 ${
                  onlySelectedStock
                    ? 'bg-[#8CB4E0] text-[#131211] shadow-sm'
                    : 'bg-[#131211] text-[#8CB4E0] border border-[#8CB4E0]/40 hover:bg-[#8CB4E0]/20'
                }`}
                title={`Filter news specifically mentioning ${selectedStock.ticker}`}
              >
                <span>Mentioning {selectedStock.ticker}</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#F7EEDB]/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news or ticker..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-[#131211] border border-[#D96B43]/15 text-xs text-[#F7EEDB] placeholder:text-[#F7EEDB]/40 focus:outline-none focus:border-[#D96B43] w-48 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Headlines Stream */}
      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
        {filteredNews.length === 0 ? (
          <div className="py-12 text-center text-[#F7EEDB]/50 text-xs space-y-2">
            <Newspaper className="w-8 h-8 text-[#D96B43]/50 mx-auto" />
            <p>No financial headlines match the selected criteria.</p>
            <button
              onClick={() => {
                setSelectedSource('ALL');
                setSelectedCategory('ALL');
                setSelectedSentiment('ALL');
                setSearchQuery('');
                setOnlySelectedStock(false);
              }}
              className="px-3 py-1 rounded-lg bg-[#131211] border border-[#D96B43]/30 text-[#D96B43] text-xs font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredNews.map((item) => {
            const isHighImpact = item.impactLevel === 'HIGH';
            const isBullish = item.sentiment === 'Bullish';
            const isBearish = item.sentiment === 'Bearish';

            return (
              <div
                key={item.id}
                className="group p-4 rounded-xl bg-[#131211]/70 hover:bg-[#131211] border border-[#D96B43]/15 hover:border-[#D96B43]/40 transition-all duration-150 space-y-2.5 shadow-sm"
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Source Pill */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${getSourceBadgeStyle(
                        item.source
                      )}`}
                    >
                      {item.source}
                    </span>

                    {/* Category */}
                    <span className="text-[10px] text-[#F7EEDB]/60 font-medium">
                      {item.category}
                    </span>

                    {/* Impact Level */}
                    {isHighImpact && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5 text-red-400" />
                        HIGH IMPACT
                      </span>
                    )}

                    {/* Sentiment */}
                    <span
                      className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                        isBullish
                          ? 'text-emerald-400'
                          : isBearish
                          ? 'text-red-400'
                          : 'text-[#F7EEDB]/60'
                      }`}
                    >
                      {isBullish ? '▲ Bullish' : isBearish ? '▼ Bearish' : '━ Neutral'}
                    </span>
                  </div>

                  <span className="text-[10px] text-[#F7EEDB]/40 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.timeAgo}
                  </span>
                </div>

                {/* Headline Title */}
                <h3 className="text-sm sm:text-base font-bold text-[#F7EEDB] leading-snug group-hover:text-white transition">
                  {item.title}
                </h3>

                {/* Summary Takeaway */}
                <p className="text-xs text-[#F7EEDB]/75 leading-relaxed">
                  {item.summary}
                </p>

                {/* Footer Strip: Related Tickers & External Link */}
                <div className="pt-2 border-t border-[#D96B43]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {/* Related Ticker Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#F7EEDB]/50 uppercase font-mono">Related:</span>
                    {item.relatedTickers.map((ticker) => {
                      const stockObj = stocks.find((s) => s.ticker === ticker);
                      const isStockSelected = selectedStock?.ticker === ticker;

                      return (
                        <button
                          key={ticker}
                          onClick={() => {
                            if (stockObj && onSelectStock) {
                              onSelectStock(stockObj);
                            }
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition flex items-center gap-1 ${
                            isStockSelected
                              ? 'bg-[#D96B43] text-[#131211] shadow-sm'
                              : 'bg-[#1A1816] hover:bg-[#25221F] text-[#F7EEDB] border border-[#D96B43]/20 hover:border-[#D96B43]'
                          }`}
                          title={`Click to load ${ticker} candlestick chart and order book`}
                        >
                          <span>{ticker}</span>
                          {stockObj && (
                            <span
                              className={`text-[9px] ${
                                stockObj.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {stockObj.changePercent >= 0 ? '+' : ''}
                              {stockObj.changePercent.toFixed(1)}%
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions: AI Thesis & External Link */}
                  <div className="flex items-center gap-2">
                    {item.relatedTickers.length > 0 && openAIExplanation && (
                      <button
                        onClick={() => {
                          const stockObj = stocks.find((s) => s.ticker === item.relatedTickers[0]);
                          if (stockObj) openAIExplanation(stockObj);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1A1816] hover:bg-[#25221F] border border-[#D96B43]/25 text-[11px] text-[#D96B43] font-semibold transition"
                        title="Generate Gemini AI thesis on this event"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>AI Thesis</span>
                      </button>
                    )}

                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-[#F7EEDB]/60 hover:text-[#D96B43] font-medium transition"
                    >
                      <span>Read on {item.source}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
