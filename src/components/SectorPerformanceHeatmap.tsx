import React, { useState, useMemo } from 'react';
import { StockData, SupportedLanguage } from '../types/market';
import { Sector30DayTrendChart, SectorTrendPoint } from './Sector30DayTrendChart';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  BarChart3,
  Sparkles,
  Maximize2,
  X,
  ChevronRight,
  Info,
  ShieldAlert,
  ArrowUpDown,
  Percent,
  CheckCircle2,
  ExternalLink,
  Activity,
  LineChart,
} from 'lucide-react';

export interface SectorPerformanceHeatmapProps {
  stocks: StockData[];
  onSelectStock?: (stock: StockData) => void;
  openAIExplanation?: (stock: StockData) => void;
  language?: SupportedLanguage;
  compact?: boolean;
  onNavigateToSectors?: () => void;
}

export interface SectorMetric {
  name: string;
  stocks: StockData[];
  count: number;
  avgChangePercent: number;
  weightedAvgChangePercent: number;
  totalMarketCapCr: number;
  advances: number;
  declines: number;
  unchanged: number;
  topGainer: StockData;
  topLoser: StockData;
  bellwether: StockData;
  avgPE: number;
  status: 'Leading' | 'Improving' | 'Neutral' | 'Weakening' | 'Lagging';
  trend30D: {
    points: SectorTrendPoint[];
    netReturn: number;
    highReturn: number;
    lowReturn: number;
  };
}

