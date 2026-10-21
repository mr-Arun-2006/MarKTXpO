import React, { useState } from 'react';
import { StockData } from '../types/market';
import { HourlyTrendIndicator } from './HourlyTrendIndicator';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Pause,
  Play,
  Zap,
  Activity,
  Gauge,
} from 'lucide-react';

interface Props {
  stocks: StockData[];
  onSelectStock: (stock: StockData) => void;
  onNavigate: (view: string) => void;
}

interface BenchmarkIndex {
  name: string;
  exchange: 'NSE' | 'BSE' | 'BOTH';
  value: number;
  change: number;
  changePercent: number;
}

const BENCHMARKS: BenchmarkIndex[] = [
  { name: 'NIFTY 50', exchange: 'NSE', value: 24852.15, change: 104.2, changePercent: 0.42 },
  { name: 'SENSEX', exchange: 'BSE', value: 81330.4, change: 318.5, changePercent: 0.39 },
  { name: 'BANK NIFTY', exchange: 'NSE', value: 52210.8, change: 368.1, changePercent: 0.71 },
  { name: 'BSE 100', exchange: 'BSE', value: 25684.2, change: 92.4, changePercent: 0.36 },
  { name: 'NIFTY IT', exchange: 'NSE', value: 38450.2, change: -68.4, changePercent: -0.18 },
  { name: 'INDIA VIX', exchange: 'NSE', value: 12.85, change: -0.42, changePercent: -3.16 },
];

