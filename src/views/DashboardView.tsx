import React, { useState } from 'react';
import { StockData, SupportedLanguage, MarketAlert } from '../types/market';
import { translations } from '../i18n/translations';
import { TechnicalChart } from '../components/TechnicalChart';
import { StockSparkline } from '../components/StockSparkline';
import { AINewsDigest } from '../components/AINewsDigest';
import { HourlyTrendIndicator } from '../components/HourlyTrendIndicator';
import { SectorPerformanceHeatmap } from '../components/SectorPerformanceHeatmap';
import { MarketNews } from '../components/MarketNews';
import {
  Sparkles,
  TrendingUp,
  Brain,
  GitCompare,
  Filter,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Activity,
  Gamepad2,
  Layers,
  Newspaper,
} from 'lucide-react';

interface Props {
  stocks: StockData[];
  selectedStock: StockData;
  setSelectedStock: (stock: StockData) => void;
  openAIExplanation: (stock: StockData) => void;
  alerts: MarketAlert[];
  setActiveView: (view: string) => void;
  language: SupportedLanguage;
  customApiKey?: string;
}

export const DashboardView: React.FC<Props> = ({
  stocks,
  selectedStock,
  setSelectedStock,
  openAIExplanation,
  alerts,
  setActiveView,
  language,
  customApiKey,
}) => {
  const [filterSentiment, setFilterSentiment] = useState<'ALL' | 'BULLISH' | 'ARBITRAGE'>('ALL');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [newsViewTab, setNewsViewTab] = useState<'MARKET_NEWS' | 'AI_DIGEST'>('MARKET_NEWS');
  const t = translations[language];

  // Rank opportunities by AI confidence
  const rankedStocks = [...stocks].sort((a, b) => b.sentiment.confidence - a.sentiment.confidence);

  const filteredOpportunities = rankedStocks.filter((s) => {
    if (filterSentiment === 'BULLISH') return s.sentiment.score >= 65;
    if (filterSentiment === 'ARBITRAGE') return Math.abs(s.spreadPercent) >= 0.03;
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 space-y-6 sm:space-y-8 text-[#F7EEDB]">
      {/* Top Banner / Surveillance Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-[#D96B43]/20">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[#F7EEDB]">
              Equities Intelligence &amp; Surveillance
            </h1>
            <span className="text-[11px] text-[#D96B43] font-semibold font-mono tracking-wider">
              NSE · BSE
            </span>
          </div>
          <p className="text-xs text-[#F7EEDB]/65 mt-1">
            Dual-exchange liquidity surveillance, deterministic quantitative validation, and Gemini 3.8 Flash synthesis.
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto sm:flex-wrap pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => {
              setNewsViewTab('MARKET_NEWS');
              const el = document.getElementById('market-news-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-[#D96B43]/40 bg-[#1A1816] text-xs font-semibold text-[#F7EEDB] hover:bg-[#25221F] hover:border-[#D96B43] transition active:scale-95 whitespace-nowrap shrink-0"
          >
            <Newspaper className="w-3.5 h-3.5 text-[#D96B43]" />
            <span>Market News</span>
          </button>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border text-xs font-semibold transition active:scale-95 whitespace-nowrap shrink-0 ${
              showHeatmap
                ? 'border-[#D96B43] bg-[#D96B43]/20 text-[#F7EEDB]'
                : 'border-[#D96B43]/40 bg-[#1A1816] text-[#F7EEDB]/70 hover:bg-[#25221F] hover:text-[#F7EEDB]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#D96B43]" />
            <span>Sector Heatmap</span>
          </button>
          <button
            onClick={() => setActiveView('game')}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-[#22C55E]/40 bg-[#1A1816] text-xs font-semibold text-[#22C55E] hover:bg-[#22C55E]/15 hover:border-[#22C55E] transition active:scale-95 whitespace-nowrap shrink-0"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Trading Academy Game</span>
          </button>
          <button
            onClick={() => setActiveView('compare')}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-[#D96B43]/40 bg-[#1A1816] text-xs font-semibold text-[#F7EEDB] hover:bg-[#25221F] hover:border-[#D96B43] transition active:scale-95 whitespace-nowrap shrink-0"
          >
            <GitCompare className="w-3.5 h-3.5 text-[#D96B43]" />
            <span>NSE vs BSE</span>
          </button>
          <button
            onClick={() => setActiveView('screener')}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-[#8CB4E0]/40 bg-[#1A1816] text-xs font-semibold text-[#F7EEDB] hover:bg-[#25221F] hover:border-[#8CB4E0] transition active:scale-95 whitespace-nowrap shrink-0"
          >
            <Filter className="w-3.5 h-3.5 text-[#8CB4E0]" />
            <span>Simple Screener</span>
          </button>
        </div>
      </div>

      {/* Sparkline Momentum Overview Strip (Green / Red) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono uppercase tracking-wider text-[#8CB4E0] text-[11px]">
            <Activity className="w-3.5 h-3.5 text-[#D96B43]" />
            <span>Momentum Sparklines · 18-Day Recharts Trend</span>
          </div>
          <span className="text-[11px] text-[#F7EEDB]/50">At a glance</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {stocks.slice(0, 6).map((stock) => {
            const isSelected = selectedStock.ticker === stock.ticker;
            const isPos = stock.change >= 0;
            return (
              <div
                key={`spark-${stock.ticker}`}
                onClick={() => setSelectedStock(stock)}
                className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 group ${
                  isSelected
                    ? 'bg-[#1A1816] border-[#D96B43] shadow-[0_0_16px_rgba(217,107,67,0.3)]'
                    : 'bg-[#1A1816]/85 border-[#D96B43]/20 hover:border-[#D96B43]/70 hover:shadow-[0_0_14px_rgba(217,107,67,0.22)] hover:bg-[#25221F]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#F7EEDB] group-hover:text-[#FFFDF8] transition">
                    {stock.ticker}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isPos ? 'text-[#22C55E]' : 'text-[#EF4444]'
                    }`}
                  >
                    {isPos ? '+' : ''}{stock.changePercent}%
                  </span>
                </div>

                <div className="text-[11px] font-mono text-[#F7EEDB]/85 mt-0.5">
                  ₹{stock.currentPrice.toFixed(1)}
                </div>

                {/* Recharts Sparkline in Green or Red */}
                <div className="mt-2 pt-1 border-t border-[#D96B43]/15">
                  <StockSparkline data={stock.history} height={32} isPositive={isPos} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Sector Performance Heatmap */}
      {showHeatmap && (
        <SectorPerformanceHeatmap
          stocks={stocks}
          onSelectStock={setSelectedStock}
          openAIExplanation={openAIExplanation}
          language={language}
          onNavigateToSectors={() => setActiveView('sectors')}
        />
      )}

      {/* Main Grid: Chart & Active Stock Header */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Stock Chart & Key Statistics */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Ticker Card */}
          <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/35 shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_18px_rgba(217,107,67,0.12)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xl sm:text-2xl font-bold text-[#F7EEDB] tracking-tight">{selectedStock.ticker}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#131211] text-[#22C55E] border border-[#22C55E]/40 font-mono font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(34,197,94,0.25)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
                    NSE: {selectedStock.ticker}.NS
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#131211] text-[#8CB4E0] border border-[#8CB4E0]/40 shadow-[0_0_6px_rgba(140,180,224,0.2)] font-mono font-semibold">
                    BSE Scrip: {selectedStock.bseCode}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D96B43]/15 text-[#D96B43] border border-[#D96B43]/40 shadow-[0_0_6px_rgba(217,107,67,0.2)] font-medium">
                    {selectedStock.sector}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#F7EEDB]/60 flex-wrap">
                  <span>{selectedStock.name}</span>
                  <span>•</span>
                  <span className="text-[#8CB4E0] font-mono text-[11px]">Official Feed: Yahoo &amp; Google Finance Verified</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right space-y-1">
                  <div className="text-2xl font-bold text-[#F7EEDB] font-mono">₹{selectedStock.currentPrice.toFixed(2)}</div>
                  <div className="flex items-center justify-end gap-2">
                    <div
                      className={`text-xs font-mono font-bold flex items-center justify-end gap-1 ${
                        selectedStock.change >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                      }`}
                    >
                      {selectedStock.change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      <span>{selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)} ({selectedStock.changePercent}%)</span>
                    </div>
                    <HourlyTrendIndicator
                      hourlyChangePercent={selectedStock.hourlyChangePercent}
                      hourlyTrend={selectedStock.hourlyTrend}
                      compact
                    />
                  </div>
                </div>

                <button
                  onClick={() => openAIExplanation(selectedStock)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs border border-[#F7EEDB]/30 hover:border-[#F7EEDB] shadow-[0_0_16px_rgba(217,107,67,0.35)] transition"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Explain Setup</span>
                </button>
              </div>
            </div>

            {/* Available quote range and circuit metrics */}
            <div className="pt-2 border-t border-[#D96B43]/15 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-[#F7EEDB]/75">
              <div className="bg-[#131211]/60 px-2.5 py-1.5 rounded-lg border border-[#D96B43]/15">
                <span className="text-[#F7EEDB]/50 text-[10px] block">Day High / Low</span>
                <span className="text-[#22C55E] font-semibold">₹{selectedStock.dayHigh || selectedStock.high}</span> / <span className="text-[#EF4444] font-semibold">₹{selectedStock.dayLow || selectedStock.low}</span>
              </div>
              <div className="bg-[#131211]/60 px-2.5 py-1.5 rounded-lg border border-[#D96B43]/15">
                <span className="text-[#F7EEDB]/50 text-[10px] block">Prev Close / Open</span>
                <span className="text-[#F7EEDB] font-semibold">₹{selectedStock.previousClose}</span> / <span>₹{selectedStock.open || selectedStock.previousClose}</span>
              </div>
              <div className="bg-[#131211]/60 px-2.5 py-1.5 rounded-lg border border-[#D96B43]/15">
                <span className="text-[#F7EEDB]/50 text-[10px] block">Upper Circuit</span>
                <span className="text-[#22C55E] font-semibold">{selectedStock.upperCircuit != null ? `₹${selectedStock.upperCircuit.toFixed(2)}` : 'N/A'}</span>
              </div>
              <div className="bg-[#131211]/60 px-2.5 py-1.5 rounded-lg border border-[#D96B43]/15">
                <span className="text-[#F7EEDB]/50 text-[10px] block">Lower Circuit</span>
                <span className="text-[#EF4444] font-semibold">{selectedStock.lowerCircuit != null ? `₹${selectedStock.lowerCircuit.toFixed(2)}` : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Technical Candlestick Chart (Green & Red candles) */}
          <TechnicalChart stock={selectedStock} height={380} />

          {/* Stock Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/30 hover:border-[#D96B43] hover:shadow-[0_0_14px_rgba(217,107,67,0.25)] transition-all text-xs">
              <span className="text-[#F7EEDB]/60">NSE Quoted Price</span>
              <div className="text-base font-bold text-[#F7EEDB] font-mono mt-0.5">₹{selectedStock.nsePrice.toFixed(2)}</div>
              <span className="text-[10px] text-[#8CB4E0] font-mono">Vol: {(selectedStock.nseVolume / 100000).toFixed(1)}L</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1A1816] border border-[#8CB4E0]/30 hover:border-[#8CB4E0] hover:shadow-[0_0_14px_rgba(140,180,224,0.25)] transition-all text-xs">
              <span className="text-[#F7EEDB]/60">BSE Quoted Price</span>
              <div className="text-base font-bold text-[#8CB4E0] font-mono mt-0.5">₹{selectedStock.bsePrice.toFixed(2)}</div>
              <span className="text-[10px] text-[#D96B43] font-mono font-medium">
                Spread: {selectedStock.spreadPercent > 0 ? '+' : ''}{selectedStock.spreadPercent}%
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/30 hover:border-[#D96B43] hover:shadow-[0_0_14px_rgba(217,107,67,0.25)] transition-all text-xs">
              <span className="text-[#F7EEDB]/60">52W Range</span>
              <div className="text-xs font-bold text-[#F7EEDB] font-mono mt-1">
                {selectedStock.low52 != null && selectedStock.high52 != null ? `₹${selectedStock.low52} - ₹${selectedStock.high52}` : 'N/A'}
              </div>
              <span className="text-[10px] text-[#F7EEDB]/50">P/E: {selectedStock.pe} · Beta: {selectedStock.beta}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1A1816] border border-[#22C55E]/30 hover:border-[#22C55E] hover:shadow-[0_0_14px_rgba(34,197,94,0.25)] transition-all text-xs">
              <span className="text-[#F7EEDB]/60">Delivery &amp; RSI</span>
              <div className="text-xs font-bold text-[#22C55E] font-mono mt-1">
                {selectedStock.deliveryPercent != null ? `${selectedStock.deliveryPercent}% Delivery` : 'Delivery data unavailable'}
              </div>
              <span className="text-[10px] text-[#8CB4E0] font-mono">RSI(14): {selectedStock.rsi}</span>
            </div>
          </div>

          {/* Market News & Company AI Intelligence Section */}
          <div id="market-news-section" className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D96B43]/20 pb-3">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#1A1816] border border-[#D96B43]/20 text-xs">
                <button
                  onClick={() => setNewsViewTab('MARKET_NEWS')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition ${
                    newsViewTab === 'MARKET_NEWS'
                      ? 'bg-[#D96B43] text-[#131211] shadow-sm'
                      : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                  }`}
                >
                  <Newspaper className="w-3.5 h-3.5" />
                  <span>Market News (ET · Moneycontrol · Mint · BS)</span>
                </button>

                <button
                  onClick={() => setNewsViewTab('AI_DIGEST')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition ${
                    newsViewTab === 'AI_DIGEST'
                      ? 'bg-[#D96B43] text-[#131211] shadow-sm'
                      : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{selectedStock.ticker} AI Catalyst Thesis</span>
                </button>
              </div>

              <span className="text-[11px] text-[#F7EEDB]/50 font-mono hidden sm:inline">
                {newsViewTab === 'MARKET_NEWS'
                  ? 'Real-time Indian financial headlines'
                  : `Gemini synthesis for ${selectedStock.ticker}`}
              </span>
            </div>

            {newsViewTab === 'MARKET_NEWS' ? (
              <MarketNews
                stocks={stocks}
                selectedStock={selectedStock}
                onSelectStock={setSelectedStock}
                openAIExplanation={openAIExplanation}
                language={language}
                customApiKey={customApiKey}
                onOpenEod={() => setActiveView('eod')}
              />
            ) : (
              <AINewsDigest
                stock={selectedStock}
                language={language}
                customApiKey={customApiKey}
              />
            )}
          </div>
        </div>

        {/* Right 1 Col: AI Confidence Ranked Opportunities & Sparkline Indicators */}
        <div className="space-y-6">
          {/* AI Opportunity Ranking */}
          <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-[0_4px_24px_rgba(0,0,0,0.4),0_0_16px_rgba(217,107,67,0.1)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#D96B43]" />
                <h3 className="text-sm font-bold text-[#F7EEDB]">AI Opportunity Ranker</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8CB4E0]/15 text-[#8CB4E0] font-mono font-semibold border border-[#8CB4E0]/40 shadow-[0_0_8px_rgba(140,180,224,0.2)]">
                PROPRIETARY
              </span>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#131211] border border-[#D96B43]/30 text-xs">
              {(['ALL', 'BULLISH', 'ARBITRAGE'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterSentiment(filter)}
                  className={`flex-1 py-1 rounded-lg text-center transition font-semibold ${
                    filterSentiment === filter
                      ? 'bg-[#D96B43] text-[#131211] font-bold shadow-[0_0_12px_rgba(217,107,67,0.4)] border border-[#F7EEDB]/40'
                      : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB] hover:border-[#D96B43]/40'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Scrollable Ranked List with Recharts Sparklines in Green/Red */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredOpportunities.slice(0, 8).map((stock) => {
                const isSelected = selectedStock.ticker === stock.ticker;
                const isPos = stock.change >= 0;
                return (
                  <div
                    key={stock.ticker}
                    onClick={() => setSelectedStock(stock)}
                    className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#131211] border-[#D96B43] shadow-[0_0_14px_rgba(217,107,67,0.35)]'
                        : 'bg-[#131211]/70 border-[#D96B43]/20 hover:bg-[#131211] hover:border-[#8CB4E0]/60 hover:shadow-[0_0_12px_rgba(140,180,224,0.25)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#F7EEDB]">{stock.ticker}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                            stock.sentiment.confidence >= 90
                              ? 'bg-[#8CB4E0]/20 text-[#8CB4E0] border-[#8CB4E0]/50 shadow-[0_0_6px_rgba(140,180,224,0.3)]'
                              : 'bg-[#D96B43]/15 text-[#D96B43] border-[#D96B43]/40 shadow-[0_0_6px_rgba(217,107,67,0.3)]'
                          }`}
                        >
                          {stock.sentiment.confidence}% Conf.
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#F7EEDB]">
                        ₹{stock.currentPrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#F7EEDB]/60 mt-1">
                      <span className="truncate max-w-[110px]">{stock.name}</span>
                      <div className="flex items-center gap-1.5">
                        <HourlyTrendIndicator
                          hourlyChangePercent={stock.hourlyChangePercent}
                          hourlyTrend={stock.hourlyTrend}
                          compact
                        />
                        <span className={isPos ? 'text-[#22C55E] font-mono font-bold' : 'text-[#EF4444] font-mono font-bold'}>
                          {isPos ? '+' : ''}{stock.changePercent}%
                        </span>
                      </div>
                    </div>

                    {/* Integrated Sparkline inside Opportunity Row */}
                    <div className="my-1.5 py-0.5">
                      <StockSparkline data={stock.history} height={24} isPositive={isPos} />
                    </div>

                    {/* Arbitrage and AI catalyst footer */}
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#D96B43]/10">
                      <span className="text-[#F7EEDB]/60">
                        Spread: <strong className="text-[#8CB4E0] font-mono">{stock.spreadPercent}%</strong>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAIExplanation(stock);
                        }}
                        className="text-[#D96B43] hover:text-[#F7EEDB] font-bold flex items-center gap-0.5"
                      >
                        <span>Explain</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-Time Market Shift Alerts */}
          <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#D96B43]" />
                <h3 className="text-sm font-bold text-[#F7EEDB]">Automated Shift Alerts</h3>
              </div>
              <button
                onClick={() => setActiveView('alerts')}
                className="text-xs text-[#D96B43] hover:text-[#F7EEDB] font-medium"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2">
              {alerts.slice(0, 3).map((alt) => (
                <div
                  key={alt.id}
                  className="p-3 rounded-xl bg-[#131211]/70 border border-[#D96B43]/15 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#F7EEDB]">{alt.ticker}</span>
                    <span className="text-[10px] text-[#8CB4E0] font-mono">{alt.triggeredAt}</span>
                  </div>
                  <p className="text-[#F7EEDB]/80 text-[11px] leading-tight">{alt.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
