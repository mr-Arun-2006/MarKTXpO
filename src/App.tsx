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
import { RegisterUserModal } from './components/RegisterUserModal';
import { GeminiChatbot } from './components/GeminiChatbot';
import { ChatbotTrigger } from './components/ChatbotTrigger';
import { VolatilityAlertToast } from './components/VolatilityAlertToast';
import { GoogleChatModal } from './components/GoogleChatModal';
import {
  calculate14DayAverageRange,
  computeStockVolatilityMetric,
  createVolatilityAlert,
  playVolatilityChime,
} from './utils/volatilityAlertEngine';
import { auth, getDbUserProfile, saveDbTradeAlert } from './services/firebase';

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
  const [isLiveOfficial, setIsLiveOfficial] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active strategy passed to backtester
  const [activeStrategy, setActiveStrategy] = useState<CustomStrategy | undefined>(undefined);

  // AI Explanation Modal state
  const [explainingStock, setExplainingStock] = useState<StockData | null>(null);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Gemini Chatbot modal state
  const [chatbotOpen, setChatbotOpen] = useState(false);

  // Google Chat Workspace Integration modal state
  const [googleChatOpen, setGoogleChatOpen] = useState(false);
  const [chatShareText, setChatShareText] = useState<string | undefined>(undefined);
  const [chatTemplate, setChatTemplate] = useState<'ARBITRAGE' | 'SECTOR' | 'VOLATILITY' | 'CUSTOM'>('CUSTOM');

  const handleOpenGoogleChat = (text?: string, template?: 'ARBITRAGE' | 'SECTOR' | 'VOLATILITY' | 'CUSTOM') => {
    setChatShareText(text);
    setChatTemplate(template || 'CUSTOM');
    setGoogleChatOpen(true);
  };

  // Real-time Volatility Alert state
  const [activeVolatilityToast, setActiveVolatilityToast] = useState<MarketAlert | null>(null);
  const triggeredVolatilityTickersRef = React.useRef<Set<string>>(new Set());

  // User profile with persistence
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('marktxpo_user_profile') || localStorage.getItem('nsebse_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved) as UserProfile;
        // API credentials are session-only; remove any legacy key saved by older builds.
        const safeProfile = { ...parsed, customApiKey: '' };
        localStorage.setItem('marktxpo_user_profile', JSON.stringify(safeProfile));
        localStorage.removeItem('nsebse_user_profile');
        return safeProfile;
      }
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

  // Synchronize authenticated user profile from Firestore cloud database
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const dbProfile = await getDbUserProfile(user.uid);
        if (dbProfile) {
          setProfile((prev) => ({
            ...prev,
            name: dbProfile.displayName || user.displayName || prev.name,
            email: dbProfile.email || user.email || prev.email,
            preferredExchange: (dbProfile.preferredExchange as any) || prev.preferredExchange,
            language: (dbProfile.language as any) || prev.language,
          }));
          if (dbProfile.language) setLanguage(dbProfile.language as any);
        } else if (user.displayName || user.email) {
          setProfile((prev) => ({
            ...prev,
            name: user.displayName || prev.name,
            email: user.email || prev.email,
          }));
        }
      }
    });
    return () => unsub();
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
      // Do not persist a user's custom API key in readable browser storage.
      localStorage.setItem('marktxpo_user_profile', JSON.stringify({ ...newProfile, customApiKey: '' }));
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

  // Simulate an intraday volatility surge for live testing
  const handleSimulateVolatilitySurge = (targetTicker?: string) => {
    const symbol = targetTicker || (stocks[0] ? stocks[0].ticker : 'RELIANCE');
    const targetStock = stocks.find((s) => s.ticker === symbol);
    if (!targetStock) return;

    const avg14 = calculate14DayAverageRange(targetStock.history);
    const effectiveAvg14 = avg14 > 0 ? avg14 : Math.round(targetStock.currentPrice * 0.018 * 100) / 100;
    const surgeMultiplier = 1.38; // 38% above 14-day average
    const targetRange = Math.round(effectiveAvg14 * surgeMultiplier * 100) / 100;

    const basePrice = targetStock.currentPrice;
    const simulatedHigh = Math.round((basePrice + targetRange * 0.62) * 100) / 100;
    const simulatedLow = Math.round((basePrice - targetRange * 0.38) * 100) / 100;

    const simulatedStock: StockData = {
      ...targetStock,
      high: simulatedHigh,
      low: simulatedLow,
    };

    setStocks((prev) =>
      prev.map((s) => (s.ticker === symbol ? simulatedStock : s))
    );

    const metric = computeStockVolatilityMetric(simulatedStock, 1.0);
    const alertObj = createVolatilityAlert(simulatedStock, metric);

    triggeredVolatilityTickersRef.current.add(symbol);
    setActiveVolatilityToast(alertObj);
    playVolatilityChime(profile.soundAlerts);
    setAlerts((curr) => [alertObj, ...curr]);

    if (auth.currentUser) {
      saveDbTradeAlert({
        id: alertObj.id,
        userId: auth.currentUser.uid,
        ticker: alertObj.ticker,
        condition: 'VOLATILITY_EXPANSION',
        threshold: alertObj.targetValue,
        intradayRange: alertObj.intradayRange,
        average14DayRange: alertObj.average14DayRange,
        expansionRatio: alertObj.expansionRatio,
        isActive: true,
        createdAt: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  // Real-time micro tick variations for continuous live floor feeling & volatility surveillance
  useEffect(() => {
    const timer = setInterval(() => {
      setStocks((prev) => {
        if (!prev || prev.length === 0) return prev;
        const indicesToTick = new Set<number>();
        while (indicesToTick.size < Math.min(3, prev.length)) {
          indicesToTick.add(Math.floor(Math.random() * prev.length));
        }

        const newlyTriggered: MarketAlert[] = [];

        const updated = prev.map((s, idx) => {
          if (!indicesToTick.has(idx)) return s;
          const delta = (Math.random() - 0.49) * (s.nsePrice * 0.0003);
          const newNse = Math.round((s.nsePrice + delta) * 100) / 100;
          const newBse = Math.round((s.bsePrice + delta * (0.8 + Math.random() * 0.4)) * 100) / 100;
          const spread = Math.round(((newNse - newBse) / newNse * 100) * 1000) / 1000;
          const currentHourlyPct = s.hourlyChangePercent ?? 0;
          const newHourlyPct = Math.round((currentHourlyPct + (delta / s.nsePrice) * 100 * 0.15) * 100) / 100;
          const newHourlyTrend: 'UP' | 'DOWN' | 'NEUTRAL' =
            newHourlyPct > 0.05 ? 'UP' : newHourlyPct < -0.05 ? 'DOWN' : 'NEUTRAL';

          // Update real-time intraday high and low as price ticks
          const updatedHigh = Math.max(s.high || newNse, newNse);
          const updatedLow = Math.min(s.low || newNse, newNse);

          const updatedStock = {
            ...s,
            nsePrice: newNse,
            bsePrice: newBse,
            currentPrice: newNse,
            high: updatedHigh,
            low: updatedLow,
            spreadPercent: spread,
            hourlyChangePercent: newHourlyPct,
            hourlyChange: Math.round(newNse * (newHourlyPct / 100) * 100) / 100,
            hourlyTrend: newHourlyTrend,
          };

          // Check if intraday range exceeds 14-day average range
          const metric = computeStockVolatilityMetric(updatedStock, 1.0);
          if (metric.isExceeded && !triggeredVolatilityTickersRef.current.has(s.ticker)) {
            triggeredVolatilityTickersRef.current.add(s.ticker);
            const alertObj = createVolatilityAlert(updatedStock, metric);
            newlyTriggered.push(alertObj);
          }

          return updatedStock;
        });

        if (newlyTriggered.length > 0) {
          const firstAlert = newlyTriggered[0];
          setActiveVolatilityToast(firstAlert);
          playVolatilityChime(profile.soundAlerts);
          setAlerts((curr) => [...newlyTriggered, ...curr]);

          if (auth.currentUser) {
            newlyTriggered.forEach((al) => {
              saveDbTradeAlert({
                id: al.id,
                userId: auth.currentUser!.uid,
                ticker: al.ticker,
                condition: 'VOLATILITY_EXPANSION',
                threshold: al.targetValue,
                intradayRange: al.intradayRange,
                average14DayRange: al.average14DayRange,
                expansionRatio: al.expansionRatio,
                isActive: true,
                createdAt: new Date().toISOString(),
              }).catch(() => {});
            });
          }
        }

        return updated;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [profile.soundAlerts]);

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
        onOpenRegister={() => setAuthModalOpen(true)}
        onOpenChatbot={() => setChatbotOpen(true)}
        onOpenGoogleChat={() => handleOpenGoogleChat()}
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
            onRegister={() => setAuthModalOpen(true)}
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
            onSelectStock={(st) => {
              handleSelectStock(st);
              setActiveView('dashboard');
            }}
            onSimulateVolatilitySurge={handleSimulateVolatilitySurge}
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
            onOpenChatbot={() => setChatbotOpen(true)}
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

      {/* Register New User & Cloud DB Auth Modal */}
      <RegisterUserModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        language={language}
        onSuccess={async () => {
          if (auth.currentUser) {
            const dbP = await getDbUserProfile(auth.currentUser.uid);
            if (dbP) {
              setProfile((prev) => ({
                ...prev,
                name: dbP.displayName || prev.name,
                email: dbP.email || prev.email,
                preferredExchange: (dbP.preferredExchange as any) || prev.preferredExchange,
              }));
            }
          }
        }}
      />

      {/* Floating Chatbot Trigger Button */}
      <ChatbotTrigger
        onClick={() => setChatbotOpen(true)}
        isOpen={chatbotOpen}
      />

      {/* Multi-turn Gemini AI Chatbot Drawer / Modal */}
      <GeminiChatbot
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
        language={language}
        customApiKey={profile.customApiKey}
        onUpdateApiKey={(key) => handleUpdateProfile({ customApiKey: key })}
        activeStockTicker={selectedStock?.ticker}
      />

      {/* Real-Time Volatility Surge Alert In-App Toast */}
      <VolatilityAlertToast
        alert={activeVolatilityToast}
        onDismiss={() => setActiveVolatilityToast(null)}
        onInspectStock={(ticker) => {
          const st = stocks.find((s) => s.ticker === ticker);
          if (st) handleSelectStock(st);
          setActiveView('dashboard');
        }}
        onShareToChat={(al) => {
          const text = `⚠️ *NseBse Volatility Expansion Alert: ${al.ticker}*\nCompany: ${al.companyName}\nIntraday Range: ₹${(al.intradayRange || al.currentValue).toFixed(2)}\n14-Day Average Range: ₹${(al.average14DayRange || al.targetValue).toFixed(2)}\nExpansion Ratio: *${(al.expansionRatio || 1.1).toFixed(2)}x Baseline*\nTriggered at: ${new Date().toLocaleTimeString('en-IN')}\n\n_Dispatched via NseBse AI Real-Time Surveillance Engine_`;
          handleOpenGoogleChat(text, 'VOLATILITY');
        }}
        soundEnabled={profile.soundAlerts}
      />

      {/* Google Chat Workspace Integration Modal */}
      <GoogleChatModal
        isOpen={googleChatOpen}
        onClose={() => setGoogleChatOpen(false)}
        stocks={stocks}
        initialShareText={chatShareText}
        initialTemplate={chatTemplate}
      />
    </div>
  );
}
