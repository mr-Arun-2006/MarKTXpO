import React, { useState } from 'react';
import { StockData, SupportedLanguage } from '../types/market';
import { translations } from '../i18n/translations';
import {
  GitCompare,
  TrendingUp,
  AlertCircle,
  Calculator,
  Sparkles,
} from 'lucide-react';

interface Props {
  stocks: StockData[];
  selectedStock: StockData;
  setSelectedStock: (stock: StockData) => void;
  openAIExplanation: (stock: StockData) => void;
  language: SupportedLanguage;
}

export const CompareView: React.FC<Props> = ({
  stocks,
  selectedStock,
  setSelectedStock,
  openAIExplanation,
  language,
}) => {
  const [sharesQty, setSharesQty] = useState<number>(1000);
  const t = translations[language];

  const nsePrice = selectedStock.nsePrice;
  const bsePrice = selectedStock.bsePrice;
  const priceDiff = Math.round((nsePrice - bsePrice) * 100) / 100;
  const spreadPercent = selectedStock.spreadPercent;

  // Indicative last-quote spread only; executable costs and order-book depth are not available.
  const indicativeGrossSpread = Math.abs(priceDiff) * sharesQty;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-[#F7EEDB]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D96B43]/15">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#F7EEDB] tracking-tight">
              NSE vs. BSE Quote Comparison
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D96B43]/10 text-[#F7EEDB] border border-[#D96B43]/20 font-bold font-mono">
              QUOTE COMPARISON
            </span>
          </div>
          <p className="text-xs text-[#F7EEDB]/60 mt-1">
            Compare available third-party quote metadata. This page does not access synchronized live order books.
          </p>
        </div>

        {/* Stock Selector Pill Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#F7EEDB]/60">Select Security:</span>
          <select
            value={selectedStock.ticker}
            onChange={(e) => {
              const found = stocks.find((s) => s.ticker === e.target.value);
              if (found) setSelectedStock(found);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/25 text-xs font-bold text-[#F7EEDB] focus:outline-none focus:border-[#D96B43]"
          >
            {stocks.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} · BSE: {s.bseCode} ({s.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Dual Exchange Comparison Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* National Stock Exchange (NSE) Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/15">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#D96B43]/10 border border-[#D96B43]/30 flex items-center justify-center font-bold text-[#F7EEDB] text-xs">
                NSE
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F7EEDB]">National Stock Exchange</h3>
                <span className="text-[11px] text-[#F7EEDB]/60 font-mono">Series: EQ · Ticker: {selectedStock.ticker}</span>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#D96B43]/15 text-[#F7EEDB] font-semibold">
              Primary Liquidity
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[#F7EEDB]/60">NSE Quoted Price</span>
              <span className="text-2xl font-bold text-[#F7EEDB] font-mono">₹{nsePrice.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15">
                <span className="text-[#F7EEDB]/50">Trading Volume</span>
                <div className="text-sm font-bold text-[#F7EEDB] font-mono mt-0.5">
                  {(selectedStock.nseVolume / 100000).toFixed(2)} L Shares
                </div>
                <span className="text-[10px] text-[#D96B43]">Provider-reported volume</span>
              </div>

              <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15">
                <span className="text-[#F7EEDB]/50">Delivery Percentage</span>
                <div className="text-sm font-bold text-[#F7EEDB] font-mono mt-0.5">
                  {selectedStock.deliveryPercent != null ? `${selectedStock.deliveryPercent}%` : 'N/A'}
                </div>
                <span className="text-[10px] text-[#F7EEDB]/60">Delivery data</span>
              </div>

              <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15">
                <span className="text-[#F7EEDB]/50">Upper Circuit</span>
                <div className="text-sm font-bold text-[#F7EEDB] font-mono mt-0.5">
                  {selectedStock.upperCircuit != null ? `₹${selectedStock.upperCircuit.toFixed(2)}` : 'N/A'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15">
                <span className="text-[#F7EEDB]/50">Lower Circuit</span>
                <div className="text-sm font-bold text-[#EF4444] font-mono mt-0.5">
                  {selectedStock.lowerCircuit != null ? `₹${selectedStock.lowerCircuit.toFixed(2)}` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bombay Stock Exchange (BSE) Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/15">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#D96B43]/10 border border-[#D96B43]/30 flex items-center justify-center font-bold text-[#F7EEDB] text-xs">
                BSE
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F7EEDB]">Bombay Stock Exchange</h3>
                <span className="text-[11px] text-[#F7EEDB]/60 font-mono">Scrip Code: {selectedStock.bseCode}</span>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#D96B43]/15 text-[#F7EEDB] font-semibold">
              Secondary Hub
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[#F7EEDB]/60">BSE Quoted Price</span>
              <span className="text-2xl font-bold text-[#F7EEDB] font-mono">₹{bsePrice.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15">
                <span className="text-[#F7EEDB]/50">Trading Volume</span>
                <div className="text-sm font-bold text-[#F7EEDB] font-mono mt-0.5">
                  {(selectedStock.bseVolume / 100000).toFixed(2)} L Shares
                </div>
                <span className="text-[10px] text-[#D96B43]">Provider-reported volume</span>
              </div>

              <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15">
                <span className="text-[#F7EEDB]/50">Delivery Percentage</span>
                <div className="text-sm font-bold text-[#F7EEDB] font-mono mt-0.5">
                  {selectedStock.deliveryPercent != null ? `${selectedStock.deliveryPercent.toFixed(1)}%` : 'N/A'}
                </div>
                <span className="text-[10px] text-[#F7EEDB]/60">Delivery data</span>
              </div>

              <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15">
                <span className="text-[#F7EEDB]/50">Upper Circuit</span>
                <div className="text-sm font-bold text-[#F7EEDB] font-mono mt-0.5">
                  {selectedStock.upperCircuit != null ? `₹${selectedStock.upperCircuit.toFixed(2)}` : 'N/A'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15">
                <span className="text-[#F7EEDB]/50">Lower Circuit</span>
                <div className="text-sm font-bold text-[#EF4444] font-mono mt-0.5">
                  {selectedStock.lowerCircuit != null ? `₹${selectedStock.lowerCircuit.toFixed(2)}` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Net Arbitrage Capture Calculator */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/15">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#D96B43]" />
            <h2 className="text-base font-bold text-[#F7EEDB]">Net Arbitrage Capture Calculator</h2>
          </div>
          <button
            onClick={() => openAIExplanation(selectedStock)}
            className="flex items-center gap-1.5 text-xs text-[#D96B43] hover:text-[#F7EEDB] font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>AI Spread Thesis</span>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-center">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#F7EEDB]/70 font-semibold block mb-1.5">
                Simulation Share Quantity
              </label>
              <div className="flex items-center gap-2">
                {[250, 500, 1000, 2500].map((qty) => (
                  <button
                    key={qty}
                    onClick={() => setSharesQty(qty)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                      sharesQty === qty
                        ? 'bg-[#D96B43] text-[#131211] shadow-sm'
                        : 'bg-[#131211] text-[#F7EEDB] hover:bg-[#25221F]'
                    }`}
                  >
                    {qty}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-[#F7EEDB]/70 space-y-1">
              <div className="flex justify-between">
                <span>Spread per Share:</span>
                <span className="font-mono font-bold text-[#F7EEDB]">₹{Math.abs(priceDiff).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Spread Percentage:</span>
                <span className="font-mono font-bold text-[#F7EEDB]">{spreadPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span>Direction:</span>
                <span className="font-bold text-[#D96B43]">
                  {priceDiff > 0 ? 'NSE quote above BSE' : priceDiff < 0 ? 'BSE quote above NSE' : 'Quotes at parity'}
                </span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#131211] border border-[#D96B43]/15 text-center">
              <span className="text-xs text-[#F7EEDB]/50">Indicative Gross Spread</span>
              <div className="text-xl font-bold text-[#F7EEDB] font-mono mt-1">
                ₹{indicativeGrossSpread.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-[#F7EEDB]/40">Quote difference × quantity</span>
            </div>

            <div className="p-4 rounded-xl bg-[#131211] border border-[#D96B43]/15 text-center">
              <span className="text-xs text-[#F7EEDB]/50">Taxes, Fees &amp; Slippage</span>
              <div className="text-xl font-bold text-[#F7EEDB]/70 font-mono mt-1">N/A</div>
              <span className="text-[10px] text-[#F7EEDB]/40">Complete transaction costs unavailable</span>
            </div>

            <div className="p-4 rounded-xl bg-[#131211] border border-[#D96B43]/30 text-center">
              <span className="text-xs text-[#D96B43] font-bold">Executable Net P&amp;L</span>
              <div className="text-xl font-bold text-[#F7EEDB]/70 font-mono mt-1">Not calculated</div>
              <span className="text-[10px] text-[#F7EEDB]/50">No profit guarantee or trade signal</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-xs text-[#F7EEDB]/80 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#D96B43] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Execution Caveat:</strong> The displayed difference uses third-party last-quote data, not synchronized bid/ask prices or full order-book depth. Validate timestamps, market depth, exchange charges, taxes, brokerage and slippage before evaluating any trade.
          </p>
        </div>
      </div>
    </div>
  );
};
