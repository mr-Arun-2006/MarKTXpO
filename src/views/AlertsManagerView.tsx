import React, { useState, useMemo } from 'react';
import { MarketAlert, StockData, SupportedLanguage } from '../types/market';
import { translations } from '../i18n/translations';
import {
  computeStockVolatilityMetric,
  calculate14DayAverageRange,
  calculateIntradayRange,
  createVolatilityAlert,
  VolatilityMetric,
} from '../utils/volatilityAlertEngine';
import {
  Bell,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
  Activity,
  Flame,
  ArrowUpRight,
  Filter,
  Search,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from 'lucide-react';

interface Props {
  alerts: MarketAlert[];
  stocks: StockData[];
  onAddAlert: (alert: MarketAlert) => void;
  onRemoveAlert: (id: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  language: SupportedLanguage;
  onSelectStock?: (stock: StockData) => void;
  onSimulateVolatilitySurge?: (ticker: string) => void;
}

export const AlertsManagerView: React.FC<Props> = ({
  alerts,
  stocks,
  onAddAlert,
  onRemoveAlert,
  soundEnabled,
  onToggleSound,
  language,
  onSelectStock,
  onSimulateVolatilitySurge,
}) => {
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<'ALL_ALERTS' | 'VOLATILITY_RADAR'>('VOLATILITY_RADAR');
  const [ticker, setTicker] = useState<string>('RELIANCE');
  const [alertType, setAlertType] = useState<MarketAlert['type']>('VOLATILITY_EXPANSION');
  const [volatilityMultiplier, setVolatilityMultiplier] = useState<number>(1.0);
  const [targetValue, setTargetValue] = useState<number>(55);
  const [customMsg, setCustomMsg] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [radarFilter, setRadarFilter] = useState<'ALL' | 'EXCEEDED' | 'ELEVATED' | 'NORMAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected stock object for the form
  const selectedFormStock = useMemo(() => {
    return stocks.find((s) => s.ticker === ticker) || stocks[0];
  }, [stocks, ticker]);

  // Compute live 14-day average range for selected stock in the form
  const formStock14DayRange = useMemo(() => {
    if (!selectedFormStock) return 50;
    const avg = calculate14DayAverageRange(selectedFormStock.history);
    return avg > 0 ? avg : Math.round(selectedFormStock.currentPrice * 0.018 * 100) / 100;
  }, [selectedFormStock]);

  // Compute volatility metrics for all stocks
  const volatilityList = useMemo<VolatilityMetric[]>(() => {
    if (!stocks || stocks.length === 0) return [];
    return stocks.map((s) => computeStockVolatilityMetric(s, volatilityMultiplier));
  }, [stocks, volatilityMultiplier]);

  // Filtered radar list
  const filteredRadarList = useMemo(() => {
    let list = [...volatilityList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.ticker.toLowerCase().includes(q) ||
          m.stockName.toLowerCase().includes(q)
      );
    }

    if (radarFilter === 'EXCEEDED') {
      list = list.filter((m) => m.isExceeded);
    } else if (radarFilter === 'ELEVATED') {
      list = list.filter((m) => m.status === 'ELEVATED' || m.status === 'EXCEEDED' || m.status === 'EXTREME');
    } else if (radarFilter === 'NORMAL') {
      list = list.filter((m) => m.status === 'NORMAL');
    }

    // Sort by expansion ratio descending (highest volatility first)
    list.sort((a, b) => b.expansionRatio - a.expansionRatio);
    return list;
  }, [volatilityList, searchQuery, radarFilter]);

  // Statistics
  const stats = useMemo(() => {
    const exceededCount = volatilityList.filter((m) => m.isExceeded).length;
    const elevatedCount = volatilityList.filter((m) => m.status === 'ELEVATED').length;
    const triggeredAlertsCount = alerts.filter((a) => a.triggered).length;
    const volatilityAlertsCount = alerts.filter((a) => a.type === 'VOLATILITY_EXPANSION').length;

    return {
      exceededCount,
      elevatedCount,
      triggeredAlertsCount,
      volatilityAlertsCount,
    };
  }, [volatilityList, alerts]);

  // Handle Form Creation
  const handleCreate = () => {
    const stock = stocks.find((s) => s.ticker === ticker);
    if (!stock) return;

    if (alertType === 'VOLATILITY_EXPANSION') {
      const metric = computeStockVolatilityMetric(stock, volatilityMultiplier);
      const newAlert: MarketAlert = {
        id: `alt-vol-${ticker}-${Date.now()}`,
        ticker,
        companyName: stock.name,
        type: 'VOLATILITY_EXPANSION',
        targetValue: Math.round(metric.average14DayRange * volatilityMultiplier * 100) / 100,
        currentValue: metric.intradayRange,
        intradayRange: metric.intradayRange,
        average14DayRange: metric.average14DayRange,
        expansionRatio: metric.expansionRatio,
        triggered: metric.isExceeded,
        triggeredAt: metric.isExceeded
          ? new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : undefined,
        message:
          customMsg ||
          `${ticker} Volatility Watcher: Alerts when Intraday Range exceeds ₹${(
            metric.average14DayRange * volatilityMultiplier
          ).toFixed(2)} (${volatilityMultiplier}x of 14-day average ₹${metric.average14DayRange.toFixed(2)}).`,
      };

      onAddAlert(newAlert);
    } else {
      const newAlert: MarketAlert = {
        id: `alt-${Date.now()}`,
        ticker,
        companyName: stock ? stock.name : ticker,
        type: alertType,
        targetValue,
        currentValue: stock ? stock.currentPrice : 0,
        triggered: false,
        message:
          customMsg ||
          `${ticker} ${
            alertType === 'PRICE_ABOVE'
              ? `rose above ₹${targetValue}`
              : alertType === 'PRICE_BELOW'
              ? `fell below ₹${targetValue}`
              : alertType === 'RSI_OVERSOLD'
              ? `RSI dropped under ${targetValue}`
              : alertType === 'ARBITRAGE_SPREAD'
              ? `NSE/BSE Spread exceeded ${targetValue}%`
              : `Volume surged past ${targetValue}x average`
          }`,
      };

      onAddAlert(newAlert);
    }

    setShowAddForm(false);
    setCustomMsg('');
  };

  // Quick arm volatility alert from radar table
  const handleQuickArmVolatility = (metric: VolatilityMetric) => {
    const stock = stocks.find((s) => s.ticker === metric.ticker);
    if (!stock) return;

    const newAlert: MarketAlert = {
      id: `alt-vol-${metric.ticker}-${Date.now()}`,
      ticker: metric.ticker,
      companyName: metric.stockName,
      type: 'VOLATILITY_EXPANSION',
      targetValue: metric.average14DayRange,
      currentValue: metric.intradayRange,
      intradayRange: metric.intradayRange,
      average14DayRange: metric.average14DayRange,
      expansionRatio: metric.expansionRatio,
      triggered: metric.isExceeded,
      triggeredAt: metric.isExceeded
        ? new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : undefined,
      message: `Volatility Surge: ${metric.ticker} intraday range of ₹${metric.intradayRange.toFixed(
        2
      )} exceeded 14-day average of ₹${metric.average14DayRange.toFixed(2)} (${metric.expansionRatio}x expansion).`,
    };

    onAddAlert(newAlert);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-[#F7EEDB]">
      {/* Title & Global Settings */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D96B43]/15">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#D96B43]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#F7EEDB] tracking-tight">
              Real-Time Volatility &amp; Shift Monitor
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D96B43]/10 text-[#F7EEDB] border border-[#D96B43]/20 font-bold font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
              LIVE SURVEILLANCE
            </span>
          </div>
          <p className="text-xs text-[#F7EEDB]/60 mt-1">
            Detects when an equity's intraday price range exceeds its 14-day average baseline range (ATR₁₄ expansion breakout).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sound Alert Toggle */}
          <button
            onClick={onToggleSound}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition ${
              soundEnabled
                ? 'bg-[#D96B43]/20 border-[#D96B43] text-[#F7EEDB]'
                : 'bg-[#1A1816] border-[#D96B43]/20 text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
            }`}
            title="Play acoustic chime when volatility threshold is exceeded"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#D96B43]" /> : <VolumeX className="w-4 h-4" />}
            <span>Audio Chime: {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Create Alert Button */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs shadow-md shadow-[#D96B43]/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Alert</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs & Live Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 text-xs">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#131211] border border-[#D96B43]/15">
          <button
            onClick={() => setActiveTab('VOLATILITY_RADAR')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition ${
              activeTab === 'VOLATILITY_RADAR'
                ? 'bg-[#D96B43] text-[#131211] shadow-sm'
                : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Volatility Range Radar</span>
            {stats.exceededCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-950 text-red-300 font-mono text-[10px] font-black border border-red-500/50">
                {stats.exceededCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ALL_ALERTS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition ${
              activeTab === 'ALL_ALERTS'
                ? 'bg-[#D96B43] text-[#131211] shadow-sm'
                : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Active &amp; Triggered Alerts</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#25221F] text-[#F7EEDB] font-mono text-[10px]">
              {alerts.length}
            </span>
          </button>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
          <div className="flex items-center gap-1.5 text-red-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>{stats.exceededCount} Range Exceeded</span>
          </div>
          <span className="text-[#F7EEDB]/30">·</span>
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{stats.elevatedCount} Elevated</span>
          </div>
          <span className="text-[#F7EEDB]/30">·</span>
          <div className="text-[#F7EEDB]/60">
            Total Monitored: <strong className="text-[#F7EEDB]">{stocks.length} Stocks</strong>
          </div>
        </div>
      </div>

      {/* Create Alert Form Drawer */}
      {showAddForm && (
        <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/35 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/15">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#D96B43]" />
              <h3 className="text-sm font-bold text-[#F7EEDB]">Configure Real-Time Trigger</h3>
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-[#F7EEDB]/50 hover:text-[#F7EEDB] text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Target Stock</label>
              <select
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value);
                  const st = stocks.find((s) => s.ticker === e.target.value);
                  if (st) {
                    const avg = calculate14DayAverageRange(st.history);
                    setTargetValue(avg > 0 ? avg : Math.round(st.currentPrice * 0.018 * 100) / 100);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-bold"
              >
                {stocks.map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} - {s.name} (LTP: ₹{s.currentPrice.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Trigger Condition</label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-bold"
              >
                <option value="VOLATILITY_EXPANSION">
                  ⚡ Volatility Expansion (Intraday &gt; 14D Range)
                </option>
                <option value="PRICE_ABOVE">Price Above (Breakout Target)</option>
                <option value="PRICE_BELOW">Price Below (Stop-Loss Alert)</option>
                <option value="RSI_OVERSOLD">RSI Oversold Dip (&lt; Threshold)</option>
                <option value="VOLUME_SPIKE">Volume Surge Multiplier (&gt; Avg)</option>
                <option value="ARBITRAGE_SPREAD">NSE/BSE Spread Exceeds (%)</option>
              </select>
            </div>

            {alertType === 'VOLATILITY_EXPANSION' ? (
              <div>
                <label className="block text-[#F7EEDB]/70 font-semibold mb-1">
                  Sensitivity Multiplier
                </label>
                <select
                  value={volatilityMultiplier}
                  onChange={(e) => setVolatilityMultiplier(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-bold font-mono"
                >
                  <option value={1.0}>1.0x (Standard: Intraday &gt; 14-Day Average Range)</option>
                  <option value={1.25}>1.25x (Elevated: 25% Above 14-Day Average Range)</option>
                  <option value={1.5}>1.50x (High: 50% Above 14-Day Average Range)</option>
                  <option value={2.0}>2.00x (Extreme Volatility Shock)</option>
                </select>
                <span className="text-[10px] text-[#D96B43] font-mono mt-1 block">
                  14-Day Baseline: ₹{formStock14DayRange.toFixed(2)} → Trigger at ₹
                  {(formStock14DayRange * volatilityMultiplier).toFixed(2)}
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Threshold Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={targetValue}
                  onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-mono font-bold"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#F7EEDB]/60">
              Alert triggers in real time with desktop toast and acoustic chime.
            </span>
            <button
              onClick={handleCreate}
              className="px-5 py-2 bg-[#D96B43] text-[#131211] rounded-xl text-xs font-bold hover:brightness-110 active:scale-95 transition"
            >
              Activate Real-Time Alert
            </button>
          </div>
        </div>
      )}

      {/* Tab 1: Volatility Range Radar */}
      {activeTab === 'VOLATILITY_RADAR' && (
        <div className="space-y-6">
          {/* Radar Header & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Threshold Multiplier pills */}
              <div className="flex items-center p-1 rounded-xl bg-[#1A1816] border border-[#D96B43]/15">
                <span className="px-2.5 py-1 text-[#F7EEDB]/60 font-semibold">Alert Multiplier:</span>
                {[
                  { val: 1.0, label: '1.0x (Standard)' },
                  { val: 1.25, label: '1.25x' },
                  { val: 1.5, label: '1.5x (High)' },
                ].map((m) => (
                  <button
                    key={m.val}
                    onClick={() => setVolatilityMultiplier(m.val)}
                    className={`px-3 py-1 rounded-lg font-bold font-mono transition ${
                      volatilityMultiplier === m.val
                        ? 'bg-[#D96B43] text-[#131211] shadow-sm'
                        : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center p-1 rounded-xl bg-[#1A1816] border border-[#D96B43]/15">
                {(
                  [
                    { id: 'ALL', label: 'All Equities' },
                    { id: 'EXCEEDED', label: 'Exceeded Only' },
                    { id: 'ELEVATED', label: 'Elevated (≥85%)' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setRadarFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      radarFilter === f.id
                        ? 'bg-[#25221F] text-[#F7EEDB] border border-[#D96B43]/30 font-bold'
                        : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search & Simulation Trigger */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#F7EEDB]/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter ticker..."
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/15 text-xs text-[#F7EEDB] placeholder:text-[#F7EEDB]/40 focus:outline-none focus:border-[#D96B43] w-36 sm:w-48"
                />
              </div>

              {onSimulateVolatilitySurge && (
                <button
                  onClick={() => onSimulateVolatilitySurge(ticker)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-500/50 text-red-300 font-bold text-xs shadow-sm transition active:scale-95"
                  title="Simulate an instant price range breakout on selected stock to verify real-time toast and audio alert"
                >
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>Test Surge Alert</span>
                </button>
              )}
            </div>
          </div>

          {/* Volatility Radar Table / Cards */}
          <div className="rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#131211] text-[#F7EEDB]/60 uppercase text-[10px] tracking-wider border-b border-[#D96B43]/15">
                  <tr>
                    <th className="py-3 px-4 font-sans">Stock</th>
                    <th className="py-3 px-4 text-right">LTP (₹)</th>
                    <th className="py-3 px-4 text-right">Today's Range (H - L)</th>
                    <th className="py-3 px-4 text-right">14-Day Avg Range</th>
                    <th className="py-3 px-4 text-center font-sans">Expansion Ratio vs 14D</th>
                    <th className="py-3 px-4 text-center font-sans">Alert Status</th>
                    <th className="py-3 px-4 text-right font-sans">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D96B43]/10">
                  {filteredRadarList.map((m) => {
                    const stock = stocks.find((s) => s.ticker === m.ticker);
                    const percentFilled = Math.min(100, Math.round(m.expansionRatio * 100));

                    return (
                      <tr
                        key={m.ticker}
                        className={`transition hover:bg-[#25221F]/60 ${
                          m.isExceeded ? 'bg-red-950/20' : ''
                        }`}
                      >
                        {/* Stock Name */}
                        <td className="py-3.5 px-4 font-sans font-bold text-[#F7EEDB]">
                          <div className="flex items-center gap-2">
                            {m.isExceeded ? (
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            ) : m.status === 'ELEVATED' ? (
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-stone-500/40" />
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{m.ticker}</span>
                                {stock && (
                                  <span className="text-[10px] text-[#F7EEDB]/50 font-normal">
                                    · {stock.sector}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#F7EEDB]/50 font-mono block">
                                {m.stockName}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Current LTP */}
                        <td className="py-3.5 px-4 text-right font-bold text-[#F7EEDB]">
                          ₹{m.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Intraday Range */}
                        <td className="py-3.5 px-4 text-right font-bold">
                          <span
                            className={
                              m.isExceeded
                                ? 'text-red-400 font-black'
                                : m.status === 'ELEVATED'
                                ? 'text-amber-400'
                                : 'text-[#F7EEDB]'
                            }
                          >
                            ₹{m.intradayRange.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-[#F7EEDB]/50 block">
                            (₹{m.intradayLow.toFixed(1)} - ₹{m.intradayHigh.toFixed(1)})
                          </span>
                        </td>

                        {/* 14-Day Average Range */}
                        <td className="py-3.5 px-4 text-right text-[#F7EEDB]/80">
                          <span>₹{m.average14DayRange.toFixed(2)}</span>
                          <span className="text-[10px] text-[#F7EEDB]/50 block">
                            ~{m.average14DayRangePercent}% of price
                          </span>
                        </td>

                        {/* Expansion Progress Bar */}
                        <td className="py-3.5 px-4 text-center font-sans">
                          <div className="w-36 mx-auto space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span
                                className={
                                  m.isExceeded
                                    ? 'text-red-400 font-bold'
                                    : m.status === 'ELEVATED'
                                    ? 'text-amber-400'
                                    : 'text-[#F7EEDB]/70'
                                }
                              >
                                {m.expansionRatio.toFixed(2)}x
                              </span>
                              <span className="text-[#F7EEDB]/50">
                                {m.expansionPercent > 0 ? `+${m.expansionPercent}%` : `${m.expansionPercent}%`}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-[#131211] rounded-full overflow-hidden flex">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  m.isExceeded
                                    ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                    : m.status === 'ELEVATED'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percentFilled}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Alert Status Badge */}
                        <td className="py-3.5 px-4 text-center font-sans">
                          {m.isExceeded ? (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-950/80 text-red-300 border border-red-500/70 font-bold font-mono inline-flex items-center gap-1 shadow-sm">
                              <Flame className="w-3 h-3 text-red-400 animate-pulse" />
                              EXCEEDED ({m.expansionRatio}x)
                            </span>
                          ) : m.status === 'ELEVATED' ? (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/40 font-bold font-mono">
                              ELEVATED ({Math.round(m.expansionRatio * 100)}%)
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#131211] text-emerald-400/80 border border-emerald-500/20 font-mono">
                              NORMAL
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            {stock && onSelectStock && (
                              <button
                                onClick={() => onSelectStock(stock)}
                                className="px-2.5 py-1 rounded-lg bg-[#131211] hover:bg-[#25221F] border border-[#D96B43]/20 text-xs font-semibold text-[#D96B43] transition"
                              >
                                Chart
                              </button>
                            )}
                            <button
                              onClick={() => handleQuickArmVolatility(m)}
                              className="px-2.5 py-1 rounded-lg bg-[#D96B43]/15 hover:bg-[#D96B43]/30 border border-[#D96B43]/30 text-xs font-semibold text-[#F7EEDB] transition"
                              title="Arm real-time notification alert for this stock"
                            >
                              Arm Alert
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

      {/* Tab 2: All Active & Triggered Alerts */}
      {activeTab === 'ALL_ALERTS' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Triggered Shift Alerts */}
          <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/15">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#D96B43]" />
                <h3 className="text-sm font-bold text-[#F7EEDB]">Triggered Market Shifts</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#D96B43]/10 text-[#F7EEDB] font-mono font-bold">
                {alerts.filter((a) => a.triggered).length} Triggered
              </span>
            </div>

            <div className="space-y-3">
              {alerts.filter((a) => a.triggered).length === 0 ? (
                <div className="py-8 text-center text-[#F7EEDB]/40 text-xs">
                  No alerts triggered yet. Monitoring tick feed.
                </div>
              ) : (
                alerts
                  .filter((a) => a.triggered)
                  .map((alt) => (
                    <div
                      key={alt.id}
                      className="p-3.5 rounded-xl bg-[#131211] border border-[#D96B43]/25 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#F7EEDB] text-sm">{alt.ticker}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                              alt.type === 'VOLATILITY_EXPANSION'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : 'bg-[#D96B43]/20 text-[#F7EEDB]'
                            }`}
                          >
                            {alt.type === 'VOLATILITY_EXPANSION'
                              ? `RANGE EXCEEDED (${alt.expansionRatio || 1.2}x)`
                              : 'TRIGGERED'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#F7EEDB]/40 font-mono">{alt.triggeredAt}</span>
                      </div>

                      <p className="text-[#F7EEDB]/80 leading-relaxed">{alt.message}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-[#D96B43]/10 text-[11px] text-[#F7EEDB]/50 font-mono">
                        {alt.type === 'VOLATILITY_EXPANSION' ? (
                          <span>
                            Range: ₹{(alt.intradayRange || alt.currentValue).toFixed(2)} &gt; 14D Avg: ₹
                            {(alt.average14DayRange || alt.targetValue).toFixed(2)}
                          </span>
                        ) : (
                          <span>Target: {alt.targetValue}</span>
                        )}
                        <div className="flex items-center gap-2 font-sans">
                          {onSelectStock && (
                            <button
                              onClick={() => {
                                const st = stocks.find((s) => s.ticker === alt.ticker);
                                if (st) onSelectStock(st);
                              }}
                              className="text-[#D96B43] hover:underline"
                            >
                              Inspect Chart
                            </button>
                          )}
                          <button
                            onClick={() => onRemoveAlert(alt.id)}
                            className="text-[#F7EEDB]/40 hover:text-[#EF4444] transition"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Active Standing Watchers */}
          <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/15">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D96B43]" />
                <h3 className="text-sm font-bold text-[#F7EEDB]">Active Standing Watchers</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#131211] text-[#F7EEDB]/70 font-mono">
                Surveillance Running
              </span>
            </div>

            <div className="space-y-3">
              {alerts.filter((a) => !a.triggered).length === 0 ? (
                <div className="py-8 text-center text-[#F7EEDB]/40 text-xs">
                  No active standing watchers. Arm any stock in the Volatility Radar above.
                </div>
              ) : (
                alerts
                  .filter((a) => !a.triggered)
                  .map((alt) => (
                    <div
                      key={alt.id}
                      className="p-3.5 rounded-xl bg-[#131211]/60 border border-[#D96B43]/15 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#F7EEDB] text-sm">{alt.ticker}</span>
                        <span className="text-[10px] text-[#D96B43] font-mono">MONITORING</span>
                      </div>

                      <p className="text-[#F7EEDB]/80">{alt.message}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-[#D96B43]/10 text-[11px] text-[#F7EEDB]/50 font-mono">
                        <span>Trigger Target: {alt.targetValue}</span>
                        <button
                          onClick={() => onRemoveAlert(alt.id)}
                          className="text-[#F7EEDB]/40 hover:text-[#EF4444] transition font-sans"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
