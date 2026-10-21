import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  X,
  ShieldCheck,
  TrendingUp,
  PieChart,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { PortfolioHolding } from '../types/market';
import { generatePortfolioPdf, PortfolioSummaryMetrics } from '../utils/generatePortfolioPdf';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  holdings: PortfolioHolding[];
  metrics: PortfolioSummaryMetrics;
  aiRiskText?: string;
}

export const PortfolioReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  holdings,
  metrics,
  aiRiskText,
}) => {
  const [investorName, setInvestorName] = useState<string>('Institutional Trading Account');
  const [reportTitle, setReportTitle] = useState<string>('PORTFOLIO PERFORMANCE & HOLDINGS REPORT');
  const [includeSectorBreakdown, setIncludeSectorBreakdown] = useState<boolean>(true);
  const [includeAiRisk, setIncludeAiRisk] = useState<boolean>(!!aiRiskText);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const doc = generatePortfolioPdf(holdings, metrics, {
        investorName,
        reportTitle,
        includeSectorBreakdown,
        includeAiRisk,
        aiRiskText,
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const filename = `MxpO_Portfolio_Summary_${todayStr}.pdf`;
      doc.save(filename);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.warn('PDF generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintOrPreview = () => {
    try {
      const doc = generatePortfolioPdf(holdings, metrics, {
        investorName,
        reportTitle,
        includeSectorBreakdown,
        includeAiRisk,
        aiRiskText,
      });

      // Output as blob URL and open in new tab
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.warn('PDF preview error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1A1816] border border-[#D96B43]/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#F7EEDB]">
        {/* Header */}
        <div className="p-5 border-b border-[#D96B43]/20 flex items-center justify-between bg-[#131211]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D96B43]/15 border border-[#D96B43]/30 flex items-center justify-center text-[#D96B43]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#F7EEDB] tracking-tight">
                  Portfolio Summary Report (PDF)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D96B43]/15 text-[#D96B43] border border-[#D96B43]/30 font-bold font-mono">
                  INSTITUTIONAL GRADE
                </span>
              </div>
              <p className="text-xs text-[#F7EEDB]/60">
                Generate an executive PDF document of equity holdings, risk metrics, and beta sensitivity.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#F7EEDB]/60 hover:text-[#F7EEDB] hover:bg-[#25221F] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Success Banner */}
          {downloadSuccess && (
            <div className="p-3.5 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/50 text-[#22C55E] shadow-[0_0_16px_rgba(34,197,94,0.3)] flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold text-xs">
                Portfolio Summary Report downloaded successfully! Ready for institutional review.
              </span>
            </div>
          )}

          {/* Quick Metrics Glance Box with Visual Color Effects */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#131211] border border-[#D96B43]/35 hover:border-[#D96B43]/70 hover:shadow-[0_0_16px_rgba(217,107,67,0.25)] transition-all">
            <div>
              <span className="text-[10px] text-[#F7EEDB]/50 uppercase tracking-wider">Total Value</span>
              <div className="text-base font-bold text-[#F7EEDB] font-mono mt-0.5">
                ₹{metrics.currentValue.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-[#F7EEDB]/50 uppercase tracking-wider">Unrealized P&amp;L</span>
              <div
                className={`text-base font-bold font-mono mt-0.5 ${
                  metrics.totalPnL >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}
              >
                {metrics.totalPnL >= 0 ? '+' : ''}₹{metrics.totalPnL.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-[#F7EEDB]/50 uppercase tracking-wider">Beta Exposure</span>
              <div className="text-base font-bold text-[#8CB4E0] font-mono mt-0.5">
                {metrics.portfolioBeta.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-[#F7EEDB]/50 uppercase tracking-wider">Securities</span>
              <div className="text-base font-bold text-[#D96B43] font-mono mt-0.5">
                {holdings.length} Positions
              </div>
            </div>
          </div>

          {/* Report Customization Form */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#D96B43] font-mono">
              <Sliders className="w-3.5 h-3.5" />
              <span>Report Options &amp; Metadata</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Account / Client Name</label>
                <input
                  type="text"
                  value={investorName}
                  onChange={(e) => setInvestorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/30 focus:border-[#D96B43] focus:shadow-[0_0_14px_rgba(217,107,67,0.35)] text-[#F7EEDB] outline-none font-medium transition"
                  placeholder="e.g. Primary Alpha Account"
                />
              </div>

              <div>
                <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Document Header Title</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/30 focus:border-[#D96B43] focus:shadow-[0_0_14px_rgba(217,107,67,0.35)] text-[#F7EEDB] outline-none font-medium transition"
                />
              </div>
            </div>

            {/* Inclusions */}
            <div className="pt-2 space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer text-[#F7EEDB]/90 select-none">
                <input
                  type="checkbox"
                  checked={includeSectorBreakdown}
                  onChange={(e) => setIncludeSectorBreakdown(e.target.checked)}
                  className="w-4 h-4 rounded text-[#D96B43] accent-[#D96B43] bg-[#131211] border-[#D96B43]/40"
                />
                <span className="flex items-center gap-1.5 font-medium">
                  <PieChart className="w-3.5 h-3.5 text-[#8CB4E0]" />
                  Include Sector Exposure &amp; Diversification Matrix ({metrics.sectorAllocation.length} Sectors)
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-[#F7EEDB]/90 select-none">
                <input
                  type="checkbox"
                  checked={includeAiRisk}
                  onChange={(e) => setIncludeAiRisk(e.target.checked)}
                  disabled={!aiRiskText}
                  className="w-4 h-4 rounded text-[#D96B43] accent-[#D96B43] bg-[#131211] border-[#D96B43]/40 disabled:opacity-40"
                />
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-[#D96B43]" />
                  Include AI Risk Audit &amp; Surveillance Directives
                  {!aiRiskText && (
                    <span className="text-[10px] text-[#F7EEDB]/40 italic">(Run 'AI Risk Audit' in Portfolio view to include)</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Holdings Summary Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#F7EEDB]/80 uppercase tracking-wider font-mono">
                Holdings Included in Report ({holdings.length})
              </span>
              <span className="text-[#8CB4E0] font-mono text-[11px]">NSE &amp; BSE Certified</span>
            </div>

            <div className="rounded-xl border border-[#D96B43]/25 hover:border-[#D96B43]/50 shadow-[0_2px_15px_rgba(0,0,0,0.3)] transition overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-[#131211] text-[#F7EEDB]/60 uppercase text-[9px] sticky top-0 border-b border-[#D96B43]/20">
                  <tr>
                    <th className="py-2 px-3">Ticker</th>
                    <th className="py-2 px-3">Exch</th>
                    <th className="py-2 px-3 text-right">Shares</th>
                    <th className="py-2 px-3 text-right">Value (₹)</th>
                    <th className="py-2 px-3 text-right">P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D96B43]/10 bg-[#1A1816]">
                  {holdings.map((h) => {
                    const cost = h.shares * h.averageBuyPrice;
                    const val = h.shares * h.currentPrice;
                    const pnl = val - cost;
                    return (
                      <tr key={h.id} className="hover:bg-[#25221F]/60 transition">
                        <td className="py-2 px-3 font-bold text-[#F7EEDB]">{h.ticker}</td>
                        <td className="py-2 px-3">
                          <span className="text-[9px] px-1 py-0.5 rounded bg-[#131211] border border-[#8CB4E0]/30 text-[#8CB4E0]">
                            {h.exchange}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-[#F7EEDB]/80">{h.shares}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#F7EEDB]">
                          ₹{val.toLocaleString('en-IN')}
                        </td>
                        <td className={`py-2 px-3 text-right font-bold ${pnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                          {pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#D96B43]/25 bg-[#131211] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-[#F7EEDB]/50">
            <ShieldCheck className="w-4 h-4 text-[#8CB4E0]" />
            <span>Standard A4 PDF · Instant Client-Side Generation</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrintOrPreview}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#8CB4E0]/40 bg-[#1A1816] text-[#F7EEDB] hover:text-[#FFFDF8] hover:border-[#8CB4E0] hover:shadow-[0_0_12px_rgba(140,180,224,0.35)] text-xs font-semibold transition active:scale-95"
            >
              <Printer className="w-4 h-4 text-[#8CB4E0]" />
              <span>Preview / Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating || holdings.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs border border-[#F7EEDB]/40 hover:border-[#F7EEDB] shadow-[0_0_18px_rgba(217,107,67,0.4)] transition disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${isGenerating ? 'animate-bounce' : ''}`} />
              <span>{isGenerating ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
