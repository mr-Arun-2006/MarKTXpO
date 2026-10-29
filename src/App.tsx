/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { StockData, SupportedLanguage, UserProfile, MarketAlert, CustomStrategy } from './types/market';
import { INITIAL_STOCKS } from './data/mockMarketData';
import { Navbar } from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AIExplanationModal } from './components/AIExplanationModal';
import { RegisterUserModal } from './components/RegisterUserModal';
import { GeminiChatbot } from './components/GeminiChatbot';
import { ChatbotTrigger } from './components/ChatbotTrigger';
import { VolatilityAlertToast } from './components/VolatilityAlertToast';
import { GoogleChatModal } from './components/GoogleChatModal';
import { GmailModal } from './components/GmailModal';
import {
  calculate14DayAverageRange,
  computeStockVolatilityMetric,
  createVolatilityAlert,
  playVolatilityChime,
} from './utils/volatilityAlertEngine';
import { auth, getDbUserProfile, saveDbTradeAlert, logOut } from './services/firebase';

// Views
import { LandingPage } from './views/LandingPage';
import { AccountHomeView } from './views/AccountHomeView';
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
import { EODAnalysisView } from './views/EODAnalysisView';
import { OfficialMarketBanner } from './components/OfficialMarketBanner';
import { MobileBottomNav } from './components/MobileBottomNav';
import { fetchRealStockQuotes, fetchRealStockHistory } from './services/marketDataClient';

export default function App() {
  const [activeView, setActiveView] = useState<string>('landing');
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockData>(INITIAL_STOCKS[0]);
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [lastLiveSync, setLastLiveSync] = useState<string | null>(null);
  const [isLiveOfficial, setIsLiveOfficial] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isMarketDataUnavailable, setIsMarketDataUnavailable] = useState<boolean>(false);

  // Active strategy passed to backtester
  const [activeStrategy, setActiveStrategy] = useState<CustomStrategy | undefined>(undefined);

  // AI Explanation Modal state
  const [explainingStock, setExplainingStock] = useState<StockData | null>(null);

  // Auth modal state
  const [authInitialMode, setAuthInitialMode] = useState<'register' | 'login'>('register');
  const [authReady, setAuthReady] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(auth.currentUser);
  const [pendingView, setPendingView] = useState<string | null>(null);

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

  // Gmail Workspace Integration modal state
  const [gmailOpen, setGmailOpen] = useState(false);

  // Real-time Volatility Alert state
  const [activeVolatilityToast, setActiveVolatilityToast] = useState<MarketAlert | null>(null);
  const triggeredVolatilityTickersRef = React.useRef<Set<string>>(new Set());

  // Never hydrate an identity from browser storage. User identity comes from Firebase Auth.
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Visitor',
    email: '',
    customApiKey: '',
    preferredExchange: 'NSE',
    riskTolerance: 'Moderate',
    soundAlerts: true,
    language: 'en',
  });

// Keep language in sync with profile
  useEffect(() => {
    if (profile.language && profile.language !== language) {
      setLanguage(profile.language);
    }
  }, []);

  // Firebase is the source of identity; clearing auth also clears the in-memory model key.
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setAuthenticatedUser(user);
      setAuthReady(true);

      if (!user) {
        setProfile((previous) => ({
          ...previous,
          name: 'Visitor',
          email: '',
          customApiKey: '',
        }));
        setExplainingStock(null);
        setChatbotOpen(false);
        setGmailOpen(false);
        setGoogleChatOpen(false);
        setActiveView((currentView) => currentView === 'auth' ? 'auth' : 'landing');
        return;
      }

      const dbProfile = await getDbUserProfile(user.uid);
      setProfile((previous) => ({
        ...previous,
        name: dbProfile?.displayName || user.displayName || 'Trader',
        email: dbProfile?.email || user.email || '',
        preferredExchange: (dbProfile?.preferredExchange as any) || previous.preferredExchange,
        language: (dbProfile?.language as any) || previous.language,
        customApiKey: '',
      }));
      if (dbProfile?.language) setLanguage(dbProfile.language as SupportedLanguage);
    });
    return () => unsubscribe();
  }, []);

