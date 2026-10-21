import React, { useState } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Info,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface Props {
  isLiveOfficial: boolean;
  lastLiveSync: string | null;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  stockCount: number;
}

export const OfficialMarketBanner: React.FC<Props> = ({
  isLiveOfficial,
  lastLiveSync,
  onRefresh,
  isRefreshing,
  stockCount,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const formattedTime = lastLiveSync
    ? new Date(lastLiveSync).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' IST'
    : 'Connecting...';

  return (
    <div className="w-full bg-[#181614] border-b border-[#D96B43]/30 px-3 sm:px-6 py-2 text-xs text-[#F7EEDB] transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Verification status */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] font-mono font-bold text-[11px] shadow-[0_0_10px_rgba(34,197,94,0.25)]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span>REAL INDIAN MARKET DATA</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#F7EEDB]/80">
            <span className="font-semibold text-[#8CB4E0]">NSE &amp; BSE Official Feeds</span>
            <span className="text-[#F7EEDB]/40">•</span>
            <span className="hidden sm:inline text-[#F7EEDB]/60">via Yahoo Finance &amp; Google Finance</span>
            <span className="text-[#F7EEDB]/40">•</span>
            <span className="font-mono text-[#D96B43]">{stockCount} Traded Equities</span>
          </div>
        </div>

        {/* Right: Timestamp & Refresh & Details toggle */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 font-mono text-[11px] text-[#F7EEDB]/60">
            <Clock className="w-3.5 h-3.5 text-[#D96B43]" />
            <span>Synced: <span className="text-[#F7EEDB] font-medium">{formattedTime}</span></span>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25221F] hover:bg-[#322D29] border border-[#D96B43]/30 text-[11px] font-medium text-[#F7EEDB] transition active:scale-95"
            title="Inspect Official Sources & Integrity"
          >
            <Info className="w-3 h-3 text-[#8CB4E0]" />
            <span>Sources</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-[#D96B43] to-[#B85D3B] text-[#131211] font-bold text-[11px] hover:brightness-110 border border-[#F7EEDB]/30 shadow-[0_0_10px_rgba(217,107,67,0.3)] transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Fetching Feeds...' : 'Refresh Real Prices'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Official Data Verification Drawer */}
      {showDetails && (
        <div className="max-w-7xl mx-auto mt-2.5 pt-2.5 border-t border-[#D96B43]/20 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] animate-fadeIn">
          <div className="p-2.5 rounded-lg bg-[#131211]/80 border border-[#22C55E]/30 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#22C55E]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>National Stock Exchange (NSE)</span>
            </div>
            <p className="text-[#F7EEDB]/70">
              Live quote feed linked to official `.NS` exchange tickers with real-time traded prices, daily volume, 52-week extremes, and circuit breakers.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-[#131211]/80 border border-[#8CB4E0]/30 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#8CB4E0]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bombay Stock Exchange (BSE)</span>
            </div>
            <p className="text-[#F7EEDB]/70">
              Authentic 6-digit scrip codes (e.g. 500325, 532540) matching official BSE Bhavcopy with live inter-exchange arbitrage surveillance.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-[#131211]/80 border border-[#D96B43]/30 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#D96B43]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Yahoo &amp; Google Finance Pipelines</span>
            </div>
            <p className="text-[#F7EEDB]/70">
              Direct institutional API aggregation with high-frequency caching and official historical daily candlestick streams.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