export const SectorPerformanceHeatmap: React.FC<SectorPerformanceHeatmapProps> = ({
  stocks,
  onSelectStock,
  openAIExplanation,
  language = 'en',
  compact = false,
  onNavigateToSectors,
}) => {
  const [weightingMode, setWeightingMode] = useState<'EQUAL' | 'MARKET_CAP'>('EQUAL');
  const [filterMode, setFilterMode] = useState<'ALL' | 'OUTPERFORMING' | 'LAGGING' | 'HIGH_MOMENTUM'>('ALL');
  const [sortBy, setSortBy] = useState<'PERFORMANCE_DESC' | 'PERFORMANCE_ASC' | 'MARKET_CAP' | 'NAME'>('PERFORMANCE_DESC');
  const [viewMode, setViewMode] = useState<'TREEMAP' | 'GRID'>('TREEMAP');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<SectorMetric | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [active30DSectors, setActive30DSectors] = useState<Set<string>>(new Set());

  const toggle30DView = (sectorName: string) => {
    setActive30DSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sectorName)) next.delete(sectorName);
      else next.add(sectorName);
      return next;
    });
  };

  // Group stocks by sector and calculate granular metrics
  const sectorMetrics = useMemo<SectorMetric[]>(() => {
    if (!stocks || stocks.length === 0) return [];

    const sectorMap = new Map<string, StockData[]>();

    stocks.forEach((stock) => {
      const rawSector = stock.sector || 'Diversified & Others';
      const cleanSector = rawSector.trim();
      const current = sectorMap.get(cleanSector) || [];
      current.push(stock);
      sectorMap.set(cleanSector, current);
    });

    const metrics: SectorMetric[] = [];

    sectorMap.forEach((sectorStocks, sectorName) => {
      if (sectorStocks.length === 0) return;

      const count = sectorStocks.length;
      const sumChange = sectorStocks.reduce((acc, s) => acc + (s.changePercent || 0), 0);
      const avgChangePercent = Math.round((sumChange / count) * 100) / 100;

      const totalMarketCapCr = sectorStocks.reduce((acc, s) => acc + (s.marketCapCr || 0), 0);
      
      const weightedSum = sectorStocks.reduce(
        (acc, s) => acc + (s.changePercent || 0) * (s.marketCapCr || 1),
        0
      );
      const weightedAvgChangePercent =
        totalMarketCapCr > 0
          ? Math.round((weightedSum / totalMarketCapCr) * 100) / 100
          : avgChangePercent;

      let advances = 0;
      let declines = 0;
      let unchanged = 0;

      sectorStocks.forEach((s) => {
        if (s.changePercent > 0.01) advances++;
        else if (s.changePercent < -0.01) declines++;
        else unchanged++;
      });

      // Sort stocks by changePercent to find top gainer and loser
      const sortedByReturn = [...sectorStocks].sort((a, b) => b.changePercent - a.changePercent);
      const topGainer = sortedByReturn[0];
      const topLoser = sortedByReturn[sortedByReturn.length - 1];

      // Bellwether is the largest market cap stock in the sector
      const sortedByCap = [...sectorStocks].sort((a, b) => (b.marketCapCr || 0) - (a.marketCapCr || 0));
      const bellwether = sortedByCap[0];

      // Average PE calculation (ignoring zero/negative or extreme outliers)
      const validPEs = sectorStocks.filter((s) => s.pe && s.pe > 0 && s.pe < 250);
      const avgPE =
        validPEs.length > 0
          ? Math.round((validPEs.reduce((acc, s) => acc + s.pe, 0) / validPEs.length) * 10) / 10
          : 0;

      // Status classification
      const primaryReturn = weightingMode === 'MARKET_CAP' ? weightedAvgChangePercent : avgChangePercent;
      let status: SectorMetric['status'] = 'Neutral';
      if (primaryReturn >= 1.0) status = 'Leading';
      else if (primaryReturn >= 0.25) status = 'Improving';
      else if (primaryReturn <= -1.0) status = 'Lagging';
      else if (primaryReturn <= -0.25) status = 'Weakening';

      // 30-Day Aggregate Sector Performance Trend Calculation
      const trendPoints: SectorTrendPoint[] = [];
      const daysCount = 30;

      const stocksWithHist = sectorStocks.filter(
        (s) => s.history && s.history.length >= 2
      );

      if (stocksWithHist.length > 0) {
        const referenceHist = stocksWithHist[0].history;
        const availableDays = Math.min(daysCount, referenceHist.length);
        const startIndex = referenceHist.length - availableDays;

        for (let i = 0; i < availableDays; i++) {
          const currIdx = startIndex + i;
          const dateStr = referenceHist[currIdx].date;

          let weightedSum30D = 0;
          let weightTotal30D = 0;

          stocksWithHist.forEach((st) => {
            const hist = st.history;
            const stStartIdx = hist.length - availableDays;
            if (stStartIdx < 0 || currIdx >= hist.length) return;

            const baseClose = hist[stStartIdx].close || st.currentPrice;
            const currClose = hist[currIdx].close || st.currentPrice;
            const retPct = baseClose > 0 ? ((currClose - baseClose) / baseClose) * 100 : 0;

            const weight = weightingMode === 'MARKET_CAP' ? (st.marketCapCr || 1) : 1;
            weightedSum30D += retPct * weight;
            weightTotal30D += weight;
          });

          const avgPointReturn = weightTotal30D > 0 ? Math.round((weightedSum30D / weightTotal30D) * 100) / 100 : 0;
          trendPoints.push({
            date: dateStr,
            returnPct: avgPointReturn,
          });
        }
      }

      const net30DayReturn = trendPoints.length > 0 ? trendPoints[trendPoints.length - 1].returnPct : 0;
      const all30DReturns = trendPoints.map((p) => p.returnPct);
      const high30DayReturn = all30DReturns.length > 0 ? Math.max(...all30DReturns) : 0;
      const low30DayReturn = all30DReturns.length > 0 ? Math.min(...all30DReturns) : 0;

      metrics.push({
        name: sectorName,
        stocks: sectorStocks,
        count,
        avgChangePercent,
        weightedAvgChangePercent,
        totalMarketCapCr,
        advances,
        declines,
        unchanged,
        topGainer,
        topLoser,
        bellwether,
        avgPE,
        status,
        trend30D: {
          points: trendPoints,
          netReturn: net30DayReturn,
          highReturn: high30DayReturn,
          lowReturn: low30DayReturn,
        },
      });
    });

    return metrics;
  }, [stocks, weightingMode]);

  // Aggregate market overview metrics
  const marketSummary = useMemo(() => {
    if (sectorMetrics.length === 0) {
      return {
        advancingSectors: 0,
        decliningSectors: 0,
        flatSectors: 0,
        bestSector: null,
        worstSector: null,
        marketAvgChange: 0,
        totalMarketCapLakhCr: 0,
      };
    }

    let advancingSectors = 0;
    let decliningSectors = 0;
    let flatSectors = 0;
    let totalCapCr = 0;
    let weightedMarketSum = 0;

    sectorMetrics.forEach((sec) => {
      const ret = weightingMode === 'MARKET_CAP' ? sec.weightedAvgChangePercent : sec.avgChangePercent;
      if (ret > 0.05) advancingSectors++;
      else if (ret < -0.05) decliningSectors++;
      else flatSectors++;

      totalCapCr += sec.totalMarketCapCr;
      weightedMarketSum += ret * sec.totalMarketCapCr;
    });

    const marketAvgChange =
      totalCapCr > 0 ? Math.round((weightedMarketSum / totalCapCr) * 100) / 100 : 0;

    const sorted = [...sectorMetrics].sort((a, b) => {
      const retA = weightingMode === 'MARKET_CAP' ? a.weightedAvgChangePercent : a.avgChangePercent;
      const retB = weightingMode === 'MARKET_CAP' ? b.weightedAvgChangePercent : b.avgChangePercent;
      return retB - retA;
    });

    return {
      advancingSectors,
      decliningSectors,
      flatSectors,
      bestSector: sorted[0] || null,
      worstSector: sorted[sorted.length - 1] || null,
      marketAvgChange,
      totalMarketCapLakhCr: Math.round((totalCapCr / 100000) * 100) / 100,
    };
  }, [sectorMetrics, weightingMode]);

  // Filtered and sorted sectors
  const displayedSectors = useMemo(() => {
    let list = [...sectorMetrics];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.stocks.some(
            (st) =>
              st.ticker.toLowerCase().includes(q) ||
              st.name.toLowerCase().includes(q)
          )
      );
    }

    // Filter mode
    if (filterMode === 'OUTPERFORMING') {
      list = list.filter((s) => {
        const ret = weightingMode === 'MARKET_CAP' ? s.weightedAvgChangePercent : s.avgChangePercent;
        return ret > 0;
      });
    } else if (filterMode === 'LAGGING') {
      list = list.filter((s) => {
        const ret = weightingMode === 'MARKET_CAP' ? s.weightedAvgChangePercent : s.avgChangePercent;
        return ret < 0;
      });
    } else if (filterMode === 'HIGH_MOMENTUM') {
      list = list.filter((s) => {
        const ret = weightingMode === 'MARKET_CAP' ? s.weightedAvgChangePercent : s.avgChangePercent;
        return Math.abs(ret) >= 0.8;
      });
    }

    // Sorting
    list.sort((a, b) => {
      const retA = weightingMode === 'MARKET_CAP' ? a.weightedAvgChangePercent : a.avgChangePercent;
      const retB = weightingMode === 'MARKET_CAP' ? b.weightedAvgChangePercent : b.avgChangePercent;

      if (sortBy === 'PERFORMANCE_DESC') return retB - retA;
      if (sortBy === 'PERFORMANCE_ASC') return retA - retB;
      if (sortBy === 'MARKET_CAP') return b.totalMarketCapCr - a.totalMarketCapCr;
      if (sortBy === 'NAME') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [sectorMetrics, searchQuery, filterMode, sortBy, weightingMode]);

  // Color grading helper based on average price change %
  const getSectorColorTheme = (changePercent: number) => {
    if (changePercent >= 2.0) {
      return {
        bg: 'bg-emerald-950/90 hover:bg-emerald-900',
        border: 'border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.22)]',
        accent: 'text-emerald-300',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
        glow: 'from-emerald-500/15 to-transparent',
        tag: 'SURGING',
      };
    }
    if (changePercent >= 1.0) {
      return {
        bg: 'bg-emerald-900/60 hover:bg-emerald-900/85',
        border: 'border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
        accent: 'text-emerald-300',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        glow: 'from-emerald-500/10 to-transparent',
        tag: 'OUTPERFORMING',
      };
    }
    if (changePercent >= 0.25) {
      return {
        bg: 'bg-teal-950/50 hover:bg-teal-900/60',
        border: 'border-teal-500/40',
        accent: 'text-teal-300',
        badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        glow: 'from-teal-500/10 to-transparent',
        tag: 'MODERATE GAIN',
      };
    }
    if (changePercent > -0.25) {
      return {
        bg: 'bg-[#1F1D1A] hover:bg-[#282521]',
        border: 'border-stone-700/50',
        accent: 'text-stone-300',
        badge: 'bg-stone-700/30 text-stone-300 border-stone-600/30',
        glow: 'from-stone-500/5 to-transparent',
        tag: 'FLAT / NEUTRAL',
      };
    }
    if (changePercent > -1.0) {
      return {
        bg: 'bg-rose-950/40 hover:bg-rose-900/55',
        border: 'border-rose-700/40',
        accent: 'text-rose-300',
        badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        glow: 'from-rose-500/10 to-transparent',
        tag: 'MILD PULLBACK',
      };
    }
    if (changePercent > -2.0) {
      return {
        bg: 'bg-red-950/65 hover:bg-red-900/80',
        border: 'border-red-600/60 shadow-[0_0_12px_rgba(239,68,68,0.15)]',
        accent: 'text-red-300',
        badge: 'bg-red-500/20 text-red-300 border-red-500/40',
        glow: 'from-red-500/10 to-transparent',
        tag: 'LAGGING',
      };
    }
    return {
      bg: 'bg-red-950/90 hover:bg-red-900',
      border: 'border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.25)]',
      accent: 'text-red-300',
      badge: 'bg-red-500/25 text-red-300 border-red-400/50',
      glow: 'from-red-500/20 to-transparent',
      tag: 'HEAVY LAGGARD',
    };
  };

  // Helper to format market cap in Indian currency notation (₹ Lakh Cr or ₹ Cr)
  const formatMarketCap = (cr: number) => {
    if (cr >= 100000) {
      return `₹${(cr / 100000).toFixed(2)} Lakh Cr`;
    }
    if (cr >= 1000) {
      return `₹${(cr / 1000).toFixed(1)}K Cr`;
    }
    return `₹${cr.toFixed(0)} Cr`;
  };

  return (
    <div className="rounded-2xl bg-[#1A1816] border border-[#D96B43]/25 p-4 sm:p-6 space-y-6 shadow-xl">
      {/* Component Header with Quick Insights */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#D96B43]/15">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#D96B43]/15 border border-[#D96B43]/30 text-[#D96B43]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#F7EEDB] tracking-tight">
                  Sector Performance Heatmap
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D96B43]/15 text-[#D96B43] border border-[#D96B43]/30 font-bold font-mono">
                  LIVE DIVERGENCE
                </span>
              </div>
              <p className="text-xs text-[#F7EEDB]/60 mt-0.5">
                Block colors dynamically scale by average stock price changes across Indian industries to spot market rotation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Breadth & Top Sector Quick Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {marketSummary.bestSector && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80">Leading:</span>
              <span className="font-bold">{marketSummary.bestSector.name}</span>
              <span className="font-mono font-bold">
                +{weightingMode === 'MARKET_CAP'
                  ? marketSummary.bestSector.weightedAvgChangePercent
                  : marketSummary.bestSector.avgChangePercent}%
              </span>
            </div>
          )}

          {marketSummary.worstSector && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-red-400/80">Lagging:</span>
              <span className="font-bold">{marketSummary.worstSector.name}</span>
              <span className="font-mono font-bold">
                {weightingMode === 'MARKET_CAP'
                  ? marketSummary.worstSector.weightedAvgChangePercent
                  : marketSummary.worstSector.avgChangePercent}%
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131211] border border-[#D96B43]/20 font-mono text-[11px]">
            <span className="text-[#F7EEDB]/60">Breadth:</span>
            <span className="text-emerald-400 font-bold">{marketSummary.advancingSectors}▲</span>
            <span className="text-[#F7EEDB]/40">/</span>
            <span className="text-red-400 font-bold">{marketSummary.decliningSectors}▼</span>
          </div>

          {onNavigateToSectors && (
            <button
              onClick={onNavigateToSectors}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D96B43]/15 hover:bg-[#D96B43]/25 border border-[#D96B43]/30 text-[#D96B43] font-semibold transition"
            >
              <span>Full Analytics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Control Bar: Weighting, Filters, View Modes & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: View & Weighting Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Weighting Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-[#131211] border border-[#D96B43]/15">
            <button
              onClick={() => setWeightingMode('EQUAL')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                weightingMode === 'EQUAL'
                  ? 'bg-[#D96B43] text-[#131211] font-bold shadow-sm'
                  : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
              }`}
              title="Arithmetic average of all constituent stocks in each sector"
            >
              Equal Weighted
            </button>
            <button
              onClick={() => setWeightingMode('MARKET_CAP')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                weightingMode === 'MARKET_CAP'
                  ? 'bg-[#D96B43] text-[#131211] font-bold shadow-sm'
                  : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
              }`}
              title="Weighted by free-float market capitalization (Index benchmark style)"
            >
              Market Cap Weighted
            </button>
          </div>

          {/* Performance Filter Pills */}
          <div className="flex items-center p-1 rounded-xl bg-[#131211] border border-[#D96B43]/15">
            {(
              [
                { id: 'ALL', label: 'All Sectors' },
                { id: 'OUTPERFORMING', label: 'Outperforming (>0%)' },
                { id: 'LAGGING', label: 'Lagging (<0%)' },
                { id: 'HIGH_MOMENTUM', label: 'Momentum (|Δ|≥0.8%)' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFilterMode(opt.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  filterMode === opt.id
                    ? 'bg-[#25221F] text-[#F7EEDB] border border-[#D96B43]/30 font-bold'
                    : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Search & Layout Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search sector or stock */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#F7EEDB]/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sector or stock..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-[#131211] border border-[#D96B43]/15 text-xs text-[#F7EEDB] placeholder:text-[#F7EEDB]/40 focus:outline-none focus:border-[#D96B43] w-44 sm:w-56"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#F7EEDB]/40 hover:text-[#F7EEDB]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#131211] border border-[#D96B43]/15 text-[#F7EEDB]/80">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#D96B43]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-[#F7EEDB] focus:outline-none cursor-pointer"
            >
              <option value="PERFORMANCE_DESC" className="bg-[#1A1816]">Top Gainers First</option>
              <option value="PERFORMANCE_ASC" className="bg-[#1A1816]">Worst Laggards First</option>
              <option value="MARKET_CAP" className="bg-[#1A1816]">Largest Market Cap</option>
              <option value="NAME" className="bg-[#1A1816]">Sector Name (A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle: Treemap vs Grid */}
          <div className="flex items-center p-1 rounded-xl bg-[#131211] border border-[#D96B43]/15">
            <button
              onClick={() => setViewMode('TREEMAP')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'TREEMAP'
                  ? 'bg-[#D96B43] text-[#131211]'
                  : 'text-[#F7EEDB]/50 hover:text-[#F7EEDB]'
              }`}
              title="Treemap Visual Blocks (Proportional by Market Weight)"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'GRID'
                  ? 'bg-[#D96B43] text-[#131211]'
                  : 'text-[#F7EEDB]/50 hover:text-[#F7EEDB]'
              }`}
              title="Matrix Grid View"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap Color Scale Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#131211] border border-[#D96B43]/10 text-[11px]">
        <div className="flex items-center gap-1.5 text-[#F7EEDB]/60">
          <Info className="w-3.5 h-3.5 text-[#D96B43]" />
          <span>Sector Return Heat Scale:</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 font-mono text-[10px]">
          <span className="px-2 py-0.5 rounded bg-red-950/90 text-red-300 border border-red-500/80 font-bold">
            &lt; -2.0%
          </span>
          <span className="px-2 py-0.5 rounded bg-red-950/65 text-red-300 border border-red-600/60 font-semibold">
            -1.0% to -2.0%
          </span>
          <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-700/40">
            -0.25% to -1.0%
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1F1D1A] text-stone-300 border border-stone-700/50">
            ±0.25% Flat
          </span>
          <span className="px-2 py-0.5 rounded bg-teal-950/50 text-teal-300 border border-teal-500/40">
            +0.25% to +1.0%
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-500/50 font-semibold">
            +1.0% to +2.0%
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/80 font-bold">
            &gt; +2.0%
          </span>
        </div>
      </div>

      {/* Heatmap Visualization: Treemap Mode */}
      {viewMode === 'TREEMAP' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayedSectors.map((sector) => {
            const ret = weightingMode === 'MARKET_CAP' ? sector.weightedAvgChangePercent : sector.avgChangePercent;
            const theme = getSectorColorTheme(ret);
            const isPositive = ret > 0;
            const isFlat = Math.abs(ret) <= 0.05;

            // Compute proportional visual span for bellwether sectors
            const isMegaSector = sector.totalMarketCapCr > 1000000;

            const isHovered = hoveredSector === sector.name;
            const is30DActive = isHovered || active30DSectors.has(sector.name);

            return (
              <div
                key={sector.name}
                onClick={() => setSelectedSector(sector)}
                onMouseEnter={() => setHoveredSector(sector.name)}
                onMouseLeave={() => setHoveredSector(null)}
                className={`group relative rounded-2xl p-4 border transition-all duration-300 cursor-pointer overflow-hidden ${
                  theme.bg
                } ${theme.border} hover:scale-[1.015] hover:z-20 hover:shadow-2xl ${
                  isMegaSector ? 'sm:col-span-2 xl:col-span-2' : 'col-span-1'
                } ${is30DActive ? 'ring-1 ring-[#D96B43]/50 shadow-[0_0_24px_rgba(217,107,67,0.2)]' : ''}`}
              >
                {/* Background ambient gradient glow */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${theme.glow} pointer-events-none opacity-40 group-hover:opacity-85 transition-opacity`}
                />

                <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
                  {/* Top Row: Sector Name, Badges, 30D Toggle & Average % Change */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-[#F7EEDB] tracking-tight group-hover:text-white transition">
                          {sector.name}
                        </h3>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono uppercase ${theme.badge}`}>
                          {theme.tag}
                        </span>

                        {/* Responsive 30D Trend Toggle Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle30DView(sector.name);
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 transition ${
                            is30DActive
                              ? 'bg-[#D96B43] text-[#131211] shadow-sm'
                              : 'bg-[#131211] text-[#F7EEDB]/70 hover:text-white border border-[#D96B43]/20 hover:border-[#D96B43]/50'
                          }`}
                          title="Click to toggle 30-day aggregate trend chart on mobile or touchscreens"
                        >
                          <Activity className="w-2.5 h-2.5 text-[#D96B43]" />
                          <span>30D Trend</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-[#F7EEDB]/60 font-mono">
                        {sector.count} equities · {formatMarketCap(sector.totalMarketCapCr)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`flex items-center justify-end gap-1 font-mono text-lg sm:text-xl font-black ${theme.accent}`}>
                        {!isFlat && (isPositive ? (
                          <ArrowUpRight className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-red-400 stroke-[2.5]" />
                        ))}
                        <span>{isPositive ? `+${ret.toFixed(2)}` : ret.toFixed(2)}%</span>
                      </div>
                      <span className="text-[10px] text-[#F7EEDB]/50 font-mono">
                        {weightingMode === 'MARKET_CAP' ? 'MCap-weighted' : 'Equal-weighted'}
                      </span>
                    </div>
                  </div>

                  {/* Advance / Decline Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#F7EEDB]/70">
                      <span className="text-emerald-400 font-bold">{sector.advances} Advancing</span>
                      {sector.unchanged > 0 && <span className="text-[#F7EEDB]/50">{sector.unchanged} Flat</span>}
                      <span className="text-red-400 font-bold">{sector.declines} Declining</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#131211]/80 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${(sector.advances / sector.count) * 100}%` }}
                      />
                      <div
                        className="bg-stone-500/40 h-full transition-all"
                        style={{ width: `${(sector.unchanged / sector.count) * 100}%` }}
                      />
                      <div
                        className="bg-red-500 h-full transition-all"
                        style={{ width: `${(sector.declines / sector.count) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Hover-State Effect: Miniaturized 30-Day Line Chart */}
                  <div
                    className={`transition-all duration-300 ease-out overflow-hidden ${
                      is30DActive
                        ? 'max-h-48 opacity-100 pt-2 border-t border-[#D96B43]/20 animate-in fade-in duration-200'
                        : 'max-h-0 opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#F7EEDB]/70 font-mono mb-1">
                      <span className="flex items-center gap-1 text-[#D96B43] font-bold">
                        <Activity className="w-3 h-3 text-[#D96B43]" />
                        30-Day Aggregate Sector Trend
                      </span>
                      <span
                        className={`font-black ${
                          sector.trend30D.netReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {sector.trend30D.netReturn >= 0 ? '+' : ''}
                        {sector.trend30D.netReturn.toFixed(2)}% net
                      </span>
                    </div>

                    <Sector30DayTrendChart
                      points={sector.trend30D.points}
                      netReturn={sector.trend30D.netReturn}
                      highReturn={sector.trend30D.highReturn}
                      lowReturn={sector.trend30D.lowReturn}
                      height={68}
                    />
                  </div>

                  {/* Sector Extremes: Top Gainer & Loser */}
                  <div className="pt-2 border-t border-[#D96B43]/15 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-[#131211]/60 p-2 border border-[#D96B43]/10">
                      <span className="text-[10px] text-[#F7EEDB]/50 block">Top Gainer:</span>
                      <div className="flex items-center justify-between font-mono mt-0.5">
                        <span className="font-bold text-[#F7EEDB] truncate mr-1">
                          {sector.topGainer.ticker}
                        </span>
                        <span className="text-emerald-400 font-bold">
                          +{sector.topGainer.changePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#131211]/60 p-2 border border-[#D96B43]/10">
                      <span className="text-[10px] text-[#F7EEDB]/50 block">Anchor / Laggard:</span>
                      <div className="flex items-center justify-between font-mono mt-0.5">
                        <span className="font-bold text-[#F7EEDB] truncate mr-1">
                          {sector.topLoser.ticker}
                        </span>
                        <span className={sector.topLoser.changePercent >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                          {sector.topLoser.changePercent >= 0 ? '+' : ''}
                          {sector.topLoser.changePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Micro Stock Pills Preview */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {sector.stocks.slice(0, isMegaSector ? 6 : 4).map((st) => (
                      <span
                        key={st.ticker}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                          st.changePercent > 0
                            ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                            : st.changePercent < 0
                            ? 'bg-red-950/50 text-red-300 border border-red-500/30'
                            : 'bg-[#131211] text-[#F7EEDB]/60 border border-[#D96B43]/15'
                        }`}
                      >
                        {st.ticker} {st.changePercent > 0 ? '+' : ''}{st.changePercent.toFixed(1)}%
                      </span>
                    ))}
                    {sector.stocks.length > (isMegaSector ? 6 : 4) && (
                      <span className="text-[10px] text-[#D96B43] font-mono font-bold flex items-center gap-0.5">
                        +{sector.stocks.length - (isMegaSector ? 6 : 4)} more
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Matrix Grid View */
        <div className="overflow-x-auto rounded-xl border border-[#D96B43]/20">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#131211] text-[#F7EEDB]/60 uppercase text-[10px] tracking-wider border-b border-[#D96B43]/20">
              <tr>
                <th className="py-3 px-4 font-sans">Sector Segment</th>
                <th className="py-3 px-4 text-right">Avg Return</th>
                <th className="py-3 px-4 text-center">30D Trend</th>
                <th className="py-3 px-4 text-center">Market Breadth</th>
                <th className="py-3 px-4 text-right">Market Cap</th>
                <th className="py-3 px-4 text-right">Avg P/E</th>
                <th className="py-3 px-4 font-sans">Bellwether Anchor</th>
                <th className="py-3 px-4 text-right font-sans">Best Performer</th>
                <th className="py-3 px-4 text-center font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D96B43]/10">
              {displayedSectors.map((sector) => {
                const ret = weightingMode === 'MARKET_CAP' ? sector.weightedAvgChangePercent : sector.avgChangePercent;
                const theme = getSectorColorTheme(ret);
                const isPositive = ret > 0;

                return (
                  <tr
                    key={sector.name}
                    onClick={() => setSelectedSector(sector)}
                    className="hover:bg-[#25221F]/60 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-sans font-bold text-[#F7EEDB]">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>{sector.name}</span>
                        <span className="text-[10px] font-mono text-[#F7EEDB]/50">({sector.count})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-sm">
                      <span className={theme.accent}>
                        {isPositive ? '+' : ''}{ret.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center w-36">
                      <div className="w-28 mx-auto space-y-0.5">
                        <Sector30DayTrendChart
                          points={sector.trend30D.points}
                          netReturn={sector.trend30D.netReturn}
                          highReturn={sector.trend30D.highReturn}
                          lowReturn={sector.trend30D.lowReturn}
                          height={28}
                          showAxes={false}
                          interactive={false}
                          compact={true}
                        />
                        <div className="text-[9px] font-mono font-bold text-right">
                          <span className={sector.trend30D.netReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {sector.trend30D.netReturn >= 0 ? '+' : ''}{sector.trend30D.netReturn.toFixed(1)}% 30d
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-emerald-400 font-bold">{sector.advances}</span>
                      <span className="text-[#F7EEDB]/40 mx-1">:</span>
                      <span className="text-red-400 font-bold">{sector.declines}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#F7EEDB]/80">
                      {formatMarketCap(sector.totalMarketCapCr)}
                    </td>
                    <td className="py-3 px-4 text-right text-[#F7EEDB]/80">
                      {sector.avgPE > 0 ? `${sector.avgPE}x` : '—'}
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-[#F7EEDB]">
                      {sector.bellwether.name} ({sector.bellwether.ticker})
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[#F7EEDB] font-bold mr-1">{sector.topGainer.ticker}</span>
                      <span className="text-emerald-400 font-bold">+{sector.topGainer.changePercent.toFixed(1)}%</span>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSector(sector);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#131211] hover:bg-[#D96B43]/20 border border-[#D96B43]/20 text-xs font-semibold text-[#D96B43] transition"
                      >
                        Breakdown
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sector Constituent Drilldown Drawer / Modal */}
      {selectedSector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#1A1816] border border-[#D96B43]/40 shadow-2xl overflow-hidden text-[#F7EEDB]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#D96B43]/20 flex items-start justify-between gap-4 bg-[#131211]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#D96B43] font-bold">
                    Sector Drilldown &amp; Constituents
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                      getSectorColorTheme(
                        weightingMode === 'MARKET_CAP'
                          ? selectedSector.weightedAvgChangePercent
                          : selectedSector.avgChangePercent
                      ).badge
                    }`}
                  >
                    {selectedSector.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F7EEDB]">
                  {selectedSector.name}
                </h3>
                <p className="text-xs text-[#F7EEDB]/60">
                  {selectedSector.count} dual-listed companies · {formatMarketCap(selectedSector.totalMarketCapCr)} Total Market Cap
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div
                    className={`text-2xl font-black font-mono ${
                      getSectorColorTheme(
                        weightingMode === 'MARKET_CAP'
                          ? selectedSector.weightedAvgChangePercent
                          : selectedSector.avgChangePercent
                      ).accent
                    }`}
                  >
                    {(weightingMode === 'MARKET_CAP'
                      ? selectedSector.weightedAvgChangePercent
                      : selectedSector.avgChangePercent) >= 0
                      ? '+'
                      : ''}
                    {(weightingMode === 'MARKET_CAP'
                      ? selectedSector.weightedAvgChangePercent
                      : selectedSector.avgChangePercent
                    ).toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-[#F7EEDB]/50 font-mono">
                    {weightingMode === 'MARKET_CAP' ? 'MCap-weighted' : 'Equal-weighted'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSector(null)}
                  className="p-2 rounded-xl bg-[#25221F] hover:bg-[#35302B] text-[#F7EEDB]/70 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#1A1816] border-b border-[#D96B43]/15 text-xs">
              <div className="p-2.5 rounded-xl bg-[#131211] border border-[#D96B43]/10">
                <span className="text-[10px] text-[#F7EEDB]/50 uppercase font-mono">Market Breadth</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-emerald-400 font-bold">{selectedSector.advances} Advancing</span>
                  <span className="text-[#F7EEDB]/30">/</span>
                  <span className="text-red-400 font-bold">{selectedSector.declines} Declining</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#131211] border border-[#D96B43]/10">
                <span className="text-[10px] text-[#F7EEDB]/50 uppercase font-mono">Sector Leader</span>
                <div className="font-bold text-[#F7EEDB] mt-1 truncate">
                  {selectedSector.topGainer.ticker} (+{selectedSector.topGainer.changePercent.toFixed(1)}%)
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#131211] border border-[#D96B43]/10">
                <span className="text-[10px] text-[#F7EEDB]/50 uppercase font-mono">Anchor Stock</span>
                <div className="font-bold text-[#F7EEDB] mt-1 truncate">
                  {selectedSector.bellwether.ticker} ({formatMarketCap(selectedSector.bellwether.marketCapCr)})
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#131211] border border-[#D96B43]/10">
                <span className="text-[10px] text-[#F7EEDB]/50 uppercase font-mono">Weighted P/E</span>
                <div className="font-bold text-[#F7EEDB] mt-1">
                  {selectedSector.avgPE > 0 ? `${selectedSector.avgPE}x` : 'N/A'}
                </div>
              </div>
            </div>

            {/* 30-Day Aggregate Sector Trajectory Banner */}
            <div className="p-4 bg-[#131211] border-b border-[#D96B43]/15 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#D96B43]/15 text-[#D96B43]">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#F7EEDB] uppercase tracking-wider font-mono">
                      30-Day Aggregate Sector Trajectory
                    </h4>
                    <p className="text-[11px] text-[#F7EEDB]/50">
                      Indexed daily closing price return aggregated across all {selectedSector.count} constituent stocks.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono self-end sm:self-auto">
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                    High: +{selectedSector.trend30D.highReturn.toFixed(2)}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-500/30">
                    Low: {selectedSector.trend30D.lowReturn.toFixed(2)}%
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      selectedSector.trend30D.netReturn >= 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}
                  >
                    30D Net: {selectedSector.trend30D.netReturn >= 0 ? '+' : ''}
                    {selectedSector.trend30D.netReturn.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <Sector30DayTrendChart
                  points={selectedSector.trend30D.points}
                  netReturn={selectedSector.trend30D.netReturn}
                  highReturn={selectedSector.trend30D.highReturn}
                  lowReturn={selectedSector.trend30D.lowReturn}
                  height={80}
                  interactive={true}
                />
              </div>
            </div>

            {/* Constituents Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <h4 className="text-xs font-bold text-[#F7EEDB]/70 uppercase tracking-wider font-mono">
                All {selectedSector.count} Constituent Stocks
              </h4>
              <div className="overflow-x-auto rounded-xl border border-[#D96B43]/15">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#131211] text-[#F7EEDB]/60 uppercase text-[10px] tracking-wider border-b border-[#D96B43]/15">
                    <tr>
                      <th className="py-2.5 px-3 font-sans">Stock</th>
                      <th className="py-2.5 px-3 text-right">LTP (₹)</th>
                      <th className="py-2.5 px-3 text-right">Change (%)</th>
                      <th className="py-2.5 px-3 text-right">Market Cap</th>
                      <th className="py-2.5 px-3 text-right">P/E</th>
                      <th className="py-2.5 px-3 text-center">AI Sentiment</th>
                      <th className="py-2.5 px-3 text-right font-sans">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D96B43]/10">
                    {[...selectedSector.stocks]
                      .sort((a, b) => b.changePercent - a.changePercent)
                      .map((stock) => {
                        const isUp = stock.changePercent >= 0;
                        return (
                          <tr key={stock.ticker} className="hover:bg-[#25221F] transition">
                            <td className="py-2.5 px-3 font-sans">
                              <div className="font-bold text-[#F7EEDB]">{stock.name}</div>
                              <div className="text-[10px] text-[#F7EEDB]/50 font-mono">
                                NSE: {stock.ticker} · BSE: {stock.bseCode}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#F7EEDB]">
                              ₹{stock.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold">
                              <span className={isUp ? 'text-emerald-400' : 'text-red-400'}>
                                {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-[#F7EEDB]/70">
                              {formatMarketCap(stock.marketCapCr)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-[#F7EEDB]/70">
                              {stock.pe > 0 ? `${stock.pe}x` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  stock.sentiment.score >= 60
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : stock.sentiment.score <= 40
                                    ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                                    : 'bg-stone-500/15 text-stone-300 border border-stone-500/30'
                                }`}
                              >
                                {stock.sentiment.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-sans">
                              <div className="flex items-center justify-end gap-1.5">
                                {onSelectStock && (
                                  <button
                                    onClick={() => {
                                      onSelectStock(stock);
                                      setSelectedSector(null);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-[#D96B43] hover:bg-[#D96B43]/90 text-[#131211] font-bold text-xs transition"
                                  >
                                    Chart &amp; Trade
                                  </button>
                                )}
                                {openAIExplanation && (
                                  <button
                                    onClick={() => openAIExplanation(stock)}
                                    className="px-2 py-1 rounded-lg bg-[#131211] hover:bg-[#25221F] border border-[#D96B43]/30 text-[#D96B43] text-xs font-semibold transition"
                                    title="Generate Gemini AI Quantitative Thesis"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#131211] border-t border-[#D96B43]/15 flex items-center justify-between text-xs text-[#F7EEDB]/60">
              <span className="font-mono text-[11px]">
                Showing real-time data calculated across all {selectedSector.stocks.length} sector equities
              </span>
              <button
                onClick={() => setSelectedSector(null)}
                className="px-4 py-1.5 rounded-xl bg-[#25221F] hover:bg-[#35302B] text-[#F7EEDB] font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
