import React, { useState, useEffect } from 'react';
import { StockData, SupportedLanguage } from '../types/market';
import {
  Newspaper,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Clock,
  Radio,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  stock: StockData;
  language: SupportedLanguage;
  customApiKey?: string;
}

interface NewsHeadline {
  title: string;
  source: string;
  timeAgo: string;
  snippet: string;
  sentimentTag: 'Bullish' | 'Neutral' | 'Bearish';
  impactScore: number;
}

interface NewsDigestData {
  ticker: string;
  companyName: string;
  oneSentenceImpact: string;
  overallSentiment: 'Bullish' | 'Neutral' | 'Bearish';
  headlines: NewsHeadline[];
  sources?: { title?: string; url?: string }[];
  dataAvailable?: boolean;
  dataStatus?: string;
}

// Cache successful grounded results only; unavailable responses must not mask a later retry.
const clientDigestCache = new Map<string, NewsDigestData>();
const MAX_CLIENT_DIGEST_CACHE_ENTRIES = 100;

export const AINewsDigest: React.FC<Props> = ({ stock, language, customApiKey }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [digest, setDigest] = useState<NewsDigestData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchNewsDigest = async (forceRefresh = false) => {
    const cacheKey = `${stock.ticker}_${language}`;
    if (!forceRefresh && clientDigestCache.has(cacheKey)) {
      setDigest(clientDigestCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/news-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: stock.ticker,
          companyName: stock.name,
          language:
            language === 'hi'
              ? 'Hindi'
              : language === 'gu'
              ? 'Gujarati'
              : language === 'ta'
              ? 'Tamil'
              : language === 'mr'
              ? 'Marathi'
              : language === 'bn'
              ? 'Bengali'
              : 'English',
          userApiKey: customApiKey,
        }),
      });

      if (!res.ok) throw new Error('Failed to fetch AI news digest');
      const data = await res.json() as NewsDigestData;
      if (data.dataAvailable !== false) {
        if (clientDigestCache.size >= MAX_CLIENT_DIGEST_CACHE_ENTRIES && !clientDigestCache.has(cacheKey)) {
          const oldestKey = clientDigestCache.keys().next().value;
          if (oldestKey !== undefined) clientDigestCache.delete(oldestKey);
        }
        clientDigestCache.set(cacheKey, data);
      }
      setDigest(data);
    } catch (err: any) {
      console.warn('[News Digest] Gracefully handling fetch:', err?.message);
      setError(err.message || 'Error retrieving financial headlines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsDigest(false);
  }, [stock.ticker, language]);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-5 text-[#F7EEDB]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D96B43]/15">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#D96B43]/15 border border-[#D96B43]/30 flex items-center justify-center">
            <Radio className="w-4 h-4 text-[#D96B43]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#F7EEDB] tracking-tight">AI News Digest &amp; Market Impact</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold ${
                loading
                  ? 'bg-[#F7EEDB]/10 text-[#F7EEDB]/70 border-[#F7EEDB]/20'
                  : digest?.dataAvailable === true
                  ? 'bg-[#8CB4E0]/15 text-[#8CB4E0] border-[#8CB4E0]/30'
                  : 'bg-[#D96B43]/15 text-[#D96B43] border-[#D96B43]/30'
              }`}>
                {loading ? 'CHECKING SOURCES' : digest?.dataAvailable === true ? 'SOURCE-GROUNDED' : 'NEWS UNAVAILABLE'}
              </span>
            </div>
            <p className="text-xs text-[#F7EEDB]/60 mt-0.5">
              {digest?.dataAvailable === true
                ? `Grounded news retrieved for ${stock.ticker}; check the linked sources and timestamps.`
                : `Verified current headlines for ${stock.ticker} are unavailable until source-grounded results can be retrieved.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {digest && (
            <span
              className={`text-xs px-2.5 py-1 rounded-lg font-bold font-mono border ${
                digest.overallSentiment === 'Bullish'
                  ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40'
                  : digest.overallSentiment === 'Bearish'
                  ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
                  : 'bg-[#8CB4E0]/15 text-[#8CB4E0] border-[#8CB4E0]/30'
              }`}
            >
              {digest.overallSentiment} Bias
            </span>
          )}

          <button
            onClick={() => fetchNewsDigest(true)}
            disabled={loading}
            title="Refresh Grounded News"
            className="p-2 rounded-lg border border-[#D96B43]/25 bg-[#131211] text-[#F7EEDB] hover:text-[#FFFDF8] hover:border-[#D96B43]/60 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-8 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#D96B43]/20 border-t-[#D96B43] animate-spin"></div>
          <p className="text-xs text-[#F7EEDB]/70 font-mono">
            Grounding real-time financial wires &amp; synthesizing 1-sentence impact for {stock.ticker}...
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-4 rounded-xl bg-[#131211] border border-[#EF4444]/30 text-xs text-[#F7EEDB] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchNewsDigest(true)} className="underline font-bold text-[#D96B43]">
            Retry
          </button>
        </div>
      )}

      {/* Active Digest Content */}
      {!loading && digest && (
        <div className="space-y-4">
          {/* 1-Sentence AI Market Impact Highlight Banner */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#131211] border border-[#D96B43]/35 relative overflow-hidden shadow-inner">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#D96B43] to-[#B85D3B] text-[#FFFDF8] flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                <Sparkles className="w-4 h-4 fill-current text-[#FFFDF8]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D96B43] font-mono">
                    1-Sentence AI Market Impact Summary
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#8CB4E0]/15 text-[#8CB4E0] font-mono">
                    {digest.dataAvailable === false ? 'NO VERIFIED NEWS' : 'NEWS CONTEXT'}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-semibold text-[#F7EEDB] leading-snug">
                  "{digest.oneSentenceImpact}"
                </p>
              </div>
            </div>
          </div>

          {/* Headline Articles Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {digest.headlines?.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#131211] border border-[#D96B43]/15 hover:border-[#D96B43]/45 transition flex flex-col justify-between space-y-2.5 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-[#1A1816] text-[#8CB4E0] border border-[#8CB4E0]/20 font-bold">
                      {item.source}
                    </span>
                    <span className="text-[#F7EEDB]/50 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#D96B43]/70" />
                      {item.timeAgo}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-[#F7EEDB] group-hover:text-[#FFFDF8] transition leading-snug line-clamp-2">
                    {item.title}
                  </h3>

                  <p className="text-[11px] text-[#F7EEDB]/70 leading-relaxed line-clamp-2">
                    {item.snippet}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#D96B43]/10 text-[10px] font-mono">
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      item.sentimentTag === 'Bullish'
                        ? 'text-[#22C55E]'
                        : item.sentimentTag === 'Bearish'
                        ? 'text-[#EF4444]'
                        : 'text-[#8CB4E0]'
                    }`}
                  >
                    {item.sentimentTag === 'Bullish' ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#22C55E]" />
                    ) : item.sentimentTag === 'Bearish' ? (
                      <ArrowDownRight className="w-3.5 h-3.5 text-[#EF4444]" />
                    ) : null}
                    <span>{item.sentimentTag} ({item.impactScore > 0 ? `+${item.impactScore}` : item.impactScore})</span>
                  </span>

                  <span className="text-[#8CB4E0] text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#8CB4E0]" />
                    <span>Verified Wire</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Grounding Sources Web Links */}
          {digest.sources && digest.sources.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#D96B43]/10 text-[11px]">
              <span className="text-[#F7EEDB]/60 flex items-center gap-1 font-mono">
                <Compass className="w-3 h-3 text-[#D96B43]" /> Sources:
              </span>
              {digest.sources.slice(0, 3).map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#131211] border border-[#D96B43]/20 text-[#8CB4E0] hover:text-[#FFFDF8] hover:border-[#D96B43]/50 transition text-[10px]"
                >
                  <span className="truncate max-w-[160px]">{src.title || 'Wire report'}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[#D96B43]" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
