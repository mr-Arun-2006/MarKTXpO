import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StockData } from '../types/market';
import {
  MousePointer,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpToLine,
  Trash2,
  Undo2,
  Eye,
  EyeOff,
  Tag,
  X,
  Check,
  MoveRight,
} from 'lucide-react';

interface Props {
  stock: StockData;
  height?: number;
  showIndicatorsControl?: boolean;
}

type ChartType = 'candlestick' | 'area' | 'line';
type Timeframe = '1W' | '1M' | '3M' | '6M' | '1Y';
type DrawingTool = 'cursor' | 'trendline' | 'support' | 'resistance';

export interface TrendlineAnnotation {
  id: string;
  type: 'trendline';
  startDate: string;
  startPrice: number;
  endDate: string;
  endPrice: number;
  color: string;
  label?: string;
  extendRight?: boolean;
  createdAt: number;
}

export interface LevelAnnotation {
  id: string;
  type: 'support' | 'resistance';
  price: number;
  date?: string;
  color: string;
  label?: string;
  createdAt: number;
}

export type ChartAnnotation = TrendlineAnnotation | LevelAnnotation;

const STORAGE_PREFIX = 'bharat_alpha_chart_annotations_v1_';

const ANNOTATION_COLORS = [
  { name: 'Canyon', value: '#D96B43' },
  { name: 'Sky', value: '#8CB4E0' },
  { name: 'Bullish', value: '#22C55E' },
  { name: 'Bearish', value: '#EF4444' },
  { name: 'Amber', value: '#F59E0B' },
];

