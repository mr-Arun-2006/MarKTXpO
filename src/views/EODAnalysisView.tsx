import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, KeyRound, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { auth } from '../services/firebase';
import type { SupportedLanguage } from '../types/market';
import type { EodTechnicalSnapshot } from '../utils/eodTechnicalAnalysis';

interface AiAnalysis {
  bias?: 'Bullish' | 'Bearish' | 'Mixed' | 'Neutral';
  summary?: string;
  bullishFactors?: string[];
  bearishFactors?: string[];
  watchItems?: string[];
  newsContext?: string;
  disclaimer?: string;
}

interface EodResponse {
  success: boolean;
  report?: EodTechnicalSnapshot;
  aiAnalysis?: AiAnalysis | null;
  sources?: Array<{ title: string; url: string }>;
  aiError?: string;
  error?: string;
}

interface Props {
  customApiKey: string;
  onUpdateApiKey: (key: string) => void;
  language: SupportedLanguage;
}

const money = (value: number | null | undefined) => value == null
  ? '—'
  : `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const decimal = (value: number | null | undefined, digits = 2) => value == null
  ? '—'
  : value.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });

const percent = (value: number | null | undefined) => value == null
  ? '—'
  : `${value > 0 ? '+' : ''}${decimal(value)}%`;

const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 8) : [];

export const EODAnalysisView: React.FC<Props> = ({ customApiKey, onUpdateApiKey, language }) => {
  const [ticker, setTicker] = useState('RELIANCE');
  const [apiKey, setApiKey] = useState(customApiKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EodResponse | null>(null);

  const handleAnalyze = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setData(null);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Your Firebase session has expired. Sign in again to run EOD analysis.');
      return;
    }
    if (!apiKey.trim()) {
      setError('Enter your own Gemini API key to generate the model-assisted EOD explanation. The key is kept in memory for this browser session.');
      return;
    }

    setLoading(true);
    onUpdateApiKey(apiKey);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/market/eod-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticker: ticker.trim().toUpperCase(),
          userApiKey: apiKey.trim(),
          language,
        }),
      });
      const body = await response.json() as EodResponse;
      if (!response.ok || !body.success || !body.report) {
        throw new Error(body.error || `EOD analysis failed (HTTP ${response.status}).`);
      }
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate the EOD report. Check the source configuration and try again.');
    } finally {
      setLoading(false);
    }
  };

  const report = data?.report;
  const ai = data?.aiAnalysis;
  const sourceLinks = (data?.sources || []).filter((item) => item.url && /^https:\/\//i.test(item.url)).slice(0, 8);

  return (
    <div className="min-h-[70vh] bg-[#131211] px-3 py-5 text-[#F7EEDB] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-[#D96B43]/30 bg-gradient-to-br from-[#221A16] via-[#171513] to-[#131211] p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D96B43]/30 bg-[#D96B43]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F0A17F]">
                <Activity className="h-3.5 w-3.5" /> Daily close · EOD diagnostics
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-4xl">End-of-Day Market Diagnosis</h1>
              <p className="max-w-2xl text-sm leading-6 text-[#F7EEDB]/65">
                Calculate price returns and technical indicators from fetched daily candles, then ask your own Gemini key to explain the observed evidence. Missing inputs stay missing; this is not a buy/sell signal.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#8CB4E0]/25 bg-[#8CB4E0]/10 px-3 py-2 text-xs text-[#BFD6F2]">
              <ShieldCheck className="h-4 w-4" /> User-key AI · server-side market provider
            </div>
          </div>

          <form onSubmit={handleAnalyze} className="mt-7 grid gap-4 lg:grid-cols-[0.7fr_1.3fr_auto]">
            <label className="space-y-1.5 text-xs font-semibold text-[#F7EEDB]/80">
              NSE ticker
              <input
                value={ticker}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
                pattern="[A-Z0-9][A-Z0-9.&_-]{0,19}"
                maxLength={20}
                required
                placeholder="RELIANCE"
                className="w-full rounded-xl border border-[#D96B43]/30 bg-[#131211] px-3 py-3 font-mono text-sm text-[#F7EEDB] outline-none transition focus:border-[#D96B43]"
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-[#F7EEDB]/80">
              Your Gemini API key <span className="text-[#D96B43]">(required for AI narrative)</span>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-[#D96B43]" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => {
                    setApiKey(event.target.value);
                    onUpdateApiKey(event.target.value);
                  }}
                  autoComplete="off"
                  required
                  minLength={8}
                  maxLength={300}
                  placeholder="Paste your key from Google AI Studio"
                  className="w-full rounded-xl border border-[#D96B43]/30 bg-[#131211] py-3 pl-10 pr-3 font-mono text-sm text-[#F7EEDB] outline-none transition focus:border-[#D96B43]"
                />
              </div>
              <span className="block font-normal text-[#F7EEDB]/45">Not saved to localStorage or Firestore; cleared when you sign out.</span>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#D96B43] px-5 py-3 text-sm font-extrabold text-[#131211] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading source data…' : 'Run EOD analysis'}
              </button>
            </div>
          </form>

          {error && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/35 bg-red-950/25 p-3 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}
        </section>

        {loading && (
          <div className="rounded-2xl border border-[#D96B43]/20 bg-[#1A1816] p-6 text-sm text-[#F7EEDB]/65">
            Fetching daily candles, computing technical indicators, and requesting the model explanation. The latest session bar is excluded before 15:45 IST if it may still be forming.
          </div>
        )}

        {report && (
          <>
            <section className="rounded-2xl border border-[#D96B43]/20 bg-[#1A1816] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#F7EEDB]/60">
                    <Clock3 className="h-4 w-4" /> Completed daily bar
                  </div>
                  <h2 className="mt-1 text-2xl font-black">{report.ticker} <span className="text-sm font-medium text-[#F7EEDB]/55">{report.companyName}</span></h2>
                  <p className="mt-1 text-xs text-[#F7EEDB]/55">As of {report.asOfDate} · Retrieved {new Date(report.retrievedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-[10px] uppercase tracking-widest text-[#F7EEDB]/45">Technical bias (rule-based)</div>
                  <span className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-bold ${report.technicalBias === 'Bullish' ? 'border-green-500/30 bg-green-500/10 text-green-300' : report.technicalBias === 'Bearish' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                    {report.technicalBias}
                  </span>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {[
                  ['Close', money(report.latest.close)],
                  ['Open', money(report.latest.open)],
                  ['High', money(report.latest.high)],
                  ['Low', money(report.latest.low)],
                  ['Volume', report.latest.volume ? report.latest.volume.toLocaleString('en-IN') : '—'],
                  ['Daily change', percent(report.priceChanges.find((change) => change.period === '1D')?.percent)],
                  ['Candles', report.candleCount.toLocaleString('en-IN')],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[#F7EEDB]/8 bg-[#131211] p-3">
                    <div className="text-[10px] text-[#F7EEDB]/45">{label}</div>
                    <div className="mt-1 truncate text-sm font-bold tabular-nums">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-[#F7EEDB]/50">Returns from completed daily closes</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {report.priceChanges.map((change) => (
                    <div key={change.period} className="rounded-xl border border-[#F7EEDB]/8 bg-[#131211] p-3">
                      <div className="text-xs text-[#F7EEDB]/50">{change.period}</div>
                      <div className={`mt-1 text-lg font-black tabular-nums ${change.percent == null ? 'text-[#F7EEDB]/40' : change.percent >= 0 ? 'text-green-300' : 'text-red-300'}`}>{percent(change.percent)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 border-t border-[#D96B43]/15 pt-4 text-[11px] leading-5 text-[#F7EEDB]/50">
                Source: {report.source}. The source is not presented as an official NSE/BSE feed. {report.limitations.join(' ')}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black">Computed technical indicators</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ['SMA 20', money(report.indicators.sma20)],
                  ['SMA 50', money(report.indicators.sma50)],
                  ['SMA 200', money(report.indicators.sma200)],
                  ['RSI (14)', decimal(report.indicators.rsi14, 1)],
                  ['MACD line', decimal(report.indicators.macdLine)],
                  ['MACD signal', decimal(report.indicators.macdSignal)],
                  ['MACD histogram', decimal(report.indicators.macdHistogram)],
                  ['Volume / 20D avg', report.indicators.volumeRatio20 == null ? '—' : `${decimal(report.indicators.volumeRatio20)}×`],
                  ['Bollinger upper', money(report.indicators.bollingerUpper)],
                  ['Bollinger middle', money(report.indicators.bollingerMiddle)],
                  ['Bollinger lower', money(report.indicators.bollingerLower)],
                  ['20D average volume', report.indicators.averageVolume20 == null ? '—' : report.indicators.averageVolume20.toLocaleString('en-IN')],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[#D96B43]/15 bg-[#1A1816] p-4">
                    <div className="text-xs text-[#F7EEDB]/50">{label}</div>
                    <div className="mt-2 text-lg font-extrabold tabular-nums">{value}</div>
                    <div className="mt-1 text-[10px] text-[#F7EEDB]/35">Calculated from source candles</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#D96B43]/20 bg-[#1A1816] p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-black"><Activity className="h-5 w-5 text-[#D96B43]" /> Rule-based evidence</h2>
                <div className="mt-4 space-y-3">
                  {report.signals.map((signal) => (
                    <div key={signal} className="flex items-start gap-2 text-sm leading-6 text-[#F7EEDB]/75">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#8CB4E0]" /> {signal}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#8CB4E0]/25 bg-[#171A1D] p-5 sm:p-6">
                <div className="flex items-center gap-2 text-lg font-black">
                  {ai?.bias === 'Bearish' ? <TrendingDown className="h-5 w-5 text-red-300" /> : <TrendingUp className="h-5 w-5 text-[#8CB4E0]" />}
                  Gemini explanation
                </div>
                {ai ? (
                  <div className="mt-4 space-y-4">
                    {ai.bias && <div className="text-xs font-bold uppercase tracking-widest text-[#BFD6F2]">Model interpretation: {ai.bias}</div>}
                    {ai.summary && <p className="text-sm leading-6 text-[#F7EEDB]/80">{ai.summary}</p>}
                    {ai.newsContext && <p className="rounded-lg border border-[#8CB4E0]/15 bg-[#131A20] p-3 text-xs leading-5 text-[#F7EEDB]/70">{ai.newsContext}</p>}
                    {[
                      ['Bullish evidence to monitor', ai.bullishFactors],
                      ['Bearish evidence / risks', ai.bearishFactors],
                      ['Next-session watch items', ai.watchItems],
                    ].map(([title, entries]) => {
                      const items = list(entries);
                      return items.length ? (
                        <div key={String(title)}>
                          <div className="mb-2 text-xs font-bold text-[#F7EEDB]/65">{title}</div>
                          <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-[#F7EEDB]/70">
                            {items.map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                      ) : null;
                    })}
                    <p className="border-t border-[#8CB4E0]/15 pt-3 text-[11px] leading-5 text-[#F7EEDB]/45">{ai.disclaimer || 'This model output is explanatory only and is not a trading recommendation.'}</p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-[#F7EEDB]/60">{data.aiError || 'No model explanation was returned. Review your Gemini key and try again.'}</p>
                )}
              </div>
            </section>

            {sourceLinks.length > 0 && (
              <section className="rounded-2xl border border-[#D96B43]/15 bg-[#1A1816] p-5">
                <h2 className="text-base font-black">Grounded web sources</h2>
                <p className="mt-1 text-xs text-[#F7EEDB]/50">Only sources returned by the model's search-grounding metadata are listed here.</p>
                <div className="mt-3 space-y-2">
                  {sourceLinks.map((source) => (
                    <a key={source.url} href={source.url} target="_blank" rel="noreferrer noopener" className="block break-words text-xs text-[#8CB4E0] hover:underline">{source.title || source.url}</a>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};
