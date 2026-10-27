import React, { useState } from 'react';
import {
  RefreshCw,
  Info,
  Clock,
  ChevronDown,
} from 'lucide-react';

interface Props {
  isLiveOfficial: boolean;
  isUnavailable: boolean;
  lastLiveSync: string | null;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  stockCount: number;
}

export const OfficialMarketBanner: React.FC<Props> = ({
  isLiveOfficial,
  isUnavailable,
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
    <div className="w-full bg-[#181614] border-b border-[#D96B43]/30 px-2.5 sm:px-5 lg:px-8 py-1.5 text-xs text-[#F7EEDB] transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        {/* Left: Verification status */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <span
            className={`font-mono font-bold text-[10px] sm:text-[11px] whitespace-nowrap ${
              isUnavailable
                ? 'text-[#EF4444]'
                : !lastLiveSync
                ? 'text-[#F7EEDB]/70'
                : isLiveOfficial
                ? 'text-[#22C55E]'
                : 'text-[#D96B43]'
            }`}
          >
            {isUnavailable
              ? 'Market Data Unavailable'
              : !lastLiveSync
              ? 'Connecting Feed'
              : 'Yahoo Finance Feed'}
          </span>

          <span className="text-[#F7EEDB]/35 hidden sm:inline" aria-hidden="true">·</span>
          <span className="hidden md:inline text-[11px] text-[#8CB4E0] truncate">
            {isUnavailable
              ? 'Quote API returned no verified quotes'
              : !lastLiveSync
              ? 'Waiting for quote service'
              : 'Third-party quote/history data; not an official exchange feed'}
          </span>
          <span className="text-[#F7EEDB]/35" aria-hidden="true">·</span>
          <span className="font-mono text-[10px] sm:text-[11px] text-[#F7EEDB]/80 whitespace-nowrap tabular-nums">
            {stockCount} Equities
          </span>
        </div>

        {/* Right: Timestamp & Refresh & Details toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1 font-mono text-[11px] text-[#F7EEDB]/60 whitespace-nowrap tabular-nums">
            <Clock className="w-3.5 h-3.5 text-[#D96B43]" />
            <span>
              Synced: <span className="text-[#F7EEDB] font-medium">{formattedTime}</span>
            </span>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-[#25221F] hover:bg-[#322D29] border border-[#D96B43]/30 text-[10px] sm:text-[11px] font-medium text-[#F7EEDB] transition active:scale-95 whitespace-nowrap shrink-0"
            title="Inspect data sources and limitations"
          >
            <Info className="w-3 h-3 text-[#8CB4E0]" />
            <span>Sources</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-[#D96B43] to-[#B85D3B] text-[#131211] font-bold text-[10px] sm:text-[11px] hover:brightness-110 border border-[#F7EEDB]/30 shadow-[0_0_10px_rgba(217,107,67,0.3)] transition active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline sm:inline">
              {isRefreshing ? 'Syncing...' : 'Refresh'}
            </span>
          </button>
        </div>
      </div>

      {/* Expandable source and data-limitations drawer */}
      {showDetails && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-[#D96B43]/20 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] animate-fadeIn">
          <div className="p-2.5 rounded-lg bg-[#131211]/80 border border-[#8CB4E0]/30 space-y-1">
            <div className="font-bold text-[#8CB4E0]">Quote and history source</div>
            <p className="text-[#F7EEDB]/70">
              Price quotes and historical candles are retrieved from Yahoo Finance. This is a third-party data source, not a direct NSE or BSE exchange feed, and data may be delayed or unavailable.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-[#131211]/80 border border-[#D96B43]/30 space-y-1">
            <div className="font-bold text-[#D96B43]">Technical indicators</div>
            <p className="text-[#F7EEDB]/70">
              RSI, moving averages, MACD, and Bollinger Bands are calculated from observed historical closing prices. Equities without sufficient history are excluded from this feed.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-[#131211]/80 border border-[#F7EEDB]/20 space-y-1">
            <div className="font-bold text-[#F7EEDB]">Data limitations</div>
            <p className="text-[#F7EEDB]/70">
              Some company fundamentals remain registry reference values. Delivery statistics, institutional flows, verified news sentiment, and exchange circuit limits are not validated from a live official source.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
