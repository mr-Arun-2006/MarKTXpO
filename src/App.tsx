/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StockData, SupportedLanguage, UserProfile, MarketAlert, CustomStrategy } from './types/market';
import { INITIAL_STOCKS, INITIAL_ALERTS } from './data/mockMarketData';
import { Navbar } from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AIExplanationModal } from './components/AIExplanationModal';
import { AuthModal } from './components/AuthModal';

// Views
import { LandingPage } from './views/LandingPage';
import { DashboardView } from './views/DashboardView';
import { CompareView } from './views/CompareView';
import { ScreenerView } from './views/ScreenerView';
import { StrategyBuilderView } from './views/StrategyBuilderView';
import { BacktestingEngineView } from './views/BacktestingEngineView';
import { SectorAnalysisView } from './views/SectorAnalysisView';
import { PortfolioRiskView } from './views/PortfolioRiskView';
import { AlertsManagerView } from './views/AlertsManagerView';
import { HistoricalDataView } from './views/HistoricalDataView';
import { ProfileSettingsView } from './views/ProfileSettingsView';
import { WatchlistDividendView } from './views/WatchlistDividendView';
import { TradingGameView } from './views/TradingGameView';
import { OfficialMarketBanner } from './components/OfficialMarketBanner';
import { MobileBottomNav } from './components/MobileBottomNav';
import { fetchRealStockQuotes, fetchRealStockHistory } from './services/marketDataClient';

