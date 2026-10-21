import React, { useState } from 'react';
import { GameCandle } from '../data/tradingGameData';

interface Props {
  candles: GameCandle[];
  supportLevel?: number;
  resistanceLevel?: number;
  stopLossLevel?: number;
  targetLevel?: number;
  entryLevel?: number;
  height?: number;
  showVolume?: boolean;
  className?: string;
}

export const GameCandleChart: React.FC<Props> = ({
  candles,
  supportLevel,
  resistanceLevel,
  stopLossLevel,
  targetLevel,
  entryLevel,
  height = 320,
  showVolume = true,
  className = '',
}) => {
  const [hoveredCandle, setHoveredCandle] = useState<GameCandle | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  if (!candles || candles.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center bg-[#131211] rounded-xl border border-[#D96B43]/20 text-[#F7EEDB]/40 font-mono text-xs"
      >
        Awaiting candle data...
      </div>
    );
  }

  // Calculate price bounds with extra margin for indicators and lines
  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  if (supportLevel) allPrices.push(supportLevel);
  if (resistanceLevel) allPrices.push(resistanceLevel);
  if (stopLossLevel) allPrices.push(stopLossLevel);
  if (targetLevel) allPrices.push(targetLevel);
  if (entryLevel) allPrices.push(entryLevel);

  const rawMin = Math.min(...allPrices);
  const rawMax = Math.max(...allPrices);
  const padding = (rawMax - rawMin) * 0.12 || 10;
  const minPrice = rawMin - padding;
  const maxPrice = rawMax + padding;
  const priceRange = maxPrice - minPrice;

  // Maximum volume
  const maxVolume = Math.max(...candles.map((c) => c.volume), 1);

  // SVG dimensions
  const svgWidth = 800; // viewBox width for responsive scaling
  const chartHeight = showVolume ? height * 0.72 : height;
  const volumeHeight = showVolume ? height * 0.22 : 0;
  const topMargin = 20;
  const bottomMargin = 24;
  const pricePlotHeight = chartHeight - topMargin - bottomMargin;

  const candleSpacing = svgWidth / (candles.length + 1);
  const candleBodyWidth = Math.min(Math.max(candleSpacing * 0.65, 8), 34);

  // Price to Y coordinate conversion
  const priceToY = (price: number) => {
    return topMargin + (1 - (price - minPrice) / priceRange) * pricePlotHeight;
  };

  // 20-period moving average path calculation
  const emaCoords: { x: number; y: number }[] = [];
  let runningSum = 0;
  candles.forEach((c, i) => {
    runningSum += c.close;
    const avg = runningSum / (i + 1);
    const x = (i + 1) * candleSpacing;
    const y = priceToY(avg);
    emaCoords.push({ x, y });
  });

  let emaPath = '';
  if (emaCoords.length > 1) {
    emaPath = `M ${emaCoords[0].x} ${emaCoords[0].y}`;
    for (let i = 1; i < emaCoords.length; i++) {
      emaPath += ` L ${emaCoords[i].x} ${emaCoords[i].y}`;
    }
  }

  // Grid levels (5 horizontal price ticks)
  const priceTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => minPrice + pct * priceRange);

  return (
    <div className={`relative w-full bg-[#131211] rounded-2xl border border-[#D96B43]/20 overflow-hidden select-none ${className}`}>
      {/* Top Chart Header / HUD */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#1A1816] border-b border-[#D96B43]/15 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-[#F7EEDB]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
            LIVE CANDLE SIMULATOR
          </span>
          <span className="text-[#F7EEDB]/40">·</span>
          <span className="text-[#F59E0B] text-[11px] font-semibold flex items-center gap-1">
            <span className="w-3 h-0.5 bg-[#F59E0B] inline-block"></span> 20 EMA
          </span>
          {supportLevel && (
            <span className="text-[#8CB4E0] text-[11px] font-semibold flex items-center gap-1">
              <span className="w-3 h-0.5 bg-[#8CB4E0] inline-block border-b border-dashed border-[#8CB4E0]"></span> Support: ₹{supportLevel}
            </span>
          )}
          {resistanceLevel && (
            <span className="text-[#D96B43] text-[11px] font-semibold flex items-center gap-1">
              <span className="w-3 h-0.5 bg-[#D96B43] inline-block border-b border-dashed border-[#D96B43]"></span> Res: ₹{resistanceLevel}
            </span>
          )}
        </div>

        {/* Dynamic Candle Inspection readouts */}
        {hoveredCandle ? (
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#F7EEDB]/60">O: <strong className="text-[#F7EEDB]">₹{hoveredCandle.open.toFixed(1)}</strong></span>
            <span className="text-[#F7EEDB]/60">H: <strong className="text-[#22C55E]">₹{hoveredCandle.high.toFixed(1)}</strong></span>
            <span className="text-[#F7EEDB]/60">L: <strong className="text-[#EF4444]">₹{hoveredCandle.low.toFixed(1)}</strong></span>
            <span className="text-[#F7EEDB]/60">C: <strong className={hoveredCandle.close >= hoveredCandle.open ? 'text-[#22C55E]' : 'text-[#EF4444]'}>₹{hoveredCandle.close.toFixed(1)}</strong></span>
            {hoveredCandle.annotation && (
              <span className="px-1.5 py-0.5 rounded bg-[#D96B43]/20 text-[#D96B43] font-bold">
                {hoveredCandle.annotation}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-[#F7EEDB]/40 italic">
            Hover over any candle to inspect OHLC volume metrics
          </span>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto" style={{ height }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full block cursor-crosshair"
          onMouseLeave={() => {
            setHoveredCandle(null);
            setHoverX(null);
          }}
        >
          <defs>
            <linearGradient id="volGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="volRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Horizontal Background Grid & Price Labels */}
          {priceTicks.map((p, idx) => {
            const y = priceToY(p);
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1={0}
                  y1={y}
                  x2={svgWidth}
                  y2={y}
                  stroke="#25221F"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <text
                  x={svgWidth - 6}
                  y={y - 4}
                  fill="#F7EEDB"
                  fillOpacity={0.35}
                  fontSize={10}
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  ₹{p.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Key Reference Lines (Support / Resistance / Stop-Loss) */}
          {supportLevel && (
            <g>
              <line
                x1={0}
                y1={priceToY(supportLevel)}
                x2={svgWidth}
                y2={priceToY(supportLevel)}
                stroke="#8CB4E0"
                strokeWidth={1.8}
                strokeDasharray="6 4"
              />
              <rect
                x={svgWidth - 92}
                y={priceToY(supportLevel) - 10}
                width={88}
                height={18}
                rx={3}
                fill="#131211"
                stroke="#8CB4E0"
                strokeWidth={1}
              />
              <text
                x={svgWidth - 48}
                y={priceToY(supportLevel) + 3}
                fill="#8CB4E0"
                fontSize={9.5}
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                SUP ₹{supportLevel}
              </text>
            </g>
          )}

          {resistanceLevel && (
            <g>
              <line
                x1={0}
                y1={priceToY(resistanceLevel)}
                x2={svgWidth}
                y2={priceToY(resistanceLevel)}
                stroke="#D96B43"
                strokeWidth={1.8}
                strokeDasharray="6 4"
              />
              <rect
                x={svgWidth - 92}
                y={priceToY(resistanceLevel) - 10}
                width={88}
                height={18}
                rx={3}
                fill="#131211"
                stroke="#D96B43"
                strokeWidth={1}
              />
              <text
                x={svgWidth - 48}
                y={priceToY(resistanceLevel) + 3}
                fill="#D96B43"
                fontSize={9.5}
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                RES ₹{resistanceLevel}
              </text>
            </g>
          )}

          {stopLossLevel && (
            <g>
              <line
                x1={0}
                y1={priceToY(stopLossLevel)}
                x2={svgWidth}
                y2={priceToY(stopLossLevel)}
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              <text
                x={12}
                y={priceToY(stopLossLevel) - 4}
                fill="#EF4444"
                fontSize={10}
                fontFamily="monospace"
                fontWeight="bold"
              >
                STOP LOSS: ₹{stopLossLevel}
              </text>
            </g>
          )}

          {targetLevel && (
            <g>
              <line
                x1={0}
                y1={priceToY(targetLevel)}
                x2={svgWidth}
                y2={priceToY(targetLevel)}
                stroke="#22C55E"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              <text
                x={12}
                y={priceToY(targetLevel) - 4}
                fill="#22C55E"
                fontSize={10}
                fontFamily="monospace"
                fontWeight="bold"
              >
                TARGET: ₹{targetLevel}
              </text>
            </g>
          )}

          {/* 20 EMA Line */}
          {emaPath && (
            <path
              d={emaPath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          )}

          {/* Candlesticks Rendering */}
          {candles.map((candle, idx) => {
            const x = (idx + 1) * candleSpacing;
            const isBullish = candle.close >= candle.open;
            const color = isBullish ? '#22C55E' : '#EF4444';

            const highY = priceToY(candle.high);
            const lowY = priceToY(candle.low);
            const openY = priceToY(candle.open);
            const closeY = priceToY(candle.close);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 2);

            // Volume bar
            const volBarHeight = showVolume
              ? (candle.volume / maxVolume) * (volumeHeight - 12)
              : 0;
            const volBarY = height - 12 - volBarHeight;

            const isHovered = hoveredCandle === candle;

            return (
              <g key={`candle-${idx}`}>
                {/* Volume bar at bottom */}
                {showVolume && (
                  <rect
                    x={x - candleBodyWidth * 0.45}
                    y={volBarY}
                    width={candleBodyWidth * 0.9}
                    height={volBarHeight}
                    fill={isBullish ? 'url(#volGreen)' : 'url(#volRed)'}
                    stroke={color}
                    strokeWidth={0.8}
                    rx={1.5}
                  />
                )}

                {/* Upper and Lower Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={color}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />

                {/* Real Candle Body */}
                <rect
                  x={x - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={isBullish ? '#22C55E' : '#EF4444'}
                  stroke={color}
                  strokeWidth={1}
                  rx={2}
                  className={`transition-transform duration-150 ${isHovered ? 'scale-105' : ''}`}
                />

                {/* Annotation Badge if present on candle */}
                {candle.annotation && (
                  <g>
                    <line
                      x1={x}
                      y1={highY - 2}
                      x2={x}
                      y2={highY - 14}
                      stroke="#D96B43"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                    />
                    <rect
                      x={x - 48}
                      y={highY - 28}
                      width={96}
                      height={16}
                      rx={3}
                      fill="#1A1816"
                      stroke="#D96B43"
                      strokeWidth={1}
                    />
                    <text
                      x={x}
                      y={highY - 17}
                      fill="#D96B43"
                      fontSize={8.5}
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {candle.annotation}
                    </text>
                  </g>
                )}

                {/* Time label under candle */}
                <text
                  x={x}
                  y={height - 2}
                  fill="#F7EEDB"
                  fillOpacity={0.4}
                  fontSize={9}
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {candle.time}
                </text>

                {/* Wide invisible hit area for mouse hover */}
                <rect
                  x={x - candleSpacing / 2}
                  y={0}
                  width={candleSpacing}
                  height={height}
                  fill="transparent"
                  onMouseEnter={() => {
                    setHoveredCandle(candle);
                    setHoverX(x);
                  }}
                />
              </g>
            );
          })}

          {/* Active Crosshair Line on hover */}
          {hoverX !== null && (
            <line
              x1={hoverX}
              y1={0}
              x2={hoverX}
              y2={height}
              stroke="#F7EEDB"
              strokeDasharray="3 3"
              strokeWidth={1}
              opacity={0.35}
            />
          )}
        </svg>
      </div>
    </div>
  );
};
