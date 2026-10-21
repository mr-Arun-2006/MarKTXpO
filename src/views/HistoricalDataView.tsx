import React, { useState } from 'react';
import { StockData, SupportedLanguage } from '../types/market';
import { translations } from '../i18n/translations';
import {
  History,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';

interface Props {
  stocks: StockData[];
  selectedStock: StockData;
  setSelectedStock: (stock: StockData) => void;
  language: SupportedLanguage;
}

export const HistoricalDataView: React.FC<Props> = ({
  stocks,
  selectedStock,
  setSelectedStock,
  language,
}) => {
  const [daysCount, setDaysCount] = useState<number>(60);
  const t = translations[language];

  const candles = selectedStock.history.slice(-daysCount).reverse();

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Open', 'High', 'Low', 'NSE_Close', 'BSE_Close', 'Volume', 'Spread_Rupees'];
    const rows = candles.map((c) => [
      c.date,
      c.open,
      c.high,
      c.low,
      c.nseClose || c.close,
      c.bseClose || c.close,
      c.volume,
      ((c.nseClose || c.close) - (c.bseClose || c.close)).toFixed(2),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedStock.ticker}_NSE_BSE_EOD_${candles.length}D.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(candles, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `${selectedStock.ticker}_EOD_History.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-[#F7EEDB]">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D96B43]/15">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#D96B43]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#F7EEDB] tracking-tight">
              NSE &amp; BSE EOD Bhavcopy Historical Repository
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D96B43]/10 text-[#F7EEDB] border border-[#D96B43]/20 font-bold font-mono">
              DAILY OHLCV
            </span>
          </div>
          <p className="text-xs text-[#F7EEDB]/60 mt-1">
            Query, inspect, and export verified end-of-day dual-exchange transaction records.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D96B43]/25 bg-[#1A1816] text-xs font-semibold text-[#F7EEDB] hover:bg-[#25221F] transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#D96B43]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D96B43]/25 bg-[#1A1816] text-xs font-semibold text-[#F7EEDB] hover:bg-[#25221F] transition"
          >
            <FileCode className="w-4 h-4 text-[#F7EEDB]" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Query Bar */}
      <div className="p-4 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[#F7EEDB]/70 font-semibold">Selected Security:</span>
          <select
            value={selectedStock.ticker}
            onChange={(e) => {
              const st = stocks.find((s) => s.ticker === e.target.value);
              if (st) setSelectedStock(st);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#131211] border border-[#D96B43]/25 text-[#F7EEDB] font-bold"
          >
            {stocks.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} - {s.name} (BSE: {s.bseCode})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#131211] border border-[#D96B43]/20">
          {[30, 60, 90, 120].map((days) => (
            <button
              key={days}
              onClick={() => setDaysCount(days)}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                daysCount === days
                  ? 'bg-[#D96B43] text-[#131211] shadow-sm'
                  : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
              }`}
            >
              Last {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Table of Records */}
      <div className="rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#D96B43]/15 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#F7EEDB]">
            Daily OHLCV Candles for {selectedStock.ticker} ({selectedStock.name})
          </h2>
          <span className="text-xs text-[#F7EEDB]/60 font-mono">{candles.length} Trading Sessions</span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#131211] text-[#F7EEDB]/60 uppercase text-[10px] tracking-wider border-b border-[#D96B43]/15 sticky top-0">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Open (₹)</th>
                <th className="py-3 px-4 text-right">High (₹)</th>
                <th className="py-3 px-4 text-right">Low (₹)</th>
                <th className="py-3 px-4 text-right">NSE Close</th>
                <th className="py-3 px-4 text-right">BSE Close</th>
                <th className="py-3 px-4 text-right">Spread (NSE-BSE)</th>
                <th className="py-3 px-4 text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D96B43]/10">
              {candles.map((c) => {
                const diff = (c.nseClose || c.close) - (c.bseClose || c.close);
                const isBull = c.close >= c.open;
                return (
                  <tr key={c.date} className="hover:bg-[#25221F]/50 transition">
                    <td className="py-2.5 px-4 font-sans text-[#F7EEDB]/80">{c.date}</td>
                    <td className="py-2.5 px-4 text-right text-[#F7EEDB]/60">₹{c.open.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right text-[#D96B43]">₹{c.high.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right text-[#EF4444]">₹{c.low.toFixed(2)}</td>
                    <td className={`py-2.5 px-4 text-right font-bold ${isBull ? 'text-[#D96B43]' : 'text-[#EF4444]'}`}>
                      ₹{(c.nseClose || c.close).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-[#F7EEDB]">
                      ₹{(c.bseClose || c.close).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className={diff > 0 ? 'text-[#D96B43]' : diff < 0 ? 'text-[#F7EEDB]' : 'text-[#F7EEDB]/40'}>
                        {diff > 0 ? '+' : ''}₹{diff.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-[#F7EEDB]">
                      {(c.volume / 100000).toFixed(2)} L
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
