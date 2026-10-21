import React, { useState } from 'react';
import {
  MonthlyDividendYield,
  StockDividendConsistency,
  get12MonthDividendYieldHistory,
} from '../data/mockDividendData';
import { Sparkles, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

interface Props {
  ticker: string;
  currentYield: number;
  consistencyData?: StockDividendConsistency;
  width?: number;
  height?: number;
  showDetails?: boolean;
  onOpenDetails?: (data: StockDividendConsistency) => void;
  className?: string;
}

export const DividendYieldSparkline: React.FC<Props> = ({
  ticker,
  currentYield,
  consistencyData,
  width = 110,
  height = 32,
  showDetails = true,
  onOpenDetails,
  className = '',
}) => {
  // Use passed data or compute from ticker
  const data: StockDividendConsistency =
    consistencyData || get12MonthDividendYieldHistory(ticker, currentYield);

  const [hoveredPoint, setHoveredPoint] = useState<MonthlyDividendYield | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const points = data.history12M;
  if (!points || points.length === 0) {
    return <div style={{ width, height }} className="bg-[#131211]/50 rounded" />;
  }

  // Calculate scales
  const paddingX = 4;
  const paddingY = 4;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;

  const minVal = data.minYield12M;
  const maxVal = Math.max(data.maxYield12M, minVal + 0.1);
  const range = maxVal - minVal;

  const coords = points.map((p, idx) => {
    const x = paddingX + (idx / (points.length - 1)) * graphWidth;
    const normY = (p.yieldPercent - minVal) / range;
    // Invert Y for SVG coordinates (0 at top)
    const y = paddingY + (1 - normY) * graphHeight;
    return { x, y, point: p };
  });

  // Build smooth cubic Bezier path
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  // Area path closing
  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  // Color scheme based on consistency score and trend
  const isHighConsistency = data.payoutConsistencyScore >= 90;
  const isGrowing = data.trend === 'increasing';
  const strokeColor = isGrowing
    ? '#22C55E' // Emerald Green for increasing dividend
    : isHighConsistency
    ? '#D96B43' // Amber Terracotta for solid consistency
    : '#8CB4E0'; // Soft Blue for cyclical

  const gradientId = `divSpark-${ticker.replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).substr(2, 4)}`;

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none ${className}`}
      onClick={(e) => {
        if (onOpenDetails) {
          e.stopPropagation();
          onOpenDetails(data);
        }
      }}
    >
      {/* Sparkline Canvas */}
      <div
        className="relative cursor-pointer group"
        style={{ width, height }}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <svg
          width={width}
          height={height}
          className="overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Smooth trend curve */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Markers on Dividend Payout Months */}
          {coords.map((c, i) => {
            if (!c.point.isPayoutMonth) return null;
            return (
              <g key={`payout-${i}`}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={3.2}
                  fill="#131211"
                  stroke="#22C55E"
                  strokeWidth={1.6}
                  className="animate-pulse"
                />
                <circle cx={c.x} cy={c.y} r={1.5} fill="#22C55E" />
              </g>
            );
          })}

          {/* Invisible interactive hover targets */}
          {coords.map((c, i) => (
            <rect
              key={`hover-${i}`}
              x={c.x - graphWidth / (points.length * 2)}
              y={0}
              width={graphWidth / points.length}
              height={height}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                setHoveredPoint(c.point);
                if (rect) {
                  setHoverPos({ x: c.x, y: c.y });
                }
              }}
            />
          ))}

          {/* Active hover crosshair point */}
          {hoveredPoint && hoverPos && (
            <circle
              cx={hoverPos.x}
              cy={hoverPos.y}
              r={3.5}
              fill="#F7EEDB"
              stroke={strokeColor}
              strokeWidth={2}
            />
          )}
        </svg>

        {/* Hover Tooltip Popup */}
        {hoveredPoint && hoverPos && (
          <div
            className="absolute z-50 pointer-events-none -top-11 left-1/2 -translate-x-1/2 bg-[#1A1816] text-[#F7EEDB] border border-[#D96B43]/50 px-2 py-1 rounded-md text-[10px] font-mono shadow-[0_4px_16px_rgba(0,0,0,0.8)] whitespace-nowrap space-y-0.5"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <span>{hoveredPoint.month}:</span>
              <span className="text-[#22C55E]">{hoveredPoint.yieldPercent.toFixed(2)}%</span>
            </div>
            {hoveredPoint.dividendPerShare && (
              <div className="text-[9px] text-[#8CB4E0] font-sans">
                Paid: ₹{hoveredPoint.dividendPerShare}/sh
              </div>
            )}
          </div>
        )}
      </div>

      {/* Consistency Rating Tag & 12M Range Sub-indicator */}
      {showDetails && (
        <div className="flex items-center justify-between w-full text-[9px] font-mono text-[#F7EEDB]/60 mt-1 px-0.5">
          <span
            title={`12-Month Dividend Yield Range: ${data.minYield12M}% to ${data.maxYield12M}%`}
            className="hover:text-[#F7EEDB] transition"
          >
            {data.minYield12M}%-{data.maxYield12M}%
          </span>
          <span
            title={`Payout Consistency: ${data.payoutConsistencyScore}% (${data.payoutsInLast12M}/${data.expectedPayoutsPerYear} Payouts)`}
            className={`font-semibold px-1 py-0.2 rounded ${
              data.payoutConsistencyScore >= 95
                ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                : 'bg-[#D96B43]/15 text-[#D96B43] border border-[#D96B43]/30'
            }`}
          >
            {data.payoutConsistencyScore}%
          </span>
        </div>
      )}
    </div>
  );
};
