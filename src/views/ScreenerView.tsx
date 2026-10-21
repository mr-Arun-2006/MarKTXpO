import React, { useState, useMemo } from 'react';
import { StockData, SupportedLanguage } from '../types/market';
import { SIMPLE_SCREENER_PRESETS } from '../data/mockMarketData';
import { translations } from '../i18n/translations';
import { StockSparkline } from '../components/StockSparkline';
import { HourlyTrendIndicator } from '../components/HourlyTrendIndicator';
import {
  Filter,
  Search,
  ChevronRight,
  TrendingUp,
  Coins,
} from 'lucide-react';

interface Props {
  stocks: StockData[];
  onSelectStock: (stock: StockData) => void;
  openAIExplanation: (stock: StockData) => void;
  language: SupportedLanguage;
}

export const ScreenerView: React.FC<Props> = ({
  stocks,
  onSelectStock,
  openAIExplanation,
  language,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('all');
  const [searchWord, setSearchWord] = useState<string>('');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [minConfidence, setMinConfidence] = useState<number>(50);
  const [maxPE, setMaxPE] = useState<number>(90);

  const t = translations[language];

  // Unique sectors
  const sectors = useMemo(() => {
    const list = Array.from(new Set(stocks.map((s) => s.sector)));
    return ['ALL', ...list];
  }, [stocks]);

  // Filter stocks
  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      // 1. Sector
      if (sectorFilter !== 'ALL' && stock.sector !== sectorFilter) return false;

      // 2. Preset
      if (selectedPreset !== 'all') {
        const preset = SIMPLE_SCREENER_PRESETS.find((p) => p.id === selectedPreset);
        if (preset && !preset.filterFn(stock)) return false;
      }

      // 3. Simple word search query
      if (searchWord.trim()) {
        const query = searchWord.toLowerCase().trim();
        const matchesName = stock.name.toLowerCase().includes(query);
        const matchesTicker = stock.ticker.toLowerCase().includes(query);
        const matchesSector = stock.sector.toLowerCase().includes(query);
        const matchesSentiment = stock.sentiment.label.toLowerCase().includes(query);

        let matchesSemantic = false;
        if (query.includes('dip') || query.includes('oversold')) {
          matchesSemantic = stock.rsi < 45;
        } else if (query.includes('bull') || query.includes('strong')) {
          matchesSemantic = stock.sentiment.score > 60;
        } else if (query.includes('dividend') || query.includes('yield')) {
          matchesSemantic = stock.dividendYield > 1.2;
        } else if (query.includes('arbitrage') || query.includes('spread')) {
          matchesSemantic = Math.abs(stock.spreadPercent) > 0.03;
        } else if (query.includes('cheap') || query.includes('value')) {
          matchesSemantic = stock.pe < 25;
        }

        if (!matchesName && !matchesTicker && !matchesSector && !matchesSentiment && !matchesSemantic) {
          return false;
        }
      }

      // 4. Sliders
      if (stock.sentiment.confidence < minConfidence) return false;
      if (stock.pe > maxPE) return false;

      return true;
    });
  }, [stocks, selectedPreset, searchWord, sectorFilter, minConfidence, maxPE]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-[#F7EEDB]">
      {/* Title */}
      <div className="pb-4 border-b border-[#D96B43]/15 space-y-1">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[#D96B43]" />
          <h1 className="text-xl sm:text-2xl font-bold text-[#F7EEDB] tracking-tight">
            {t.simpleScreenerTitle}
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D96B43]/10 text-[#F7EEDB] border border-[#D96B43]/20 font-bold font-mono">
            PLAIN WORDS SCAN
          </span>
        </div>
        <p className="text-xs text-[#F7EEDB]/60">
          {t.simpleScreenerSubtitle}
        </p>
      </div>

      {/* Preset Word Cards */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-[#F7EEDB]/60 uppercase tracking-wider font-mono">
          Curated Plain-Language Presets:
        </span>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedPreset('all')}
            className={`p-3.5 rounded-xl border text-left transition ${
              selectedPreset === 'all'
                ? 'bg-[#1A1816] border-[#D96B43] text-[#F7EEDB] shadow-md shadow-[#D96B43]/10'
                : 'bg-[#1A1816]/60 border-[#D96B43]/15 text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#1A1816]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F7EEDB]">Show All Indian Equities</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#131211] text-[#F7EEDB] font-mono">
                {stocks.length}
              </span>
            </div>
            <p className="text-[11px] text-[#F7EEDB]/50 mt-1">Full universe of dual-listed NSE &amp; BSE companies</p>
          </button>

          {SIMPLE_SCREENER_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            const matchCount = stocks.filter(preset.filterFn).length;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                className={`p-3.5 rounded-xl border text-left transition ${
                  isSelected
                    ? 'bg-[#1A1816] border-[#D96B43] text-[#F7EEDB] shadow-md shadow-[#D96B43]/10'
                    : 'bg-[#1A1816]/60 border-[#D96B43]/15 text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#1A1816]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F7EEDB]">{preset.title}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-bold font-mono bg-[#D96B43]/20 text-[#F7EEDB]">
                    {matchCount} Matches
                  </span>
                </div>
                <p className="text-[11px] text-[#F7EEDB]/50 mt-1 line-clamp-1">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Natural Language Search & Interactive Sliders */}
      <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[#F7EEDB]/40 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Type keywords like 'dip', 'arbitrage', 'cheap', 'dividend', or ticker..."
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-xs text-[#F7EEDB] placeholder-[#F7EEDB]/40 focus:outline-none focus:border-[#D96B43]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#F7EEDB]/60">Sector:</span>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-xs font-semibold text-[#F7EEDB] focus:outline-none focus:border-[#D96B43]"
            >
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 pt-3 border-t border-[#D96B43]/10 text-xs">
          <div>
            <div className="flex justify-between text-[#F7EEDB]/60 mb-1">
              <span>Min AI Confidence Level</span>
              <span className="font-mono font-bold text-[#F7EEDB]">{minConfidence}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full accent-[#D96B43] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[#F7EEDB]/60 mb-1">
              <span>Maximum Valuation P/E</span>
              <span className="font-mono font-bold text-[#F7EEDB]">{maxPE}x</span>
            </div>
            <input
              type="range"
              min="15"
              max="90"
              step="5"
              value={maxPE}
              onChange={(e) => setMaxPE(Number(e.target.value))}
              className="w-full accent-[#D96B43] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Filtered Results Table with Sparklines */}
      <div className="rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#D96B43]/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#F7EEDB]">Screener Matches</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#131211] text-[#F7EEDB] font-mono font-bold">
              {filteredStocks.length} Securities
            </span>
          </div>
          <span className="text-xs text-[#F7EEDB]/50">Select row to load chart</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131211] text-[#F7EEDB]/60 uppercase font-mono text-[10px] tracking-wider border-b border-[#D96B43]/15">
              <tr>
                <th className="py-3 px-4">Ticker / Company</th>
                <th className="py-3 px-4">Sector</th>
                <th className="py-3 px-4 text-center">1H Trend</th>
                <th className="py-3 px-4 text-center">Trend (Recharts)</th>
                <th className="py-3 px-4 text-right">NSE / BSE Price</th>
                <th className="py-3 px-4 text-center">Dividend Yield</th>
                <th className="py-3 px-4 text-right">Spread %</th>
                <th className="py-3 px-4 text-center">RSI</th>
                <th className="py-3 px-4 text-center">AI Confidence</th>
                <th className="py-3 px-4 text-right">P/E</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D96B43]/10 font-mono">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#F7EEDB]/40">
                    No securities matching criteria.
                  </td>
                </tr>
              ) : (
                filteredStocks.map((stock) => {
                  const isPos = stock.change >= 0;
                  return (
                    <tr
                      key={stock.ticker}
                      onClick={() => onSelectStock(stock)}
                      className="hover:bg-[#25221F]/80 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#F7EEDB] text-sm group-hover:text-[#F7EEDB] transition">
                            {stock.ticker}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#131211] text-[#F7EEDB]/60 font-mono">
                            {stock.bseCode}
                          </span>
                        </div>
                        <span className="text-xs text-[#F7EEDB]/60 truncate block max-w-[160px] font-sans">
                          {stock.name}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-sans text-[#F7EEDB]/80">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#131211] text-[#F7EEDB]">
                          {stock.sector}
                        </span>
                      </td>

                      {/* Visual Hourly Trend Direction Indicator (Latest hour vs previous hour) */}
                      <td className="py-3.5 px-4 text-center">
                        <HourlyTrendIndicator
                          hourlyChangePercent={stock.hourlyChangePercent}
                          hourlyTrend={stock.hourlyTrend}
                          hourlyChange={stock.hourlyChange}
                          currentPrice={stock.currentPrice}
                        />
                      </td>

                      {/* Sparkline in Table Cell */}
                      <td className="py-3.5 px-4 text-center w-28">
                        <div className="w-24 mx-auto">
                          <StockSparkline data={stock.history} height={24} isPositive={isPos} />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-[#F7EEDB] text-xs">₹{stock.nsePrice.toFixed(2)}</div>
                        <div className="text-[11px] text-[#F7EEDB]">BSE: ₹{stock.bsePrice.toFixed(2)}</div>
                      </td>

                      {/* Dividend Yield Column */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-bold font-mono ${
                            stock.dividendYield >= 3.0
                              ? 'text-[#22C55E]'
                              : stock.dividendYield >= 1.5
                              ? 'text-[#D96B43]'
                              : 'text-[#F7EEDB]/70'
                          }`}
                        >
                          {stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : '0.00%'}
                        </span>
                        {stock.dividendYield >= 3.0 && (
                          <span className="text-[9px] px-1 py-0.2 ml-1 rounded bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 font-sans font-bold">
                            High
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-bold ${
                            Math.abs(stock.spreadPercent) > 0.03 ? 'text-[#F7EEDB]' : 'text-[#F7EEDB]/50'
                          }`}
                        >
                          {stock.spreadPercent > 0 ? '+' : ''}{stock.spreadPercent}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-[#F7EEDB]">{stock.rsi}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#D96B43]"></span>
                          <span className="font-bold text-[#F7EEDB]">{stock.sentiment.confidence}%</span>
                        </div>
                        <div className="text-[10px] text-[#D96B43] font-sans">{stock.sentiment.label}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right text-[#F7EEDB]/80">{stock.pe}x</td>

                      <td className="py-3.5 px-4 text-right font-sans">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAIExplanation(stock);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#D96B43]/15 border border-[#D96B43]/30 text-[#F7EEDB] hover:bg-[#D96B43] hover:text-[#131211] transition font-bold text-xs"
                        >
                          Explain
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
