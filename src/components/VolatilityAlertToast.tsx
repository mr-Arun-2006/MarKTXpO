import React, { useEffect, useState } from 'react';
import { MarketAlert } from '../types/market';
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Flame,
  Volume2,
  X,
  MessageSquare,
} from 'lucide-react';

interface Props {
  alert: MarketAlert | null;
  onDismiss: () => void;
  onInspectStock: (ticker: string) => void;
  onShareToChat?: (alert: MarketAlert) => void;
  soundEnabled: boolean;
}

export const VolatilityAlertToast: React.FC<Props> = ({
  alert,
  onDismiss,
  onInspectStock,
  onShareToChat,
  soundEnabled,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!alert) return;
    setProgress(100);

    const startTime = Date.now();
    const duration = 8000; // 8 seconds auto-dismiss

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const isExtreme = (alert.expansionRatio || 1) >= 1.5;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div
        className={`rounded-2xl p-4 shadow-2xl border backdrop-blur-md transition-all ${
          isExtreme
            ? 'bg-[#1F1412]/95 border-red-500/70 shadow-[0_0_30px_rgba(239,68,68,0.35)]'
            : 'bg-[#1A1816]/95 border-[#D96B43]/70 shadow-[0_0_24px_rgba(217,107,67,0.3)]'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl border ${
                isExtreme
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                  : 'bg-[#D96B43]/20 text-[#D96B43] border-[#D96B43]/40'
              }`}
            >
              {isExtreme ? <Flame className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D96B43]">
                  REAL-TIME VOLATILITY SURGE
                </span>
                {soundEnabled && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#D96B43]/15 text-[#D96B43] border border-[#D96B43]/30 font-mono flex items-center gap-1">
                    <Volume2 className="w-2.5 h-2.5" />
                    Chime
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-[#F7EEDB] flex items-center gap-1.5 mt-0.5">
                <span>{alert.ticker}</span>
                <span className="text-xs font-normal text-[#F7EEDB]/60 truncate max-w-[150px]">
                  · {alert.companyName}
                </span>
              </h4>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-[#F7EEDB]/50 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metric Comparison Card */}
        <div className="mt-3 p-2.5 rounded-xl bg-[#131211]/80 border border-[#D96B43]/15 space-y-2 text-xs">
          <div className="flex items-center justify-between font-mono">
            <span className="text-[#F7EEDB]/60 text-[11px]">Intraday Price Range:</span>
            <span className="text-[#F7EEDB] font-bold">
              ₹{(alert.intradayRange || alert.currentValue).toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between font-mono">
            <span className="text-[#F7EEDB]/60 text-[11px]">14-Day Average Range:</span>
            <span className="text-[#F7EEDB]/80">
              ₹{(alert.average14DayRange || alert.targetValue).toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-[#D96B43]/10 font-mono">
            <span className="text-[11px] font-bold text-[#D96B43]">Range Expansion:</span>
            <span
              className={`font-black text-xs px-2 py-0.5 rounded-md ${
                isExtreme
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {(alert.expansionRatio || 1.1).toFixed(2)}x Baseline
            </span>
          </div>
        </div>

        {/* Message body */}
        <p className="text-[11px] text-[#F7EEDB]/80 mt-2 leading-relaxed">
          {alert.message}
        </p>

        {/* Actions Strip */}
        <div className="mt-3 pt-2.5 border-t border-[#D96B43]/15 flex items-center justify-between gap-2">
          <span className="text-[10px] text-[#F7EEDB]/50 font-mono">
            Triggered {alert.triggeredAt || 'Just now'}
          </span>

          <div className="flex items-center gap-2">
            {onShareToChat && (
              <button
                onClick={() => {
                  onShareToChat(alert);
                  onDismiss();
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#131211] hover:bg-[#D96B43]/20 border border-[#D96B43]/30 text-[#F7EEDB] text-xs font-semibold transition"
                title="Share this volatility expansion alert to a Google Chat Space"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#D96B43]" />
                <span className="hidden sm:inline">Google Chat</span>
              </button>
            )}
            <button
              onClick={() => {
                onInspectStock(alert.ticker);
                onDismiss();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D96B43] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs shadow-md transition"
            >
              <span>Inspect Stock</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Auto-Dismiss Progress Bar */}
        <div className="mt-2.5 h-1 w-full bg-[#131211] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${
              isExtreme ? 'bg-red-500' : 'bg-[#D96B43]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