function loadAnnotationsForTicker(ticker: string): ChartAnnotation[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${ticker}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAnnotationsForTicker(ticker: string, annotations: ChartAnnotation[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${ticker}`, JSON.stringify(annotations));
  } catch {
    // Ignore storage quota errors
  }
}

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
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);

  // Annotation states
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [selectedColor, setSelectedColor] = useState<string>('#D96B43');
  const [extendRay, setExtendRay] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>(() =>
    loadAnnotationsForTicker(stock.ticker)
  );
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState<string>('');

  // In-progress trendline drawing state
  const [draftStart, setDraftStart] = useState<{ date: string; price: number; index: number } | null>(null);

  // Dragging existing annotation state
  const [draggingHandle, setDraggingHandle] = useState<
    | { id: string; kind: 'start' | 'end' | 'level' }
    | null
  >(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Reload annotations when stock ticker changes
  useEffect(() => {
    setAnnotations(loadAnnotationsForTicker(stock.ticker));
    setSelectedAnnotationId(null);
    setEditingLabelId(null);
    setDraftStart(null);
    setDraggingHandle(null);
  }, [stock.ticker]);

  // Persist annotations to localStorage whenever they change
  useEffect(() => {
    saveAnnotationsForTicker(stock.ticker, annotations);
  }, [stock.ticker, annotations]);

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

  // Compute boundaries for chart (including level annotations if within reasonable range)
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

    const candleSpan = Math.max(1, max - min);
    if (showAnnotations) {
      annotations.forEach((ann) => {
        if (ann.type === 'support' || ann.type === 'resistance') {
          if (ann.price >= min - candleSpan * 0.35 && ann.price <= max + candleSpan * 0.35) {
            if (ann.price < min) min = ann.price;
            if (ann.price > max) max = ann.price;
          }
        } else if (ann.type === 'trendline') {
          [ann.startPrice, ann.endPrice].forEach((p) => {
            if (p >= min - candleSpan * 0.35 && p <= max + candleSpan * 0.35) {
              if (p < min) min = p;
              if (p > max) max = p;
            }
          });
        }
      });
    }

    const padding = (max - min) * 0.08 || 5;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      maxVol: volMax || 1,
    };
  }, [candles, annotations, showAnnotations]);

  const activeCandle =
    hoverIndex !== null && candles[hoverIndex]
      ? candles[hoverIndex]
      : candles[candles.length - 1];

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = height;
  const mainHeight = svgHeight * 0.72;
  const volHeight = svgHeight * 0.16;

  const candleWidth = Math.max(3, Math.min(22, (svgWidth - 60) / Math.max(1, candles.length) - 3));
  const stepX = (svgWidth - 60) / Math.max(1, candles.length - 1);

  // Scale helpers
  const getY = (val: number) => {
    return mainHeight - ((val - minPrice) / Math.max(0.0001, maxPrice - minPrice)) * (mainHeight - 20) - 10;
  };

  const getPriceFromY = (y: number) => {
    const clampedY = Math.max(10, Math.min(mainHeight - 10, y));
    const ratio = (mainHeight - 10 - clampedY) / Math.max(1, mainHeight - 20);
    const rawPrice = minPrice + ratio * (maxPrice - minPrice);
    return Math.round(rawPrice * 100) / 100;
  };

  const getVolY = (vol: number) => {
    const bottom = mainHeight + volHeight;
    return bottom - (vol / maxVol) * (volHeight - 8);
  };

  // Map a candle date to an X coordinate on the current timeframe slice
  const getXForDate = (dateStr: string): number | null => {
    if (!candles.length) return null;
    const exactIdx = candles.findIndex((c) => c.date === dateStr);
    if (exactIdx !== -1) {
      return 30 + exactIdx * stepX;
    }
    // If date is before the first visible candle or after the last visible candle, interpolate/clamp
    if (dateStr < candles[0].date) {
      return 30;
    }
    if (dateStr > candles[candles.length - 1].date) {
      return 30 + (candles.length - 1) * stepX;
    }
    // Find nearest candle date
    for (let i = 0; i < candles.length - 1; i++) {
      if (candles[i].date <= dateStr && candles[i + 1].date >= dateStr) {
        return 30 + (i + 0.5) * stepX;
      }
    }
    return null;
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
    const points: string[] = [];
    candles.forEach((c, i) => {
      if (c.bseClose == null || !Number.isFinite(c.bseClose)) return;
      const x = 30 + i * stepX;
      const y = getY(c.bseClose);
      points.push(`${points.length === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    });
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

  // Convert client pointer event to SVG coordinates, candle index, and price
  const getPointerChartCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current || !candles.length) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * svgWidth;
    const relY = ((clientY - rect.top) / rect.height) * svgHeight;
    const idx = Math.max(0, Math.min(candles.length - 1, Math.round((relX - 30) / stepX)));
    const price = getPriceFromY(relY);
    return {
      relX,
      relY,
      idx,
      date: candles[idx].date,
      price,
    };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    const coords = getPointerChartCoords(clientX, clientY);
    if (!coords) return;

    setHoverIndex(coords.idx);
    if (coords.relY <= mainHeight) {
      setHoverPrice(coords.price);
    } else {
      setHoverPrice(null);
    }

    // Update dragged annotation in real time
    if (draggingHandle) {
      setAnnotations((prev) =>
        prev.map((ann) => {
          if (ann.id !== draggingHandle.id) return ann;
          if (ann.type === 'trendline') {
            if (draggingHandle.kind === 'start') {
              return { ...ann, startDate: coords.date, startPrice: coords.price };
            }
            if (draggingHandle.kind === 'end') {
              return { ...ann, endDate: coords.date, endPrice: coords.price };
            }
          } else if (
            (ann.type === 'support' || ann.type === 'resistance') &&
            draggingHandle.kind === 'level'
          ) {
            return { ...ann, price: coords.price };
          }
          return ann;
        })
      );
    }
  };

  const handleCanvasClick = (clientX: number, clientY: number) => {
    if (draggingHandle) {
      setDraggingHandle(null);
      return;
    }

    const coords = getPointerChartCoords(clientX, clientY);
    if (!coords || coords.relY > mainHeight) return;

    if (activeTool === 'support' || activeTool === 'resistance') {
      const isSupport = activeTool === 'support';
      const newLevel: LevelAnnotation = {
        id: `lvl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: activeTool,
        price: coords.price,
        date: coords.date,
        color: isSupport ? '#22C55E' : '#EF4444',
        label: isSupport ? 'Support' : 'Resistance',
        createdAt: Date.now(),
      };
      setAnnotations((prev) => [...prev, newLevel]);
      setSelectedAnnotationId(newLevel.id);
      setShowAnnotations(true);
      return;
    }

    if (activeTool === 'trendline') {
      if (!draftStart) {
        setDraftStart({
          date: coords.date,
          price: coords.price,
          index: coords.idx,
        });
      } else {
        // Complete trendline
        const newTrendline: TrendlineAnnotation = {
          id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'trendline',
          startDate: draftStart.date,
          startPrice: draftStart.price,
          endDate: coords.date,
          endPrice: coords.price,
          color: selectedColor,
          extendRight: extendRay,
          label: 'Trendline',
          createdAt: Date.now(),
        };
        setAnnotations((prev) => [...prev, newTrendline]);
        setSelectedAnnotationId(newTrendline.id);
        setDraftStart(null);
        setShowAnnotations(true);
      }
      return;
    }

    // In cursor mode, clicking empty canvas deselects
    setSelectedAnnotationId(null);
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
    if (editingLabelId === id) setEditingLabelId(null);
  };

  const handleUndoLast = () => {
    if (draftStart) {
      setDraftStart(null);
      return;
    }
    setAnnotations((prev) => prev.slice(0, -1));
    setSelectedAnnotationId(null);
  };

  const handleClearAll = () => {
    setDraftStart(null);
    setAnnotations([]);
    setSelectedAnnotationId(null);
    setEditingLabelId(null);
  };

  const handleSaveLabel = (id: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, label: labelDraft.trim() || undefined } : a))
    );
    setEditingLabelId(null);
  };

  const handleToggleRay = (id: string) => {
    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === id && a.type === 'trendline' ? { ...a, extendRight: !a.extendRight } : a
      )
    );
  };

  return (
    <div className="w-full rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 p-3.5 sm:p-4 shadow-xl backdrop-blur-md text-[#F7EEDB]">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D96B43]/15">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#F7EEDB] tracking-tight">{stock.ticker}</span>
              <span className="text-[11px] text-[#8CB4E0] font-semibold font-mono">
                NSE · BSE
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

      {/* Annotation Drawing Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 border-b border-[#D96B43]/15 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-lg bg-[#131211] border border-[#D96B43]/20 p-0.5">
            <button
              type="button"
              onClick={() => {
                setActiveTool('cursor');
                setDraftStart(null);
              }}
              title="Inspect & Select Annotations"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition font-medium ${
                activeTool === 'cursor'
                  ? 'bg-[#F7EEDB] text-[#131211] font-bold'
                  : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB]'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Cursor</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('trendline');
                setDraftStart(null);
              }}
              title="Draw Trendline (click start point, then click end point)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition font-medium ${
                activeTool === 'trendline'
                  ? 'bg-[#D96B43] text-[#131211] font-bold'
                  : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Trendline</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('support');
                setDraftStart(null);
              }}
              title="Place Horizontal Support Marker"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition font-medium ${
                activeTool === 'support'
                  ? 'bg-[#22C55E] text-[#131211] font-bold'
                  : 'text-[#22C55E]/80 hover:text-[#22C55E]'
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Support</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('resistance');
                setDraftStart(null);
              }}
              title="Place Horizontal Resistance Marker"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition font-medium ${
                activeTool === 'resistance'
                  ? 'bg-[#EF4444] text-[#131211] font-bold'
                  : 'text-[#EF4444]/80 hover:text-[#EF4444]'
              }`}
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
              <span>Resistance</span>
            </button>
          </div>

          {/* Trendline Options: Color Swatches & Ray Extension */}
          {activeTool === 'trendline' && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#131211] border border-[#D96B43]/20">
              {ANNOTATION_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  title={`Trendline Color: ${c.name}`}
                  className={`w-4 h-4 rounded-full transition transform ${
                    selectedColor === c.value
                      ? 'scale-110 ring-2 ring-[#F7EEDB] ring-offset-1 ring-offset-[#131211]'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
              <span className="text-[#F7EEDB]/20 mx-0.5">|</span>
              <button
                type="button"
                onClick={() => setExtendRay(!extendRay)}
                title="Extend trendline ray to right edge"
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono transition ${
                  extendRay
                    ? 'bg-[#8CB4E0]/20 text-[#8CB4E0] border border-[#8CB4E0]/40 font-semibold'
                    : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                }`}
              >
                <MoveRight className="w-3 h-3" />
                <span>Ray</span>
              </button>
            </div>
          )}

          {/* Contextual instruction helper */}
          {activeTool !== 'cursor' && (
            <span className="text-[11px] text-[#8CB4E0] font-mono px-1.5">
              {activeTool === 'trendline'
                ? draftStart
                  ? `Click second point on chart (Start: ₹${draftStart.price.toFixed(2)})`
                  : 'Click first anchor point on chart'
                : `Click chart to place ${activeTool} level${hoverPrice ? ` at ₹${hoverPrice.toFixed(2)}` : ''}`}
            </span>
          )}
        </div>

        {/* Right Annotation Controls: Visibility, Undo, Clear */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-[#F7EEDB]/50 mr-1">
            Saved ({stock.ticker}): <strong className="text-[#F7EEDB]">{annotations.length}</strong>
          </span>

          <button
            type="button"
            onClick={() => setShowAnnotations(!showAnnotations)}
            disabled={annotations.length === 0}
            title={showAnnotations ? 'Hide Annotations' : 'Show Annotations'}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB]/80 hover:text-[#F7EEDB] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {showAnnotations ? <Eye className="w-3.5 h-3.5 text-[#8CB4E0]" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{showAnnotations ? 'Visible' : 'Hidden'}</span>
          </button>

          <button
            type="button"
            onClick={handleUndoLast}
            disabled={annotations.length === 0 && !draftStart}
            title="Undo Last Annotation"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB]/80 hover:text-[#F7EEDB] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={annotations.length === 0 && !draftStart}
            title={`Clear all annotations for ${stock.ticker}`}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#131211] border border-[#EF4444]/30 text-[#EF4444]/85 hover:bg-[#EF4444]/15 hover:text-[#EF4444] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Floating Price & Crosshair Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs font-mono text-[#F7EEDB]/80 border-b border-[#D96B43]/10">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
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
              title={
                hasHistoricalBSEData
                  ? 'Toggle BSE historical close overlay'
                  : 'BSE historical close data is not available from the current provider'
              }
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
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className={`w-full h-auto touch-none ${
            activeTool === 'cursor' ? 'cursor-crosshair' : 'cursor-cell'
          }`}
          onMouseLeave={() => {
            setHoverIndex(null);
            setHoverPrice(null);
            setDraggingHandle(null);
          }}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={() => {
            if (draggingHandle) setDraggingHandle(null);
          }}
          onClick={(e) => handleCanvasClick(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              const touch = e.touches[0];
              handlePointerMove(touch.clientX, touch.clientY);
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 1) {
              const touch = e.touches[0];
              handlePointerMove(touch.clientX, touch.clientY);
            }
          }}
          onTouchEnd={(e) => {
            if (draggingHandle) {
              setDraggingHandle(null);
              return;
            }
            if (e.changedTouches.length === 1 && activeTool !== 'cursor') {
              const touch = e.changedTouches[0];
              handleCanvasClick(touch.clientX, touch.clientY);
            }
          }}
        >
          <defs>
            <linearGradient id="canyonChartAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.28" />
              <stop offset="90%" stopColor="#22C55E" stopOpacity="0.0" />
            </linearGradient>
            <clipPath id="mainPricePaneClip">
              <rect x="20" y="0" width={svgWidth - 30} height={mainHeight} />
            </clipPath>
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
                <text x={svgWidth - 58} y={y - 4} fill="#8C8176" fontSize="10" fontFamily="monospace">
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

          {/* Persisted User Annotations Layer */}
          {showAnnotations && (
            <g clipPath="url(#mainPricePaneClip)">
              {annotations.map((ann) => {
                const isSelected = selectedAnnotationId === ann.id;

                if (ann.type === 'support' || ann.type === 'resistance') {
                  const y = getY(ann.price);
                  const isSupport = ann.type === 'support';
                  const strokeCol = ann.color || (isSupport ? '#22C55E' : '#EF4444');
                  const tagText = `${ann.label || (isSupport ? 'Support' : 'Resistance')} · ₹${ann.price.toFixed(2)}`;

                  return (
                    <g
                      key={ann.id}
                      className="cursor-ns-resize"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnnotationId(ann.id);
                      }}
                      onMouseDown={(e) => {
                        if (activeTool === 'cursor') {
                          e.stopPropagation();
                          setSelectedAnnotationId(ann.id);
                          setDraggingHandle({ id: ann.id, kind: 'level' });
                        }
                      }}
                    >
                      {/* Invisible wider hit target for effortless selection/dragging */}
                      <line
                        x1={25}
                        y1={y}
                        x2={svgWidth - 12}
                        y2={y}
                        stroke="transparent"
                        strokeWidth="12"
                      />
                      {/* Shaded zone band */}
                      <rect
                        x={25}
                        y={isSupport ? y : y - 6}
                        width={svgWidth - 37}
                        height={6}
                        fill={strokeCol}
                        opacity={isSelected ? 0.18 : 0.08}
                      />
                      {/* Horizontal Support/Resistance line */}
                      <line
                        x1={25}
                        y1={y}
                        x2={svgWidth - 12}
                        y2={y}
                        stroke={strokeCol}
                        strokeWidth={isSelected ? '2.4' : '1.7'}
                        strokeDasharray={isSupport ? '6,3' : '4,3'}
                      />
                      {/* Price & Label Callout Tag on Left */}
                      <rect
                        x={28}
                        y={Math.max(4, y - 18)}
                        width={Math.min(240, tagText.length * 6.4 + 14)}
                        height={15}
                        rx="3"
                        fill="#131211"
                        stroke={strokeCol}
                        strokeWidth={isSelected ? '1.4' : '0.9'}
                        opacity="0.92"
                      />
                      <text
                        x={34}
                        y={Math.max(14, y - 7)}
                        fill={strokeCol}
                        fontSize="9.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {tagText}
                      </text>
                    </g>
                  );
                }

                if (ann.type === 'trendline') {
                  const x1 = getXForDate(ann.startDate);
                  const x2 = getXForDate(ann.endDate);
                  if (x1 === null || x2 === null) return null;
                  const y1 = getY(ann.startPrice);
                  const y2 = getY(ann.endPrice);

                  // Compute ray extension if enabled
                  let renderX2 = x2;
                  let renderY2 = y2;
                  if (ann.extendRight && x2 !== x1) {
                    const targetX = svgWidth - 15;
                    if (targetX > x1) {
                      const slope = (y2 - y1) / (x2 - x1);
                      renderX2 = targetX;
                      renderY2 = y1 + slope * (targetX - x1);
                    }
                  }

                  const pctDiff = ((ann.endPrice - ann.startPrice) / Math.max(0.01, ann.startPrice)) * 100;
                  const pctStr = `${pctDiff >= 0 ? '+' : ''}${pctDiff.toFixed(2)}%`;
                  const midX = (x1 + x2) / 2;
                  const midY = (y1 + y2) / 2;

                  return (
                    <g
                      key={ann.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnnotationId(ann.id);
                      }}
                    >
                      {/* Invisible wider hit line */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={renderX2}
                        y2={renderY2}
                        stroke="transparent"
                        strokeWidth="12"
                      />
                      {/* Primary Trendline */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={renderX2}
                        y2={renderY2}
                        stroke={ann.color}
                        strokeWidth={isSelected ? '2.8' : '2'}
                        strokeLinecap="round"
                      />
                      {/* Midpoint label & percentage slope */}
                      <g transform={`translate(${midX}, ${Math.max(16, midY - 8)})`}>
                        <rect
                          x={-48}
                          y={-11}
                          width={96}
                          height={15}
                          rx="3"
                          fill="#131211"
                          stroke={ann.color}
                          strokeWidth="0.9"
                          opacity="0.9"
                        />
                        <text
                          x={0}
                          y={0}
                          textAnchor="middle"
                          fill={ann.color}
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {(ann.label ? `${ann.label.slice(0, 8)} ` : '') + pctStr}
                        </text>
                      </g>

                      {/* Draggable Start & End Anchor Handles */}
                      <circle
                        cx={x1}
                        cy={y1}
                        r={isSelected ? 5.5 : 4}
                        fill="#131211"
                        stroke={ann.color}
                        strokeWidth="2"
                        className="cursor-move"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedAnnotationId(ann.id);
                          setDraggingHandle({ id: ann.id, kind: 'start' });
                        }}
                      />
                      <circle
                        cx={x2}
                        cy={y2}
                        r={isSelected ? 5.5 : 4}
                        fill="#F7EEDB"
                        stroke={ann.color}
                        strokeWidth="2"
                        className="cursor-move"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedAnnotationId(ann.id);
                          setDraggingHandle({ id: ann.id, kind: 'end' });
                        }}
                      />
                    </g>
                  );
                }

                return null;
              })}

              {/* Live Preview while drawing a Trendline */}
              {activeTool === 'trendline' && draftStart && hoverIndex !== null && hoverPrice !== null && (
                <g>
                  <line
                    x1={30 + draftStart.index * stepX}
                    y1={getY(draftStart.price)}
                    x2={30 + hoverIndex * stepX}
                    y2={getY(hoverPrice)}
                    stroke={selectedColor}
                    strokeWidth="2"
                    strokeDasharray="5,3"
                  />
                  <circle
                    cx={30 + draftStart.index * stepX}
                    cy={getY(draftStart.price)}
                    r="4.5"
                    fill="#F7EEDB"
                    stroke={selectedColor}
                    strokeWidth="2"
                  />
                  <circle
                    cx={30 + hoverIndex * stepX}
                    cy={getY(hoverPrice)}
                    r="4.5"
                    fill={selectedColor}
                    stroke="#131211"
                    strokeWidth="1.5"
                  />
                  <text
                    x={30 + hoverIndex * stepX + 8}
                    y={Math.max(15, getY(hoverPrice) - 6)}
                    fill={selectedColor}
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    ₹{hoverPrice.toFixed(2)} (
                    {(((hoverPrice - draftStart.price) / Math.max(0.01, draftStart.price)) * 100).toFixed(2)}%)
                  </text>
                </g>
              )}

              {/* Live Preview while placing a Support or Resistance marker */}
              {(activeTool === 'support' || activeTool === 'resistance') && hoverPrice !== null && (
                <g>
                  <line
                    x1={25}
                    y1={getY(hoverPrice)}
                    x2={svgWidth - 12}
                    y2={getY(hoverPrice)}
                    stroke={activeTool === 'support' ? '#22C55E' : '#EF4444'}
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    opacity="0.85"
                  />
                  <rect
                    x={svgWidth - 125}
                    y={Math.max(4, getY(hoverPrice) - 16)}
                    width={110}
                    height={15}
                    rx="3"
                    fill="#131211"
                    stroke={activeTool === 'support' ? '#22C55E' : '#EF4444'}
                    strokeWidth="1"
                  />
                  <text
                    x={svgWidth - 70}
                    y={Math.max(14, getY(hoverPrice) - 5)}
                    textAnchor="middle"
                    fill={activeTool === 'support' ? '#22C55E' : '#EF4444'}
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {activeTool === 'support' ? 'SUP' : 'RES'} ₹{hoverPrice.toFixed(2)}
                  </text>
                </g>
              )}
            </g>
          )}

          {/* Interactive Crosshair */}
          {hoverIndex !== null && activeCandle && (
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
                y1={hoverPrice !== null && activeTool !== 'cursor' ? getY(hoverPrice) : getY(activeCandle.close)}
                x2={svgWidth - 10}
                y2={hoverPrice !== null && activeTool !== 'cursor' ? getY(hoverPrice) : getY(activeCandle.close)}
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

        {/* Saved Annotations Manager Strip (Persisted per Stock in localStorage) */}
        {annotations.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-[#D96B43]/15 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#F7EEDB]/70 px-1">
              <span>
                Persisted Annotations for <strong className="text-[#F7EEDB]">{stock.ticker}</strong> (Drag handles on chart to adjust)
              </span>
              <span className="text-[#8CB4E0]">Auto-saved to device</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {annotations.map((ann) => {
                const isSelected = selectedAnnotationId === ann.id;
                const isEditing = editingLabelId === ann.id;

                const summaryText =
                  ann.type === 'trendline'
                    ? `₹${ann.startPrice.toFixed(1)} → ₹${ann.endPrice.toFixed(1)}`
                    : `₹${ann.price.toFixed(2)}`;

                return (
                  <div
                    key={ann.id}
                    onClick={() => setSelectedAnnotationId(ann.id)}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#25221F] border-[#D96B43] text-[#F7EEDB]'
                        : 'bg-[#131211] border-[#D96B43]/20 text-[#F7EEDB]/80 hover:border-[#D96B43]/50'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ann.color }}
                    />

                    {isEditing ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={labelDraft}
                          onChange={(e) => setLabelDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveLabel(ann.id);
                            if (e.key === 'Escape') setEditingLabelId(null);
                          }}
                          placeholder="Label..."
                          className="w-24 px-1.5 py-0.5 rounded bg-[#1A1816] border border-[#D96B43]/40 text-[11px] text-[#F7EEDB] focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveLabel(ann.id)}
                          className="text-[#22C55E] hover:text-[#22C55E]/80 p-0.5"
                          title="Save Label"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-semibold text-[11px]">
                          {ann.label || (ann.type === 'trendline' ? 'Trendline' : ann.type === 'support' ? 'Support' : 'Resistance')}
                        </span>
                        <span className="text-[#F7EEDB]/60 text-[11px]">{summaryText}</span>
                      </>
                    )}

                    {ann.type === 'trendline' && !isEditing && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRay(ann.id);
                        }}
                        title="Toggle Ray Extension"
                        className={`p-0.5 rounded transition ${
                          ann.extendRight ? 'text-[#8CB4E0]' : 'text-[#F7EEDB]/40 hover:text-[#F7EEDB]'
                        }`}
                      >
                        <MoveRight className="w-3 h-3" />
                      </button>
                    )}

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLabelId(ann.id);
                          setLabelDraft(ann.label || '');
                        }}
                        title="Edit Label"
                        className="text-[#F7EEDB]/45 hover:text-[#F7EEDB] p-0.5"
                      >
                        <Tag className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAnnotation(ann.id);
                      }}
                      title="Delete Annotation"
                      className="text-[#EF4444]/70 hover:text-[#EF4444] p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-2.5 pt-2 border-t border-[#D96B43]/10 px-1 text-[11px] text-[#F7EEDB]/70 font-mono">
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
