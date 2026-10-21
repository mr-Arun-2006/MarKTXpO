import React, { useState } from 'react';
import { MarketAlert, StockData, SupportedLanguage } from '../types/market';
import { translations } from '../i18n/translations';
import {
  Bell,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

interface Props {
  alerts: MarketAlert[];
  stocks: StockData[];
  onAddAlert: (alert: MarketAlert) => void;
  onRemoveAlert: (id: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  language: SupportedLanguage;
}

export const AlertsManagerView: React.FC<Props> = ({
  alerts,
  stocks,
  onAddAlert,
  onRemoveAlert,
  soundEnabled,
  onToggleSound,
  language,
}) => {
  const t = translations[language];

  const [ticker, setTicker] = useState<string>('RELIANCE');
  const [alertType, setAlertType] = useState<MarketAlert['type']>('PRICE_ABOVE');
  const [targetValue, setTargetValue] = useState<number>(3050);
  const [customMsg, setCustomMsg] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  const handleCreate = () => {
    const stock = stocks.find((s) => s.ticker === ticker);
    const newAlert: MarketAlert = {
      id: `alt-${Date.now()}`,
      ticker,
      companyName: stock ? stock.name : ticker,
      type: alertType,
      targetValue,
      currentValue: stock ? stock.currentPrice : 0,
      triggered: false,
      message:
        customMsg ||
        `${ticker} ${
          alertType === 'PRICE_ABOVE'
            ? `rose above ₹${targetValue}`
            : alertType === 'PRICE_BELOW'
            ? `fell below ₹${targetValue}`
            : alertType === 'RSI_OVERSOLD'
            ? `RSI dropped under ${targetValue}`
            : alertType === 'ARBITRAGE_SPREAD'
            ? `NSE/BSE Spread exceeded ${targetValue}%`
            : `Volume surged past ${targetValue}x average`
        }`,
    };

    onAddAlert(newAlert);
    setShowAddForm(false);
    setCustomMsg('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-[#F7EEDB]">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D96B43]/15">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#D96B43]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#F7EEDB] tracking-tight">
              Personalized Trade Alerts &amp; Shift Monitor
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D96B43]/10 text-[#F7EEDB] border border-[#D96B43]/20 font-bold font-mono">
              REAL-TIME DISPATCH
            </span>
          </div>
          <p className="text-xs text-[#F7EEDB]/60 mt-1">
            Configure push and in-app triggers for price breakouts, volume surges, and inter-exchange spreads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition ${
              soundEnabled
                ? 'bg-[#D96B43]/20 border-[#D96B43] text-[#F7EEDB]'
                : 'bg-[#1A1816] border-[#D96B43]/20 text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#D96B43]" /> : <VolumeX className="w-4 h-4" />}
            <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs shadow-md shadow-[#D96B43]/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Alert</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F7EEDB]">Create Real-Time Shift Alert</h3>
            <button onClick={() => setShowAddForm(false)} className="text-[#F7EEDB]/50 hover:text-[#F7EEDB] text-xs">
              Cancel
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Target Stock</label>
              <select
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value);
                  const st = stocks.find((s) => s.ticker === e.target.value);
                  if (st) setTargetValue(Math.round(st.currentPrice * 1.03));
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-bold"
              >
                {stocks.map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} · BSE: {s.bseCode} - {s.name} (₹{s.currentPrice.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Trigger Condition</label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-bold"
              >
                <option value="PRICE_ABOVE">Price Above (Breakout Target)</option>
                <option value="PRICE_BELOW">Price Below (Stop-Loss Alert)</option>
                <option value="RSI_OVERSOLD">RSI Oversold Dip (&lt; Threshold)</option>
                <option value="VOLUME_SPIKE">Volume Surge Multiplier (&gt; Avg)</option>
                <option value="ARBITRAGE_SPREAD">NSE/BSE Spread Exceeds (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Threshold Value</label>
              <input
                type="number"
                step="0.01"
                value={targetValue}
                onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-mono font-bold"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-[#D96B43] text-[#131211] rounded-xl text-xs font-bold hover:brightness-110 transition"
          >
            Activate Alert
          </button>
        </div>
      )}

      {/* Alerts Feed */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Triggered Shift Alerts */}
        <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/15">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#D96B43]" />
              <h3 className="text-sm font-bold text-[#F7EEDB]">Triggered Market Shifts</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#D96B43]/10 text-[#F7EEDB] font-mono font-bold">
              {alerts.filter((a) => a.triggered).length} Triggered
            </span>
          </div>

          <div className="space-y-3">
            {alerts
              .filter((a) => a.triggered)
              .map((alt) => (
                <div
                  key={alt.id}
                  className="p-3.5 rounded-xl bg-[#131211] border border-[#D96B43]/25 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F7EEDB] text-sm">{alt.ticker}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#D96B43]/20 text-[#F7EEDB] font-bold">
                        TRIGGERED
                      </span>
                    </div>
                    <span className="text-[10px] text-[#F7EEDB]/40 font-mono">{alt.triggeredAt}</span>
                  </div>

                  <p className="text-[#F7EEDB]/80 leading-relaxed">{alt.message}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#D96B43]/10 text-[11px] text-[#F7EEDB]/50 font-mono">
                    <span>Target: {alt.targetValue}</span>
                    <button
                      onClick={() => onRemoveAlert(alt.id)}
                      className="text-[#F7EEDB]/40 hover:text-[#EF4444] transition font-sans"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Active Standing Alerts */}
        <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/15">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#D96B43]" />
              <h3 className="text-sm font-bold text-[#F7EEDB]">Active Standing Watchers</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#131211] text-[#F7EEDB]/70 font-mono">
              Surveillance Running
            </span>
          </div>

          <div className="space-y-3">
            {alerts.filter((a) => !a.triggered).length === 0 ? (
              <div className="py-8 text-center text-[#F7EEDB]/40 text-xs">
                No active standing watchers. Click "Create Alert" above.
              </div>
            ) : (
              alerts
                .filter((a) => !a.triggered)
                .map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3.5 rounded-xl bg-[#131211]/60 border border-[#D96B43]/15 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#F7EEDB] text-sm">{alt.ticker}</span>
                      <span className="text-[10px] text-[#D96B43] font-mono">MONITORING</span>
                    </div>

                    <p className="text-[#F7EEDB]/80">{alt.message}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-[#D96B43]/10 text-[11px] text-[#F7EEDB]/50 font-mono">
                      <span>Condition Value: {alt.targetValue}</span>
                      <button
                        onClick={() => onRemoveAlert(alt.id)}
                        className="text-[#F7EEDB]/40 hover:text-[#EF4444] transition font-sans"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
