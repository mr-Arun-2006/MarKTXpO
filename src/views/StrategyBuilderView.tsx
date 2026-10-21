import React, { useState } from 'react';
import { CustomStrategy, StrategyRule, SupportedLanguage } from '../types/market';
import { translations } from '../i18n/translations';
import {
  Sliders,
  Plus,
  Trash2,
  Play,
  Save,
  CheckCircle2,
  Shield,
} from 'lucide-react';

interface Props {
  onRunBacktest: (strategy: CustomStrategy) => void;
  language: SupportedLanguage;
}

export const StrategyBuilderView: React.FC<Props> = ({ onRunBacktest, language }) => {
  const t = translations[language];

  const [strategyName, setStrategyName] = useState<string>('Nifty Bluechip Mean Reversion & Arbitrage');
  const [strategyDesc, setStrategyDesc] = useState<string>(
    'Buys dips on Indian equities with RSI < 42 above 50-DMA and takes advantage of cross-exchange spreads.'
  );
  const [stopLossPercent, setStopLossPercent] = useState<number>(3.0);
  const [targetProfitPercent, setTargetProfitPercent] = useState<number>(7.5);
  const [trailingStop, setTrailingStop] = useState<boolean>(true);

  const [rules, setRules] = useState<StrategyRule[]>([
    {
      id: 'r1',
      indicator: 'RSI',
      operator: '<',
      value: 42,
      action: 'BUY',
    },
    {
      id: 'r2',
      indicator: 'DMA_50_CROSS',
      operator: 'CROSSES_ABOVE',
      value: 0,
      action: 'BUY',
    },
    {
      id: 'r3',
      indicator: 'VOLUME_SURGE',
      operator: '>',
      value: 1.5,
      action: 'BUY',
    },
  ]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddRule = () => {
    const newRule: StrategyRule = {
      id: `r-${Date.now()}`,
      indicator: 'NSE_BSE_SPREAD',
      operator: '>',
      value: 0.04,
      action: 'BUY',
    };
    setRules([...rules, newRule]);
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const handleUpdateRule = (id: string, updates: Partial<StrategyRule>) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const applyPreset = (type: 'mean_reversion' | 'breakout' | 'arbitrage') => {
    if (type === 'mean_reversion') {
      setStrategyName('RSI Oversold Institutional Dip Hunter');
      setStrategyDesc('Detects oversold pullbacks on fundamentally resilient companies with tight 2.5% stop loss.');
      setStopLossPercent(2.5);
      setTargetProfitPercent(6.0);
      setTrailingStop(true);
      setRules([
        { id: '1', indicator: 'RSI', operator: '<', value: 38, action: 'BUY' },
        { id: '2', indicator: 'DELIVERY_PERCENT', operator: '>', value: 45, action: 'BUY' },
      ]);
    } else if (type === 'breakout') {
      setStrategyName('Golden Cross Momentum Breakout');
      setStrategyDesc('Captures high-velocity trends when 50 DMA crosses 200 DMA with 2x volume expansion.');
      setStopLossPercent(4.0);
      setTargetProfitPercent(12.0);
      setTrailingStop(true);
      setRules([
        { id: '1', indicator: 'DMA_200_CROSS', operator: 'CROSSES_ABOVE', value: 0, action: 'BUY' },
        { id: '2', indicator: 'VOLUME_SURGE', operator: '>', value: 2.0, action: 'BUY' },
      ]);
    } else {
      setStrategyName('NSE vs BSE Inter-Exchange Arbitrage Scalper');
      setStrategyDesc('Exploits transient order book price discrepancies between NSE and BSE.');
      setStopLossPercent(1.5);
      setTargetProfitPercent(3.5);
      setTrailingStop(false);
      setRules([
        { id: '1', indicator: 'NSE_BSE_SPREAD', operator: '>', value: 0.05, action: 'BUY' },
        { id: '2', indicator: 'DELIVERY_PERCENT', operator: '>', value: 40, action: 'BUY' },
      ]);
    }
  };

  const buildCustomStrategyObj = (): CustomStrategy => ({
    id: `strat-${Date.now()}`,
    name: strategyName,
    description: strategyDesc,
    rules,
    stopLossPercent,
    targetProfitPercent,
    trailingStopLoss: trailingStop,
    active: true,
  });

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-[#F7EEDB]">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D96B43]/15">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#D96B43]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#F7EEDB] tracking-tight">
              Algorithmic Strategy Builder
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D96B43]/10 text-[#F7EEDB] border border-[#D96B43]/20 font-bold font-mono">
              QUANT RULES
            </span>
          </div>
          <p className="text-xs text-[#F7EEDB]/60 mt-1">
            Construct modular quantitative rules combining technical signals, moving averages, and cross-exchange spreads.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D96B43]/20 bg-[#1A1816] text-xs font-semibold text-[#F7EEDB] hover:bg-[#25221F] transition"
          >
            {savedSuccess ? <CheckCircle2 className="w-4 h-4 text-[#D96B43]" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'Strategy Saved' : 'Save Strategy'}</span>
          </button>

          <button
            onClick={() => onRunBacktest(buildCustomStrategyObj())}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs shadow-md shadow-[#D96B43]/20 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Simulate in Backtester</span>
          </button>
        </div>
      </div>

      {/* Preset Strategy Buttons */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-[#F7EEDB]/60 uppercase tracking-wider font-mono">
          One-Click Quant Templates:
        </span>
        <div className="grid sm:grid-cols-3 gap-3">
          <button
            onClick={() => applyPreset('mean_reversion')}
            className="p-3.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/15 hover:border-[#D96B43]/40 text-left transition space-y-1 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#F7EEDB] group-hover:text-[#F7EEDB]">RSI Dip Hunter</span>
              <span className="text-[10px] text-[#D96B43] font-mono">Win: ~72%</span>
            </div>
            <p className="text-[11px] text-[#F7EEDB]/50">Accumulates oversold bluechips with delivery volume backing</p>
          </button>

          <button
            onClick={() => applyPreset('breakout')}
            className="p-3.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/15 hover:border-[#D96B43]/40 text-left transition space-y-1 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#F7EEDB] group-hover:text-[#F7EEDB]">Golden Cross Surge</span>
              <span className="text-[10px] text-[#F7EEDB] font-mono">RR: 1:3</span>
            </div>
            <p className="text-[11px] text-[#F7EEDB]/50">Rides large-cap multi-month trends above 200 DMA</p>
          </button>

          <button
            onClick={() => applyPreset('arbitrage')}
            className="p-3.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/15 hover:border-[#D96B43]/40 text-left transition space-y-1 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#F7EEDB] group-hover:text-[#F7EEDB]">NSE/BSE Arbitrage</span>
              <span className="text-[10px] text-[#F7EEDB] font-mono">Low Risk</span>
            </div>
            <p className="text-[11px] text-[#F7EEDB]/50">Exploits price divergence between national exchanges</p>
          </button>
        </div>
      </div>

      {/* Strategy Meta & Parameters */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#F7EEDB]/70 mb-1">Strategy Name</label>
            <input
              type="text"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-sm font-bold text-[#F7EEDB] focus:outline-none focus:border-[#D96B43]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#F7EEDB]/70 mb-1">Strategy Thesis &amp; Description</label>
            <textarea
              rows={2}
              value={strategyDesc}
              onChange={(e) => setStrategyDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-xs text-[#F7EEDB]/80 focus:outline-none focus:border-[#D96B43] resize-none"
            />
          </div>

          {/* Rule List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F7EEDB] uppercase tracking-wider font-mono">
                Trigger Conditions (AND Logic)
              </span>
              <button
                onClick={handleAddRule}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D96B43]/10 text-[#F7EEDB] border border-[#D96B43]/30 text-xs font-bold hover:bg-[#D96B43] hover:text-[#131211] transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Condition</span>
              </button>
            </div>

            <div className="space-y-2">
              {rules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15 flex flex-wrap items-center gap-3 text-xs"
                >
                  <span className="font-mono text-[#F7EEDB]/40 font-bold">#{idx + 1}</span>

                  <select
                    value={rule.indicator}
                    onChange={(e) => handleUpdateRule(rule.id, { indicator: e.target.value as any })}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1A1816] border border-[#D96B43]/25 text-[#F7EEDB] font-semibold"
                  >
                    <option value="RSI">RSI (14)</option>
                    <option value="MACD">MACD Histogram</option>
                    <option value="DMA_50_CROSS">Price vs 50 DMA</option>
                    <option value="DMA_200_CROSS">Price vs 200 DMA</option>
                    <option value="VOLUME_SURGE">Volume Surge Multiplier</option>
                    <option value="NSE_BSE_SPREAD">NSE/BSE Spread %</option>
                    <option value="DELIVERY_PERCENT">Delivery Percentage</option>
                  </select>

                  <select
                    value={rule.operator}
                    onChange={(e) => handleUpdateRule(rule.id, { operator: e.target.value as any })}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1A1816] border border-[#D96B43]/25 text-[#D96B43] font-bold font-mono"
                  >
                    <option value="<">&lt; Less Than</option>
                    <option value="<=">&le; Less Or Equal</option>
                    <option value=">">&gt; Greater Than</option>
                    <option value=">=">&ge; Greater Or Equal</option>
                    <option value="CROSSES_ABOVE">Crosses Above</option>
                    <option value="CROSSES_BELOW">Crosses Below</option>
                  </select>

                  <input
                    type="number"
                    step="0.1"
                    value={rule.value}
                    onChange={(e) => handleUpdateRule(rule.id, { value: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-2.5 py-1.5 rounded-lg bg-[#1A1816] border border-[#D96B43]/25 text-[#F7EEDB] font-mono font-bold"
                  />

                  <span className="px-2 py-1 rounded bg-[#D96B43]/15 text-[#F7EEDB] font-bold text-[10px]">
                    TRIGGER {rule.action}
                  </span>

                  <button
                    onClick={() => handleRemoveRule(rule.id)}
                    className="ml-auto p-1 text-[#F7EEDB]/40 hover:text-[#EF4444] transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Controls */}
        <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#D96B43]/15">
            <Shield className="w-4 h-4 text-[#D96B43]" />
            <h3 className="text-sm font-bold text-[#F7EEDB]">Risk &amp; Execution Control</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-[#F7EEDB]/70 mb-1">
                <span>Stop-Loss Limit</span>
                <span className="font-mono font-bold text-[#EF4444]">{stopLossPercent}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(parseFloat(e.target.value))}
                className="w-full accent-[#EF4444] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[#F7EEDB]/70 mb-1">
                <span>Target Profit Band</span>
                <span className="font-mono font-bold text-[#F7EEDB]">+{targetProfitPercent}%</span>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                step="0.5"
                value={targetProfitPercent}
                onChange={(e) => setTargetProfitPercent(parseFloat(e.target.value))}
                className="w-full accent-[#D96B43] cursor-pointer"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#131211] border border-[#D96B43]/15 flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#F7EEDB]">Trailing Stop-Loss</span>
                <p className="text-[10px] text-[#F7EEDB]/50">Auto-adjusts stop-loss upwards as price expands</p>
              </div>
              <input
                type="checkbox"
                checked={trailingStop}
                onChange={(e) => setTrailingStop(e.target.checked)}
                className="w-4 h-4 accent-[#D96B43] rounded cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/25 space-y-1">
              <span className="font-bold text-[#F7EEDB] text-xs">Risk-to-Reward Ratio</span>
              <div className="text-lg font-black text-[#F7EEDB] font-mono">
                1 : {(targetProfitPercent / stopLossPercent).toFixed(2)}
              </div>
              <p className="text-[10px] text-[#F7EEDB]/50">Recommended institutional setup: &ge; 1:2.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
