import React, { useState, useEffect, useRef } from 'react';
import { StockData } from '../types/market';
import { GameCandle } from '../data/tradingGameData';
import { GameCandleChart } from './GameCandleChart';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  TrendingUp,
  TrendingDown,
  Coins,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { playTradeSound, playClickSound, playSuccessSound, playErrorSound } from '../utils/soundEffects';

interface Props {
  stocks: StockData[];
  soundEnabled: boolean;
}

interface PaperPosition {
  id: string;
  ticker: string;
  stockName: string;
  type: 'BUY' | 'SHORT';
  shares: number;
  entryPrice: number;
  stopLoss?: number;
  target?: number;
  entryTime: string;
}

interface ClosedTrade {
  id: string;
  ticker: string;
  type: 'BUY' | 'SHORT';
  shares: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  exitTime: string;
}

export const PaperTradingSandbox: React.FC<Props> = ({ stocks, soundEnabled }) => {
  const [selectedTicker, setSelectedTicker] = useState('RELIANCE');
  const [capital, setCapital] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mxpo_paper_capital');
      if (saved) return parseFloat(saved);
    } catch {}
    return 1000000; // ₹10 Lakhs starting virtual cash
  });

  const [orderShares, setOrderShares] = useState(50);
  const [stopLossInput, setStopLossInput] = useState<string>('');
  const [targetInput, setTargetInput] = useState<string>('');

  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);

  // Simulation controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 5>(1);

  // Generated candle history for active stock
  const currentStock = stocks.find((s) => s.ticker === selectedTicker) || stocks[0];
  const basePrice = currentStock ? currentStock.currentPrice : 2900;

  const [candles, setCandles] = useState<GameCandle[]>(() => {
    // Generate initial 12 candles
    const initial: GameCandle[] = [];
    let p = basePrice * 0.985;
    const now = new Date();
    for (let i = 12; i >= 1; i--) {
      const open = p;
      const delta = (Math.sin(i * 1.7) * 0.008 + (Math.random() - 0.48) * 0.012) * p;
      const close = Math.round((open + delta) * 10) / 10;
      const high = Math.round((Math.max(open, close) + Math.random() * 0.006 * p) * 10) / 10;
      const low = Math.round((Math.min(open, close) - Math.random() * 0.006 * p) * 10) / 10;
      const vol = Math.floor(15000 + Math.random() * 45000);
      const timeStr = new Date(now.getTime() - i * 60000 * 5).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      initial.push({ time: timeStr, open, high, low, close, volume: vol });
      p = close;
    }
    return initial;
  });

  // Save capital
  useEffect(() => {
    try {
      localStorage.setItem('mxpo_paper_capital', capital.toString());
    } catch {}
  }, [capital]);

  // Current simulated live price
  const latestCandle = candles[candles.length - 1];
  const currentSimPrice = latestCandle ? latestCandle.close : basePrice;

  // Add next candle simulation tick
  const stepForwardCandle = () => {
    setCandles((prev) => {
      const last = prev[prev.length - 1];
      const open = last.close;
      // Intraday micro walk
      const volatility = 0.004 + (Math.random() * 0.005);
      const direction = (Math.random() - 0.47) > 0 ? 1 : -1;
      const delta = open * volatility * direction;
      const close = Math.round((open + delta) * 10) / 10;
      const high = Math.round((Math.max(open, close) + Math.random() * 0.004 * open) * 10) / 10;
      const low = Math.round((Math.min(open, close) - Math.random() * 0.004 * open) * 10) / 10;
      const vol = Math.floor(18000 + Math.random() * 50000);

      const d = new Date();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const newCandle: GameCandle = { time: timeStr, open, high, low, close, volume: vol };
      const updated = [...prev.slice(1), newCandle];

      // Check Stop-loss and Target triggers for open positions
      positions.forEach((pos) => {
        if (pos.ticker === selectedTicker) {
          if (pos.type === 'BUY') {
            if (pos.stopLoss && close <= pos.stopLoss) {
              closePosition(pos, close, 'Stop-Loss Triggered');
            } else if (pos.target && close >= pos.target) {
              closePosition(pos, close, 'Target Profit Triggered');
            }
          } else if (pos.type === 'SHORT') {
            if (pos.stopLoss && close >= pos.stopLoss) {
              closePosition(pos, close, 'Stop-Loss Triggered');
            } else if (pos.target && close <= pos.target) {
              closePosition(pos, close, 'Target Profit Triggered');
            }
          }
        }
      });

      return updated;
    });
  };

  // Timer for active auto-sim
  useEffect(() => {
    if (!isPlaying) return;
    const intervalTime = 2000 / simSpeed;
    const timer = setInterval(() => {
      stepForwardCandle();
    }, intervalTime);
    return () => clearInterval(timer);
  }, [isPlaying, simSpeed, positions, selectedTicker]);

  // Execute Order
  const handleOpenPosition = (type: 'BUY' | 'SHORT') => {
    const cost = currentSimPrice * orderShares;
    if (type === 'BUY' && cost > capital) {
      if (soundEnabled) playErrorSound();
      return;
    }

    const sl = stopLossInput ? parseFloat(stopLossInput) : undefined;
    const tgt = targetInput ? parseFloat(targetInput) : undefined;

    const newPos: PaperPosition = {
      id: `pos-${Date.now()}`,
      ticker: selectedTicker,
      stockName: currentStock.name,
      type,
      shares: orderShares,
      entryPrice: currentSimPrice,
      stopLoss: sl,
      target: tgt,
      entryTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (type === 'BUY') {
      setCapital((prev) => prev - cost);
    }

    setPositions((prev) => [newPos, ...prev]);
    if (soundEnabled) playTradeSound();
  };

  // Close Position
  const closePosition = (pos: PaperPosition, exitPrice: number, reason = 'Manual Exit') => {
    let pnl = 0;
    if (pos.type === 'BUY') {
      pnl = (exitPrice - pos.entryPrice) * pos.shares;
      setCapital((prev) => prev + exitPrice * pos.shares);
    } else {
      pnl = (pos.entryPrice - exitPrice) * pos.shares;
      setCapital((prev) => prev + pnl);
    }

    const pnlPct = Math.round((pnl / (pos.entryPrice * pos.shares)) * 1000) / 10;

    const closed: ClosedTrade = {
      id: `closed-${Date.now()}`,
      ticker: pos.ticker,
      type: pos.type,
      shares: pos.shares,
      entryPrice: pos.entryPrice,
      exitPrice,
      pnl: Math.round(pnl),
      pnlPct,
      exitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setPositions((prev) => prev.filter((p) => p.id !== pos.id));
    setClosedTrades((prev) => [closed, ...prev]);

    if (soundEnabled) {
      if (pnl >= 0) playSuccessSound();
      else playErrorSound();
    }
  };

  // Reset portfolio
  const handleResetPortfolio = () => {
    setCapital(1000000);
    setPositions([]);
    setClosedTrades([]);
    if (soundEnabled) playClickSound();
  };

  // Calculate live unrealized P&L
  const totalUnrealizedPnl = positions.reduce((acc, pos) => {
    const isCurrent = pos.ticker === selectedTicker;
    const price = isCurrent ? currentSimPrice : pos.entryPrice;
    const diff = pos.type === 'BUY' ? price - pos.entryPrice : pos.entryPrice - price;
    return acc + diff * pos.shares;
  }, 0);

  const totalRealizedPnl = closedTrades.reduce((acc, t) => acc + t.pnl, 0);

  return (
    <div className="space-y-5">
      {/* Simulation Controls & Capital Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#1A1816] border border-[#D96B43]/30 shadow-md">
          <span className="text-[11px] text-[#F7EEDB]/60 block font-mono">Virtual Cash Balance</span>
          <div className="text-xl font-bold font-mono text-[#F7EEDB] mt-1">
            ₹{capital.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-[#8CB4E0] font-mono">Paper Trading Funds</span>
        </div>

        <div className="p-4 rounded-xl bg-[#1A1816] border border-[#22C55E]/30 shadow-md">
          <span className="text-[11px] text-[#F7EEDB]/60 block font-mono">Open Positions P&L</span>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              totalUnrealizedPnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
            }`}
          >
            {totalUnrealizedPnl >= 0 ? '+' : ''}₹{Math.round(totalUnrealizedPnl).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#F7EEDB]/50 font-mono">{positions.length} active trade(s)</span>
        </div>

        <div className="p-4 rounded-xl bg-[#1A1816] border border-[#8CB4E0]/30 shadow-md">
          <span className="text-[11px] text-[#F7EEDB]/60 block font-mono">Realized P&L</span>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              totalRealizedPnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
            }`}
          >
            {totalRealizedPnl >= 0 ? '+' : ''}₹{Math.round(totalRealizedPnl).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#F7EEDB]/50 font-mono">{closedTrades.length} closed trade(s)</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#F7EEDB]/60">Candle Playback</span>
            <span className="text-[#22C55E] font-bold">{isPlaying ? 'LIVE' : 'PAUSED'}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg bg-[#25221F] hover:bg-[#D96B43]/20 text-[#F7EEDB] border border-[#D96B43]/30 transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={stepForwardCandle}
              className="p-1.5 rounded-lg bg-[#25221F] hover:bg-[#D96B43]/20 text-[#F7EEDB] border border-[#D96B43]/30 transition"
              title="Step 1 Candle Forward"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>
            {([1, 2, 5] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition ${
                  simSpeed === spd
                    ? 'bg-[#D96B43] text-[#131211]'
                    : 'bg-[#25221F] text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                }`}
              >
                {spd}x
              </button>
            ))}
            <button
              onClick={handleResetPortfolio}
              className="ml-auto p-1.5 rounded-lg text-[#F7EEDB]/50 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition"
              title="Reset Portfolio to ₹10L"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stock Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1A1816] p-3 rounded-xl border border-[#D96B43]/20">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-mono text-[#F7EEDB]/60 shrink-0">Simulate Stock:</span>
          {['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS', 'COALINDIA'].map((sym) => (
            <button
              key={sym}
              onClick={() => {
                setSelectedTicker(sym);
                if (soundEnabled) playClickSound();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition shrink-0 ${
                selectedTicker === sym
                  ? 'bg-[#D96B43] text-[#131211] shadow-md'
                  : 'bg-[#131211] text-[#F7EEDB]/70 hover:text-[#F7EEDB] border border-[#D96B43]/15'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#F7EEDB]/60">Simulated Price:</span>
          <span className="text-base font-bold text-[#F7EEDB]">₹{currentSimPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Interactive Candlestick Chart */}
      <GameCandleChart
        candles={candles}
        supportLevel={Math.round(basePrice * 0.98)}
        resistanceLevel={Math.round(basePrice * 1.02)}
        stopLossLevel={stopLossInput ? parseFloat(stopLossInput) : undefined}
        targetLevel={targetInput ? parseFloat(targetInput) : undefined}
        height={320}
      />

      {/* Trade Execution Order Panel */}
      <div className="p-4 rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#D96B43]/15 pb-2">
          <h3 className="text-xs font-bold text-[#F7EEDB] uppercase font-mono tracking-wider">
            Execute Student Paper Order ({selectedTicker})
          </h3>
          <span className="text-[11px] text-[#8CB4E0] font-mono">Zero Financial Risk</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <label className="text-[11px] text-[#F7EEDB]/60 block mb-1">Quantity (Shares)</label>
            <div className="flex items-center gap-1">
              {[25, 50, 100].map((qty) => (
                <button
                  key={qty}
                  onClick={() => setOrderShares(qty)}
                  className={`px-2 py-1 rounded text-xs transition ${
                    orderShares === qty
                      ? 'bg-[#D96B43] text-[#131211] font-bold'
                      : 'bg-[#131211] text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                  }`}
                >
                  {qty}
                </button>
              ))}
              <input
                type="number"
                value={orderShares}
                onChange={(e) => setOrderShares(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 rounded bg-[#131211] border border-[#D96B43]/30 text-[#F7EEDB] font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[#F7EEDB]/60 block mb-1">Stop-Loss (₹ Optional)</label>
            <input
              type="number"
              placeholder="e.g. 2910"
              value={stopLossInput}
              onChange={(e) => setStopLossInput(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#131211] border border-[#D96B43]/30 text-[#F7EEDB] font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] text-[#F7EEDB]/60 block mb-1">Target Price (₹ Optional)</label>
            <input
              type="number"
              placeholder="e.g. 2990"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#131211] border border-[#D96B43]/30 text-[#F7EEDB] font-mono text-xs"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => handleOpenPosition('BUY')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#22C55E] hover:bg-[#1ea750] text-[#131211] font-bold text-xs shadow-md transition"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>BUY LONG</span>
            </button>
            <button
              onClick={() => handleOpenPosition('SHORT')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#EF4444] hover:bg-[#dc2626] text-[#F7EEDB] font-bold text-xs shadow-md transition"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>SELL SHORT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Open Positions Table */}
      {positions.length > 0 && (
        <div className="rounded-xl bg-[#1A1816] border border-[#D96B43]/20 shadow-md overflow-hidden">
          <div className="px-4 py-2.5 bg-[#131211] border-b border-[#D96B43]/15 flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[#F7EEDB]">Active Paper Positions ({positions.length})</span>
            <span className="text-[#22C55E]">Simulated Live Floor</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] uppercase text-[#F7EEDB]/60 bg-[#131211]/50 border-b border-[#D96B43]/10">
                <tr>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Stock</th>
                  <th className="py-2.5 px-3 text-right">Shares</th>
                  <th className="py-2.5 px-3 text-right">Entry Price</th>
                  <th className="py-2.5 px-3 text-right">Current Price</th>
                  <th className="py-2.5 px-3 text-right">Live P&L</th>
                  <th className="py-2.5 px-3 text-center">SL / Target</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D96B43]/10">
                {positions.map((pos) => {
                  const isCur = pos.ticker === selectedTicker;
                  const price = isCur ? currentSimPrice : pos.entryPrice;
                  const pnl =
                    pos.type === 'BUY'
                      ? (price - pos.entryPrice) * pos.shares
                      : (pos.entryPrice - price) * pos.shares;
                  const pnlPct = (pnl / (pos.entryPrice * pos.shares)) * 100;

                  return (
                    <tr key={pos.id} className="hover:bg-[#25221F]/50">
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pos.type === 'BUY'
                              ? 'bg-[#22C55E]/15 text-[#22C55E]'
                              : 'bg-[#EF4444]/15 text-[#EF4444]'
                          }`}
                        >
                          {pos.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#F7EEDB]">{pos.ticker}</td>
                      <td className="py-2.5 px-3 text-right text-[#F7EEDB]/80">{pos.shares}</td>
                      <td className="py-2.5 px-3 text-right text-[#F7EEDB]/80">₹{pos.entryPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#F7EEDB]">₹{price.toFixed(2)}</td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          pnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                        }`}
                      >
                        {pnl >= 0 ? '+' : ''}₹{Math.round(pnl)} ({pnl >= 0 ? '+' : ''}
                        {pnlPct.toFixed(2)}%)
                      </td>
                      <td className="py-2.5 px-3 text-center text-[10px] text-[#F7EEDB]/60">
                        {pos.stopLoss ? `SL: ₹${pos.stopLoss}` : 'No SL'} ·{' '}
                        {pos.target ? `Tgt: ₹${pos.target}` : 'No Tgt'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => closePosition(pos, price, 'Manual Close')}
                          className="px-2.5 py-1 rounded-lg bg-[#EF4444]/20 hover:bg-[#EF4444] text-[#EF4444] hover:text-[#131211] font-bold text-[11px] transition"
                        >
                          Close Trade
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Closed Trades History */}
      {closedTrades.length > 0 && (
        <div className="rounded-xl bg-[#1A1816] border border-[#D96B43]/15 overflow-hidden">
          <div className="px-4 py-2 bg-[#131211] border-b border-[#D96B43]/10 text-xs font-mono text-[#F7EEDB]/60">
            Recent Session Closed Trades ({closedTrades.length})
          </div>
          <div className="divide-y divide-[#D96B43]/10 max-h-48 overflow-y-auto font-mono text-xs">
            {closedTrades.slice(0, 5).map((t) => (
              <div key={t.id} className="p-2.5 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold ${
                      t.type === 'BUY' ? 'text-[#22C55E]' : 'text-[#EF4444]'
                    }`}
                  >
                    {t.type} {t.ticker}
                  </span>
                  <span className="text-[11px] text-[#F7EEDB]/40">
                    {t.shares} shares @ ₹{t.entryPrice.toFixed(1)} ➔ ₹{t.exitPrice.toFixed(1)}
                  </span>
                </div>
                <div
                  className={`font-bold ${
                    t.pnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  }`}
                >
                  {t.pnl >= 0 ? '+' : ''}₹{t.pnl} ({t.pnl >= 0 ? '+' : ''}
                  {t.pnlPct}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
