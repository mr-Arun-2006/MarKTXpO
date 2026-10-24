import React from 'react';
import { StockData, SupportedLanguage } from '../types/market';
import { translations } from '../i18n/translations';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { StockSparkline } from '../components/StockSparkline';
import {
  TrendingUp,
  Brain,
  ShieldCheck,
  ArrowRight,
  GitCompare,
  BarChart3,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle,
  XCircle,
  ChevronRight,
  Gamepad2,
  UserPlus,
} from 'lucide-react';

interface Props {
  onLaunchDashboard: () => void;
  onExploreStock: (stock: StockData) => void;
  onPlayGame?: () => void;
  onRegister?: () => void;
  featuredStocks: StockData[];
  language: SupportedLanguage;
}

export const LandingPage: React.FC<Props> = ({
  onLaunchDashboard,
  onExploreStock,
  onPlayGame,
  onRegister,
  featuredStocks,
  language,
}) => {
  const t = translations[language];

  return (
    <div className="min-h-screen text-[#F7EEDB] flex flex-col bg-[#131211]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-14 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#D96B43]/20 bg-gradient-to-b from-[#131211] via-[#1A1816] to-[#131211]">
        {/* Canyon & Morning Sky ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#D96B43]/15 via-[#8CB4E0]/15 to-transparent blur-[140px] pointer-events-none"></div>

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1A1816] border border-[#D96B43]/35 text-[#F7EEDB] text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#D96B43]" />
            <span>Dual NSE &amp; BSE EOD Quantitative Terminal</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#F7EEDB] leading-tight">
            Institutional Precision for <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#D96B43] via-[#F7EEDB] to-[#8CB4E0] bg-clip-text text-transparent">
              Indian Equity Markets
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#F7EEDB]/70 leading-relaxed">
            Eliminate speculation in Dalal Street. Combine deterministic quantitative rules with Gemini 3.8 Flash qualitative synthesis, real-time cross-exchange arbitrage detection, and backtesting simulations.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={onLaunchDashboard}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] text-[#FFFDF8] font-bold text-sm shadow-lg shadow-[#D96B43]/25 hover:brightness-110 active:scale-95 transition"
            >
              <span>Launch Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onPlayGame && (
              <button
                onClick={onPlayGame}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#22C55E]/40 bg-[#1A1816] hover:bg-[#22C55E]/15 text-[#22C55E] text-sm font-semibold transition"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Student Trading Game</span>
              </button>
            )}

            {onRegister && (
              <button
                onClick={onRegister}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#D96B43]/40 bg-[#1A1816] hover:bg-[#D96B43]/20 text-[#D96B43] text-sm font-semibold transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Free Account</span>
              </button>
            )}

            <button
              onClick={() => onExploreStock(featuredStocks[0])}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#D96B43]/30 bg-[#1A1816] hover:bg-[#25221F] text-[#F7EEDB] text-sm font-semibold transition"
            >
              <Brain className="w-4 h-4 text-[#8CB4E0]" />
              <span>Explore AI Trade Thesis</span>
            </button>

            <PWAInstallButton />
          </div>

          {/* Trust badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-[#F7EEDB]/60 font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#22C55E]" />
              <span>Dual NSE &amp; BSE Real-time Parity</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#8CB4E0]" />
              <span>Rule-Based + AI Hybrid Engine</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#D96B43]" />
              <span>100% Offline-Capable MxpO PWA</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase: Traditional Models vs MarKtXPO Advantage */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-[#D96B43]/20 bg-[#131211]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-[#D96B43] uppercase tracking-widest font-mono">
              The Architecture Advantage
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#F7EEDB]">
              Traditional Market Tools vs. MarKtXPO
            </h2>
            <p className="text-sm text-[#F7EEDB]/60 max-w-xl mx-auto">
              Why professional investors and swing traders rely on our explainable multi-exchange architecture.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional Left Column */}
            <div className="rounded-2xl border border-[#EF4444]/25 bg-[#1A1816]/60 p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/25 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-[#EF4444]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F7EEDB]">Legacy Trading Tools</h3>
                  <p className="text-xs text-[#F7EEDB]/50">Black-box indicators &amp; fragmented data</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-[#F7EEDB]/80">
                <div className="flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#F7EEDB]">Single Exchange Siloed:</strong> Monitors only NSE or BSE in isolation, completely missing cross-exchange arbitrage spreads and delivery deltas.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#F7EEDB]">Unexplained Black-Box Signals:</strong> Flashes vague recommendations without demonstrating the underlying mathematical rule checklist.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#F7EEDB]">Blind to Macro Catalysts:</strong> Unaware of crude oil fluctuations, USD/INR swings, RBI policy shifts, and FII institutional cash flows.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#F7EEDB]">No Quantitative Backtesting:</strong> Traders risk capital without historical simulation curves, win-rate metrics, or max drawdown audits.
                  </div>
                </div>
              </div>
            </div>

            {/* Our Model Right Column */}
            <div className="rounded-2xl border border-[#D96B43]/35 bg-[#1A1816] p-6 sm:p-8 space-y-6 shadow-xl shadow-[#D96B43]/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D96B43]/15 border border-[#D96B43]/35 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#D96B43]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#F7EEDB]">MarKtXPO Terminal</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8CB4E0]/20 text-[#8CB4E0] font-bold">
                      PRO ADVANTAGE
                    </span>
                  </div>
                  <p className="text-xs text-[#8CB4E0]/80">Deterministic Rules + Multimodal AI</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-[#F7EEDB]/85">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#F7EEDB]">Dual NSE &amp; BSE Arbitrage Engine:</strong> Scans order books across both national exchanges simultaneously to capture inter-exchange spreads.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#F7EEDB]">Transparent Quantitative Auditing:</strong> Every trade setup is evaluated against deterministic indicators (RSI, 50/200 DMA, MACD, Volume) before AI commentary.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#F7EEDB]">Custom Sentiment Models:</strong> Analyzes earnings commentary, media sentiment, and institutional flows to rank trade opportunities by confidence (90%+).
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#F7EEDB]">Multi-Year Simulation Engine:</strong> Test custom strategies over 1 to 5 years of historical candles to evaluate CAGR, Drawdown, and Equity Curves.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Market Leaders Carousel with Green/Red Sparklines */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-[#D96B43]/20 bg-[#171513]">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F7EEDB]">Market Snapshot &amp; Sparklines</h2>
              <p className="text-xs text-[#F7EEDB]/60">Select any security to view dual-exchange charts and AI explanations</p>
            </div>
            <button
              onClick={onLaunchDashboard}
              className="text-xs font-bold text-[#D96B43] hover:text-[#FFFDF8] flex items-center gap-1 transition"
            >
              <span>View Terminal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredStocks.slice(0, 4).map((stock) => {
              const isPos = stock.change >= 0;
              return (
                <div
                  key={stock.ticker}
                  onClick={() => onExploreStock(stock)}
                  className="cursor-pointer p-4 rounded-xl bg-[#1A1816] border border-[#D96B43]/20 hover:border-[#D96B43]/50 transition space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#F7EEDB] text-base group-hover:text-[#FFFDF8] transition">
                      {stock.ticker}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        isPos ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                      }`}
                    >
                      {isPos ? '+' : ''}{stock.changePercent}%
                    </span>
                  </div>

                  <div className="text-xs text-[#F7EEDB]/65 truncate">{stock.name}</div>

                  {/* Sparkline Indicator in Green or Red */}
                  <div className="py-1">
                    <StockSparkline data={stock.history} height={30} isPositive={isPos} />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-[#D96B43]/15">
                    <span className="text-[#8CB4E0]">NSE: ₹{stock.nsePrice.toFixed(2)}</span>
                    <span className="text-[#F7EEDB]">BSE: ₹{stock.bsePrice.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 px-4 sm:px-6 lg:px-8 bg-[#131211] border-t border-[#D96B43]/20 text-xs text-[#F7EEDB]/50">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#D96B43]" />
            <span className="font-bold text-[#F7EEDB]">MarKtXPO (MxpO)</span>
            <span>·</span>
            <span>Indian Equities Progressive Web App</span>
          </div>

          <div className="flex items-center gap-4 font-mono">
            <span>Verified with NSE &amp; BSE EOD Bhavcopy</span>
            <span>·</span>
            <span className="text-[#8CB4E0]">Gemini 3.8 Flash Powered</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
