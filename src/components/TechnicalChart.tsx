import React, { useState, useMemo } from 'react';
import { StockData, OHLCVCandle } from '../types/market';

interface Props {
  stock: StockData;
  height?: number;
  showIndicatorsControl?: boolean;
}

type ChartType = 'candlestick' | 'area' | 'line';
type Timeframe = '1W' | '1M' | '3M' | '6M' | '1Y';

export const TechnicalChart: React.FC<Props> = ({
  stock,
  height = 360,
  showIndicatorsControl = true,
}) => {
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('3M');
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showBSEOverlay, setShowBSEOverlay] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter candles based on timeframe
  const candles = useMemo(() => {
    const all = stock.history;
    const count =
      timeframe === '1W'
        ? 5
        : timeframe === '1M'
        ? 22
        : timeframe === '3M'
        ? 65
        : timeframe === '6M'
        ? 130
        : all.length;
    return all.slice(-count);
  }, [stock.history, timeframe]);

  const hasHistoricalBSEData = candles.some((c) => c.bseClose != null && Number.isFinite(c.bseClose));
  const showBSELine = showBSEOverlay && hasHistoricalBSEData;

  // Compute boundaries for chart
  const { minPrice, maxPrice, maxVol } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let volMax = 0;

    candles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.bseClose && c.bseClose < min) min = c.bseClose;
      if (c.bseClose && c.bseClose > max) max = c.bseClose;
      if (c.volume > volMax) volMax = c.volume;
    });

    const padding = (max - min) * 0.08 || 5;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      maxVol: volMax || 1,
    };
  }, [candles]);

  const activeCandle =
    hoverIndex !== null && candles[hoverIndex]
      ? candles[hoverIndex]
      : candles[candles.length - 1];

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = height;
  const mainHeight = svgHeight * 0.7;
  const volHeight = svgHeight * 0.16;

  const candleWidth = Math.max(3, Math.min(22, (svgWidth - 60) / candles.length - 3));
  const stepX = (svgWidth - 60) / Math.max(1, candles.length - 1);

  // Scale helpers
  const getY = (val: number) => {
    return mainHeight - ((val - minPrice) / (maxPrice - minPrice)) * (mainHeight - 20) - 10;
  };

  const getVolY = (vol: number) => {
    const bottom = mainHeight + volHeight;
    return bottom - (vol / maxVol) * (volHeight - 8);
  };

  // Moving Average path
  const computeMAPath = (period: number) => {
    const points: string[] = [];
    candles.forEach((c, i) => {
      if (i < period - 1) return;
      const slice = candles.slice(i - period + 1, i + 1);
      const avg = slice.reduce((acc, curr) => acc + curr.close, 0) / period;
      const x = 30 + i * stepX;
      const y = getY(avg);
      points.push(`${i === period - 1 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    });
    return points.join(' ');
  };

  const sma20Path = useMemo(() => computeMAPath(20), [candles, minPrice, maxPrice]);
  const sma50Path = useMemo(() => computeMAPath(50), [candles, minPrice, maxPrice]);

  // Only plot BSE history when the provider actually supplied BSE closes.
  const bseOverlayPath = useMemo(() => {
    const points = candles
      .map((c, i) => {
        if (c.bseClose == null || !Number.isFinite(c.bseClose)) return null;
        const x = 30 + i * stepX;
        const y = getY(c.bseClose);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .filter((point): point is string => point !== null);
    return points.join(' ');
  }, [candles, minPrice, maxPrice]);

  // Area / Line Path
  const linePath = useMemo(() => {
    return candles
      .map((c, i) => {
        const x = 30 + i * stepX;
        const y = getY(c.close);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [candles, minPrice, maxPrice]);

  const areaPath = useMemo(() => {
    if (!candles.length) return '';
    const firstX = 30;
    const lastX = 30 + (candles.length - 1) * stepX;
    return `${linePath} L ${lastX} ${mainHeight} L ${firstX} ${mainHeight} Z`;
  }, [linePath, candles.length, stepX, mainHeight]);

  return (
    <div className="w-full rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 p-4 shadow-xl backdrop-blur-md text-[#F7EEDB]">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D96B43]/15">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#F7EEDB] tracking-tight">{stock.ticker}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8CB4E0]/15 text-[#8CB4E0] border border-[#8CB4E0]/30 font-semibold font-mono">
                NSE &amp; BSE
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#F7EEDB]/60 mt-0.5">
              <span>{stock.name}</span>
              <span>·</span>
              <span className="text-[#8CB4E0] font-mono">BSE Code: {stock.bseCode}</span>
            </div>
          </div>
        </div>

        {/* Timeframe & Chart Style Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type */}
          <div className="flex items-center rounded-lg bg-[#131211] border border-[#D96B43]/20 p-0.5 text-xs">
            {(['candlestick', 'area', 'line'] as ChartType[]).map((t) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={`px-2.5 py-1 rounded-md capitalize transition font-medium ${
                  chartType === t
                    ? 'bg-[#D96B43] text-[#131211] font-bold shadow-sm'
                    : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Timeframes */}
          <div className="flex items-center rounded-lg bg-[#131211] border border-[#D96B43]/20 p-0.5 text-xs">
            {(['1W', '1M', '3M', '6M', '1Y'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-md transition font-medium ${
                  timeframe === tf
                    ? 'bg-[#8CB4E0] text-[#131211] font-bold'
                    : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Price & Crosshair Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs font-mono text-[#F7EEDB]/80 border-b border-[#D96B43]/10">
        <div className="flex items-center gap-4">
          <span className="text-[#F7EEDB]/50">
            Date: <strong className="text-[#F7EEDB]">{activeCandle?.date}</strong>
          </span>
          <span>
            O: <strong className="text-[#F7EEDB]">₹{activeCandle?.open.toFixed(2)}</strong>
          </span>
          <span>
            H: <strong className="text-[#22C55E]">₹{activeCandle?.high.toFixed(2)}</strong>
          </span>
          <span>
            L: <strong className="text-[#EF4444]">₹{activeCandle?.low.toFixed(2)}</strong>
          </span>
          <span>
            C:{' '}
            <strong className={activeCandle?.close >= activeCandle?.open ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
              ₹{activeCandle?.close.toFixed(2)}
            </strong>
          </span>
          {activeCandle?.bseClose && (
            <span className="text-[#8CB4E0]">
              BSE: <strong>₹{activeCandle.bseClose.toFixed(2)}</strong>
            </span>
          )}
        </div>

        {/* Indicator Toggles */}
        {showIndicatorsControl && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSMA20(!showSMA20)}
              className={`px-2 py-0.5 rounded text-[11px] border transition ${
                showSMA20
                  ? 'bg-[#8CB4E0]/20 border-[#8CB4E0] text-[#8CB4E0] font-semibold'
                  : 'border-[#D96B43]/15 text-[#F7EEDB]/40'
              }`}
            >
              SMA 20
            </button>
            <button
              onClick={() => setShowSMA50(!showSMA50)}
              className={`px-2 py-0.5 rounded text-[11px] border transition ${
                showSMA50
                  ? 'bg-[#D96B43]/20 border-[#D96B43] text-[#D96B43] font-semibold'
                  : 'border-[#D96B43]/15 text-[#F7EEDB]/40'
              }`}
            >
              SMA 50
            </button>
            <button
              onClick={() => setShowBSEOverlay(!showBSEOverlay)}
              disabled={!hasHistoricalBSEData}
              title={hasHistoricalBSEData ? 'Toggle BSE historical close overlay' : 'BSE historical close data is not available from the current provider'}
              className={`px-2 py-0.5 rounded text-[11px] border transition disabled:cursor-not-allowed disabled:opacity-40 ${
                showBSEOverlay && hasHistoricalBSEData
                  ? 'bg-[#F7EEDB]/20 border-[#F7EEDB] text-[#F7EEDB] font-semibold'
                  : 'border-[#D96B43]/15 text-[#F7EEDB]/40'
              }`}
            >
              {hasHistoricalBSEData ? 'BSE Spread' : 'BSE History N/A'}
            </button>
          </div>
        )}
      </div>

      {/* Main Interactive Chart Canvas SVG */}
      <div className="relative w-full overflow-hidden mt-2 select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * svgWidth;
            const idx = Math.round((relX - 30) / stepX);
            if (idx >= 0 && idx < candles.length) {
              setHoverIndex(idx);
            }
          }}
        >
          <defs>
            <linearGradient id="canyonChartAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.28" />
              <stop offset="90%" stopColor="#22C55E" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((pct, idx) => {
            const y = mainHeight * pct;
            const priceVal = maxPrice - pct * (maxPrice - minPrice);
            return (
              <g key={idx}>
                <line
                  x1="25"
                  y1={y}
                  x2={svgWidth - 10}
                  y2={y}
                  stroke="#282420"
                  strokeDasharray="3,3"
                  strokeWidth="1"
                />
                <text x={svgWidth - 55} y={y - 4} fill="#8C8176" fontSize="10" fontFamily="monospace">
                  ₹{priceVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Volume separator */}
          <line x1="25" y1={mainHeight} x2={svgWidth - 10} y2={mainHeight} stroke="#282420" strokeWidth="1" />

          {/* Volume bars (green for bullish, red for bearish) */}
          {candles.map((c, i) => {
            const x = 30 + i * stepX - candleWidth / 2;
            const y = getVolY(c.volume);
            const h = mainHeight + volHeight - y;
            const isBullish = c.close >= c.open;
            return (
              <rect
                key={`vol-${i}`}
                x={x}
                y={y}
                width={candleWidth}
                height={Math.max(2, h)}
                fill={isBullish ? '#22C55E' : '#EF4444'}
                opacity={hoverIndex === i ? 0.95 : 0.45}
              />
            );
          })}

          {/* Chart Rendering: Area */}
          {chartType === 'area' && (
            <>
              <path d={areaPath} fill="url(#canyonChartAreaGrad)" />
              <path d={linePath} fill="none" stroke="#22C55E" strokeWidth="2.2" />
            </>
          )}

          {/* Chart Rendering: Line */}
          {chartType === 'line' && (
            <path d={linePath} fill="none" stroke="#8CB4E0" strokeWidth="2.2" />
          )}

          {/* Chart Rendering: Candlesticks (Green & Red) */}
          {chartType === 'candlestick' &&
            candles.map((c, i) => {
              const x = 30 + i * stepX;
              const isBull = c.close >= c.open;
              const candleColor = isBull ? '#22C55E' : '#EF4444';
              const yHigh = getY(c.high);
              const yLow = getY(c.low);
              const yOpen = getY(c.open);
              const yClose = getY(c.close);
              const top = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

              return (
                <g key={`candle-${i}`}>
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={candleColor} strokeWidth="1.5" />
                  <rect
                    x={x - candleWidth / 2}
                    y={top}
                    width={candleWidth}
                    height={bodyHeight}
                    rx="1"
                    fill={candleColor}
                  />
                </g>
              );
            })}

          {/* Indicator SMA 20 (Morning Sky #8CB4E0) */}
          {showSMA20 && sma20Path && (
            <path d={sma20Path} fill="none" stroke="#8CB4E0" strokeWidth="1.6" strokeDasharray="4,2" />
          )}

          {/* Indicator SMA 50 (Canyon #D96B43) */}
          {showSMA50 && sma50Path && (
            <path d={sma50Path} fill="none" stroke="#D96B43" strokeWidth="1.6" />
          )}

          {/* BSE Overlay Comparison Line (Butter Cream #F7EEDB) */}
          {showBSELine && bseOverlayPath && (
            <path
              d={bseOverlayPath}
              fill="none"
              stroke="#F7EEDB"
              strokeWidth="1.4"
              strokeDasharray="3,3"
              opacity="0.8"
            />
          )}

          {/* Interactive Crosshair */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={30 + hoverIndex * stepX}
                y1={10}
                x2={30 + hoverIndex * stepX}
                y2={svgHeight - 10}
                stroke="#D96B43"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.65"
              />
              <line
                x1={25}
                y1={getY(activeCandle.close)}
                x2={svgWidth - 10}
                y2={getY(activeCandle.close)}
                stroke="#D96B43"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.65"
              />
              <circle
                cx={30 + hoverIndex * stepX}
                cy={getY(activeCandle.close)}
                r="4.5"
                fill="#F7EEDB"
                stroke="#D96B43"
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-2 px-2 text-[11px] text-[#F7EEDB]/70 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#22C55E] inline-block"></span>
            <span>Bullish / NSE Close (₹{stock.nsePrice})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444] inline-block"></span>
            <span>Bearish Close</span>
          </div>
          {showBSELine && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-[#F7EEDB] border border-[#F7EEDB] inline-block"></span>
              <span className="text-[#8CB4E0]">BSE Close (₹{stock.bsePrice}) [Spread: {stock.spreadPercent}%]</span>
            </div>
          )}
          {showSMA20 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-[#8CB4E0] inline-block"></span>
              <span className="text-[#8CB4E0]">20 DMA (₹{stock.dma20})</span>
            </div>
          )}
          {showSMA50 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-[#D96B43] inline-block"></span>
              <span className="text-[#D96B43]">50 DMA (₹{stock.dma50})</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[#F7EEDB]/60">RSI(14):</span>
            <span className="font-mono font-bold text-[#F7EEDB]">{stock.rsi}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
