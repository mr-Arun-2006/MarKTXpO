import React, { useState, useMemo, useEffect } from 'react';
import { PortfolioHolding, StockData, SupportedLanguage } from '../types/market';
import { translations } from '../i18n/translations';
import {
  Briefcase,
  Sparkles,
  Plus,
  Trash2,
  TrendingUp,
  AlertTriangle,
  FileDown,
  FileText,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { PortfolioReportModal } from '../components/PortfolioReportModal';
import { generatePortfolioPdf } from '../utils/generatePortfolioPdf';
import { auth, getDbPortfolio, saveDbPortfolioPosition, deleteDbPortfolioPosition } from '../services/firebase';

interface Props {
  stocks: StockData[];
  customApiKey?: string;
  language: SupportedLanguage;
  openAIExplanation: (stock: StockData) => void;
}

export const PortfolioRiskView: React.FC<Props> = ({
  stocks,
  customApiKey,
  language,
  openAIExplanation,
}) => {
  const t = translations[language];

  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [aiRiskText, setAiRiskText] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [newTicker, setNewTicker] = useState<string>('ICICIBANK');
  const [newShares, setNewShares] = useState<number>(50);
  const [newBuyPrice, setNewBuyPrice] = useState<number>(1200);
  const [newExchange, setNewExchange] = useState<'NSE' | 'BSE'>('NSE');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [quickDownloading, setQuickDownloading] = useState<boolean>(false);
  const [quickDownloadSuccess, setQuickDownloadSuccess] = useState<boolean>(false);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [savingPosition, setSavingPosition] = useState(false);
  const signedInUid = auth.currentUser?.uid || '';

  useEffect(() => {
    let active = true;
    const loadPortfolio = async () => {
      const user = auth.currentUser;
      if (!user) {
        setHoldings([]);
        setPortfolioError('Sign in to load a personal portfolio.');
        setPortfolioLoading(false);
        return;
      }
      setPortfolioLoading(true);
      setPortfolioError(null);
      try {
        const saved = await getDbPortfolio(user.uid);
        const loaded = saved.filter((position) => position.status === 'OPEN').map((position): PortfolioHolding => {
          const stock = stocks.find((item) => item.ticker === position.ticker);
          return {
            id: position.id,
            ticker: position.ticker,
            name: position.stockName || stock?.name || position.ticker,
            exchange: position.exchange === 'BSE' ? 'BSE' : 'NSE',
            shares: position.shares,
            averageBuyPrice: position.entryPrice,
            currentPrice: stock ? (position.exchange === 'BSE' ? stock.bsePrice : stock.nsePrice) : 0,
            sector: stock?.sector || 'Unclassified',
            beta: stock?.beta || 1,
          };
        });
        if (active) setHoldings(loaded);
      } catch (error) {
        if (active) {
          setHoldings([]);
          setPortfolioError(error instanceof Error ? error.message : 'The personal portfolio could not be loaded.');
        }
      } finally {
        if (active) setPortfolioLoading(false);
      }
    };
    void loadPortfolio();
    return () => { active = false; };
  }, [signedInUid, stocks]);

  const { totalInvested, currentValue, totalPnL, totalPnLPercent, portfolioBeta, var95Rupees, historicalVolatility } =
    useMemo(() => {
      const priced = holdings.filter((holding) => Number.isFinite(holding.currentPrice) && holding.currentPrice > 0);
      const invested = priced.reduce((sum, holding) => sum + holding.shares * holding.averageBuyPrice, 0);
      const current = priced.reduce((sum, holding) => sum + holding.shares * holding.currentPrice, 0);
      const betaWeighted = priced.reduce((sum, holding) => sum + holding.shares * holding.currentPrice * holding.beta, 0);
      const pnl = current - invested;
      const pnlPct = invested > 0 ? pnl / invested * 100 : 0;
      const beta = current > 0 ? betaWeighted / current : 0;
      const returnsByDate = new Map<string, { weighted: number; weight: number }>();
      priced.forEach((holding) => {
        const stock = stocks.find((item) => item.ticker === holding.ticker);
        const candles = stock?.history || [];
        const weight = holding.shares * holding.currentPrice;
        for (let i = 1; i < candles.length; i += 1) {
          const previous = candles[i - 1];
          const currentBar = candles[i];
          if (!Number.isFinite(previous.close) || previous.close <= 0 || !Number.isFinite(currentBar.close)) continue;
          const dailyReturn = currentBar.close / previous.close - 1;
          if (!Number.isFinite(dailyReturn)) continue;
          const entry = returnsByDate.get(currentBar.date) || { weighted: 0, weight: 0 };
          entry.weighted += dailyReturn * weight;
          entry.weight += weight;
          returnsByDate.set(currentBar.date, entry);
        }
      });
      const dailyReturns = Array.from(returnsByDate.values()).filter((entry) => entry.weight > 0).map((entry) => entry.weighted / entry.weight);
      const avgDailyReturn = dailyReturns.length ? dailyReturns.reduce((sum, value) => sum + value, 0) / dailyReturns.length : 0;
      const volatility = dailyReturns.length > 1
        ? Math.sqrt(dailyReturns.reduce((sum, value) => sum + Math.pow(value - avgDailyReturn, 2), 0) / (dailyReturns.length - 1))
        : null;
      return {
        totalInvested: Math.round(invested),
        currentValue: Math.round(current),
        totalPnL: Math.round(pnl),
        totalPnLPercent: Math.round(pnlPct * 10) / 10,
        portfolioBeta: Math.round(beta * 100) / 100,
        var95Rupees: volatility === null ? null : Math.round(current * 1.645 * volatility),
        historicalVolatility: volatility === null ? null : volatility * 100,
      };
    }, [holdings, stocks]);
  const sectorAllocation = useMemo(() => {
    const map: Record<string, number> = {};
    holdings.forEach((h) => {
      if (!Number.isFinite(h.currentPrice) || h.currentPrice <= 0) return;
      const val = h.shares * h.currentPrice;
      map[h.sector] = (map[h.sector] || 0) + val;
    });
    return Object.entries(map).map(([sec, val]) => ({
      sector: sec,
      amount: Math.round(val),
      percent: Math.round((val / (currentValue || 1)) * 1000) / 10,
    }));
  }, [holdings, currentValue]);

  const handleAddHolding = async () => {
    const user = auth.currentUser;
    const stock = stocks.find((item) => item.ticker === newTicker);
    if (!user || !stock) { setPortfolioError('Sign in and choose a security with a fetched quote.'); return; }
    if (!Number.isFinite(newShares) || newShares <= 0 || !Number.isFinite(newBuyPrice) || newBuyPrice <= 0) {
      setPortfolioError('Enter a positive share quantity and entry price.');
      return;
    }
    const id = 'position-' + Date.now();
    setSavingPosition(true);
    setPortfolioError(null);
    try {
      await saveDbPortfolioPosition({
        id, userId: user.uid, ticker: stock.ticker, stockName: stock.name, exchange: newExchange, type: 'BUY',
        shares: Math.floor(newShares), entryPrice: newBuyPrice, isPaperTrade: true,
        status: 'OPEN', createdAt: new Date().toISOString(),
      });
      const holding: PortfolioHolding = {
        id, ticker: stock.ticker, name: stock.name, exchange: newExchange,
        shares: Math.floor(newShares), averageBuyPrice: newBuyPrice,
        currentPrice: newExchange === 'NSE' ? stock.nsePrice : stock.bsePrice,
        sector: stock.sector, beta: stock.beta,
      };
      setHoldings((existing) => [...existing, holding]);
      setShowAddForm(false);
    } catch (error) {
      setPortfolioError(error instanceof Error ? error.message : 'The position could not be saved to your account.');
    } finally { setSavingPosition(false); }
  };

  const handleRemoveHolding = async (id: string) => {
    const user = auth.currentUser;
    if (!user) { setPortfolioError('Sign in again before deleting a position.'); return; }
    setPortfolioError(null);
    try {
      await deleteDbPortfolioPosition(user.uid, id);
      setHoldings((existing) => existing.filter((holding) => holding.id !== id));
    } catch (error) {
      setPortfolioError(error instanceof Error ? error.message : 'The position could not be deleted from your account.');
    }
  };
  const handleRunAiRisk = async () => {
    if (!customApiKey?.trim() || holdings.length === 0) { setAiRiskText('Add a saved position and provide your own Gemini API key to request an AI risk explanation.'); return; }
    setIsAiLoading(true);
    setAiRiskText('');
    try {
      const res = await fetch('/api/ai/portfolio-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await auth.currentUser?.getIdToken() || '') },
        body: JSON.stringify({
          portfolio: holdings.map((h) => ({
            ticker: h.ticker,
            exchange: h.exchange,
            shares: h.shares,
            investedValue: h.shares * h.averageBuyPrice,
            currentValue: h.shares * h.currentPrice,
            sector: h.sector,
            beta: h.beta,
          })),
          totalValue: currentValue,
          userApiKey: customApiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiRiskText(data.riskAnalysis);
    } catch (err: any) {
      console.warn(err);
      setAiRiskText('AI risk explanation unavailable. No verified risk audit was returned. Check your own model key and retry.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDirectDownloadPdf = () => {
    setQuickDownloading(true);
    try {
      const doc = generatePortfolioPdf(
        holdings.filter((holding) => Number.isFinite(holding.currentPrice) && holding.currentPrice > 0),
        {
          totalInvested,
          currentValue,
          totalPnL,
          totalPnLPercent,
          portfolioBeta,
          var95Rupees,
          sectorAllocation,
        },
        {
          investorName: 'MxpO Institutional Client',
          reportTitle: 'PORTFOLIO PERFORMANCE & HOLDINGS REPORT',
          includeSectorBreakdown: true,
          includeAiRisk: !!aiRiskText,
          aiRiskText,
        }
      );
      const today = new Date().toISOString().split('T')[0];
      doc.save(`MxpO_Portfolio_Summary_${today}.pdf`);
      setQuickDownloadSuccess(true);
      setTimeout(() => setQuickDownloadSuccess(false), 4500);
    } catch (e) {
      console.warn('PDF export error:', e);
    } finally {
      setQuickDownloading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-[#F7EEDB]">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D96B43]/15">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#D96B43]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#F7EEDB] tracking-tight">
              Portfolio Risk Surveillance &amp; Hedging
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D96B43]/10 text-[#F7EEDB] border border-[#D96B43]/20 font-bold font-mono">
              HISTORICAL PRICE-RISK MODEL
            </span>
          </div>
          <p className="text-xs text-[#F7EEDB]/60 mt-1">
            Real-time equity exposure tracking across NSE and BSE, beta sensitivity, and institutional risk mitigation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* PDF Report Generation Buttons */}
          <div className="flex items-center rounded-xl border border-[#D96B43]/30 bg-[#1A1816] p-0.5 shadow-sm">
            <button
              onClick={handleDirectDownloadPdf}
              disabled={quickDownloading || holdings.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D96B43]/15 hover:bg-[#D96B43] hover:text-[#131211] text-xs font-bold text-[#F7EEDB] transition disabled:opacity-50"
              title="Download instant institutional summary PDF"
            >
              <FileDown className={`w-3.5 h-3.5 text-[#D96B43] ${quickDownloading ? 'animate-bounce' : ''}`} />
              <span>{quickDownloading ? 'Generating PDF...' : t.downloadPdfReport || 'Download PDF Report'}</span>
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#25221F] transition border-l border-[#D96B43]/20"
              title="Customize report options, client name & preview"
            >
              Options
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D96B43]/20 bg-[#1A1816] text-xs font-semibold text-[#F7EEDB] hover:bg-[#25221F] transition"
          >
            <Plus className="w-4 h-4 text-[#D96B43]" />
            <span>Add Position</span>
          </button>

          <button
            onClick={handleRunAiRisk}
            disabled={isAiLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs shadow-md shadow-[#D96B43]/20 transition disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>{isAiLoading ? 'Analyzing...' : 'AI Risk Audit'}</span>
          </button>
        </div>
      </div>

      {(portfolioError || portfolioLoading || holdings.some((holding) => !Number.isFinite(holding.currentPrice) || holding.currentPrice <= 0)) && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-4 text-xs leading-5 text-amber-100">
          {portfolioLoading ? 'Loading your saved positions from Firebase…' : null}
          {portfolioError && <div role="alert">{portfolioError}</div>}
          {!portfolioLoading && holdings.some((holding) => !Number.isFinite(holding.currentPrice) || holding.currentPrice <= 0) && (
            <div>One or more positions have no current fetched quote. They remain visible but are excluded from current valuation and historical VaR until their ticker returns data.</div>
          )}
          <div className="mt-1 text-amber-100/60">No demo holdings are preloaded. These are user-entered paper-tracking positions, not brokerage trades.</div>
        </div>
      )}

      {/* Quick Download Success Notification Banner */}
      {quickDownloadSuccess && (
        <div className="p-3.5 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-between animate-in fade-in duration-200 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">
              Portfolio Summary Report (PDF) generated and downloaded successfully!
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#F7EEDB]/60">Check Downloads</span>
        </div>
      )}

      {showAddForm && (
        <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/45 shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_20px_rgba(217,107,67,0.2)] space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F7EEDB]">Add Equity Position</h3>
            <button onClick={() => setShowAddForm(false)} className="text-[#F7EEDB]/60 hover:text-[#F7EEDB] hover:border-[#D96B43] px-2 py-0.5 rounded text-xs border border-transparent transition">
              Cancel
            </button>
          </div>

          <div className="grid sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Stock Ticker</label>
              <select
                value={newTicker}
                onChange={(e) => {
                  setNewTicker(e.target.value);
                  const st = stocks.find((s) => s.ticker === e.target.value);
                  if (st) setNewBuyPrice(st.currentPrice);
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/30 focus:border-[#D96B43] focus:shadow-[0_0_12px_rgba(217,107,67,0.35)] text-[#F7EEDB] font-bold outline-none transition"
              >
                {stocks.map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} · BSE: {s.bseCode} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Exchange</label>
              <select
                value={newExchange}
                onChange={(e) => setNewExchange(e.target.value as 'NSE' | 'BSE')}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/30 focus:border-[#D96B43] focus:shadow-[0_0_12px_rgba(217,107,67,0.35)] text-[#F7EEDB] font-bold outline-none transition"
              >
                <option value="NSE">NSE (National)</option>
                <option value="BSE">BSE (Bombay)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Quantity (Shares)</label>
              <input
                type="number"
                min="1"
                value={newShares}
                onChange={(e) => setNewShares(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/30 focus:border-[#D96B43] focus:shadow-[0_0_12px_rgba(217,107,67,0.35)] text-[#F7EEDB] font-mono font-bold outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Avg. Buy Price (₹)</label>
              <input
                type="number"
                step="0.1"
                value={newBuyPrice}
                onChange={(e) => setNewBuyPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/30 focus:border-[#D96B43] focus:shadow-[0_0_12px_rgba(217,107,67,0.35)] text-[#F7EEDB] font-mono font-bold outline-none transition"
              />
            </div>
          </div>

          <button
            onClick={handleAddHolding}
            className="px-4 py-2 bg-[#D96B43] text-[#131211] rounded-xl text-xs font-bold border border-[#F7EEDB]/40 hover:border-[#F7EEDB] hover:shadow-[0_0_14px_rgba(217,107,67,0.4)] transition"
          >
            Confirm Holding
          </button>
        </div>
      )}

      {/* KPI Stats Ribbon with Visual Color Border Effects */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 hover:border-[#D96B43] hover:shadow-[0_0_18px_rgba(217,107,67,0.25)] transition-all duration-200">
          <span className="text-xs text-[#F7EEDB]/60">Total Equity Value</span>
          <div className="text-2xl font-bold text-[#F7EEDB] font-mono mt-1">
            ₹{currentValue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#F7EEDB]/40 font-mono">Cost: ₹{totalInvested.toLocaleString('en-IN')}</span>
        </div>

        <div className={`p-4 rounded-2xl bg-[#1A1816] border transition-all duration-200 ${
          totalPnL >= 0
            ? 'border-[#22C55E]/30 hover:border-[#22C55E] hover:shadow-[0_0_18px_rgba(34,197,94,0.3)]'
            : 'border-[#EF4444]/30 hover:border-[#EF4444] hover:shadow-[0_0_18px_rgba(239,68,68,0.3)]'
        }`}>
          <span className="text-xs text-[#F7EEDB]/60">Unrealized P&amp;L</span>
          <div className={`text-2xl font-bold font-mono mt-1 ${totalPnL >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString('en-IN')}
          </div>
          <span className={`text-[10px] font-bold ${totalPnLPercent >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent}% Overall
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#1A1816] border border-[#8CB4E0]/30 hover:border-[#8CB4E0] hover:shadow-[0_0_18px_rgba(140,180,224,0.3)] transition-all duration-200">
          <span className="text-xs text-[#F7EEDB]/60">Reference Portfolio Beta</span>
          <div className="text-2xl font-bold text-[#8CB4E0] font-mono mt-1">{portfolioBeta}</div>
          <span className="text-[10px] text-[#F7EEDB]/50">
            {portfolioBeta > 1.1 ? 'High Sensitivity' : 'Balanced Exposure'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#1A1816] border border-[#EF4444]/30 hover:border-[#EF4444] hover:shadow-[0_0_18px_rgba(239,68,68,0.3)] transition-all duration-200">
          <span className="text-xs text-[#F7EEDB]/60">1-Day Historical VaR (95%)</span>
          <div className="text-2xl font-bold text-[#EF4444] font-mono mt-1">
            {var95Rupees === null ? 'Unavailable' : '-₹' + var95Rupees.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#F7EEDB]/40 font-mono">Estimated normal max daily loss</span>
        </div>
      </div>

      {/* Sector Concentration Bar */}
      <div className="p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 hover:border-[#D96B43]/60 shadow-[0_4px_24px_rgba(0,0,0,0.4),0_0_16px_rgba(217,107,67,0.1)] transition-all space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#F7EEDB] uppercase tracking-wider font-mono">
            Sector Concentration Exposure
          </span>
          <span className="text-[#F7EEDB]/60">{sectorAllocation.length} Sectors</span>
        </div>

        <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#131211]">
          {sectorAllocation.map((sec, i) => {
            const colors = ['bg-[#D96B43]', 'bg-[#F7EEDB]', 'bg-[#8A7E6C]', 'bg-[#D4AF37]', 'bg-[#B85D3B]'];
            const colorClass = colors[i % colors.length];
            return (
              <div
                key={sec.sector}
                style={{ width: `${sec.percent}%` }}
                className={`${colorClass} h-full transition-all`}
                title={`${sec.sector}: ${sec.percent}%`}
              ></div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1">
          {sectorAllocation.map((sec, i) => {
            const colors = ['bg-[#D96B43]', 'bg-[#F7EEDB]', 'bg-[#8A7E6C]', 'bg-[#D4AF37]', 'bg-[#B85D3B]'];
            return (
              <div key={sec.sector} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`}></span>
                <span className="font-sans text-[#F7EEDB]/80">{sec.sector}:</span>
                <span className="font-bold text-[#F7EEDB]">{sec.percent}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Risk Audit Response */}
      {aiRiskText && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#131211] border border-[#D96B43]/45 shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_20px_rgba(217,107,67,0.2)] space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D96B43]" />
            <h3 className="text-sm font-bold text-[#F7EEDB]">AI Portfolio Risk &amp; Hedging Directives</h3>
          </div>
          <div className="prose prose-invert max-w-none text-xs text-[#F7EEDB]/90 whitespace-pre-line leading-relaxed">
            {aiRiskText}
          </div>
        </div>
      )}

      {/* Holdings Table */}
      <div className="rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_16px_rgba(217,107,67,0.12)] overflow-hidden">
        <div className="p-4 border-b border-[#D96B43]/20 flex flex-wrap items-center justify-between gap-3 bg-[#131211]/50">
          <div>
            <h3 className="text-sm font-bold text-[#F7EEDB]">Portfolio Holdings</h3>
            <span className="text-xs text-[#F7EEDB]/60 font-mono">{holdings.length} Securities</span>
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D96B43]/40 bg-[#131211] hover:bg-[#D96B43]/20 hover:border-[#D96B43] hover:shadow-[0_0_12px_rgba(217,107,67,0.35)] text-[#F7EEDB] text-xs font-semibold transition active:scale-95"
          >
            <FileText className="w-3.5 h-3.5 text-[#D96B43]" />
            <span>Generate PDF Report</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#131211] text-[#F7EEDB]/60 uppercase text-[10px] tracking-wider border-b border-[#D96B43]/15">
              <tr>
                <th className="py-3 px-4 font-sans">Stock</th>
                <th className="py-3 px-4">Exchange</th>
                <th className="py-3 px-4 text-right">Shares</th>
                <th className="py-3 px-4 text-right">Buy Price</th>
                <th className="py-3 px-4 text-right">Current Price</th>
                <th className="py-3 px-4 text-right">Current Value</th>
                <th className="py-3 px-4 text-right">P&amp;L</th>
                <th className="py-3 px-4 text-center">Beta</th>
                <th className="py-3 px-4 text-right font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D96B43]/10">
              {holdings.map((h) => {
                const quoteAvailable = Number.isFinite(h.currentPrice) && h.currentPrice > 0;
                const totalCost = h.shares * h.averageBuyPrice;
                const holdingVal = quoteAvailable ? h.shares * h.currentPrice : 0;
                const holdingPnL = holdingVal - totalCost;
                const holdingPnLPct = totalCost > 0 ? (holdingPnL / totalCost) * 100 : 0;
                const rawStock = stocks.find((s) => s.ticker === h.ticker);

                return (
                  <tr key={h.id} className="hover:bg-[#25221F]/50 transition">
                    <td className="py-3 px-4 font-sans font-bold text-[#F7EEDB]">
                      {h.ticker}
                      <span className="block text-[11px] text-[#F7EEDB]/50 font-normal truncate max-w-[150px]">
                        {h.name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#131211] text-[#F7EEDB] border border-[#D96B43]/20">
                        {h.exchange}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#F7EEDB]">{h.shares}</td>
                    <td className="py-3 px-4 text-right text-[#F7EEDB]/60">₹{h.averageBuyPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#F7EEDB]">{quoteAvailable ? "₹" + h.currentPrice.toFixed(2) : "Unavailable"}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#F7EEDB]">
                      ₹{holdingVal.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <div className={holdingPnL >= 0 ? 'text-[#D96B43]' : 'text-[#EF4444]'}>
                        {holdingPnL >= 0 ? '+' : ''}₹{holdingPnL.toLocaleString('en-IN')}
                      </div>
                      <div className={`text-[10px] ${holdingPnLPct >= 0 ? 'text-[#D96B43]' : 'text-[#EF4444]'}`}>
                        ({holdingPnLPct >= 0 ? '+' : ''}{holdingPnLPct.toFixed(1)}%)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-[#F7EEDB]">{h.beta}</td>
                    <td className="py-3 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        {rawStock && (
                          <button
                            onClick={() => openAIExplanation(rawStock)}
                            className="px-2 py-1 rounded bg-[#D96B43]/15 text-[#F7EEDB] hover:bg-[#D96B43] hover:text-[#131211] transition text-xs font-bold"
                          >
                            AI Check
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveHolding(h.id)}
                          className="p-1 text-[#F7EEDB]/40 hover:text-[#EF4444] transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Institutional PDF Report Modal */}
      <PortfolioReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        holdings={holdings}
        metrics={{
          totalInvested,
          currentValue,
          totalPnL,
          totalPnLPercent,
          portfolioBeta,
          var95Rupees,
          sectorAllocation,
        }}
        aiRiskText={aiRiskText}
      />
    </div>
  );
};
