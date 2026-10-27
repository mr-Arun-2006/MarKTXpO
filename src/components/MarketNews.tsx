import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Newspaper, RefreshCw, Search, Sparkles, AlertTriangle, Clock3 } from 'lucide-react';
import { auth } from '../services/firebase';
import type { StockData, SupportedLanguage } from '../types/market';

interface GroundedSource {
  title: string;
  url: string;
}

interface GroundedHeadline {
  id: string;
  title: string;
  source: string;
  summary: string;
  timeLabel: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  impact: number | null;
}

interface Props {
  stocks: StockData[];
  selectedStock?: StockData;
  onSelectStock?: (stock: StockData) => void;
  openAIExplanation?: (stock: StockData) => void;
  language?: SupportedLanguage;
  compact?: boolean;
  customApiKey?: string;
  onOpenEod?: () => void;
}

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  gu: 'Gujarati',
  ta: 'Tamil',
  mr: 'Marathi',
  bn: 'Bengali',
};

function safeSentiment(value: unknown): GroundedHeadline['sentiment'] {
  return value === 'Bullish' || value === 'Bearish' || value === 'Neutral' ? value : 'Neutral';
}

export const MarketNews: React.FC<Props> = ({
  stocks,
  selectedStock,
  language = 'en',
  compact = false,
  customApiKey = '',
  onOpenEod,
}) => {
  const [headlines, setHeadlines] = useState<GroundedHeadline[]>([]);
  const [sources, setSources] = useState<GroundedSource[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const ticker = selectedStock?.ticker || 'NIFTY';
  const companyName = selectedStock?.name || 'Indian equity market';

  const loadGroundedNews = useCallback(async () => {
    setError(null);
    setHeadlines([]);
    setSources([]);
    setFetchedAt(null);

    const user = auth.currentUser;
    if (!user) {
      setError('Sign in again to retrieve market news.');
      return;
    }
    if (!customApiKey.trim()) {
      setError('Use your own Gemini API key to request source-grounded news. No sample headlines are substituted.');
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/ai/news-digest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          ticker,
          companyName,
          language: LANGUAGE_NAMES[language],
          userApiKey: customApiKey.trim(),
        }),
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'The news provider request failed.');
      }

      const groundedSources: GroundedSource[] = Array.isArray(payload?.sources)
        ? payload.sources
            .filter((item: any) => typeof item?.url === 'string' && /^https:\/\//i.test(item.url))
            .map((item: any) => ({
              title: typeof item.title === 'string' ? item.title.slice(0, 200) : item.url,
              url: item.url,
            }))
            .slice(0, 8)
        : [];

      const groundedHeadlines: GroundedHeadline[] = Array.isArray(payload?.headlines)
        ? payload.headlines
            .filter((item: any) => typeof item?.title === 'string' && item.title.trim())
            .slice(0, 20)
            .map((item: any, index: number) => ({
              id: ticker + '-grounded-' + index + '-' + item.title.slice(0, 24),
              title: item.title.slice(0, 500),
              source: typeof item.source === 'string' ? item.source.slice(0, 100) : 'Source listed in grounded references',
              summary: typeof item.snippet === 'string' ? item.snippet.slice(0, 800) : 'No source-backed summary was returned.',
              timeLabel: typeof item.timeAgo === 'string' ? item.timeAgo.slice(0, 80) : 'Publication time unavailable',
              sentiment: safeSentiment(item.sentimentTag),
              impact: typeof item.impactScore === 'number' && Number.isFinite(item.impactScore)
                ? Math.max(-100, Math.min(100, item.impactScore))
                : null,
            }))
        : [];

      if (payload?.dataAvailable !== true || groundedHeadlines.length === 0 || groundedSources.length === 0) {
        throw new Error('No grounded headlines with source URLs were returned. The news feed remains empty.');
      }

      setHeadlines(groundedHeadlines);
      setSources(groundedSources);
      setFetchedAt(new Date().toISOString());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to retrieve source-grounded news.');
    } finally {
      setLoading(false);
    }
  }, [ticker, companyName, language, customApiKey]);

  useEffect(() => {
    void loadGroundedNews();
  }, [loadGroundedNews, refreshKey]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return headlines;
    return headlines.filter((item) =>
      item.title.toLowerCase().includes(query)
      || item.summary.toLowerCase().includes(query)
      || item.source.toLowerCase().includes(query),
    );
  }, [headlines, search]);

  return (
    <section className="space-y-4 rounded-2xl border border-[#D96B43]/25 bg-[#1A1816] p-4 text-[#F7EEDB] sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#D96B43]/15 pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-[#D96B43]/25 bg-[#D96B43]/10 p-2 text-[#D96B43]">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold sm:text-lg">Source-Grounded Market News</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#F7EEDB]/55">
              {companyName} ({ticker}) · Gemini Search grounding. Only provider-returned headlines and reference links are displayed.
            </p>
            {fetchedAt && (
              <p className="mt-1 text-[10px] text-[#F7EEDB]/40">
                Retrieved {new Date(fetchedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#D96B43]/30 bg-[#131211] px-3 py-2 text-xs font-semibold transition hover:border-[#D96B43] disabled:opacity-50"
        >
          <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          {loading ? 'Searching…' : 'Refresh sources'}
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-[#F7EEDB]/35" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search grounded headlines…"
            className="w-full rounded-xl border border-[#D96B43]/15 bg-[#131211] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#D96B43]"
          />
        </div>
        <span className="text-[10px] uppercase tracking-widest text-[#F7EEDB]/40">
          {headlines.length} source results · not an exchange feed
        </span>
      </div>

      {loading && (
        <div role="status" className="rounded-xl border border-[#8CB4E0]/20 bg-[#171A1D] p-4 text-xs text-[#BFD6F2]">
          Searching for current market references. Source and publication metadata are shown only when returned by the provider.
        </div>
      )}

      {error && (
        <div role="status" className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-4 text-xs leading-5 text-amber-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          {onOpenEod && (
            <button type="button" onClick={onOpenEod} className="ml-6 mt-2 font-bold underline underline-offset-2">
              Open EOD key setup
            </button>
          )}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-[#F7EEDB]/10 bg-[#131211] p-8 text-center text-xs text-[#F7EEDB]/50">
          {headlines.length ? 'No headlines match this filter.' : 'No grounded headlines are currently available.'}
        </div>
      )}

      <div className={compact ? 'space-y-3' : 'max-h-[560px] space-y-3 overflow-y-auto pr-1'}>
        {filtered.map((item) => (
          <article key={item.id} className="space-y-2 rounded-xl border border-[#D96B43]/15 bg-[#131211]/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-md border border-[#8CB4E0]/20 bg-[#8CB4E0]/10 px-2 py-1 text-[10px] font-bold text-[#BFD6F2]">
                {item.source}
              </span>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#F7EEDB]/45">
                <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{item.timeLabel}</span>
                <span className={item.sentiment === 'Bullish' ? 'text-emerald-300' : item.sentiment === 'Bearish' ? 'text-red-300' : 'text-[#F7EEDB]/60'}>
                  {item.sentiment}
                </span>
                {item.impact !== null && <span>AI impact: {item.impact > 0 ? '+' : ''}{item.impact}</span>}
              </div>
            </div>
            <h3 className="text-sm font-bold leading-6">{item.title}</h3>
            <p className="text-xs leading-5 text-[#F7EEDB]/65">{item.summary}</p>
          </article>
        ))}
      </div>

      {sources.length > 0 && (
        <footer className="border-t border-[#D96B43]/15 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#F7EEDB]/55">Grounding references</h3>
          <p className="mt-1 text-[10px] leading-5 text-[#F7EEDB]/40">
            These URLs came from grounding metadata. The provider does not guarantee a one-to-one mapping from each headline to each reference.
          </p>
          <div className="mt-3 space-y-2">
            {sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="block break-words text-xs text-[#8CB4E0] hover:underline">
                {source.title || source.url} <ExternalLink className="ml-1 inline h-3 w-3" />
              </a>
            ))}
          </div>
        </footer>
      )}
      <p className="text-[10px] leading-5 text-[#F7EEDB]/35">
        Model-generated sentiment and impact are interpretations, not verified market facts. This feed does not claim official exchange, institutional-flow, or order-book data.
      </p>
    </section>
  );
};
