import React, { useState, useMemo } from 'react';
import { SectorIndex, StockData, SupportedLanguage } from '../types/market';
import { translations } from '../i18n/translations';
import { SectorPerformanceHeatmap } from '../components/SectorPerformanceHeatmap';
import {
  Layers,
  Compass,
  TableProperties,
} from 'lucide-react';

interface Props {
  stocks: StockData[];
  onSelectStock: (stock: StockData) => void;
  openAIExplanation: (stock: StockData) => void;
  language: SupportedLanguage;
}

export const SectorAnalysisView: React.FC<Props> = ({
  stocks,
  onSelectStock,
  openAIExplanation,
  language,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const t = translations[language];

  // Indicative sector aggregates are calculated from the currently fetched quote set.
  // They are not official sector-index returns or evidence of institutional flows.
  const sectorIndices: SectorIndex[] = useMemo(() => {
    const groups = new Map<string, StockData[]>();
    stocks.forEach((stock) => {
      const group = groups.get(stock.sector) || [];
      group.push(stock);
      groups.set(stock.sector, group);
    });

    const round = (value: number) => Math.round(value * 100) / 100;
    return Array.from(groups.entries()).map(([name, members]) => {
      const changePercent = members.reduce((sum, stock) => sum + stock.changePercent, 0) / members.length;
      const peValues = members.map((stock) => stock.pe).filter((value) => Number.isFinite(value) && value > 0);
      const pe = peValues.length ? peValues.reduce((sum, value) => sum + value, 0) / peValues.length : 0;
      const top = [...members].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0];
      const status: SectorIndex['status'] = changePercent >= 1
        ? 'Leading'
        : changePercent > 0
          ? 'Improving'
          : changePercent <= -1
            ? 'Lagging'
            : 'Weakening';
      return {
        name,
        changePercent: round(changePercent),
        pe: round(pe),
        marketCapRatio: 0,
        status,
        topStock: top?.ticker || '',
        momentumScore: Math.max(0, Math.min(100, Math.round(50 + changePercent * 10))),
        stocksCount: members.length,
      };
    }).sort((a, b) => b.changePercent - a.changePercent);
  }, [stocks]);

  const filteredSectors = sectorIndices.filter(
    (sec) => selectedStatus === 'ALL' || sec.status === selectedStatus
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-[#F7EEDB]">
      {/* Visual Sector Performance Heatmap */}
      <SectorPerformanceHeatmap
        stocks={stocks}
        onSelectStock={onSelectStock}
        openAIExplanation={openAIExplanation}
        language={language}
      />

      {/* Title for Rotation Quadrants */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#D96B43]/15 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#D96B43]" />
            <h2 className="text-lg sm:text-xl font-bold text-[#F7EEDB] tracking-tight">
              Institutional Sector Rotation Quadrants
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#D96B43]/10 text-[#F7EEDB] border border-[#D96B43]/20 font-bold font-mono">
              FETCHED QUOTES
            </span>
          </div>
          <p className="text-xs text-[#F7EEDB]/60 mt-1">
            Average daily percent change of the fetched equities grouped by their sector labels. This is not an official index or institutional-flow dataset.
          </p>
        </div>

        {/* Quadrant filter pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#1A1816] border border-[#D96B43]/15 text-xs">
          {(['ALL', 'Leading', 'Improving', 'Weakening', 'Lagging'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedStatus === st
                  ? 'bg-[#D96B43] text-[#131211] shadow-sm font-bold'
                  : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Sector Rotation Quadrants Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Leading */}
        <div className="p-4 rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#D96B43] uppercase tracking-wider font-mono">
              Leading Quadrant
            </span>
            <span className="w-2 h-2 rounded-full bg-[#D96B43] animate-pulse"></span>
          </div>
          <p className="text-[11px] text-[#F7EEDB]/70">
            Highest average daily change among sectors represented in the fetched quote set.
          </p>
          <div className="space-y-1.5 pt-2">
            {sectorIndices.filter((s) => s.status === 'Leading').map((sec) => (
              <div
                key={sec.name}
                className="flex items-center justify-between p-2 rounded-lg bg-[#131211] border border-[#D96B43]/10 text-xs"
              >
                <span className="font-bold text-[#F7EEDB]">{sec.name}</span>
                <span className="font-mono text-[#D96B43] font-bold">+{sec.changePercent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Improving */}
        <div className="p-4 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F7EEDB] uppercase tracking-wider font-mono">
              Improving Quadrant
            </span>
            <span className="w-2 h-2 rounded-full bg-[#F7EEDB]"></span>
          </div>
          <p className="text-[11px] text-[#F7EEDB]/70">
            Positive average daily change among fetched constituents; not a confirmed trend reversal.
          </p>
          <div className="space-y-1.5 pt-2">
            {sectorIndices.filter((s) => s.status === 'Improving').map((sec) => (
              <div
                key={sec.name}
                className="flex items-center justify-between p-2 rounded-lg bg-[#131211] border border-[#D96B43]/10 text-xs"
              >
                <span className="font-bold text-[#F7EEDB]">{sec.name}</span>
                <span className="font-mono text-[#F7EEDB] font-bold">+{sec.changePercent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weakening */}
        <div className="p-4 rounded-2xl bg-[#1A1816] border border-[#D96B43]/15 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F7EEDB]/60 uppercase tracking-wider font-mono">
              Weakening Quadrant
            </span>
            <span className="w-2 h-2 rounded-full bg-[#F7EEDB]/60"></span>
          </div>
          <p className="text-[11px] text-[#F7EEDB]/60">
            Small or negative average daily change; price movement alone does not identify a cause.
          </p>
          <div className="space-y-1.5 pt-2">
            {sectorIndices.filter((s) => s.status === 'Weakening').map((sec) => (
              <div
                key={sec.name}
                className="flex items-center justify-between p-2 rounded-lg bg-[#131211] border border-[#D96B43]/10 text-xs"
              >
                <span className="font-bold text-[#F7EEDB]">{sec.name}</span>
                <span className="font-mono text-[#F7EEDB]/70 font-bold">{sec.changePercent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lagging */}
        <div className="p-4 rounded-2xl bg-[#1A1816] border border-[#EF4444]/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#EF4444] uppercase tracking-wider font-mono">
              Lagging Quadrant
            </span>
            <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
          </div>
          <p className="text-[11px] text-[#F7EEDB]/60">
            Largest negative average daily change in this fetched sample.
          </p>
          <div className="space-y-1.5 pt-2">
            {sectorIndices.filter((s) => s.status === 'Lagging').map((sec) => (
              <div
                key={sec.name}
                className="flex items-center justify-between p-2 rounded-lg bg-[#131211] border border-[#D96B43]/10 text-xs"
              >
                <span className="font-bold text-[#F7EEDB]">{sec.name}</span>
                <span className="font-mono text-[#EF4444] font-bold">{sec.changePercent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sector Multiples Table */}
      <div className="rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#D96B43]/15 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#F7EEDB]">Sector Snapshot From Fetched Equities</h2>
          <span className="text-xs text-[#F7EEDB]/50">P/E uses registry reference estimates; sector changes use fetched daily quotes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#131211] text-[#F7EEDB]/60 uppercase text-[10px] tracking-wider border-b border-[#D96B43]/15">
              <tr>
                <th className="py-3 px-4 font-sans">Sector Index</th>
                <th className="py-3 px-4 text-right">Daily Change</th>
                <th className="py-3 px-4 text-center font-sans">Status</th>
                <th className="py-3 px-4 text-right">P/E ref.</th>
                <th className="py-3 px-4 text-center">Momentum</th>
                <th className="py-3 px-4 font-sans">Bellwether Anchor</th>
                <th className="py-3 px-4 text-right font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D96B43]/10">
              {filteredSectors.map((sec) => {
                const anchorStock = stocks.find((s) => s.ticker === sec.topStock);
                return (
                  <tr key={sec.name} className="hover:bg-[#25221F]/50 transition">
                    <td className="py-3.5 px-4 font-sans font-bold text-[#F7EEDB]">{sec.name}</td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span className={sec.changePercent >= 0 ? 'text-[#D96B43]' : 'text-[#EF4444]'}>
                        {sec.changePercent >= 0 ? '+' : ''}{sec.changePercent}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          sec.status === 'Leading'
                            ? 'bg-[#D96B43]/20 text-[#F7EEDB] border border-[#D96B43]/30'
                            : sec.status === 'Improving'
                            ? 'bg-[#F7EEDB]/20 text-[#F7EEDB] border border-[#F7EEDB]/30'
                            : sec.status === 'Weakening'
                            ? 'bg-[#131211] text-[#F7EEDB]/70 border border-[#D96B43]/20'
                            : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                        }`}
                      >
                        {sec.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#F7EEDB]/80">{sec.pe}x</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="w-16 bg-[#131211] h-1.5 rounded-full overflow-hidden mx-auto">
                        <div
                          className="bg-[#D96B43] h-full rounded-full"
                          style={{ width: `${sec.momentumScore}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-[#F7EEDB]/50 mt-0.5 block">{sec.momentumScore}/100</span>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      {anchorStock ? (
                        <button
                          onClick={() => onSelectStock(anchorStock)}
                          className="text-[#D96B43] hover:underline font-bold"
                        >
                          {sec.topStock} <span className="font-mono text-[#F7EEDB]/60 text-[11px]">(₹{anchorStock.currentPrice})</span>
                        </button>
                      ) : (
                        <span className="text-[#F7EEDB]/60">{sec.topStock}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      {anchorStock && (
                        <button
                          onClick={() => openAIExplanation(anchorStock)}
                          className="px-2.5 py-1 rounded-lg bg-[#131211] border border-[#D96B43]/20 hover:border-[#D96B43]/40 text-[#F7EEDB] text-xs font-semibold transition"
                        >
                          AI Thesis
                        </button>
                      )}
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