// Fetch quote and historical data through the configured server API
  const handleRefreshRealData = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchRealStockQuotes();
      if (data && data.stocks && data.stocks.length > 0) {
        setStocks(data.stocks);
        setLastLiveSync(data.timestamp || new Date().toISOString());
        setIsLiveOfficial(data.isLiveOfficial ?? false);
        setIsMarketDataUnavailable(false);

        setSelectedStock((prev) => {
          const match = data.stocks.find((s) => s.ticker === prev.ticker) || data.stocks[0];
          if (!match) return prev;
          return {
            ...match,
            history: prev.ticker === match.ticker && prev.history && prev.history.length > 0
              ? prev.history
              : match.history,
          };
        });
      } else {
        setIsMarketDataUnavailable(true);
      }
    } catch (err) {
      setIsMarketDataUnavailable(true);
      console.warn('[App] Market data refresh failed:', err);
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
    if (!authReady || !authenticatedUser) {
      setPendingView('dashboard');
      setActiveView('landing');
      setAuthModalOpen(true);
      return;
    }
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



  const openAuthForView = (targetView = 'account', mode: 'register' | 'login' = 'register') => {
    if (authReady && authenticatedUser) {
      setActiveView(targetView);
      return;
    }
    setPendingView(targetView);
    setAuthInitialMode(mode);
    setActiveView('auth');
  };

  const navigateToView = (view: string) => {
    if (view === 'landing') {
      setActiveView('landing');
      return;
    }
    if (view === 'auth') {
      setAuthInitialMode('register');
      setActiveView('auth');
      return;
    }
    if (!authReady || !authenticatedUser) {
      setPendingView(view);
      setAuthInitialMode('register');
      setActiveView('auth');
      return;
    }
    setActiveView(view);
  };

  const runAuthenticatedAction = (action: () => void, targetView = 'dashboard') => {
    if (!authReady || !authenticatedUser) {
      setPendingView(targetView);
      setAuthInitialMode('register');
      setActiveView('auth');
      return;
    }
    action();
  };

  const handleSignOut = async () => {
    try {
      await logOut();
    } finally {
      setAuthenticatedUser(null);
      setAuthReady(true);
      setPendingView(null);
      setProfile({
        name: 'Visitor',
        email: '',
        customApiKey: '',
        preferredExchange: 'NSE',
        riskTolerance: 'Moderate',
        soundAlerts: true,
        language: 'en',
      });
      setLanguage('en');
      setActiveView('landing');
    }
  };

  const unreadAlertsCount = alerts.filter((a) => a.triggered).length;

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-[#131211] text-[#F7EEDB] flex flex-col font-sans selection:bg-[#D96B43]/30 selection:text-[#F7EEDB]">
      {/* Offline Toast Indicator */}
      {activeView !== 'auth' && <OfflineIndicator />}

      {/* Market data connection and provenance banner */}
      {activeView !== 'auth' && (
        <OfficialMarketBanner
          isLiveOfficial={isLiveOfficial}
          isUnavailable={isMarketDataUnavailable}
          lastLiveSync={lastLiveSync}
          onRefresh={handleRefreshRealData}
          isRefreshing={isRefreshing}
          stockCount={stocks.length}
        />
      )}

      {/* Main Top Navigation */}
      {activeView !== 'auth' && <Navbar
        activeView={activeView}
        setActiveView={navigateToView}
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
        onOpenRegister={() => openAuthForView('account', 'register')}
        onOpenLogin={() => openAuthForView('account', 'login')}
        onOpenChatbot={() => runAuthenticatedAction(() => setChatbotOpen(true))}
        onOpenGoogleChat={() => runAuthenticatedAction(() => handleOpenGoogleChat())}
        onOpenGmail={() => runAuthenticatedAction(() => setGmailOpen(true))}
        isAuthenticated={Boolean(authReady && authenticatedUser)}
        onSignOut={handleSignOut}
      />}

      {/* Active View Router */}
      <main className={activeView === 'auth' ? 'flex-1 w-full' : 'flex-1 w-full pb-24 lg:pb-10'}>
        {activeView !== 'landing' && activeView !== 'profile' && activeView !== 'eod' && activeView !== 'account' && activeView !== 'auth' && (stocks.length === 0 || isMarketDataUnavailable) ? (
          <section className="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center gap-4 px-5 py-12 text-center">
            <div className="rounded-2xl border border-[#D96B43]/25 bg-[#1A1816] p-6 shadow-xl">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#D96B43]">Market data unavailable</div>
              <h2 className="mt-3 text-2xl font-black text-[#F7EEDB]">Waiting for a real market-data response</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#F7EEDB]/60">
                Stock-driven features are paused until the configured source returns usable quotes. This prevents placeholder prices or sample alerts from being presented as live market data.
              </p>
              <p className="mt-2 text-xs text-[#F7EEDB]/45">
                The default source is Yahoo Finance third-party reference data, not an official NSE/BSE feed. Check provider access and deployment secrets before retrying.
              </p>
              <button
                onClick={() => { void handleRefreshRealData(); }}
                disabled={isRefreshing}
                className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#D96B43] px-5 py-3 text-sm font-bold text-[#131211] disabled:opacity-50"
              >
                {isRefreshing ? 'Checking market source…' : 'Retry market data'}
              </button>
            </div>
          </section>
        ) : (
          <>
        {activeView === 'auth' && (
          <RegisterUserModal
            isOpen={true}
            fullPage
            initialMode={authInitialMode}
            language={language}
            onClose={() => {
              setPendingView(null);
              setActiveView('landing');
            }}
            onSuccess={async () => {
              const signedInUser = auth.currentUser;
              setAuthenticatedUser(signedInUser);
              setAuthReady(true);
              if (!signedInUser) return;
              setActiveView('account');
              const dbP = await getDbUserProfile(signedInUser.uid);
              if (dbP) {
                setProfile((prev) => ({
                  ...prev,
                  name: dbP.displayName || signedInUser.displayName || prev.name,
                  email: dbP.email || signedInUser.email || prev.email,
                  preferredExchange: (dbP.preferredExchange as any) || prev.preferredExchange,
                  customApiKey: '',
                }));
              }
            }}
          />
        )}

        {activeView === 'landing' && (
          <LandingPage
            onLaunchDashboard={() => navigateToView('dashboard')}
            onLaunchEod={() => navigateToView('eod')}
            onExploreStock={(st) => runAuthenticatedAction(() => {
              handleSelectStock(st);
              navigateToView('dashboard');
              openAIExplanation(st);
            }, 'dashboard')}
            onPlayGame={() => navigateToView('game')}
            onRegister={() => openAuthForView('account', 'register')}
            featuredStocks={stocks}
            language={language}
          />
        )}

        {activeView === 'account' && (
          <AccountHomeView
            profile={profile}
            isGuest={Boolean(authenticatedUser?.isAnonymous)}
            pendingDestination={pendingView}
            onNavigate={(view) => {
              setPendingView(null);
              navigateToView(view);
            }}
            onSignOut={handleSignOut}
          />
        )}

        {activeView === 'dashboard' && (
          <DashboardView
            stocks={stocks}
            selectedStock={selectedStock}
            setSelectedStock={handleSelectStock}
            openAIExplanation={openAIExplanation}
            alerts={alerts}
            setActiveView={navigateToView}
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
            onNavigateToDashboard={() => navigateToView('dashboard')}
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

        {activeView === 'eod' && (
          <EODAnalysisView
            customApiKey={profile.customApiKey}
            onUpdateApiKey={(key) => handleUpdateProfile({ customApiKey: key })}
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
          </>
        )}
      </main>
 
      {/* Mobile Bottom Quick Navigation & PWA Action Bar */}
      {authReady && authenticatedUser && activeView !== 'landing' && activeView !== 'auth' && (
        <MobileBottomNav
          activeView={activeView}
          setActiveView={navigateToView}
          unreadAlertsCount={unreadAlertsCount}
          onOpenGmail={() => setGmailOpen(true)}
          onOpenGoogleChat={() => handleOpenGoogleChat()}
        />
      )}

      {/* AI Deep Explanation Modal */}
      {explainingStock && (
        <AIExplanationModal
          stock={explainingStock}
          language={language}
          customApiKey={profile.customApiKey}
          onClose={() => setExplainingStock(null)}
        />
      )}



      {/* Floating Chatbot Trigger Button */}
      {authenticatedUser && activeView !== 'auth' && (
        <ChatbotTrigger
          onClick={() => setChatbotOpen(true)}
          isOpen={chatbotOpen}
        />
      )}

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

      {/* Gmail Workspace Integration Modal */}
      <GmailModal
        isOpen={gmailOpen}
        onClose={() => setGmailOpen(false)}
        stocks={stocks}
        selectedStock={selectedStock}
        userEmail={profile.email}
        userName={profile.name}
      />
    </div>
  );
}
