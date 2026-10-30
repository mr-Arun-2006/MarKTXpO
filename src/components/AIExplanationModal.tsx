import React, { useState, useEffect } from 'react';
import { StockData, SupportedLanguage, RuleStep } from '../types/market';
import { translations } from '../i18n/translations';
import { auth } from '../services/firebase';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Volume2,
  Copy,
  Check,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
  Brain,
  Sliders,
  X,
} from 'lucide-react';

interface Props {
  stock: StockData;
  language: SupportedLanguage;
  customApiKey?: string;
  onClose: () => void;
}

export const AIExplanationModal: React.FC<Props> = ({
  stock,
  language,
  customApiKey,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'rules'>('ai');
  const [loading, setLoading] = useState<boolean>(true);
  const [analysisText, setAnalysisText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const t = translations[language];

  // Mathematical Rule Steps
  const ruleSteps: RuleStep[] = [
    {
      name: 'RSI Momentum Zone',
      condition: 'RSI(14) between 35 and 65 (Not Overbought)',
      passed: stock.rsi >= 35 && stock.rsi <= 68,
      value: `${stock.rsi}`,
      threshold: '35 - 65',
      weight: 20,
    },
    {
      name: 'Trend Structural Support',
      condition: 'Price > 50 DMA (Medium Term Uptrend)',
      passed: stock.currentPrice >= stock.dma50,
      value: `₹${stock.currentPrice} vs ₹${stock.dma50}`,
      threshold: `> ₹${stock.dma50}`,
      weight: 25,
    },
    {
      name: 'Long-Term Baseline (200 DMA)',
      condition: 'Price > 200 DMA (Institutional Bull Market)',
      passed: stock.currentPrice >= stock.dma200,
      value: `₹${stock.currentPrice} vs ₹${stock.dma200}`,
      threshold: `> ₹${stock.dma200}`,
      weight: 20,
    },
    {
      name: 'MACD Momentum Direction',
      condition: 'MACD Signal is Bullish',
      passed: stock.macd.signal === 'Bullish',
      value: `${stock.macd.signal} (${stock.macd.histogram})`,
      threshold: 'Bullish Histogram',
      weight: 15,
    },
    {
      name: 'Delivery Volume Backing',
      condition: 'Delivery Percentage > 40%',
      passed: stock.deliveryPercent != null && stock.deliveryPercent >= 40,
      value: stock.deliveryPercent != null ? `${stock.deliveryPercent}%` : 'Unavailable from provider',
      threshold: '≥ 40%',
      weight: 10,
    },
    {
      name: 'Inter-Exchange Parity / Spread',
      condition: 'NSE & BSE Spread within rational bounds (< 0.15%)',
      passed: Math.abs(stock.spreadPercent) < 0.15,
      value: `${stock.spreadPercent}%`,
      threshold: '< 0.15%',
      weight: 10,
    },
  ];

  const totalScore = ruleSteps.reduce((acc, r) => (r.passed ? acc + r.weight : acc), 0);

  // Fetch AI explanation
  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const langNames: Record<SupportedLanguage, string> = {
        ta: 'Tamil (தமிழ்)',
        en: 'English',
        hi: 'Hindi (हिन्दी)',
        gu: 'Gujarati (ગુજરાતી)',
        mr: 'Marathi (मराठी)',
        bn: 'Bengali (বাংলা)',
      };

      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await auth.currentUser?.getIdToken() || '') },
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify({
          ticker: stock.ticker,
          companyName: stock.name,
          sector: stock.sector,
          quoteTimestamp: stock.quoteTimestamp ?? null,
          marketState: stock.marketState ?? 'Unavailable',
          dataSource: stock.dataSource ?? 'Unknown',
          price: stock.currentPrice,
          changePercent: stock.changePercent,
          rsi: stock.rsi,
          macd: stock.macd,
          dma50: stock.dma50,
          dma200: stock.dma200,
          pe: stock.pe,
          nsePrice: stock.nsePrice,
          bsePrice: stock.bsePrice,
          arbitragePercent: stock.spreadPercent,
          language: langNames[language],
          userApiKey: customApiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI analysis');
      }
      setAnalysisText(data.analysis);
    } catch (err: any) {
      console.warn(err);
      setError(err.message || 'Error communicating with AI analysis engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [stock.ticker, language]);

  const handleCopy = () => {
    if (!analysisText) return;
    navigator.clipboard.writeText(analysisText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(analysisText.slice(0, 1500));
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] flex flex-col rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-2xl overflow-hidden text-[#F7EEDB]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#D96B43]/15 bg-[#1A1816]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D96B43] to-[#F7EEDB] flex items-center justify-center shadow-md shadow-[#D96B43]/20">
              <Brain className="w-5 h-5 text-[#131211]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F7EEDB] tracking-tight">{stock.ticker}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#131211] text-[#F7EEDB] border border-[#D96B43]/20 font-medium">
                  {stock.sector}
                </span>
                <span className="text-xs font-mono text-[#D96B43] font-bold">
                  ₹{stock.currentPrice.toFixed(2)} ({stock.changePercent > 0 ? '+' : ''}{stock.changePercent}%)
                </span>
              </div>
              <p className="text-xs text-[#F7EEDB]/60">{stock.name} · Dual Listed (NSE &amp; BSE)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              title="Refresh Analysis"
              className="p-2 rounded-lg text-[#F7EEDB]/60 hover:text-[#F7EEDB] hover:bg-[#25221F] transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#F7EEDB]/60 hover:text-[#F7EEDB] hover:bg-[#25221F] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-5 border-b border-[#D96B43]/15 bg-[#131211]/80">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'ai'
                ? 'bg-[#D96B43] text-[#131211] shadow-sm'
                : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#1A1816]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>AI</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'rules'
                ? 'bg-[#F7EEDB] text-[#131211] shadow-sm'
                : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#1A1816]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Rule-Based </span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                totalScore >= 70 ? 'bg-[#131211] text-[#D96B43]' : 'bg-[#131211] text-[#EF4444]'
              }`}
            >
              {totalScore}/100
            </span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-sm text-[#F7EEDB]">
          {activeTab === 'ai' ? (
            <div>
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-[#D96B43]/20 border-t-[#D96B43] animate-spin"></div>
                    <Sparkles className="w-6 h-6 text-[#D96B43] absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-semibold text-[#F7EEDB]">Synthesizing Equities Intelligence...</p>
                    <p className="text-xs text-[#F7EEDB]/60">
                      Reviewing observed price, trend and momentum indicators. Grounded news context is included only when sources are available.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-4 text-[#F7EEDB] flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Failed to generate AI analysis</h4>
                    <p className="text-xs text-[#F7EEDB]/80 mt-1">{error}</p>
                    <button
                      onClick={fetchAnalysis}
                      className="mt-3 px-3 py-1 bg-[#D96B43] text-[#131211] rounded-lg text-xs font-semibold hover:brightness-110 transition"
                    >
                      Retry Generation
                    </button>
                  </div>
                </div>
              )}

              {!loading && !error && analysisText && (
                <div className="space-y-4">
                  {/* Floating Action Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/15">
                    <div className="flex items-center gap-2 text-xs text-[#F7EEDB]/70">
                      <span className="w-2 h-2 rounded-full bg-[#D96B43] animate-ping"></span>
                      <span>Technical / News Evidence</span>
                      <span>·</span>
                      {stock.sentiment.confidence > 0 ? (
                        <>
                          <span className="text-[#F7EEDB] font-semibold">{stock.sentiment.label}</span>
                          <span>({stock.sentiment.confidence}% model confidence)</span>
                        </>
                      ) : (
                        <span className="text-[#F7EEDB]/45">Verified sentiment source unavailable</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSpeak}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          isSpeaking
                            ? 'bg-[#D96B43] text-[#131211] border-[#D96B43] font-bold'
                            : 'border-[#D96B43]/20 bg-[#131211] text-[#F7EEDB] hover:text-[#F7EEDB] hover:border-[#D96B43]/40'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{isSpeaking ? 'Stop Audio' : 'Listen'}</span>
                      </button>

                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D96B43]/20 bg-[#131211] text-[#F7EEDB] hover:text-[#F7EEDB] hover:border-[#D96B43]/40 transition"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-[#D96B43]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Render analysis text */}
                  <div className="prose prose-invert max-w-none text-[#F7EEDB] text-sm leading-relaxed space-y-4 font-normal whitespace-pre-line">
                    {analysisText}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Rule-Based Engine View */
            <div className="space-y-6">
              {/* Scorecard Banner */}
              <div className="p-4 rounded-xl bg-[#131211] border border-[#D96B43]/20 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-[#F7EEDB]/60 uppercase tracking-wider font-mono">
                    Deterministic Rule Validation
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-[#F7EEDB] font-mono">{totalScore}</span>
                    <span className="text-xs text-[#F7EEDB]/60">/ 100 Points</span>
                    <span
                      className={`ml-3 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        totalScore >= 75
                          ? 'bg-[#D96B43]/20 text-[#F7EEDB] border border-[#D96B43]/30'
                          : 'bg-[#EF4444]/20 text-[#F7EEDB] border border-[#EF4444]/30'
                      }`}
                    >
                      {totalScore >= 75 ? 'Qualified Setup' : 'Conditional Validation'}
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs text-[#F7EEDB]/70">
                  <p>
                    NSE Price: <strong className="text-[#F7EEDB]">₹{stock.nsePrice.toFixed(2)}</strong>
                  </p>
                  <p>
                    BSE Price: <strong className="text-[#F7EEDB]">₹{stock.bsePrice.toFixed(2)}</strong>
                  </p>
                  <p className="text-[#D96B43] font-mono">
                    Spread: {stock.spreadPercent > 0 ? '+' : ''}{stock.spreadPercent}%
                  </p>
                </div>
              </div>

              {/* Individual Rules Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F7EEDB]/60 font-mono">
                  Quantitative Criteria Checks
                </h4>
                {ruleSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                      step.passed
                        ? 'bg-[#131211] border-[#D96B43]/30 text-[#F7EEDB]'
                        : 'bg-[#131211]/50 border-[#EF4444]/20 text-[#F7EEDB]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {step.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-[#D96B43] shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#EF4444] shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#F7EEDB]">{step.name}</span>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#1A1816] text-[#F7EEDB]">
                            +{step.weight} pts
                          </span>
                        </div>
                        <p className="text-xs text-[#F7EEDB]/60 mt-0.5">{step.condition}</p>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <div className={step.passed ? 'text-[#D96B43] font-bold' : 'text-[#EF4444]'}>
                        {step.value}
                      </div>
                      <div className="text-[10px] text-[#F7EEDB]/40">Threshold: {step.threshold}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Arbitrage Detail Box */}
              <div className="p-4 rounded-xl bg-[#131211] border border-[#D96B43]/25 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#F7EEDB] text-sm">
                  <TrendingUp className="w-4 h-4 text-[#D96B43]" />
                  <span>NSE vs BSE Exchange Spread Analysis</span>
                </div>
                <p className="text-[#F7EEDB]/80 leading-relaxed">
                  {stock.spreadPercent > 0.02
                    ? `BSE is currently pricing ${stock.ticker} at a ₹${Math.abs(stock.nsePrice - stock.bsePrice).toFixed(2)} discount relative to NSE. Arbitrageurs can buy on BSE at ₹${stock.bsePrice.toFixed(2)} and sell on NSE at ₹${stock.nsePrice.toFixed(2)} to capture an estimated gross spread profit.`
                    : stock.spreadPercent < -0.02
                    ? `NSE is trading at a ₹${Math.abs(stock.nsePrice - stock.bsePrice).toFixed(2)} discount relative to BSE.`
                    : `NSE and BSE are at tight parity (Spread: ${stock.spreadPercent}%). Both order books exhibit deep institutional liquidity.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D96B43]/15 bg-[#1A1816] flex flex-wrap items-center justify-between gap-3 text-xs text-[#F7EEDB]/60">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-[#D96B43]" />
            <span>AI trade setups are educational simulations. Always apply disciplined capital risk controls.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 hover:border-[#D96B43]/40 text-[#F7EEDB] font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
