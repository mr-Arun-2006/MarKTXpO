import React, { useState, useMemo } from 'react';
import { StockData, SupportedLanguage, WatchlistStockItem, DividendRecord } from '../types/market';
import {
  INITIAL_DIVIDEND_RECORDS,
  DEFAULT_WATCHLIST_TICKERS,
  INDIA_10Y_BOND_YIELD,
  NIFTY50_AVG_DIVIDEND_YIELD,
  getDividendYieldTier,
  generateCalendarDays,
  CalendarDayInfo,
  StockDividendConsistency,
} from '../data/mockDividendData';
import { HourlyTrendIndicator } from '../components/HourlyTrendIndicator';
import { DividendYieldSparkline } from '../components/DividendYieldSparkline';
import {
  Bookmark,
  Star,
  Calendar as CalendarIcon,
  Coins,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  DollarSign,
  PieChart,
  ShieldCheck,
  Plus,
  Trash2,
  Calculator,
  Search,
  X,
} from 'lucide-react';

interface Props {
  stocks: StockData[];
  selectedStock: StockData;
  onSelectStock: (stock: StockData) => void;
  openAIExplanation: (stock: StockData) => void;
  onNavigateToDashboard: () => void;
  language: SupportedLanguage;
}

export const WatchlistDividendView: React.FC<Props> = ({
  stocks,
  selectedStock,
  onSelectStock,
  openAIExplanation,
  onNavigateToDashboard,
  language,
}) => {
  // Navigation tabs within module
  const [activeTab, setActiveTab] = useState<'watchlist' | 'calendar' | 'high_yield' | 'calculator'>('watchlist');

  // Watchlist items stored in localStorage
  const [watchlist, setWatchlist] = useState<WatchlistStockItem[]>(() => {
    try {
      const saved = localStorage.getItem('nsebse_watchlist_stocks');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_WATCHLIST_TICKERS;
  });

  // Calendar month state (0-indexed month)
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());
  const [calendarFilter, setCalendarFilter] = useState<'ALL' | 'WATCHLIST_ONLY'>('ALL');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);

  // High yield filter & search
  const [yieldSearch, setYieldSearch] = useState('');
  const [yieldTierFilter, setYieldTierFilter] = useState<'ALL' | 'SUPER' | 'HIGH' | 'MODERATE'>('ALL');

  // Calculator inputs
  const [calcInvestmentAmount, setCalcInvestmentAmount] = useState<number>(500000); // ₹5 Lakhs
  const [calcTargetYield, setCalcTargetYield] = useState<number>(4.2);

  // Quick feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active consistency modal data
  const [selectedConsistencyData, setSelectedConsistencyData] = useState<StockDividendConsistency | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync watchlist to localStorage
  const saveWatchlist = (items: WatchlistStockItem[]) => {
    setWatchlist(items);
    try {
      localStorage.setItem('nsebse_watchlist_stocks', JSON.stringify(items));
    } catch {}
  };

  const isStockInWatchlist = (ticker: string) => {
    return watchlist.some((w) => w.ticker === ticker);
  };

  const toggleWatchlist = (stock: StockData) => {
    if (isStockInWatchlist(stock.ticker)) {
      const updated = watchlist.filter((w) => w.ticker !== stock.ticker);
      saveWatchlist(updated);
      showToast(`Removed ${stock.ticker} from Watchlist`);
    } else {
      const newItem: WatchlistStockItem = {
        ticker: stock.ticker,
        addedAt: new Date().toISOString().split('T')[0],
        sharesHeld: 50,
        customTargetYield: stock.dividendYield || 2.5,
        notes: `${stock.sector} dividend constituent`,
      };
      const updated = [newItem, ...watchlist];
      saveWatchlist(updated);
      showToast(`Added ${stock.ticker} to Watchlist`);
    }
  };

  const updateSharesHeld = (ticker: string, shares: number) => {
    const updated = watchlist.map((item) => {
      if (item.ticker === ticker) {
        return { ...item, sharesHeld: Math.max(0, shares) };
      }
      return item;
    });
    saveWatchlist(updated);
  };

  // Watchlist enriched with live stock details
  const watchlistStockDetails = useMemo(() => {
    return watchlist
      .map((item) => {
        const liveStock = stocks.find((s) => s.ticker === item.ticker);
        const record = INITIAL_DIVIDEND_RECORDS.find((r) => r.ticker === item.ticker);
        return {
          ...item,
          stock: liveStock,
          dividendRecord: record,
        };
      })
      .filter((item) => item.stock !== undefined) as {
      ticker: string;
      addedAt: string;
      sharesHeld?: number;
      notes?: string;
      customTargetYield?: number;
      stock: StockData;
      dividendRecord?: DividendRecord;
    }[];
  }, [watchlist, stocks]);

  // Aggregate Watchlist Metrics
  const watchlistSummary = useMemo(() => {
    if (watchlistStockDetails.length === 0) {
      return { totalCount: 0, avgYield: 0, annualIncome: 0, totalValue: 0, upcomingCount: 0 };
    }

    let totalYieldSum = 0;
    let totalAnnualIncome = 0;
    let totalPortfolioVal = 0;
    let upcomingCount = 0;
    const nowStr = new Date().toISOString().split('T')[0];

    watchlistStockDetails.forEach(({ stock, sharesHeld = 50, dividendRecord }) => {
      const yieldVal = stock.dividendYield || 0;
      totalYieldSum += yieldVal;
      const dps = stock.annualDividendPerShare || (stock.currentPrice * yieldVal) / 100;
      totalAnnualIncome += dps * sharesHeld;
      totalPortfolioVal += stock.currentPrice * sharesHeld;

      if (dividendRecord && dividendRecord.exDate >= nowStr) {
        upcomingCount++;
      }
    });

    const avgYield = Math.round((totalYieldSum / watchlistStockDetails.length) * 100) / 100;

    return {
      totalCount: watchlistStockDetails.length,
      avgYield,
      annualIncome: Math.round(totalAnnualIncome),
      totalValue: Math.round(totalPortfolioVal),
      upcomingCount,
    };
  }, [watchlistStockDetails]);

  // Filtered Dividend Records for Calendar
  const filteredDividendRecords = useMemo(() => {
    if (calendarFilter === 'WATCHLIST_ONLY') {
      const watchlistTickers = new Set(watchlist.map((w) => w.ticker));
      return INITIAL_DIVIDEND_RECORDS.filter((r) => watchlistTickers.has(r.ticker));
    }
    return INITIAL_DIVIDEND_RECORDS;
  }, [calendarFilter, watchlist]);

  // Calendar Grid Days
  const calendarDays = useMemo(() => {
    return generateCalendarDays(
      calendarDate.getFullYear(),
      calendarDate.getMonth(),
      filteredDividendRecords
    );
  }, [calendarDate, filteredDividendRecords]);

  // Month navigation handlers
  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
    setSelectedCalendarDay(null);
  };
  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
    setSelectedCalendarDay(null);
  };
  const currentMonthName = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Upcoming dividends sorted by ex-date
  const upcomingChronologicalDividends = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [...filteredDividendRecords]
      .filter((r) => r.exDate >= today || r.status === 'Upcoming' || r.status === 'Announced')
      .sort((a, b) => a.exDate.localeCompare(b.exDate));
  }, [filteredDividendRecords]);

  // High Dividend Ranked Stocks Universe
  const highDividendStocks = useMemo(() => {
    return [...stocks]
      .filter((s) => {
        if (yieldSearch.trim()) {
          const q = yieldSearch.toLowerCase();
          const matchTicker = s.ticker.toLowerCase().includes(q);
          const matchName = s.name.toLowerCase().includes(q);
          const matchSector = s.sector.toLowerCase().includes(q);
          if (!matchTicker && !matchName && !matchSector) return false;
        }

        if (yieldTierFilter === 'SUPER') return s.dividendYield >= 4.5;
        if (yieldTierFilter === 'HIGH') return s.dividendYield >= 2.5 && s.dividendYield < 4.5;
        if (yieldTierFilter === 'MODERATE') return s.dividendYield >= 1.2 && s.dividendYield < 2.5;
        return true;
      })
      .sort((a, b) => (b.dividendYield || 0) - (a.dividendYield || 0));
  }, [stocks, yieldSearch, yieldTierFilter]);

  // ICS Calendar Exporter
  const handleExportICS = () => {
    const events = filteredDividendRecords
      .map((r) => {
        const cleanExDate = r.exDate.replace(/-/g, '');
        return [
          'BEGIN:VEVENT',
          `SUMMARY:Ex-Dividend: ${r.ticker} (₹${r.dividendPerShare}/sh)`,
          `DESCRIPTION:${r.companyName} Ex-Dividend Date. Yield: ${r.dividendYield}%. Payment Date: ${r.paymentDate}. ${r.remarks || ''}`,
          `DTSTART;VALUE=DATE:${cleanExDate}`,
          `DTEND;VALUE=DATE:${cleanExDate}`,
          `UID:div-${r.ticker}-${cleanExDate}@marktxpo.ai`,
          'STATUS:CONFIRMED',
          'END:VEVENT',
        ].join('\n');
      })
      .join('\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MarKtXPO//Indian Equities Dividend Calendar//EN',
      'CALSCALE:GREGORIAN',
      events,
      'END:VCALENDAR',
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NSE_BSE_Dividend_Calendar_${calendarDate.getFullYear()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded Dividend Calendar (.ics) file!');
  };

  // CSV Schedule Exporter
  const handleExportCSV = () => {
    const headers = [
      'Ticker',
      'Company Name',
      'BSE Code',
      'Sector',
      'Dividend Per Share (INR)',
      'Dividend Yield (%)',
      'Type',
      'Ex-Dividend Date',
      'Record Date',
      'Payment Date',
      'Status',
      'Payout Ratio (%)',
    ];
    const rows = filteredDividendRecords.map((r) => [
      r.ticker,
      `"${r.companyName}"`,
      r.bseCode,
      `"${r.sector}"`,
      r.dividendPerShare,
      r.dividendYield,
      r.type,
      r.exDate,
      r.recordDate,
      r.paymentDate,
      r.status,
      r.payoutRatio,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Indian_Equities_Dividend_Payout_Schedule.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported Dividend Schedule as CSV!');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-[#F7EEDB]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 bg-[#1A1816] text-[#F7EEDB] border border-[#22C55E]/60 px-4 py-2.5 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.8),0_0_16px_rgba(34,197,94,0.3)] flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D96B43]/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Coins className="w-6 h-6 text-[#D96B43]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F7EEDB]">
              Watchlist &amp; Dividend Intelligence Hub
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D96B43]/15 text-[#D96B43] border border-[#D96B43]/40 font-mono font-bold">
              PAYOUT CALENDAR &amp; YIELD RADAR
            </span>
          </div>
          <p className="text-xs text-[#F7EEDB]/60 max-w-2xl">
            Track your personal Indian stock watchlist, monitor dividend yield champions across NSE &amp; BSE,
            and keep track of upcoming ex-dividend &amp; payout calendar dates.
          </p>
        </div>

        {/* Module Sub-tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#1A1816] border border-[#D96B43]/30 text-xs font-medium">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'watchlist'
                ? 'bg-[#D96B43] text-[#131211] font-bold shadow-[0_0_12px_rgba(217,107,67,0.35)]'
                : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#131211]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>My Watchlist ({watchlist.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'calendar'
                ? 'bg-[#D96B43] text-[#131211] font-bold shadow-[0_0_12px_rgba(217,107,67,0.35)]'
                : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#131211]'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Payout Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('high_yield')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'high_yield'
                ? 'bg-[#D96B43] text-[#131211] font-bold shadow-[0_0_12px_rgba(217,107,67,0.35)]'
                : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#131211]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>High-Yield Discovery</span>
          </button>

          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'calculator'
                ? 'bg-[#D96B43] text-[#131211] font-bold shadow-[0_0_12px_rgba(217,107,67,0.35)]'
                : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#131211]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Cash Flow Planner</span>
          </button>
        </div>
      </div>

      {/* Aggregate Watchlist Dividend Performance Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-[#1A1816] border border-[#D96B43]/30 shadow-md">
          <span className="text-[11px] text-[#F7EEDB]/60 block">Watchlist Stocks</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-[#F7EEDB]">{watchlistSummary.totalCount}</span>
            <span className="text-[10px] text-[#8CB4E0] font-mono">Securities tracked</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#1A1816] border border-[#22C55E]/30 shadow-md">
          <span className="text-[11px] text-[#F7EEDB]/60 block">Avg Portfolio Dividend Yield</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-[#22C55E]">{watchlistSummary.avgYield}%</span>
            <span className="text-[10px] text-[#22C55E]/80 font-mono">
              vs {NIFTY50_AVG_DIVIDEND_YIELD}% Nifty 50
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#1A1816] border border-[#D96B43]/30 shadow-md">
          <span className="text-[11px] text-[#F7EEDB]/60 block">Est. Annual Dividend Income</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-[#F7EEDB]">
              ₹{watchlistSummary.annualIncome.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-[#F7EEDB]/50 font-mono">/ year</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#1A1816] border border-[#8CB4E0]/30 shadow-md">
          <span className="text-[11px] text-[#F7EEDB]/60 block">Upcoming Ex-Dates (30d)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-[#8CB4E0]">{watchlistSummary.upcomingCount}</span>
            <span className="text-[10px] text-[#8CB4E0] font-mono">Announced payouts</span>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 rounded-xl bg-[#1A1816] border border-[#D96B43]/20 shadow-md flex flex-col justify-between">
          <span className="text-[11px] text-[#F7EEDB]/60 block">10-Yr Indian G-Sec Benchmark</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-bold font-mono text-[#F7EEDB]">{INDIA_10Y_BOND_YIELD}%</span>
            <span className="text-[10px] text-[#F7EEDB]/50">Risk-free yield</span>
          </div>
        </div>
      </div>

      {/* ================= TAB 1: MY WATCHLIST & INCOME TRACKER ================= */}
      {activeTab === 'watchlist' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1A1816] p-4 rounded-xl border border-[#D96B43]/20">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[#D96B43]" />
              <h2 className="text-sm font-bold text-[#F7EEDB]">Personal Watchlist Equities</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#131211] text-[#F7EEDB]/70 font-mono font-bold">
                {watchlistStockDetails.length} active
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('high_yield')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D96B43]/20 hover:bg-[#D96B43]/30 text-[#D96B43] hover:text-[#F7EEDB] text-xs font-semibold border border-[#D96B43]/40 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More High-Yield Stocks</span>
              </button>
            </div>
          </div>

          {/* Watchlist Table */}
          <div className="rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#131211] text-[#F7EEDB]/60 uppercase font-mono text-[10px] tracking-wider border-b border-[#D96B43]/15">
                  <tr>
                    <th className="py-3 px-3 text-center w-10">★</th>
                    <th className="py-3 px-4">Ticker / Company</th>
                    <th className="py-3 px-4 text-center">1H Hourly Trend</th>
                    <th className="py-3 px-4 text-right">NSE / BSE Price</th>
                    <th className="py-3 px-4 text-right">24H Change</th>
                    <th className="py-3 px-4 text-center">Dividend Yield</th>
                    <th className="py-3 px-4 text-center min-w-[130px]">12M Yield Trend (Consistency)</th>
                    <th className="py-3 px-4 text-right">Annual DPS</th>
                    <th className="py-3 px-4 text-center">Shares Held</th>
                    <th className="py-3 px-4 text-right">Est. Annual Income</th>
                    <th className="py-3 px-4 text-center">Next Ex-Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D96B43]/10 font-mono">
                  {watchlistStockDetails.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-[#F7EEDB]/50">
                        No stocks currently in your watchlist. Browse High-Yield Discovery or Screener to bookmark stocks!
                      </td>
                    </tr>
                  ) : (
                    watchlistStockDetails.map(({ ticker, stock, sharesHeld = 50, dividendRecord }) => {
                      const yieldTier = getDividendYieldTier(stock.dividendYield || 0);
                      const dps = stock.annualDividendPerShare || ((stock.currentPrice * (stock.dividendYield || 0)) / 100);
                      const estIncome = Math.round(dps * sharesHeld);

                      return (
                        <tr
                          key={ticker}
                          className="hover:bg-[#25221F]/80 transition group"
                        >
                          {/* Star toggle */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => toggleWatchlist(stock)}
                              title="Remove from Watchlist"
                              className="text-[#D96B43] hover:text-[#EF4444] transition p-1"
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          </td>

                          {/* Ticker / Company */}
                          <td className="py-3.5 px-4 font-sans">
                            <div className="flex items-center gap-2">
                              <span
                                onClick={() => {
                                  onSelectStock(stock);
                                  onNavigateToDashboard();
                                }}
                                className="font-bold text-[#F7EEDB] text-sm hover:text-[#D96B43] cursor-pointer transition"
                              >
                                {stock.ticker}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#131211] text-[#8CB4E0] font-mono border border-[#8CB4E0]/30">
                                {stock.bseCode}
                              </span>
                            </div>
                            <span className="text-xs text-[#F7EEDB]/60 truncate block max-w-[150px] font-sans">
                              {stock.name}
                            </span>
                          </td>

                          {/* 1H Hourly Trend Direction Indicator */}
                          <td className="py-3.5 px-4 text-center">
                            <HourlyTrendIndicator
                              hourlyChangePercent={stock.hourlyChangePercent}
                              hourlyTrend={stock.hourlyTrend}
                              hourlyChange={stock.hourlyChange}
                              currentPrice={stock.currentPrice}
                            />
                          </td>

                          {/* Price */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-bold text-[#F7EEDB] text-xs">₹{stock.nsePrice.toFixed(2)}</div>
                            <div className="text-[11px] text-[#8CB4E0]">BSE: ₹{stock.bsePrice.toFixed(2)}</div>
                          </td>

                          {/* 24H Change */}
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`font-bold ${
                                stock.change >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                              }`}
                            >
                              {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </span>
                          </td>

                          {/* Dividend Yield */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="font-bold text-sm text-[#F7EEDB]">
                              {stock.dividendYield.toFixed(2)}%
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-semibold border ${yieldTier.badgeClass}`}>
                              {yieldTier.label}
                            </span>
                          </td>

                          {/* 12-Month Dividend Yield Sparkline & Payout Consistency */}
                          <td className="py-3.5 px-3 text-center">
                            <DividendYieldSparkline
                              ticker={stock.ticker}
                              currentYield={stock.dividendYield}
                              width={116}
                              height={30}
                              onOpenDetails={(data) => setSelectedConsistencyData(data)}
                            />
                          </td>

                          {/* Annual DPS */}
                          <td className="py-3.5 px-4 text-right text-[#F7EEDB] font-bold">
                            ₹{dps.toFixed(2)}
                          </td>

                          {/* Shares Held (Editable) */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1 bg-[#131211] px-2 py-1 rounded-lg border border-[#D96B43]/30">
                              <input
                                type="number"
                                min="0"
                                max="100000"
                                value={sharesHeld}
                                onChange={(e) => updateSharesHeld(ticker, Number(e.target.value))}
                                className="w-14 bg-transparent text-center font-mono font-bold text-[#F7EEDB] focus:outline-none"
                              />
                              <span className="text-[10px] text-[#F7EEDB]/50">sh</span>
                            </div>
                          </td>

                          {/* Estimated Annual Income */}
                          <td className="py-3.5 px-4 text-right font-bold text-[#22C55E]">
                            ₹{estIncome.toLocaleString('en-IN')}
                          </td>

                          {/* Next Ex-Date */}
                          <td className="py-3.5 px-4 text-center font-sans">
                            {dividendRecord ? (
                              <div className="space-y-0.5">
                                <span className="font-mono text-xs text-[#8CB4E0] font-bold block">
                                  {dividendRecord.exDate}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 font-semibold font-mono">
                                  ₹{dividendRecord.dividendPerShare}/sh
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#F7EEDB]/40 font-mono">Announced Soon</span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openAIExplanation(stock)}
                                title="Explain Stock & Dividend Setup"
                                className="p-1.5 rounded-lg bg-[#D96B43]/15 hover:bg-[#D96B43]/30 text-[#D96B43] border border-[#D96B43]/30 transition"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  onSelectStock(stock);
                                  onNavigateToDashboard();
                                }}
                                title="Open in Terminal Dashboard"
                                className="px-2 py-1 rounded-lg bg-[#131211] hover:bg-[#D96B43] hover:text-[#131211] text-[#F7EEDB] border border-[#D96B43]/30 text-[11px] font-bold transition"
                              >
                                View Chart
                              </button>
                            </div>
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
      )}

      {/* ================= TAB 2: DIVIDEND PAYOUT CALENDAR ================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Calendar Controls & Export Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#1A1816] border border-[#D96B43]/25">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-[#131211] rounded-xl border border-[#D96B43]/30 p-1">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-[#1A1816] text-[#F7EEDB] transition"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold text-sm px-3 text-[#F7EEDB] min-w-[140px] text-center">
                  {currentMonthName}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-[#1A1816] text-[#F7EEDB] transition"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Filter: All vs Watchlist */}
              <div className="flex items-center gap-1 bg-[#131211] p-1 rounded-xl border border-[#D96B43]/30 text-xs">
                <button
                  onClick={() => setCalendarFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    calendarFilter === 'ALL'
                      ? 'bg-[#D96B43] text-[#131211] font-bold'
                      : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                  }`}
                >
                  All Indian Equities
                </button>
                <button
                  onClick={() => setCalendarFilter('WATCHLIST_ONLY')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    calendarFilter === 'WATCHLIST_ONLY'
                      ? 'bg-[#D96B43] text-[#131211] font-bold'
                      : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                  }`}
                >
                  Watchlist Only ({watchlist.length})
                </button>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportICS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131211] hover:bg-[#25221F] text-[#F7EEDB] border border-[#8CB4E0]/40 text-xs font-semibold shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5 text-[#8CB4E0]" />
                <span>Export to Calendar (.ics)</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131211] hover:bg-[#25221F] text-[#F7EEDB] border border-[#22C55E]/40 text-xs font-semibold shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>Export Schedule (CSV)</span>
              </button>
            </div>
          </div>

          {/* Monthly Calendar Grid */}
          <div className="rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl overflow-hidden p-4 space-y-2">
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] text-[#F7EEDB]/50 uppercase tracking-wider pb-2 border-b border-[#D96B43]/15">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day, idx) => {
                const isSelected = selectedCalendarDay === day.date;
                const hasEvents = day.events.length > 0;

                return (
                  <div
                    key={`${day.date}-${idx}`}
                    onClick={() => hasEvents && setSelectedCalendarDay(isSelected ? null : day.date)}
                    className={`min-h-[92px] p-2 rounded-xl border transition flex flex-col justify-between ${
                      !day.isCurrentMonth
                        ? 'bg-[#131211]/30 border-[#D96B43]/5 text-[#F7EEDB]/30'
                        : isSelected
                        ? 'bg-[#131211] border-[#D96B43] shadow-[0_0_14px_rgba(217,107,67,0.4)]'
                        : day.isToday
                        ? 'bg-[#131211] border-[#8CB4E0] shadow-[0_0_10px_rgba(140,180,224,0.25)]'
                        : hasEvents
                        ? 'bg-[#131211]/70 border-[#D96B43]/20 hover:border-[#D96B43]/60 cursor-pointer'
                        : 'bg-[#131211]/50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className={day.isToday ? 'font-bold text-[#8CB4E0]' : ''}>{day.dayNumber}</span>
                      {day.isToday && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[#8CB4E0]/20 text-[#8CB4E0] font-sans">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Day's Event Badges */}
                    <div className="space-y-1 my-1">
                      {day.events.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className="px-1.5 py-0.5 rounded bg-[#D96B43]/15 text-[#D96B43] border border-[#D96B43]/40 text-[10px] font-mono truncate font-bold flex items-center justify-between"
                          title={`${ev.ticker} Ex-Date (₹${ev.dividendPerShare}/sh)`}
                        >
                          <span>{ev.ticker}</span>
                          <span className="text-[9px] text-[#22C55E]">₹{ev.dividendPerShare}</span>
                        </div>
                      ))}
                      {day.events.length > 2 && (
                        <span className="text-[9px] text-[#8CB4E0] font-mono block text-center">
                          +{day.events.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chronological Upcoming Events Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D96B43]" />
                <h3 className="text-sm font-bold text-[#F7EEDB]">Upcoming Dividend Payout Schedule</h3>
              </div>
              <span className="text-xs text-[#F7EEDB]/50 font-mono">
                {upcomingChronologicalDividends.length} Scheduled Events
              </span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingChronologicalDividends.map((item) => {
                const stock = stocks.find((s) => s.ticker === item.ticker);
                const isWatchlisted = isStockInWatchlist(item.ticker);
                const yieldTier = getDividendYieldTier(item.dividendYield);

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[#1A1816] border border-[#D96B43]/20 hover:border-[#D96B43]/60 transition shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#F7EEDB] font-sans">{item.ticker}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-semibold border ${yieldTier.badgeClass}`}>
                          {item.dividendYield}% Yield
                        </span>
                      </div>
                      <button
                        onClick={() => stock && toggleWatchlist(stock)}
                        title={isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}
                        className={`p-1 rounded-lg transition ${
                          isWatchlisted ? 'text-[#D96B43]' : 'text-[#F7EEDB]/30 hover:text-[#D96B43]'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <div className="text-xs text-[#F7EEDB]/70 truncate">{item.companyName}</div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#131211] border border-[#D96B43]/15 text-[11px] font-mono text-center">
                      <div>
                        <span className="text-[#F7EEDB]/50 text-[10px] block">Ex-Dividend</span>
                        <span className="font-bold text-[#D96B43]">{item.exDate}</span>
                      </div>
                      <div>
                        <span className="text-[#F7EEDB]/50 text-[10px] block">Record Date</span>
                        <span className="font-bold text-[#8CB4E0]">{item.recordDate}</span>
                      </div>
                      <div>
                        <span className="text-[#F7EEDB]/50 text-[10px] block">Payment Date</span>
                        <span className="font-bold text-[#22C55E]">{item.paymentDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#D96B43]/10">
                      <div className="flex items-center gap-1 font-mono">
                        <span className="text-[#F7EEDB]/60">Payout:</span>
                        <strong className="text-[#22C55E]">₹{item.dividendPerShare} / sh</strong>
                        <span className="text-[10px] text-[#F7EEDB]/50">({item.type})</span>
                      </div>
                      {stock && (
                        <HourlyTrendIndicator
                          hourlyChangePercent={stock.hourlyChangePercent}
                          hourlyTrend={stock.hourlyTrend}
                          compact
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: HIGH-YIELD DISCOVERY & RADAR ================= */}
      {activeTab === 'high_yield' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1A1816] p-4 rounded-xl border border-[#D96B43]/20">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#F7EEDB]/40" />
              <input
                type="text"
                placeholder="Search high-dividend companies or sectors..."
                value={yieldSearch}
                onChange={(e) => setYieldSearch(e.target.value)}
                className="w-full bg-[#131211] border border-[#D96B43]/30 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#F7EEDB] placeholder-[#F7EEDB]/40 focus:outline-none focus:border-[#D96B43]"
              />
            </div>

            {/* Yield Tier Filter */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#131211] border border-[#D96B43]/30 text-xs">
              {(['ALL', 'SUPER', 'HIGH', 'MODERATE'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setYieldTierFilter(tier)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    yieldTierFilter === tier
                      ? 'bg-[#D96B43] text-[#131211] font-bold shadow-sm'
                      : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                  }`}
                >
                  {tier === 'ALL' && 'All Equities'}
                  {tier === 'SUPER' && 'Super Yield (>4.5%)'}
                  {tier === 'HIGH' && 'High Yield (2.5 - 4.5%)'}
                  {tier === 'MODERATE' && 'Moderate (1.2 - 2.5%)'}
                </button>
              ))}
            </div>
          </div>

          {/* High-Yield Table with 1H Trend Direction Indicators */}
          <div className="rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#131211] text-[#F7EEDB]/60 uppercase font-mono text-[10px] tracking-wider border-b border-[#D96B43]/15">
                  <tr>
                    <th className="py-3 px-3 text-center w-10">★</th>
                    <th className="py-3 px-4">Ticker / Security</th>
                    <th className="py-3 px-4">Sector</th>
                    <th className="py-3 px-4 text-center">1H Trend (Hourly)</th>
                    <th className="py-3 px-4 text-right">NSE / BSE Price</th>
                    <th className="py-3 px-4 text-center">Dividend Yield</th>
                    <th className="py-3 px-4 text-center min-w-[130px]">12M Yield Trend (Consistency)</th>
                    <th className="py-3 px-4 text-right">Annual DPS</th>
                    <th className="py-3 px-4 text-center">Payout Ratio</th>
                    <th className="py-3 px-4 text-right">P/E Ratio</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D96B43]/10 font-mono">
                  {highDividendStocks.map((stock) => {
                    const isWatchlisted = isStockInWatchlist(stock.ticker);
                    const yieldTier = getDividendYieldTier(stock.dividendYield || 0);
                    const dps = stock.annualDividendPerShare || ((stock.currentPrice * (stock.dividendYield || 0)) / 100);

                    return (
                      <tr
                        key={stock.ticker}
                        className="hover:bg-[#25221F]/80 transition group"
                      >
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => toggleWatchlist(stock)}
                            title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                            className={`p-1 rounded-lg transition ${
                              isWatchlisted ? 'text-[#D96B43]' : 'text-[#F7EEDB]/30 hover:text-[#D96B43]'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-current' : ''}`} />
                          </button>
                        </td>

                        <td className="py-3.5 px-4 font-sans">
                          <div className="flex items-center gap-2">
                            <span
                              onClick={() => {
                                onSelectStock(stock);
                                onNavigateToDashboard();
                              }}
                              className="font-bold text-[#F7EEDB] text-sm hover:text-[#D96B43] cursor-pointer transition"
                            >
                              {stock.ticker}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#131211] text-[#8CB4E0] font-mono border border-[#8CB4E0]/30">
                              {stock.bseCode}
                            </span>
                          </div>
                          <span className="text-xs text-[#F7EEDB]/60 truncate block max-w-[160px] font-sans">
                            {stock.name}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-sans text-[#F7EEDB]/80">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#131211] text-[#F7EEDB]/70">
                            {stock.sector}
                          </span>
                        </td>

                        {/* Visual Hourly Trend Direction Indicator */}
                        <td className="py-3.5 px-4 text-center">
                          <HourlyTrendIndicator
                            hourlyChangePercent={stock.hourlyChangePercent}
                            hourlyTrend={stock.hourlyTrend}
                            hourlyChange={stock.hourlyChange}
                            currentPrice={stock.currentPrice}
                          />
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-[#F7EEDB] text-xs">₹{stock.nsePrice.toFixed(2)}</div>
                          <div className="text-[11px] text-[#8CB4E0]">BSE: ₹{stock.bsePrice.toFixed(2)}</div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="font-bold text-sm text-[#F7EEDB]">{stock.dividendYield.toFixed(2)}%</div>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-semibold border ${yieldTier.badgeClass}`}>
                            {yieldTier.label}
                          </span>
                        </td>

                        {/* 12-Month Dividend Yield Sparkline & Consistency */}
                        <td className="py-3.5 px-3 text-center">
                          <DividendYieldSparkline
                            ticker={stock.ticker}
                            currentYield={stock.dividendYield}
                            width={116}
                            height={30}
                            onOpenDetails={(data) => setSelectedConsistencyData(data)}
                          />
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-[#22C55E]">
                          ₹{dps.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-center text-[#F7EEDB]/75">
                          {stock.payoutRatio != null ? `${stock.payoutRatio}%` : 'N/A'}
                        </td>

                        <td className="py-3.5 px-4 text-right text-[#F7EEDB]/75">
                          {stock.pe}x
                        </td>

                        <td className="py-3.5 px-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toggleWatchlist(stock)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                                isWatchlisted
                                  ? 'bg-[#D96B43]/20 text-[#D96B43] border-[#D96B43]/40'
                                  : 'bg-[#131211] hover:bg-[#D96B43] hover:text-[#131211] text-[#F7EEDB] border-[#D96B43]/30'
                              }`}
                            >
                              {isWatchlisted ? 'Watchlisted' : '+ Watchlist'}
                            </button>
                            <button
                              onClick={() => openAIExplanation(stock)}
                              title="Explain Setup"
                              className="p-1.5 rounded-lg bg-[#D96B43]/15 text-[#D96B43] border border-[#D96B43]/30 hover:bg-[#D96B43]/30 transition"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: DIVIDEND CASH FLOW CALCULATOR ================= */}
      {activeTab === 'calculator' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#D96B43]" />
              <h3 className="text-sm font-bold text-[#F7EEDB]">Dividend Income Simulator</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#F7EEDB]/60 block mb-1">Total Investment Capital (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[#F7EEDB]/40">₹</span>
                  <input
                    type="number"
                    step="50000"
                    min="10000"
                    value={calcInvestmentAmount}
                    onChange={(e) => setCalcInvestmentAmount(Number(e.target.value))}
                    className="w-full bg-[#131211] border border-[#D96B43]/30 rounded-xl pl-8 pr-3 py-2 font-mono font-bold text-[#F7EEDB] focus:outline-none focus:border-[#D96B43]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#F7EEDB]/60 mb-1">
                  <span>Target Portfolio Dividend Yield</span>
                  <span className="font-mono font-bold text-[#22C55E]">{calcTargetYield}%</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="7.0"
                  step="0.1"
                  value={calcTargetYield}
                  onChange={(e) => setCalcTargetYield(Number(e.target.value))}
                  className="w-full accent-[#D96B43] cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-[#D96B43]/15 space-y-2 text-[11px] text-[#F7EEDB]/70">
                <div className="flex justify-between">
                  <span>Annual Dividend Cash Flow:</span>
                  <strong className="text-[#22C55E] font-mono">
                    ₹{Math.round(calcInvestmentAmount * (calcTargetYield / 100)).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Average Inflow:</span>
                  <strong className="text-[#F7EEDB] font-mono">
                    ₹{Math.round((calcInvestmentAmount * (calcTargetYield / 100)) / 12).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Spread vs G-Sec (6.82%):</span>
                  <strong className="text-[#8CB4E0] font-mono">
                    {(calcTargetYield - INDIA_10Y_BOND_YIELD).toFixed(2)}%
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Model High-Dividend Portfolio Allocation */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#F7EEDB]">Recommended High-Yield Indian Equities Basket</h3>
            <div className="space-y-2.5">
              {[
                { ticker: 'COALINDIA', name: 'Coal India Ltd.', yield: 5.25, alloc: '25%' },
                { ticker: 'VEDL', name: 'Vedanta Ltd.', yield: 6.10, alloc: '20%' },
                { ticker: 'ITC', name: 'ITC Ltd.', yield: 2.85, alloc: '20%' },
                { ticker: 'HCLTECH', name: 'HCL Technologies', yield: 3.40, alloc: '15%' },
                { ticker: 'POWERGRID', name: 'Power Grid Corp', yield: 3.90, alloc: '10%' },
                { ticker: 'TCS', name: 'Tata Consultancy Services', yield: 1.85, alloc: '10%' },
              ].map((basket) => {
                const stock = stocks.find((s) => s.ticker === basket.ticker);
                const isWatchlisted = isStockInWatchlist(basket.ticker);

                return (
                  <div
                    key={basket.ticker}
                    className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#F7EEDB]">{basket.ticker}</span>
                      <span className="text-[11px] text-[#F7EEDB]/60 font-sans">{basket.name}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[#22C55E] font-bold">{basket.yield}% Yield</span>
                      <span className="text-[#8CB4E0]">{basket.alloc} Alloc</span>
                      {stock && (
                        <HourlyTrendIndicator
                          hourlyChangePercent={stock.hourlyChangePercent}
                          hourlyTrend={stock.hourlyTrend}
                          compact
                        />
                      )}
                      <button
                        onClick={() => stock && toggleWatchlist(stock)}
                        className="text-[#D96B43] hover:text-[#F7EEDB] transition"
                        title={isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}
                      >
                        <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* ================= 12-MONTH DIVIDEND CONSISTENCY DETAIL MODAL ================= */}
      {selectedConsistencyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#1A1816] rounded-2xl border border-[#D96B43]/50 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_24px_rgba(217,107,67,0.2)] overflow-hidden max-h-[90vh] flex flex-col text-[#F7EEDB]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#D96B43]/20 flex items-center justify-between bg-[#131211]">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xl font-bold font-mono text-[#F7EEDB]">
                    {selectedConsistencyData.ticker}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/40 font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {selectedConsistencyData.consistencyLabel}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#D96B43]/20 text-[#D96B43] border border-[#D96B43]/40 font-mono font-bold">
                    {selectedConsistencyData.consistencyRating}
                  </span>
                </div>
                <p className="text-xs text-[#F7EEDB]/60">
                  Last 12 Months Dividend Yield Trajectory &amp; Payout Consistency Track Record
                </p>
              </div>

              <button
                onClick={() => setSelectedConsistencyData(null)}
                className="p-2 rounded-xl bg-[#1A1816] hover:bg-[#25221F] text-[#F7EEDB]/70 hover:text-[#F7EEDB] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Top Key Consistency Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-xs">
                  <span className="text-[10px] text-[#F7EEDB]/50 block">Current vs 12M Avg</span>
                  <div className="font-mono font-bold text-base text-[#22C55E] mt-0.5">
                    {selectedConsistencyData.currentYield}% / {selectedConsistencyData.avgYield12M}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-xs">
                  <span className="text-[10px] text-[#F7EEDB]/50 block">12M Yield Range</span>
                  <div className="font-mono font-bold text-base text-[#F7EEDB] mt-0.5">
                    {selectedConsistencyData.minYield12M}% - {selectedConsistencyData.maxYield12M}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-xs">
                  <span className="text-[10px] text-[#F7EEDB]/50 block">Payout Frequency</span>
                  <div className="font-mono font-bold text-base text-[#8CB4E0] mt-0.5">
                    {selectedConsistencyData.payoutsInLast12M} / {selectedConsistencyData.expectedPayoutsPerYear} Payouts
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-xs">
                  <span className="text-[10px] text-[#F7EEDB]/50 block">3Y Dividend CAGR</span>
                  <div className="font-mono font-bold text-base text-[#D96B43] mt-0.5">
                    +{selectedConsistencyData.cagr3YrPercent}%
                  </div>
                </div>
              </div>

              {/* Expanded 12-Month Sparkline Chart View */}
              <div className="p-4 rounded-xl bg-[#131211] border border-[#D96B43]/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#F7EEDB] flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#22C55E]" />
                    12-Month Yield Trend Curve (Monthly Plot)
                  </span>
                  <span className="text-[10px] text-[#22C55E] font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] inline-block animate-pulse" />
                    Green dots = Dividend distribution credited
                  </span>
                </div>

                <div className="py-2 flex justify-center">
                  <DividendYieldSparkline
                    ticker={selectedConsistencyData.ticker}
                    currentYield={selectedConsistencyData.currentYield}
                    consistencyData={selectedConsistencyData}
                    width={460}
                    height={64}
                    showDetails={false}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-[#F7EEDB]/50 px-1 pt-1 border-t border-[#D96B43]/15">
                  {selectedConsistencyData.history12M.map((h, i) => (
                    <span key={i} className={h.isPayoutMonth ? 'text-[#22C55E] font-bold' : ''}>
                      {h.monthShort}
                    </span>
                  ))}
                </div>
              </div>

              {/* Month-by-Month Consistency Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#F7EEDB] uppercase tracking-wider font-mono">
                  Monthly Trajectory &amp; Distribution Log
                </h4>
                <div className="rounded-xl border border-[#D96B43]/20 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#131211] text-[#F7EEDB]/60 uppercase font-mono text-[10px] border-b border-[#D96B43]/15">
                      <tr>
                        <th className="py-2 px-3">Month</th>
                        <th className="py-2 px-3 text-right">Dividend Yield</th>
                        <th className="py-2 px-3 text-center">Payout Event</th>
                        <th className="py-2 px-3 text-right">Dividend Per Share</th>
                        <th className="py-2 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D96B43]/10 font-mono text-[11px]">
                      {selectedConsistencyData.history12M.map((h, idx) => (
                        <tr
                          key={idx}
                          className={h.isPayoutMonth ? 'bg-[#22C55E]/10' : 'hover:bg-[#131211]/50'}
                        >
                          <td className="py-2 px-3 font-semibold text-[#F7EEDB]">{h.month}</td>
                          <td className="py-2 px-3 text-right font-bold text-[#F7EEDB]">
                            {h.yieldPercent.toFixed(2)}%
                          </td>
                          <td className="py-2 px-3 text-center">
                            {h.isPayoutMonth ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#22C55E]/20 text-[#22C55E] text-[10px] font-bold border border-[#22C55E]/40">
                                Dividend Credited
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#F7EEDB]/40">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-[#22C55E] font-bold">
                            {h.dividendPerShare ? `₹${h.dividendPerShare.toFixed(2)}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-[#8CB4E0] text-[10px]">
                            {h.isPayoutMonth ? 'Confirmed' : 'Accruing'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#D96B43]/20 bg-[#131211] flex items-center justify-between">
              <span className="text-[11px] text-[#F7EEDB]/50">
                12M Consistency Score: <strong className="text-[#22C55E]">{selectedConsistencyData.payoutConsistencyScore}%</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const st = stocks.find((s) => s.ticker === selectedConsistencyData.ticker);
                    if (st) openAIExplanation(st);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D96B43]/20 hover:bg-[#D96B43]/30 text-[#D96B43] hover:text-[#F7EEDB] border border-[#D96B43]/40 text-xs font-bold transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Setup Insights</span>
                </button>

                <button
                  onClick={() => setSelectedConsistencyData(null)}
                  className="px-4 py-1.5 rounded-xl bg-[#1A1816] hover:bg-[#25221F] text-[#F7EEDB] border border-[#F7EEDB]/20 text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
