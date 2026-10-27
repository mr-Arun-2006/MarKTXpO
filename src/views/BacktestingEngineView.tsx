import React, { useState, useMemo, useEffect } from 'react';
import { CustomStrategy, BacktestResult, BacktestTrade, StockData, SupportedLanguage } from '../types/market';
import { translations } from '../i18n/translations';
import { auth } from '../services/firebase';
import { runHistoricalBacktest, type HistoricalBacktestOutcome } from '../utils/historicalBacktest';
import {
  Cpu,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface Props {
  strategy?: CustomStrategy;
  stocks: StockData[];
  customApiKey?: string;
  language: SupportedLanguage;
}

export const BacktestingEngineView: React.FC<Props> = ({
  strategy,
  stocks,
  customApiKey,
  language,
}) => {
  const [durationYears, setDurationYears] = useState<number>(3);
  const [initialCapital, setInitialCapital] = useState<number>(500000);
  const [selectedTicker, setSelectedTicker] = useState<string>(stocks[0]?.ticker || 'RELIANCE');
  const [backtestOutcome, setBacktestOutcome] = useState<HistoricalBacktestOutcome | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [aiAuditing, setAiAuditing] = useState<boolean>(false);
  const [aiAuditText, setAiAuditText] = useState<string>('');

  const t = translations[language];

  // A deterministic educational rule set; results are only shown after fetching actual daily candles.
  const activeStrategy: CustomStrategy = useMemo(() => strategy || ({
    id: 'strat-default',
    name: 'Historical RSI Mean Reversion',
    description: 'Buy when RSI(14) falls below 35; exits are controlled by configured stop/target levels.',
    rules: [
      { id: '1', indicator: 'RSI', operator: '<', value: 35, action: 'BUY' },
    ],
    stopLossPercent: 3,
    targetProfitPercent: 6,
    trailingStopLoss: true,
    active: true,
  }), [strategy]);

  useEffect(() => {
    if (stocks.length && !stocks.some((stock) => stock.ticker === selectedTicker)) {
      setSelectedTicker(stocks[0].ticker);
    }
  }, [stocks, selectedTicker]);

  useEffect(() => {
    let active = true;
    const loadHistoricalCandles = async () => {
      if (!selectedTicker) {
        setHistoryError('Choose a security with a fetched quote before running a backtest.');
        setBacktestOutcome(null);
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);
      setHistoryError(null);
      setBacktestOutcome(null);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Sign in again before running a backtest.');
        const token = await currentUser.getIdToken();
        const range = durationYears === 1 ? '1y' : '5y';
        const params = new URLSearchParams({
          ticker: selectedTicker,
          range,
          interval: '1d',
        });
        const response = await fetch('/api/market/history?' + params.toString(), {
          headers: { Authorization: 'Bearer ' + token },
          cache: 'no-store',
        });
        const payload = await response.json();
        if (!response.ok || payload?.success !== true || !Array.isArray(payload?.candles)) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : 'The historical market-data provider did not return usable candles.');
        }
        const outcome = runHistoricalBacktest(
          selectedTicker,
          payload.candles,
          activeStrategy,
          durationYears,
          initialCapital,
          typeof payload.dataSource === 'string' ? payload.dataSource : 'Unverified market-data source',
        );
        if (active) setBacktestOutcome(outcome);
      } catch (error) {
        if (active) {
          setHistoryError(error instanceof Error ? error.message : 'Unable to load historical candles. No synthetic results were generated.');
        }
      } finally {
        if (active) setIsLoadingHistory(false);
      }
    };

    void loadHistoricalCandles();
    return () => { active = false; };
  }, [selectedTicker, durationYears, initialCapital, activeStrategy, retryCount]);

  const result = backtestOutcome?.result;

  // AI Strategy Audit
  const handleRunAiAudit = async () => {
    if (!result || !backtestOutcome) return;
    setAiAuditing(true);
    setAiAuditText('');
    try {
      const res = await fetch('/api/ai/strategy-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + (await auth.currentUser?.getIdToken() || ''),
        },
        body: JSON.stringify({
          strategyName: activeStrategy.name,
          rules: activeStrategy.rules,
          backtestMetrics: {
            totalReturn: result.totalReturn,
            benchmarkReturn: result.benchmarkReturn,
            maxDrawdown: result.maxDrawdown,
            winRate: result.winRate,
            profitFactor: result.profitFactor,
            totalTrades: result.totalTrades,
            sharpeRatio: result.sharpeRatio,
          },
          userApiKey: customApiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiAuditText(data.audit);
    } catch (err: any) {
      console.warn(err);
      setAiAuditText('AI audit unavailable: the model request failed. No verified strategy audit was produced.');
    } finally {
      setAiAuditing(false);
    }
  };

  if (!backtestOutcome || !result) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-4 px-5 py-12 text-center text-[#F7EEDB]">
        <div className="rounded-2xl border border-[#D96B43]/25 bg-[#1A1816] p-6">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#D96B43]">Historical backtest</div>
          <h1 className="mt-3 text-2xl font-black">{isLoadingHistory ? 'Fetching daily candles…' : 'No verified backtest result'}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#F7EEDB]/60">
            {isLoadingHistory ? 'Loading historical bars from the configured source and calculating indicators. The engine does not generate random prices or simulated performance.' : (historyError || 'The data source did not provide enough valid daily history.')}
          </p>
          {!isLoadingHistory && (
            <button onClick={() => setRetryCount((value) => value + 1)} className="mt-5 rounded-xl bg-[#D96B43] px-5 py-3 text-sm font-bold text-[#131211]">
              Retry historical data
            </button>
          )}
        </div>
      </div>
    );
  }

  const chartWidth = 720;
  const chartHeight = 220;
  const maxEq = Math.max(...result.equityCurve.map((e) => Math.max(e.equity, e.benchmark))) * 1.05;
  const minEq = Math.min(result.initialCapital * 0.9, ...result.equityCurve.map((e) => Math.min(e.equity, e.benchmark)));

  const getEqY = (val: number) => {
    return chartHeight - ((val - minEq) / (maxEq - minEq)) * (chartHeight - 30) - 15;
  };

  const equityPath = result.equityCurve
    .map((point, idx) => {
      const x = 30 + (idx / (result.equityCurve.length - 1)) * (chartWidth - 60);
      const y = getEqY(point.equity);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const benchmarkPath = result.equityCurve
    .map((point, idx) => {
      const x = 30 + (idx / (result.equityCurve.length - 1)) * (chartWidth - 60);
      const y = getEqY(point.benchmark);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-[#F7EEDB]">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D96B43]/15">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#D96B43]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#F7EEDB] tracking-tight">
              Historical Backtesting &amp; Simulation Engine
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D96B43]/10 text-[#F7EEDB] border border-[#D96B43]/20 font-bold font-mono">
              MONTE CARLO READY
            </span>
          </div>
          <p className="text-xs text-[#F7EEDB]/60 mt-1">
            Deterministic strategy evaluation on fetched daily candles. Signals are evaluated after close and trade fills occur no earlier than the next session.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stock Selector for Backtesting */}
          <div className="flex items-center gap-2 rounded-xl bg-[#1A1816] border border-[#D96B43]/25 px-3 py-1.5 text-xs">
            <span className="text-[#F7EEDB]/60 font-medium">Underlying Security:</span>
            <select
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#F7EEDB] focus:outline-none cursor-pointer"
            >
              {stocks.map((s) => (
                <option key={s.ticker} value={s.ticker} className="bg-[#131211] text-[#F7EEDB]">
                  {s.ticker} · BSE: {s.bseCode} ({s.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center rounded-xl bg-[#1A1816] border border-[#D96B43]/20 p-0.5 text-xs">
            {[1, 3, 5].map((yr) => (
              <button
                key={yr}
                onClick={() => setDurationYears(yr)}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  durationYears === yr
                    ? 'bg-[#D96B43] text-[#131211] shadow-sm'
                    : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB]'
                }`}
              >
                {yr} Year{yr > 1 ? 's' : ''}
              </button>
            ))}
          </div>

          <button
            onClick={handleRunAiAudit}
            disabled={aiAuditing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs shadow-md shadow-[#D96B43]/20 transition disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${aiAuditing ? 'animate-spin' : ''}`} />
            <span>{aiAuditing ? 'Auditing...' : 'AI Strategy Audit'}</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#8CB4E0]/20 bg-[#171A1D] px-4 py-3 text-xs leading-5 text-[#F7EEDB]/70">
        <div><span className="font-bold text-[#BFD6F2]">Source:</span> {backtestOutcome.source}</div>
        <div>Sample window: {backtestOutcome.startDate} to {backtestOutcome.endDate} · {backtestOutcome.candleCount} daily candles · Benchmark: {selectedTicker} buy-and-hold.</div>
        {backtestOutcome.unsupportedRules.length > 0 && (
          <div className="mt-2 text-amber-200">Unavailable rule inputs (not simulated): {backtestOutcome.unsupportedRules.join(', ')}. Connect a provider for those historical series before using rules that depend on them.</div>
        )}
        <div className="mt-1 text-[#F7EEDB]/45">Third-party historical data is not an official exchange feed. Backtests are sensitive to source quality, slippage assumptions, corporate actions and out-of-sample performance.</div>
      </div>

      {/* Strategy Summary Banner */}
      <div className="p-4 rounded-xl bg-[#1A1816] border border-[#D96B43]/20 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div>
          <span className="text-[#F7EEDB]/60">Simulated Strategy:</span>
          <span className="ml-2 font-bold text-[#F7EEDB] text-sm">{activeStrategy.name}</span>
          <p className="text-[#F7EEDB]/60 mt-0.5">{activeStrategy.description}</p>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span className="text-[#EF4444]">SL: {activeStrategy.stopLossPercent}%</span>
          <span>·</span>
          <span className="text-[#D96B43]">TP: +{activeStrategy.targetProfitPercent}%</span>
          <span>·</span>
          <span className="text-[#F7EEDB]">{activeStrategy.trailingStopLoss ? 'Trailing SL: Active' : 'Fixed SL'}</span>
        </div>
      </div>

      {/* Core KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/15">
          <span className="text-[11px] text-[#F7EEDB]/60">Total Return</span>
          <div className="text-lg font-bold text-[#D96B43] font-mono mt-1">+{result.totalReturn}%</div>
          <span className="text-[10px] text-[#F7EEDB]/40 font-mono">vs Nifty: +{result.benchmarkReturn}%</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/15">
          <span className="text-[11px] text-[#F7EEDB]/60">CAGR (Ann.)</span>
          <div className="text-lg font-bold text-[#F7EEDB] font-mono mt-1">+{result.cagr}%</div>
          <span className="text-[10px] text-[#F7EEDB] font-mono">Alpha: +{(result.cagr - 13.5).toFixed(1)}%</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/15">
          <span className="text-[11px] text-[#F7EEDB]/60">Win Rate</span>
          <div className="text-lg font-bold text-[#F7EEDB] font-mono mt-1">{result.winRate}%</div>
          <span className="text-[10px] text-[#F7EEDB]/40 font-mono">{result.winningTrades}W / {result.losingTrades}L</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/15">
          <span className="text-[11px] text-[#F7EEDB]/60">Max Drawdown</span>
          <div className="text-lg font-bold text-[#EF4444] font-mono mt-1">-{result.maxDrawdown}%</div>
          <span className="text-[10px] text-[#F7EEDB]/40">Peak to trough</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/15">
          <span className="text-[11px] text-[#F7EEDB]/60">Profit Factor</span>
          <div className="text-lg font-bold text-[#F7EEDB] font-mono mt-1">{result.profitFactor}</div>
          <span className="text-[10px] text-[#F7EEDB]/40">Gross Win/Loss</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/15">
          <span className="text-[11px] text-[#F7EEDB]/60">Sharpe Ratio</span>
          <div className="text-lg font-bold text-[#D96B43] font-mono mt-1">{result.sharpeRatio}</div>
          <span className="text-[10px] text-[#F7EEDB]/40">Rf: 6.5%</span>
        </div>
      </div>

      {/* Interactive Equity Curve Chart */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D96B43]/15">
          <div>
            <h2 className="text-sm font-bold text-[#F7EEDB]">Equity Growth Curve vs. Benchmark</h2>
            <span className="text-xs text-[#F7EEDB]/60">
              Initial Capital: ₹{result.initialCapital.toLocaleString('en-IN')} → Final Equity: ₹{result.finalCapital.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#D96B43] inline-block"></span>
              <span className="text-[#D96B43] font-bold">Strategy Equity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#8A7E6C] inline-block"></span>
              <span className="text-[#F7EEDB]/50">{selectedTicker} Buy &amp; Hold</span>
            </div>
          </div>
        </div>

        {/* SVG Equity Curve */}
        <div className="w-full overflow-hidden select-none">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
            {[0.25, 0.5, 0.75].map((pct, i) => (
              <line
                key={i}
                x1="20"
                y1={chartHeight * pct}
                x2={chartWidth - 20}
                y2={chartHeight * pct}
                stroke="#2A261F"
                strokeDasharray="4,4"
              />
            ))}

            <path d={benchmarkPath} fill="none" stroke="#8A7E6C" strokeWidth="1.6" strokeDasharray="3,3" />
            <path d={equityPath} fill="none" stroke="#D96B43" strokeWidth="2.5" />
          </svg>
        </div>
      </div>

      {/* AI Strategy Audit Section */}
      {aiAuditText && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#131211] border border-[#D96B43]/30 shadow-xl space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D96B43]" />
            <h3 className="text-sm font-bold text-[#F7EEDB]">Gemini 3.8 Flash Quantitative Audit</h3>
          </div>
          <div className="prose prose-invert max-w-none text-xs text-[#F7EEDB]/90 whitespace-pre-line leading-relaxed">
            {aiAuditText}
          </div>
        </div>
      )}

      {/* Trade History Log Table */}
      <div className="rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#D96B43]/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#F7EEDB]">Simulated Trade Execution Log</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#131211] text-[#F7EEDB] font-mono">
              {result.trades.length} Closed Trades
            </span>
          </div>
          <span className="text-xs text-[#F7EEDB]/50 font-mono">Modeled slippage: {backtestOutcome.slippagePercentPerSide}% per side</span>
        </div>

        <div className="overflow-x-auto max-h-[300px]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#131211] text-[#F7EEDB]/60 uppercase text-[10px] tracking-wider border-b border-[#D96B43]/15 sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Ticker</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 text-right">Price</th>
                <th className="py-2.5 px-4 text-right">P&amp;L %</th>
                <th className="py-2.5 px-4 text-right">P&amp;L (₹)</th>
                <th className="py-2.5 px-4 font-sans">Exit Catalyst</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D96B43]/10">
              {result.trades.map((tr) => (
                <tr key={tr.id} className="hover:bg-[#25221F]/60 transition">
                  <td className="py-2.5 px-4 text-[#F7EEDB]/50">{tr.date}</td>
                  <td className="py-2.5 px-4 font-bold text-[#F7EEDB] font-sans">{tr.ticker}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-1.5 py-0.2 rounded bg-[#D96B43]/15 text-[#F7EEDB] font-bold text-[10px]">
                      {tr.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-[#F7EEDB]">₹{tr.price}</td>
                  <td className={`py-2.5 px-4 text-right font-bold ${tr.pnlPercent! >= 0 ? 'text-[#D96B43]' : 'text-[#EF4444]'}`}>
                    {tr.pnlPercent! >= 0 ? '+' : ''}{tr.pnlPercent}%
                  </td>
                  <td className={`py-2.5 px-4 text-right font-bold ${tr.pnlRupees! >= 0 ? 'text-[#D96B43]' : 'text-[#EF4444]'}`}>
                    {tr.pnlRupees! >= 0 ? '+' : ''}₹{tr.pnlRupees?.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-[#F7EEDB]/70 text-[11px]">{tr.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
