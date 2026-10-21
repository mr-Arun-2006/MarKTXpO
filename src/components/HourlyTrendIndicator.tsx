import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  hourlyChangePercent?: number;
  hourlyTrend?: 'UP' | 'DOWN' | 'NEUTRAL';
  hourlyChange?: number;
  currentPrice?: number;
  compact?: boolean;
  showIconOnly?: boolean;
  className?: string;
}

export const HourlyTrendIndicator: React.FC<Props> = ({
  hourlyChangePercent = 0,
  hourlyTrend,
  hourlyChange,
  currentPrice,
  compact = false,
  showIconOnly = false,
  className = '',
}) => {
  // Determine trend if not explicitly passed
  const trend: 'UP' | 'DOWN' | 'NEUTRAL' =
    hourlyTrend ||
    (hourlyChangePercent > 0.05
      ? 'UP'
      : hourlyChangePercent < -0.05
      ? 'DOWN'
      : 'NEUTRAL');

  const absPercent = Math.abs(hourlyChangePercent).toFixed(2);
  const formattedPercent = `${hourlyChangePercent >= 0 ? '+' : ''}${hourlyChangePercent.toFixed(2)}%`;

  if (trend === 'UP') {
    if (showIconOnly) {
      return (
        <span
          title={`Hourly Trend: +${absPercent}% in the last hour compared to previous hour`}
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shadow-[0_0_8px_rgba(34,197,94,0.25)] ${className}`}
        >
          <TrendingUp className="w-3 h-3 stroke-[2.5]" />
        </span>
      );
    }

    return (
      <span
        title={`Latest hourly price movement: +${absPercent}% compared to previous hour`}
        className={`inline-flex items-center gap-1 font-mono font-bold rounded-lg transition-all ${
          compact
            ? 'px-1.5 py-0.5 text-[10px] bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/35 shadow-[0_0_6px_rgba(34,197,94,0.2)]'
            : 'px-2 py-1 text-xs bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/40 shadow-[0_0_8px_rgba(34,197,94,0.25)]'
        } ${className}`}
      >
        <ArrowUpRight className="w-3 h-3 stroke-[2.5] shrink-0" />
        <span>{formattedPercent}</span>
        {!compact && <span className="text-[9px] font-sans opacity-70 tracking-tight">1h</span>}
      </span>
    );
  }

  if (trend === 'DOWN') {
    if (showIconOnly) {
      return (
        <span
          title={`Hourly Trend: -${absPercent}% in the last hour compared to previous hour`}
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 shadow-[0_0_8px_rgba(239,68,68,0.25)] ${className}`}
        >
          <TrendingDown className="w-3 h-3 stroke-[2.5]" />
        </span>
      );
    }

    return (
      <span
        title={`Latest hourly price movement: -${absPercent}% compared to previous hour`}
        className={`inline-flex items-center gap-1 font-mono font-bold rounded-lg transition-all ${
          compact
            ? 'px-1.5 py-0.5 text-[10px] bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/35 shadow-[0_0_6px_rgba(239,68,68,0.2)]'
            : 'px-2 py-1 text-xs bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40 shadow-[0_0_8px_rgba(239,68,68,0.25)]'
        } ${className}`}
      >
        <ArrowDownRight className="w-3 h-3 stroke-[2.5] shrink-0" />
        <span>{formattedPercent}</span>
        {!compact && <span className="text-[9px] font-sans opacity-70 tracking-tight">1h</span>}
      </span>
    );
  }

  // NEUTRAL
  if (showIconOnly) {
    return (
      <span
        title={`Hourly Trend: Flat (0.00%) compared to previous hour`}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#8CB4E0]/15 text-[#8CB4E0] border border-[#8CB4E0]/30 ${className}`}
      >
        <Minus className="w-3 h-3 stroke-[2.5]" />
      </span>
    );
  }

  return (
    <span
      title="Latest hourly price movement: Flat compared to previous hour"
      className={`inline-flex items-center gap-1 font-mono font-bold rounded-lg transition-all ${
        compact
          ? 'px-1.5 py-0.5 text-[10px] bg-[#8CB4E0]/10 text-[#8CB4E0] border border-[#8CB4E0]/30'
          : 'px-2 py-1 text-xs bg-[#8CB4E0]/10 text-[#8CB4E0] border border-[#8CB4E0]/30'
      } ${className}`}
    >
      <Minus className="w-3 h-3 stroke-[2.5] shrink-0 opacity-70" />
      <span>{formattedPercent}</span>
      {!compact && <span className="text-[9px] font-sans opacity-60 tracking-tight">1h</span>}
    </span>
  );
};