export default function App() {
  const [activeView, setActiveView] = useState<string>('landing');
  const [stocks, setStocks] = useState<StockData[]>(INITIAL_STOCKS);
  const [selectedStock, setSelectedStock] = useState<StockData>(INITIAL_STOCKS[0]);
  const [alerts, setAlerts] = useState<MarketAlert[]>(INITIAL_ALERTS);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [lastLiveSync, setLastLiveSync] = useState<string | null>(null);
  const [isLiveOfficial, setIsLiveOfficial] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active strategy passed to backtester
  const [activeStrategy, setActiveStrategy] = useState<CustomStrategy | undefined>(undefined);

  // AI Explanation Modal state
  const [explainingStock, setExplainingStock] = useState<StockData | null>(null);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // User profile with persistence
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('marktxpo_user_profile') || localStorage.getItem('nsebse_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: 'Rohan Sharma',
      email: 'rohan.sharma@marktxpo.ai',
      customApiKey: '',
      preferredExchange: 'NSE',
      riskTolerance: 'Moderate',
      soundAlerts: true,
      language: 'en',
    };
  });

  // Keep language in sync with profile
  useEffect(() => {
    if (profile.language && profile.language !== language) {
      setLanguage(profile.language);
    }
  }, []);

  // Fetch real market data from official NSE & BSE feeds via server
  const handleRefreshRealData = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchRealStockQuotes();
      if (data && data.stocks && data.stocks.length > 0) {
        setStocks(data.stocks);
        setLastLiveSync(data.timestamp || new Date().toISOString());
        setIsLiveOfficial(data.isLiveOfficial ?? true);

        setSelectedStock((prev) => {
          const match = data.stocks.find((s) => s.ticker === prev.ticker);
          if (!match) return prev;
          return {
            ...match,
            history: prev.history && prev.history.length > 0 ? prev.history : match.history,
          };
        });
      }
    } catch (err) {
      console.warn('[App] Real market refresh notice:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Stock selection that triggers official history fetch
  const handleSelectStock = async (stock: StockData) => {
    setSelectedStock(stock);
    try {
      const candles = await fetchRealStockHistory(stock.ticker);
      if (candles && candles.length > 0) {
        setSelectedStock((curr) => (curr.ticker === stock.ticker ? { ...curr, history: candles } : curr));
        setStocks((prev) => prev.map((s) => (s.ticker === stock.ticker ? { ...s, history: candles } : s)));
      }
    } catch {}
  };

  // Initial real data sync and polling interval
  useEffect(() => {
    handleRefreshRealData();
    const interval = setInterval(handleRefreshRealData, 25000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real historical candles for initial active stock
  useEffect(() => {
    if (selectedStock?.ticker) {
      fetchRealStockHistory(selectedStock.ticker).then((candles) => {
        if (candles && candles.length > 0) {
          setSelectedStock((curr) => ({ ...curr, history: candles }));
          setStocks((prev) => prev.map((s) => (s.ticker === selectedStock.ticker ? { ...s, history: candles } : s)));
        }
      });
    }
  }, []);

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...updated };
    setProfile(newProfile);
    try {
      localStorage.setItem('marktxpo_user_profile', JSON.stringify(newProfile));
    } catch {}
  };

  const openAIExplanation = (stock: StockData) => {
    setExplainingStock(stock);
  };

  const handleAddAlert = (alert: MarketAlert) => {
    setAlerts([alert, ...alerts]);
  };

  const handleRemoveAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  const handleToggleSound = () => {
    handleUpdateProfile({ soundAlerts: !profile.soundAlerts });
  };

  const handleStrategyBacktest = (strat: CustomStrategy) => {
    setActiveStrategy(strat);
    setActiveView('backtest');
  };

  // Real-time micro tick variations for continuous live floor feeling
  useEffect(() => {
    const timer = setInterval(() => {
      setStocks((prev) => {
        if (!prev || prev.length === 0) return prev;
        const indicesToTick = new Set<number>();
        while (indicesToTick.size < Math.min(3, prev.length)) {
          indicesToTick.add(Math.floor(Math.random() * prev.length));
        }

        return prev.map((s, idx) => {
          if (!indicesToTick.has(idx)) return s;
          const delta = (Math.random() - 0.49) * (s.nsePrice * 0.0003);
          const newNse = Math.round((s.nsePrice + delta) * 100) / 100;
          const newBse = Math.round((s.bsePrice + delta * (0.8 + Math.random() * 0.4)) * 100) / 100;
          const spread = Math.round(((newNse - newBse) / newNse * 100) * 1000) / 1000;
          const currentHourlyPct = s.hourlyChangePercent ?? 0;
          const newHourlyPct = Math.round((currentHourlyPct + (delta / s.nsePrice) * 100 * 0.15) * 100) / 100;
          const newHourlyTrend: 'UP' | 'DOWN' | 'NEUTRAL' =
            newHourlyPct > 0.05 ? 'UP' : newHourlyPct < -0.05 ? 'DOWN' : 'NEUTRAL';

          return {
            ...s,
            nsePrice: newNse,
            bsePrice: newBse,
            currentPrice: newNse,
            spreadPercent: spread,
            hourlyChangePercent: newHourlyPct,
            hourlyChange: Math.round(newNse * (newHourlyPct / 100) * 100) / 100,
            hourlyTrend: newHourlyTrend,
          };
        });
      });
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const unreadAlertsCount = alerts.filter((a) => a.triggered).length;

  return (
    <div className="min-h-screen bg-[#131211] text-[#F7EEDB] flex flex-col font-sans selection:bg-[#D96B43]/30 selection:text-[#F7EEDB]">
      {/* Offline Toast Indicator */}
      <OfflineIndicator />

      {/* Official Exchange Verification & Live Provenance Banner */}
      <OfficialMarketBanner
        isLiveOfficial={isLiveOfficial}
        lastLiveSync={lastLiveSync}
        onRefresh={handleRefreshRealData}
        isRefreshing={isRefreshing}
        stockCount={stocks.length}
      />

      {/* Main Top Navigation */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        stocks={stocks}
        selectedStock={selectedStock}
        setSelectedStock={handleSelectStock}
        language={language}
        setLanguage={(lang) => {
          setLanguage(lang);
          handleUpdateProfile({ language: lang });
        }}
        profile={profile}
        unreadAlertsCount={unreadAlertsCount}
        openAIExplanation={openAIExplanation}
      />

      {/* Active View Router */}
      <main className="flex-1 pb-20 lg:pb-8">
        {activeView === 'landing' && (
          <LandingPage
            onLaunchDashboard={() => setActiveView('dashboard')}
            onExploreStock={(st) => {
              handleSelectStock(st);
              openAIExplanation(st);
            }}
            onPlayGame={() => setActiveView('game')}
            featuredStocks={stocks}
            language={language}
          />
        )}

        {activeView === 'dashboard' && (
          <DashboardView
            stocks={stocks}
            selectedStock={selectedStock}
            setSelectedStock={handleSelectStock}
            openAIExplanation={openAIExplanation}
            alerts={alerts}
            setActiveView={setActiveView}
            language={language}
            customApiKey={profile.customApiKey}
          />
        )}

        {activeView === 'watchlist' && (
          <WatchlistDividendView
            stocks={stocks}
            selectedStock={selectedStock}
            onSelectStock={handleSelectStock}
            openAIExplanation={openAIExplanation}
            onNavigateToDashboard={() => setActiveView('dashboard')}
            language={language}
          />
        )}

        {activeView === 'game' && (
          <TradingGameView
            stocks={stocks}
            language={language}
            onNavigateToDashboard={() => setActiveView('dashboard')}
          />
        )}

        {activeView === 'compare' && (
          <CompareView
            stocks={stocks}
            selectedStock={selectedStock}
            setSelectedStock={handleSelectStock}
            openAIExplanation={openAIExplanation}
            language={language}
          />
        )}

        {activeView === 'screener' && (
          <ScreenerView
            stocks={stocks}
            onSelectStock={(st) => {
              handleSelectStock(st);
              setActiveView('dashboard');
            }}
            openAIExplanation={openAIExplanation}
            language={language}
          />
        )}

        {activeView === 'strategy' && (
          <StrategyBuilderView
            onRunBacktest={handleStrategyBacktest}
            language={language}
          />
        )}

        {activeView === 'backtest' && (
          <BacktestingEngineView
            strategy={activeStrategy}
            stocks={stocks}
            customApiKey={profile.customApiKey}
            language={language}
          />
        )}

        {activeView === 'sectors' && (
          <SectorAnalysisView
            stocks={stocks}
            onSelectStock={(st) => {
              handleSelectStock(st);
              setActiveView('dashboard');
            }}
            openAIExplanation={openAIExplanation}
            language={language}
          />
        )}

        {activeView === 'portfolio' && (
          <PortfolioRiskView
            stocks={stocks}
            customApiKey={profile.customApiKey}
            language={language}
            openAIExplanation={openAIExplanation}
          />
        )}

        {activeView === 'alerts' && (
          <AlertsManagerView
            alerts={alerts}
            stocks={stocks}
            onAddAlert={handleAddAlert}
            onRemoveAlert={handleRemoveAlert}
            soundEnabled={profile.soundAlerts}
            onToggleSound={handleToggleSound}
            language={language}
          />
        )}

        {activeView === 'history' && (
          <HistoricalDataView
            stocks={stocks}
            selectedStock={selectedStock}
            setSelectedStock={handleSelectStock}
            language={language}
          />
        )}

        {activeView === 'profile' && (
          <ProfileSettingsView
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            language={language}
            setLanguage={(lang) => {
              setLanguage(lang);
              handleUpdateProfile({ language: lang });
            }}
          />
        )}
      </main>
 
      {/* Mobile Bottom Quick Navigation & PWA Action Bar */}
      <MobileBottomNav
        activeView={activeView}
        setActiveView={setActiveView}
        unreadAlertsCount={unreadAlertsCount}
      />

      {/* AI Deep Explanation Modal */}
      {explainingStock && (
        <AIExplanationModal
          stock={explainingStock}
          language={language}
          customApiKey={profile.customApiKey}
          onClose={() => setExplainingStock(null)}
        />
      )}

      {/* Auth / Login Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(u) => handleUpdateProfile(u)}
        language={language}
      />
    </div>
  );
}