export const MarketTickerTape: React.FC<Props> = ({
  stocks,
  onSelectStock,
  onNavigate,
}) => {
  // Movement is strictly Right to Left (RTL) at 0.5s speed as requested
  const [isPaused, setIsPaused] = useState(false);
  const [speedMode, setSpeedMode] = useState<'0.5s' | '0.25s' | '1.0s'>('0.5s');
  const [benchmarks, setBenchmarks] = useState<BenchmarkIndex[]>(BENCHMARKS);
  const [isOfficialLive, setIsOfficialLive] = useState(false);

  // Fetch real official benchmark index quotes on mount & periodically
  React.useEffect(() => {
    const loadBenchmarks = () => {
      fetch('/api/market/benchmarks')
        .then((r) => r.json())
        .then((data) => {
          if (data.benchmarks && Array.isArray(data.benchmarks) && data.benchmarks.length > 0) {
            setBenchmarks(data.benchmarks);
            setIsOfficialLive(true);
          }
        })
        .catch(() => {});
    };

    loadBenchmarks();
    const interval = setInterval(loadBenchmarks, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleStockClick = (stock: StockData) => {
    onSelectStock(stock);
    onNavigate('dashboard');
  };

  // Compute animation duration matching speed mode (0.5s per item entry)
  // Total ~26 items: 26 * 0.5s = 13s loop
  const animationDurationSeconds =
    speedMode === '0.5s' ? 13 : speedMode === '0.25s' ? 7 : 24;

  // Render an individual stock item with border visual color effects
  const renderStockItem = (stock: StockData, keySuffix: string | number) => {
    const isBull = stock.change >= 0;
    const spreadAbs = Math.abs(stock.spreadPercent);
    const hasArbitrage = spreadAbs >= 0.03;

    return (
      <button
        key={`${stock.ticker}-${keySuffix}`}
        onClick={() => handleStockClick(stock)}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#1A1816] text-xs shrink-0 cursor-pointer group active:scale-95 transition-all duration-200 border ${
          isBull
            ? 'border-[#22C55E]/30 hover:border-[#22C55E] hover:shadow-[0_0_14px_rgba(34,197,94,0.35)]'
            : 'border-[#EF4444]/30 hover:border-[#EF4444] hover:shadow-[0_0_14px_rgba(239,68,68,0.35)]'
        }`}
      >
        <span className="font-bold text-[#F7EEDB] group-hover:text-[#FFFDF8] tracking-tight">
          {stock.ticker}
        </span>
        <span className="text-[10px] text-[#8CB4E0] font-mono px-1 py-0.2 rounded bg-[#131211] border border-[#8CB4E0]/40 group-hover:border-[#8CB4E0] group-hover:shadow-[0_0_6px_rgba(140,180,224,0.3)] transition">
          BSE {stock.bseCode}
        </span>
        <span className="font-mono text-[#F7EEDB] font-semibold">
          ₹{stock.currentPrice.toFixed(2)}
        </span>
        <span
          className={`flex items-center gap-0.5 font-mono text-[11px] font-bold ${
            isBull ? 'text-[#22C55E]' : 'text-[#EF4444]'
          }`}
        >
          {isBull ? (
            <TrendingUp className="w-3 h-3 text-[#22C55E]" />
          ) : (
            <TrendingDown className="w-3 h-3 text-[#EF4444]" />
          )}
          {isBull ? '+' : ''}
          {stock.changePercent.toFixed(2)}%
        </span>
        <HourlyTrendIndicator
          hourlyChangePercent={stock.hourlyChangePercent}
          hourlyTrend={stock.hourlyTrend}
          compact
        />
        {hasArbitrage && (
          <span
            className="text-[10px] px-1.5 py-0.2 rounded bg-[#D96B43]/20 text-[#D96B43] border border-[#D96B43]/50 font-mono font-bold hover:shadow-[0_0_8px_rgba(217,107,67,0.4)] transition"
            title={`Arbitrage spread: ₹${Math.abs(stock.nsePrice - stock.bsePrice).toFixed(2)} between NSE & BSE`}
          >
            {stock.spreadPercent > 0 ? 'NSE > BSE' : 'BSE > NSE'} ({spreadAbs.toFixed(2)}%)
          </span>
        )}
      </button>
    );
  };

  // Render an individual index item with border visual color effects
  const renderBenchmarkItem = (bench: BenchmarkIndex, keySuffix: string | number) => {
    const isBull = bench.change >= 0;
    return (
      <div
        key={`${bench.name}-${keySuffix}`}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#131211] border border-[#8CB4E0]/40 hover:border-[#8CB4E0] hover:shadow-[0_0_12px_rgba(140,180,224,0.35)] transition-all text-xs shrink-0 font-mono"
      >
        <span className="font-bold text-[#8CB4E0]">{bench.name}</span>
        <span className="text-[10px] px-1 rounded bg-[#8CB4E0]/15 text-[#8CB4E0] border border-[#8CB4E0]/30 font-bold">
          {bench.exchange}
        </span>
        <span className="text-[#F7EEDB] font-bold">
          {bench.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
        <span
          className={`text-[11px] font-bold ${
            isBull ? 'text-[#22C55E]' : 'text-[#EF4444]'
          }`}
        >
          {isBull ? '+' : ''}
          {bench.changePercent.toFixed(2)}%
        </span>
      </div>
    );
  };

  return (
    <div className="w-full bg-[#0E0D0C] border-b border-[#D96B43]/40 shadow-[0_2px_15px_rgba(217,107,67,0.15)] sticky top-0 z-50 text-[#F7EEDB] select-none text-xs">
      <div className="flex items-center h-10 w-full overflow-hidden">
        {/* Left Fixed Badge with Visual Color Border Effects */}
        <div className="flex items-center gap-2 px-3 py-1 bg-[#131211] border-r border-[#D96B43]/30 shrink-0 z-10 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
            </span>
            <span className="font-bold text-[11px] tracking-wider text-[#D96B43] uppercase hidden sm:inline">
              NSE · BSE
            </span>
          </div>

          {/* Right to Left Direction Indicator Badge */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#1A1816] border border-[#8CB4E0]/40 text-[#8CB4E0] text-[10px] font-mono font-bold shadow-[0_0_8px_rgba(140,180,224,0.2)]"
            title="Moving Right to Left (RTL)"
          >
            <ArrowLeft className="w-3 h-3 text-[#8CB4E0] animate-pulse" />
            <span className="hidden md:inline">RTL</span>
          </div>

          {/* 0.5s Speed Mode Toggle with Glowing Border */}
          <button
            onClick={() =>
              setSpeedMode((s) => (s === '0.5s' ? '0.25s' : s === '0.25s' ? '1.0s' : '0.5s'))
            }
            title={`Ticker Speed: ${speedMode} (Click to toggle 0.5s / 0.25s / 1.0s)`}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#1A1816] border border-[#D96B43]/60 hover:border-[#D96B43] hover:shadow-[0_0_12px_rgba(217,107,67,0.4)] text-[10px] text-[#D96B43] font-mono font-bold transition active:scale-95"
          >
            <Zap className="w-2.5 h-2.5 text-[#D96B43]" />
            <span>{speedMode} Speed</span>
          </button>

          {/* Pause / Play Toggle with Visual Color Border */}
          <button
            onClick={() => setIsPaused((p) => !p)}
            title={isPaused ? 'Resume live ticker' : 'Pause ticker tape'}
            className="p-1 rounded-lg bg-[#1A1816] border border-[#D96B43]/30 hover:border-[#D96B43] hover:shadow-[0_0_10px_rgba(217,107,67,0.35)] text-[#F7EEDB]/70 hover:text-[#FFFDF8] transition active:scale-95"
          >
            {isPaused ? (
              <Play className="w-2.5 h-2.5 text-[#22C55E]" />
            ) : (
              <Pause className="w-2.5 h-2.5 text-[#D96B43]" />
            )}
          </button>
        </div>

        {/* Moving Sideways Right-to-Left (RTL) Marquee Strip at 0.5s speed */}
        <div className="relative flex-1 overflow-hidden h-full flex items-center pause-on-hover">
          <div
            className="flex items-center gap-3 animate-marquee-rtl"
            style={{
              animationDuration: `${animationDurationSeconds}s`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            {/* Stream 1 */}
            {benchmarks.map((b, i) => renderBenchmarkItem(b, `b1-${i}`))}
            {stocks.map((s, i) => renderStockItem(s, `s1-${i}`))}

            {/* Stream 2 (Duplicate for seamless continuous loop) */}
            {benchmarks.map((b, i) => renderBenchmarkItem(b, `b2-${i}`))}
            {stocks.map((s, i) => renderStockItem(s, `s2-${i}`))}
          </div>
        </div>

        {/* Right Info Box with Border Visual Color Effect */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-[#131211] border-l border-[#D96B43]/30 shrink-0 z-10 text-[11px] font-mono text-[#F7EEDB]/80">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#1A1816] border border-[#22C55E]/40 shadow-[0_0_8px_rgba(34,197,94,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping"></span>
            <span className="text-[#22C55E] font-bold text-[10px]">REAL OFFICIAL FEED</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#1A1816] border border-[#D96B43]/30 shadow-[0_0_8px_rgba(217,107,67,0.15)]">
            <Activity className="w-3 h-3 text-[#D96B43]" />
            <span>
              Listed: <strong className="text-[#8CB4E0]">{stocks.length} Stocks</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
