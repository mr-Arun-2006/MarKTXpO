import React from 'react';
import { StockData, SupportedLanguage } from '../types/market';
import { translations } from '../i18n/translations';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { StockSparkline } from '../components/StockSparkline';
import {
  TrendingUp,
  Brain,
  Activity,
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
} from 'lucide-react';

interface Props {
  onLaunchDashboard: () => void;
  onLaunchEod?: () => void;
  onExploreStock: (stock: StockData) => void;
  onPlayGame?: () => void;
  onRegister?: () => void;
  onSignIn?: () => void;
  isAuthenticated?: boolean;
  featuredStocks: StockData[];
  language: SupportedLanguage;
}

export const LandingPage: React.FC<Props> = ({
  onLaunchDashboard,
  onLaunchEod,
  onExploreStock,
  onPlayGame,
  onRegister,
  onSignIn,
  isAuthenticated = false,
  featuredStocks,
  language,
}) => {
  const t = translations[language];

  return (
    <div className="min-h-screen text-[#F7EEDB] flex flex-col bg-[#131211]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 sm:pt-14 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#D96B43]/20 bg-gradient-to-b from-[#131211] via-[#1A1816] to-[#131211]">
        {/* Canyon & Morning Sky ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] h-[250px] sm:h-[350px] bg-gradient-to-tr from-[#D96B43]/15 via-[#8CB4E0]/15 to-transparent blur-[120px] pointer-events-none"></div>

        <div className="relative max-w-5xl mx-auto text-center space-y-5 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1A1816] border border-[#D96B43]/35 text-[#F7EEDB] text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#D96B43]" />
            <span>Dual NSE &amp; BSE EOD Quantitative Terminal</span>
          </div>

          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#F7EEDB] leading-tight text-balance">
            Institutional Precision for <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#D96B43] via-[#F7EEDB] to-[#8CB4E0] bg-clip-text text-transparent">
              Indian Equity Markets
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-base text-[#F7EEDB]/70 leading-relaxed">
            Explore Indian equities with deterministic technical indicators, Gemini-assisted explanations, third-party NSE/BSE quote comparisons, and strategy backtesting. Market data may be delayed; this app is not a direct exchange feed.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-3">
            <button
              onClick={isAuthenticated ? onLaunchDashboard : (onRegister || onLaunchDashboard)}
              className="flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] text-[#FFFDF8] font-bold text-sm shadow-lg shadow-[#D96B43]/25 hover:brightness-110 active:scale-95 transition whitespace-nowrap"
            >
              <span>{isAuthenticated ? 'Open market terminal' : 'Create free account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {isAuthenticated && onLaunchEod && (
              <button
                onClick={onLaunchEod}
                className="flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl border border-[#8CB4E0]/35 bg-[#8CB4E0]/10 hover:bg-[#8CB4E0]/20 text-[#BFD6F2] text-sm font-semibold transition whitespace-nowrap"
              >
                <Activity className="w-4 h-4" />
                <span>Run End-of-Day Analysis</span>
              </button>
            )}

            {isAuthenticated && onPlayGame && (
              <button
                onClick={onPlayGame}
                className="flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl border border-[#22C55E]/40 bg-[#1A1816] hover:bg-[#22C55E]/15 text-[#22C55E] text-sm font-semibold transition whitespace-nowrap"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Student Trading Game</span>
              </button>
            )}

            {!isAuthenticated && onSignIn && (
              <button
                onClick={onSignIn}
                className="flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl border border-white/15 bg-[#1A1816] hover:bg-[#25221F] text-[#F7EEDB] text-sm font-semibold transition whitespace-nowrap"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Already have an account? Sign in</span>
              </button>
            )}

            {isAuthenticated && (
              <button
                onClick={() => { if (featuredStocks[0]) onExploreStock(featuredStocks[0]); }}
                disabled={featuredStocks.length === 0}
                className="flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl border border-[#D96B43]/30 bg-[#1A1816] hover:bg-[#25221F] text-[#F7EEDB] text-sm font-semibold transition whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Brain className="w-4 h-4 text-[#8CB4E0]" />
                <span>Explore AI analysis</span>
              </button>
            )}

            {isAuthenticated && (
              <div className="flex justify-center">
                <PWAInstallButton />
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-[#F7EEDB]/60 font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#22C55E]" />
              <span>NSE/BSE Quote Comparison</span>
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
                    <strong className="text-[#F7EEDB]">NSE/BSE Price Comparison:</strong> Compares available third-party quote metadata. It does not scan live exchange order books or guarantee executable arbitrage.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#F7EEDB]">Transparent Quantitative Auditing:</strong> Technical evidence is calculated from fetched daily candles (RSI, moving averages, MACD and volume where available). AI commentary is separate and can be unavailable when a user's key or search sources are missing.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#F7EEDB]">Source-Grounded AI Explanations:</strong> Uses your Gemini API key for evidence-based explanations and grounded news when sources are returned. FII/DII flows and social sentiment are not connected unless a verified data provider is configured.
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
              <p className="text-xs text-[#F7EEDB]/60">Select a fetched market quote to view charts and AI explanations. Unavailable prices are not replaced with sample quotes.</p>
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
            <span>Historical data from a third-party price provider</span>
            <span>·</span>
            <span className="text-[#8CB4E0]">Gemini 3.8 Flash Powered</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
