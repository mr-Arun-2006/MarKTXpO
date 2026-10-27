import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, CalendarDays, CheckCircle2, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import type { StockData, SupportedLanguage } from '../types/market';
import { auth, getDbWatchlist, saveDbWatchlistItem, deleteDbWatchlistItem, type DbWatchlistItem } from '../services/firebase';

interface Props {
  stocks: StockData[];
  selectedStock: StockData;
  onSelectStock: (stock: StockData) => void;
  openAIExplanation: (stock: StockData) => void;
  onNavigateToDashboard: () => void;
  language: SupportedLanguage;
}

interface HistoricalDividendEvent {
  ticker: string;
  exDate: string;
  amountPerShare: number;
  source: string;
}

interface DividendCoverage {
  ticker: string;
  available: boolean;
  eventCount: number;
}

interface DividendApiResponse {
  success: boolean;
  dataSource?: string;
  retrievedAt?: string;
  dividends?: HistoricalDividendEvent[];
  coverage?: DividendCoverage[];
  error?: string;
  limitations?: string[];
}

function formatMoney(value: number): string {
  return '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export const WatchlistDividendView: React.FC<Props> = ({
  stocks,
  selectedStock,
  onSelectStock,
  onNavigateToDashboard,
}) => {
  const [watchlist, setWatchlist] = useState<DbWatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);
  const [dividendEvents, setDividendEvents] = useState<HistoricalDividendEvent[]>([]);
  const [coverage, setCoverage] = useState<DividendCoverage[]>([]);
  const [dividendSource, setDividendSource] = useState<string | null>(null);
  const [dividendRetrievedAt, setDividendRetrievedAt] = useState<string | null>(null);
  const [dividendLoading, setDividendLoading] = useState(false);
  const [dividendError, setDividendError] = useState<string | null>(null);
  const [tickerToAdd, setTickerToAdd] = useState(stocks[0]?.ticker || '');
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'history' | 'yield'>('watchlist');
  const [yieldTicker, setYieldTicker] = useState(selectedStock?.ticker || stocks[0]?.ticker || '');
  const [targetYield, setTargetYield] = useState('3');

  const userId = auth.currentUser?.uid || '';

  useEffect(() => {
    let active = true;
    const loadUserWatchlist = async () => {
      if (!auth.currentUser) {
        setWatchlist([]);
        setWatchlistError('Sign in to view your personal watchlist.');
        setWatchlistLoading(false);
        return;
      }
      setWatchlistLoading(true);
      setWatchlistError(null);
      try {
        const items = await getDbWatchlist(auth.currentUser.uid);
        if (active) setWatchlist(items);
      } catch (error) {
        if (active) setWatchlistError(error instanceof Error ? error.message : 'Could not load your saved watchlist.');
      } finally {
        if (active) setWatchlistLoading(false);
      }
    };
    void loadUserWatchlist();
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!stocks.length) return;
    if (!stocks.some((stock) => stock.ticker === tickerToAdd)) setTickerToAdd(stocks[0].ticker);
    if (!stocks.some((stock) => stock.ticker === yieldTicker)) setYieldTicker(selectedStock?.ticker || stocks[0].ticker);
  }, [stocks, selectedStock?.ticker, tickerToAdd, yieldTicker]);

  const loadDividendEvents = async () => {
    const tickers = Array.from(new Set([
      ...watchlist.map((item) => item.ticker),
      ...stocks.map((item) => item.ticker),
    ])).slice(0, 25);
    if (!tickers.length) {
      setDividendEvents([]);
      setCoverage([]);
      setDividendError('No fetched tickers are available to query for historical dividend events.');
      return;
    }
    setDividendLoading(true);
    setDividendError(null);
    try {
      const params = new URLSearchParams({ tickers: tickers.join(','), range: '5y' });
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in again to retrieve historical dividend events.');
      const response = await fetch('/api/market/dividends?' + params.toString(), {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store',
      });
      const payload = await response.json() as DividendApiResponse;
      if (!response.ok || payload.success !== true) throw new Error(payload.error || 'Historical dividend event request failed.');
      setDividendEvents(Array.isArray(payload.dividends) ? payload.dividends : []);
      setCoverage(Array.isArray(payload.coverage) ? payload.coverage : []);
      setDividendSource(payload.dataSource || 'Provider source not identified');
      setDividendRetrievedAt(payload.retrievedAt || new Date().toISOString());
    } catch (error) {
      setDividendEvents([]);
      setCoverage([]);
      setDividendError(error instanceof Error ? error.message : 'Historical dividend events are unavailable.');
    } finally {
      setDividendLoading(false);
    }
  };

  useEffect(() => {
    void loadDividendEvents();
    // Reload when the per-user watchlist or the fetched quote set changes.
  }, [userId, stocks, watchlist]);

  const stockByTicker = useMemo(
    () => new Map(stocks.map((stock) => [stock.ticker, stock])),
    [stocks],
  );

  const coverageByTicker = useMemo(
    () => new Map(coverage.map((item) => [item.ticker, item])),
    [coverage],
  );

  const trailingMetrics = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    const totals = new Map<string, number>();
    dividendEvents.forEach((event) => {
      if (event.exDate >= cutoffDate && event.amountPerShare >= 0 && Number.isFinite(event.amountPerShare)) {
        totals.set(event.ticker, (totals.get(event.ticker) || 0) + event.amountPerShare);
      }
    });
    const values = new Map<string, { dps12m: number | null; yieldPercent: number | null; eventCount12m: number }>();
    const eventCount = new Map<string, number>();
    dividendEvents.forEach((event) => {
      if (event.exDate >= cutoffDate) eventCount.set(event.ticker, (eventCount.get(event.ticker) || 0) + 1);
    });

    coverage.forEach((item) => {
      const stock = stockByTicker.get(item.ticker);
      const currentPrice = stock?.currentPrice;
      if (!item.available || !Number.isFinite(currentPrice) || !currentPrice || currentPrice <= 0) {
        values.set(item.ticker, { dps12m: null, yieldPercent: null, eventCount12m: eventCount.get(item.ticker) || 0 });
        return;
      }
      const dps = totals.get(item.ticker) || 0;
      values.set(item.ticker, {
        dps12m: dps,
        yieldPercent: dps / currentPrice * 100,
        eventCount12m: eventCount.get(item.ticker) || 0,
      });
    });
    return values;
  }, [coverage, dividendEvents, stockByTicker]);

  const filteredWatchlist = useMemo(() => {
    const filter = query.trim().toLowerCase();
    return watchlist.filter((item) => {
      const stockName = item.stockName || '';
      return !filter || item.ticker.toLowerCase().includes(filter) || stockName.toLowerCase().includes(filter) || (item.notes || '').toLowerCase().includes(filter);
    });
  }, [watchlist, query]);

  const coveredTickers = coverage.filter((item) => item.available).length;
  const watchedWithVerifiedYield = watchlist.filter((item) => trailingMetrics.get(item.ticker)?.yieldPercent !== null && trailingMetrics.get(item.ticker)?.yieldPercent !== undefined).length;
  const selectedStockForYield = stockByTicker.get(yieldTicker);
  const yieldMetric = trailingMetrics.get(yieldTicker);
  const desiredYield = Number(targetYield);
  const indicativePriceForTarget = yieldMetric?.dps12m !== null && yieldMetric?.dps12m !== undefined && Number.isFinite(desiredYield) && desiredYield > 0
    ? yieldMetric.dps12m / (desiredYield / 100)
    : null;

  const handleAddTicker = async () => {
    const user = auth.currentUser;
    const stock = stockByTicker.get(tickerToAdd);
    if (!user || !stock) {
      setWatchlistError('Sign in and choose a ticker with a fetched market quote.');
      return;
    }
    const parsedTarget = targetPrice.trim() ? Number(targetPrice) : undefined;
    if (parsedTarget !== undefined && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      setWatchlistError('Target price must be a positive number.');
      return;
    }

    setSaving(true);
    setWatchlistError(null);
    try {
      const existing = watchlist.find((item) => item.ticker === stock.ticker);
      const item: DbWatchlistItem = {
        id: existing?.id || 'watch-' + stock.ticker,
        userId: user.uid,
        ticker: stock.ticker,
        stockName: stock.name,
        exchange: 'NSE',
        ...(parsedTarget !== undefined ? { targetPrice: parsedTarget } : {}),
        ...(notes.trim() ? { notes: notes.trim().slice(0, 500) } : {}),
        addedAt: existing?.addedAt || new Date().toISOString(),
      };
      await saveDbWatchlistItem(item);
      setWatchlist((items) => [...items.filter((saved) => saved.ticker !== item.ticker), item].sort((a, b) => a.ticker.localeCompare(b.ticker)));
      setTargetPrice('');
      setNotes('');
    } catch (error) {
      setWatchlistError(error instanceof Error ? error.message : 'The watchlist item could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (item: DbWatchlistItem) => {
    const user = auth.currentUser;
    if (!user) {
      setWatchlistError('Sign in again before editing your watchlist.');
      return;
    }
    setWatchlistError(null);
    try {
      await deleteDbWatchlistItem(user.uid, item.id);
      setWatchlist((items) => items.filter((saved) => saved.id !== item.id));
    } catch (error) {
      setWatchlistError(error instanceof Error ? error.message : 'The watchlist item could not be removed.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-5 text-[#F7EEDB] sm:px-6 sm:py-8">
      <header className="rounded-2xl border border-[#D96B43]/25 bg-gradient-to-br from-[#221A16] via-[#171513] to-[#131211] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D96B43]/30 bg-[#D96B43]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F0A17F]">
              <CalendarDays className="h-3.5 w-3.5" /> Historical distributions
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Watchlist & Dividend Intelligence</h1>
            <p className="mt-3 text-sm leading-6 text-[#F7EEDB]/65">
              Personal watchlists are saved to the signed-in user's Firebase data. Dividend events and trailing 12-month yield are calculated from provider-returned historical ex-dates and per-share amounts—not synthetic forecasts.
            </p>
          </div>
          <button type="button" onClick={onNavigateToDashboard} className="rounded-xl border border-[#D96B43]/30 bg-[#1A1816] px-4 py-2 text-xs font-bold hover:bg-[#25221F]">
            Back to dashboard
          </button>
        </div>
        <nav className="mt-6 flex flex-wrap gap-2">
          {[
            { id: 'watchlist' as const, label: 'My Watchlist' },
            { id: 'history' as const, label: 'Historical Dividends' },
            { id: 'yield' as const, label: 'Trailing Yield Calculator' },
          ].map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? 'rounded-xl bg-[#D96B43] px-4 py-2 text-xs font-bold text-[#131211]' : 'rounded-xl border border-[#D96B43]/20 bg-[#131211] px-4 py-2 text-xs font-semibold text-[#F7EEDB]/70 hover:text-[#F7EEDB]'}>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {(watchlistError || watchlistLoading) && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-4 text-xs leading-5 text-amber-100">
          {watchlistLoading ? 'Loading your saved watchlist…' : null}
          {watchlistError}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#D96B43]/20 bg-[#1A1816] p-4">
          <div className="text-xs text-[#F7EEDB]/50">Saved tickers</div>
          <div className="mt-1 text-2xl font-black">{watchlist.length}</div>
          <div className="mt-1 text-[10px] text-[#F7EEDB]/35">Your account's watchlist only</div>
        </div>
        <div className="rounded-xl border border-[#8CB4E0]/20 bg-[#1A1816] p-4">
          <div className="text-xs text-[#F7EEDB]/50">Dividend-history coverage</div>
          <div className="mt-1 text-2xl font-black">{coveredTickers} / {coverage.length}</div>
          <div className="mt-1 text-[10px] text-[#F7EEDB]/35">Provider responses for queried tickers</div>
        </div>
        <div className="rounded-xl border border-[#D96B43]/20 bg-[#1A1816] p-4">
          <div className="text-xs text-[#F7EEDB]/50">Watchlist tickers with computed yield</div>
          <div className="mt-1 text-2xl font-black">{watchedWithVerifiedYield}</div>
          <div className="mt-1 text-[10px] text-[#F7EEDB]/35">Trailing-year dividends ÷ fetched close</div>
        </div>
        <div className="rounded-xl border border-[#D96B43]/20 bg-[#1A1816] p-4">
          <div className="text-xs text-[#F7EEDB]/50">Future payouts</div>
          <div className="mt-1 text-2xl font-black">Unavailable</div>
          <div className="mt-1 text-[10px] text-[#F7EEDB]/35">No official announcement feed is connected</div>
        </div>
      </section>

      {activeTab === 'watchlist' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-[#D96B43]/20 bg-[#1A1816] p-5">
            <h2 className="text-base font-black">Add or update a ticker</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_auto]">
              <label className="space-y-1 text-xs text-[#F7EEDB]/65">
                Fetched ticker
                <select value={tickerToAdd} onChange={(event) => setTickerToAdd(event.target.value)} className="w-full rounded-xl border border-[#D96B43]/20 bg-[#131211] px-3 py-2.5 text-sm text-[#F7EEDB]">
                  {stocks.map((stock) => <option key={stock.ticker} value={stock.ticker}>{stock.ticker} — {stock.name}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs text-[#F7EEDB]/65">
                Optional target price (₹)
                <input type="number" min="0" step="0.01" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} placeholder="No target" className="w-full rounded-xl border border-[#D96B43]/20 bg-[#131211] px-3 py-2.5 text-sm text-[#F7EEDB]" />
              </label>
              <label className="space-y-1 text-xs text-[#F7EEDB]/65">
                Notes
                <input maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Your thesis (optional)" className="w-full rounded-xl border border-[#D96B43]/20 bg-[#131211] px-3 py-2.5 text-sm text-[#F7EEDB]" />
              </label>
              <button type="button" onClick={() => { void handleAddTicker(); }} disabled={saving || !stocks.length} className="self-end inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#D96B43] px-4 py-2 text-xs font-bold text-[#131211] disabled:opacity-50">
                <Plus className="h-4 w-4" /> {saving ? 'Saving…' : 'Save ticker'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D96B43]/20 bg-[#1A1816] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-black">Your saved watchlist</h2>
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#F7EEDB]/35" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticker, company, notes" className="w-full rounded-xl border border-[#D96B43]/20 bg-[#131211] py-2 pl-9 pr-3 text-xs outline-none focus:border-[#D96B43]" />
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b border-[#D96B43]/15 text-[10px] uppercase tracking-widest text-[#F7EEDB]/45">
                  <tr>
                    <th className="py-3 pr-3">Ticker</th>
                    <th className="py-3 pr-3">Latest fetched close</th>
                    <th className="py-3 pr-3">Trailing 12M DPS</th>
                    <th className="py-3 pr-3">Computed yield</th>
                    <th className="py-3 pr-3">Target</th>
                    <th className="py-3 pr-3">Notes</th>
                    <th className="py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D96B43]/10">
                  {filteredWatchlist.map((item) => {
                    const stock = stockByTicker.get(item.ticker);
                    const metric = trailingMetrics.get(item.ticker);
                    const covered = coverageByTicker.get(item.ticker)?.available === true;
                    return (
                      <tr key={item.id}>
                        <td className="py-3 pr-3">
                          <button type="button" onClick={() => { if (stock) onSelectStock(stock); }} className="text-left font-bold text-[#D96B43] hover:underline">{item.ticker}</button>
                          <div className="mt-1 text-[10px] text-[#F7EEDB]/45">{item.stockName || stock?.name || 'Name unavailable'}</div>
                        </td>
                        <td className="py-3 pr-3">{stock?.currentPrice ? formatMoney(stock.currentPrice) : 'Unavailable'}</td>
                        <td className="py-3 pr-3">{covered && metric?.dps12m !== null && metric?.dps12m !== undefined ? formatMoney(metric.dps12m) : 'Unavailable'}</td>
                        <td className="py-3 pr-3 font-bold">{covered && metric?.yieldPercent !== null && metric?.yieldPercent !== undefined ? metric.yieldPercent.toFixed(2) + '%' : 'Unavailable'}</td>
                        <td className="py-3 pr-3">{item.targetPrice ? formatMoney(item.targetPrice) : '—'}</td>
                        <td className="max-w-[180px] truncate py-3 pr-3 text-[#F7EEDB]/55">{item.notes || '—'}</td>
                        <td className="py-3">
                          <button type="button" onClick={() => { void handleRemove(item); }} aria-label={'Remove ' + item.ticker} className="rounded-lg border border-red-500/20 p-2 text-red-300 hover:bg-red-950/30"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredWatchlist.length && <div className="py-8 text-center text-xs text-[#F7EEDB]/45">Your saved watchlist is empty. Add a ticker above; no demo positions are preloaded.</div>}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'history' && (
        <section className="rounded-2xl border border-[#D96B43]/20 bg-[#1A1816] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black">Historical dividend events</h2>
              <p className="mt-1 text-xs leading-5 text-[#F7EEDB]/50">Ex-dates and amounts returned by the provider. No future payment dates or announcement claims are manufactured.</p>
              {dividendSource && <p className="mt-1 text-[10px] text-[#F7EEDB]/35">Source: {dividendSource}</p>}
              {dividendRetrievedAt && <p className="text-[10px] text-[#F7EEDB]/35">Retrieved {new Date(dividendRetrievedAt).toLocaleString('en-IN')}</p>}
            </div>
            <button type="button" onClick={() => { void loadDividendEvents(); }} disabled={dividendLoading} className="inline-flex items-center gap-2 rounded-xl border border-[#D96B43]/25 bg-[#131211] px-3 py-2 text-xs font-semibold disabled:opacity-50"><RefreshCw className={dividendLoading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />Refresh history</button>
          </div>
          {dividendError && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-950/15 p-3 text-xs text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{dividendError}</div>}
          {dividendLoading && <div className="mt-4 text-xs text-[#BFD6F2]">Fetching historical dividend events…</div>}
          <div className="mt-4 max-h-[560px] overflow-y-auto">
            <table className="w-full min-w-[460px] text-left text-xs">
              <thead className="border-b border-[#D96B43]/15 text-[10px] uppercase tracking-widest text-[#F7EEDB]/45">
                <tr><th className="py-3 pr-3">Ticker</th><th className="py-3 pr-3">Ex-date (provider)</th><th className="py-3 pr-3 text-right">Per-share amount</th><th className="py-3">Source</th></tr>
              </thead>
              <tbody className="divide-y divide-[#D96B43]/10">
                {dividendEvents.slice(0, 300).map((event, index) => (
                  <tr key={event.ticker + '-' + event.exDate + '-' + index}>
                    <td className="py-3 pr-3 font-bold">{event.ticker}</td>
                    <td className="py-3 pr-3">{event.exDate}</td>
                    <td className="py-3 pr-3 text-right font-bold">{formatMoney(event.amountPerShare)}</td>
                    <td className="py-3 text-[10px] text-[#F7EEDB]/45">{event.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!dividendLoading && !dividendEvents.length && !dividendError && <div className="py-8 text-center text-xs text-[#F7EEDB]/45">No historical dividend events were returned for the queried tickers.</div>}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#8CB4E0]/15 bg-[#171A1D] p-3 text-[10px] leading-5 text-[#F7EEDB]/50">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8CB4E0]" />
            Yahoo historical events are third-party reference data, not an official NSE/BSE feed. Verify company dividend announcements and corporate actions before relying on these records.
          </div>
        </section>
      )}

      {activeTab === 'yield' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#D96B43]/20 bg-[#1A1816] p-5">
            <h2 className="text-base font-black">Trailing yield calculator</h2>
            <p className="mt-2 text-xs leading-5 text-[#F7EEDB]/55">Uses the sum of historical per-share dividend events in the trailing 365 days divided by the currently fetched quote. Missing data remains unavailable.</p>
            <div className="mt-4 space-y-4">
              <label className="block space-y-1 text-xs text-[#F7EEDB]/60">
                Ticker
                <select value={yieldTicker} onChange={(event) => setYieldTicker(event.target.value)} className="w-full rounded-xl border border-[#D96B43]/20 bg-[#131211] px-3 py-3 text-sm text-[#F7EEDB]">
                  {stocks.map((stock) => <option key={stock.ticker} value={stock.ticker}>{stock.ticker} — {stock.name}</option>)}
                </select>
              </label>
              <label className="block space-y-1 text-xs text-[#F7EEDB]/60">
                Target annualized yield (%)
                <input type="number" min="0.1" max="100" step="0.1" value={targetYield} onChange={(event) => setTargetYield(event.target.value)} className="w-full rounded-xl border border-[#D96B43]/20 bg-[#131211] px-3 py-3 text-sm text-[#F7EEDB]" />
              </label>
            </div>
          </div>
          <div className="rounded-2xl border border-[#8CB4E0]/20 bg-[#171A1D] p-5">
            <h2 className="flex items-center gap-2 text-base font-black"><Activity className="h-4 w-4 text-[#8CB4E0]" /> Calculated from historical events</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#131211] p-3"><div className="text-xs text-[#F7EEDB]/45">Fetched close</div><div className="mt-1 text-lg font-black">{selectedStockForYield?.currentPrice ? formatMoney(selectedStockForYield.currentPrice) : 'Unavailable'}</div></div>
              <div className="rounded-xl bg-[#131211] p-3"><div className="text-xs text-[#F7EEDB]/45">Trailing 12M DPS</div><div className="mt-1 text-lg font-black">{yieldMetric?.dps12m !== null && yieldMetric?.dps12m !== undefined ? formatMoney(yieldMetric.dps12m) : 'Unavailable'}</div></div>
              <div className="rounded-xl bg-[#131211] p-3"><div className="text-xs text-[#F7EEDB]/45">Trailing 12M yield</div><div className="mt-1 text-lg font-black">{yieldMetric?.yieldPercent !== null && yieldMetric?.yieldPercent !== undefined ? yieldMetric.yieldPercent.toFixed(2) + '%' : 'Unavailable'}</div></div>
              <div className="rounded-xl bg-[#131211] p-3"><div className="text-xs text-[#F7EEDB]/45">Events in trailing year</div><div className="mt-1 text-lg font-black">{yieldMetric?.eventCount12m ?? 'Unavailable'}</div></div>
            </div>
            <div className="mt-4 rounded-xl border border-[#D96B43]/20 bg-[#131211] p-4">
              <div className="text-xs text-[#F7EEDB]/50">Price implied by the target yield</div>
              <div className="mt-1 text-2xl font-black">{indicativePriceForTarget !== null ? formatMoney(indicativePriceForTarget) : 'Unavailable'}</div>
              <p className="mt-2 text-[10px] leading-5 text-[#F7EEDB]/40">Arithmetic illustration only; based on trailing dividends, which may change. Not a price target or investment recommendation.</p>
            </div>
          </div>
        </section>
      )}

      <footer className="flex items-start gap-2 rounded-xl border border-[#D96B43]/15 bg-[#131211] p-4 text-[10px] leading-5 text-[#F7EEDB]/40">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8CB4E0]" />
        This module does not display invented future payouts, estimated payout ratios or synthetic yield histories. Market-data coverage depends on the provider; the current UI does not claim official exchange licensing.
      </footer>
    </div>
  );
};
