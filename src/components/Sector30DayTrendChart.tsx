import React, { useState, useId } from 'react';

export interface SectorTrendPoint {
  date: string;
  returnPct: number;
}

export interface Sector30DayTrendChartProps {
  points: SectorTrendPoint[];
  netReturn: number;
  highReturn: number;
  lowReturn: number;
  height?: number;
  showAxes?: boolean;
  interactive?: boolean;
  compact?: boolean;
}

export const Sector30DayTrendChart: React.FC<Sector30DayTrendChartProps> = ({
  points,
  netReturn,
  highReturn,
  lowReturn,
  height = 70,
  showAxes = true,
  interactive = true,
  compact = false,
}) => {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!points || points.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[10px] text-[#F7EEDB]/40 font-mono"
        style={{ height }}
      >
        Calculating 30-day trajectory...
      </div>
    );
  }

  const isPositive = netReturn >= 0;
  const strokeColor = isPositive ? '#10B981' : '#EF4444'; // Emerald vs Red
  const fillColor = isPositive ? '#10B981' : '#EF4444';

  const width = 300;
  const paddingX = 8;
  const paddingY = 8;

  // Determine Y range with padding so the chart never clips
  const returns = points.map((p) => p.returnPct);
  const minVal = Math.min(...returns, 0);
  const maxVal = Math.max(...returns, 0);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const getX = (index: number) => {
    return paddingX + (index / (points.length - 1)) * (width - 2 * paddingX);
  };

  const getY = (val: number) => {
    const norm = (val - minVal) / range;
    return height - paddingY - norm * (height - 2 * paddingY);
  };

  // Zero baseline Y
  const zeroY = getY(0);

  // Generate smooth cubic Bézier SVG path
  let pathD = `M ${getX(0)} ${getY(points[0].returnPct)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const x0 = getX(i);
    const y0 = getY(points[i].returnPct);
    const x1 = getX(i + 1);
    const y1 = getY(points[i + 1].returnPct);
    const mx = (x0 + x1) / 2;
    pathD += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }

  // Generate closed area path for the gradient fill
  const areaD = `${pathD} L ${getX(points.length - 1)} ${height - paddingY} L ${getX(
    0
  )} ${height - paddingY} Z`;

  // Find high and low index for key labels
  let maxIdx = 0;
  let minIdx = 0;
  points.forEach((p, idx) => {
    if (p.returnPct > points[maxIdx].returnPct) maxIdx = idx;
    if (p.returnPct < points[minIdx].returnPct) minIdx = idx;
  });

  const activePoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];
  const activeX = hoverIndex !== null ? getX(hoverIndex) : getX(points.length - 1);
  const activeY = hoverIndex !== null ? getY(activePoint.returnPct) : getY(activePoint.returnPct);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, relativeX / rect.width));
    const index = Math.round(percent * (points.length - 1));
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  if (compact) {
    return (
      <div className="w-full relative overflow-hidden rounded bg-[#131211]/80 p-0.5 border border-[#D96B43]/15">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          style={{ maxHeight: height }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {showAxes && (
            <line
              x1={paddingX}
              y1={zeroY}
              x2={width - paddingX}
              y2={zeroY}
              stroke="#57534E"
              strokeDasharray="2,3"
              strokeWidth="0.8"
              opacity="0.3"
            />
          )}
          <path d={areaD} fill={`url(#${gradientId})`} />
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={getX(points.length - 1)}
            cy={getY(points[points.length - 1].returnPct)}
            r="2.5"
            fill="#FFF"
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-full space-y-1">
      {/* Dynamic Scrubber / Return Readout */}
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-[#F7EEDB]/60 truncate">
          {hoverIndex !== null ? `Day: ${activePoint.date}` : '30-Day Return Trend:'}
        </span>
        <span
          className={`font-black px-1.5 py-0.2 rounded ${
            activePoint.returnPct >= 0
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
              : 'bg-red-950/80 text-red-300 border border-red-500/30'
          }`}
        >
          {activePoint.returnPct >= 0 ? '+' : ''}
          {activePoint.returnPct.toFixed(2)}%
        </span>
      </div>

      {/* Responsive SVG Chart Container */}
      <div className="relative w-full overflow-hidden rounded-lg bg-[#131211]/90 p-1 border border-[#D96B43]/15">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ maxHeight: height }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Zero Return Reference Line */}
          {showAxes && (
            <line
              x1={paddingX}
              y1={zeroY}
              x2={width - paddingX}
              y2={zeroY}
              stroke="#57534E"
              strokeDasharray="2,3"
              strokeWidth="0.8"
              opacity="0.4"
            />
          )}

          {/* Gradient Area Fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Smooth Trend Line */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="filter drop-shadow-[0_0_4px_rgba(16,185,129,0.3)]"
          />

          {/* Extreme Points: 30D High & Low */}
          {points.length > 5 && (
            <>
              {/* 30D High Dot */}
              <circle
                cx={getX(maxIdx)}
                cy={getY(points[maxIdx].returnPct)}
                r="2.5"
                fill="#10B981"
                className="opacity-75"
              />
              {/* 30D Low Dot */}
              <circle
                cx={getX(minIdx)}
                cy={getY(points[minIdx].returnPct)}
                r="2.5"
                fill="#EF4444"
                className="opacity-75"
              />
            </>
          )}

          {/* Active Hover / Terminal Scrubber Point */}
          <circle
            cx={activeX}
            cy={activeY}
            r="3.5"
            fill="#FFF"
            stroke={strokeColor}
            strokeWidth="2"
            className="transition-all duration-75"
          />

          {/* Vertical cursor guide line when hovering */}
          {hoverIndex !== null && (
            <line
              x1={activeX}
              y1={paddingY}
              x2={activeX}
              y2={height - paddingY}
              stroke="#F7EEDB"
              strokeWidth="0.75"
              strokeDasharray="1,2"
              opacity="0.6"
            />
          )}
        </svg>

        {/* Start and End date labels */}
        <div className="flex items-center justify-between text-[9px] font-mono text-[#F7EEDB]/40 px-1 pt-0.5">
          <span>-30d</span>
          <span className="text-[8px] text-[#F7EEDB]/30">30-day cumulative</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
};
