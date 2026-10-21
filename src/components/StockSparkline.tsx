import React from 'react';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, YAxis } from 'recharts';
import { OHLCVCandle } from '../types/market';

interface Props {
  data: OHLCVCandle[];
  width?: number | string;
  height?: number;
  isPositive?: boolean;
  showGradient?: boolean;
}

export const StockSparkline: React.FC<Props> = ({
  data,
  width = '100%',
  height = 36,
  isPositive = true,
  showGradient = true,
}) => {
  // Take last 15-20 data points for a clean, informative sparkline
  const chartData = (data && data.length > 0 ? data.slice(-18) : []).map((c, i) => ({
    idx: i,
    price: c.close,
  }));

  if (chartData.length === 0) {
    return <div style={{ height }} className="w-full bg-[#1B1914]/50 rounded" />;
  }

  // Financial Green (#22C55E) for bullish gains and Red (#EF4444) for bearish pullbacks
  const strokeColor = isPositive ? '#22C55E' : '#EF4444';
  const gradientId = `sparklineGrad-${isPositive ? 'pos' : 'neg'}-${Math.random().toString(36).substring(2, 7)}`;

  return (
    <div style={{ width, height }} className="relative overflow-hidden select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 1, left: 1, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          {showGradient && (
            <Area
              type="monotone"
              dataKey="price"
              stroke="none"
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
