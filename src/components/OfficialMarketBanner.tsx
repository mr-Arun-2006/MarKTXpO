import React, { useMemo, useState } from 'react';
import { RefreshCw, Info, Clock3, ChevronDown, Wifi, WifiOff } from 'lucide-react';

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
  const fetchedAt = useMemo(() => {
    if (!lastLiveSync) return null;
    const date = new Date(lastLiveSync);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [lastLiveSync]);
  const isStale = Boolean(fetchedAt && Date.now() - fetchedAt.getTime() > 120_000);
  const status = isUnavailable
    ? 'Feed unavailable'
    : !fetchedAt
      ? 'Connecting'
      : isStale
        ? 'Last update may be stale'
        : 'Reference feed connected';

  const formattedTime = fetchedAt
    ? fetchedAt.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' IST'
    : 'Not fetched yet';

  const statusColor = isUnavailable || isStale
    ? 'text-amber-300'
    : !fetchedAt
      ? 'text-[#F7EEDB]/65'
      : 'text-sky-300';

  return (
    <section className="w-full border-b border-white/10 bg-[#181614] px-3 py-2 text-xs text-[#F7EEDB]" aria-label="Market data status">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {isUnavailable ? (
            <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          ) : (
            <Wifi className="h-3.5 w-3.5 shrink-0 text-sky-300" />
          )}
          <span className={"font-semibold " + statusColor}>{status}</span>
          <span className="hidden text-white/25 sm:inline">·</span>
          <span className="truncate text-[11px] text-white/55">
            {isLiveOfficial ? 'Licensed exchange feed' : 'Yahoo Finance third-party reference data'}
          </span>
          <span className="shrink-0 rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/65">
            {stockCount} symbols
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-white/55">
            <Clock3 className="h-3.5 w-3.5" />
            Fetched {formattedTime}
          </span>
          <span className="hidden whitespace-nowrap text-[10px] text-white/40 md:inline">Auto refresh · 60 sec</span>
          <button
            type="button"
            onClick={() => setShowDetails((value) => !value)}
            aria-expanded={showDetails}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/75 transition hover:bg-white/5"
          >
            <Info className="h-3 w-3" />
            Sources
            <ChevronDown className={"h-3 w-3 transition-transform " + (showDetails ? 'rotate-180' : '')} />
          </button>
          <button
            type="button"
            onClick={() => { void onRefresh(); }}
            disabled={isRefreshing}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-[#D96B43] px-3 py-1.5 text-[11px] font-bold text-[#131211] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={"h-3 w-3 " + (isRefreshing ? 'animate-spin' : '')} />
            {isRefreshing ? 'Updating' : 'Refresh'}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mx-auto mt-2 grid max-w-7xl grid-cols-1 gap-2 border-t border-white/10 pt-3 text-[11px] sm:grid-cols-3">
          <div className="rounded-lg bg-black/20 p-3">
            <h3 className="mb-1 font-semibold text-sky-200">Quote source</h3>
            <p className="leading-5 text-white/60">
              Prices and index values come from Yahoo Finance, a third-party provider. This application does not connect directly to the NSE or BSE exchange feed. Availability and delay depend on the provider.
            </p>
          </div>
          <div className="rounded-lg bg-black/20 p-3">
            <h3 className="mb-1 font-semibold text-[#F0A17F]">Calculated indicators</h3>
            <p className="leading-5 text-white/60">
              Moving averages, RSI, MACD and related technical values are calculated from retrieved historical candles. Missing observations are not replaced with invented prices.
            </p>
          </div>
          <div className="rounded-lg bg-black/20 p-3">
            <h3 className="mb-1 font-semibold text-white/80">Freshness and limitations</h3>
            <p className="leading-5 text-white/60">
              “Fetched” is when this application last received a response, not the exchange trade time. Check the quote timestamp shown for each stock. Registry fundamentals and unavailable delivery or institutional-flow data are not live verified values.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
