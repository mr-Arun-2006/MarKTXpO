import React, { useState } from 'react';
import { StockData, SupportedLanguage, UserProfile } from '../types/market';
import { translations } from '../i18n/translations';
import { PWAInstallButton } from './PWAInstallButton';
import {
  TrendingUp,
  Search,
  Globe,
  Bell,
  Sliders,
  BarChart3,
  GitCompare,
  Filter,
  Cpu,
  History,
  Briefcase,
  Menu,
  X,
  Home,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Gamepad2,
  UserPlus,
  Bot,
  MessageSquare,
} from 'lucide-react';

interface Props {
  activeView: string;
  setActiveView: (view: string) => void;
  stocks: StockData[];
  selectedStock: StockData;
  setSelectedStock: (stock: StockData) => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  profile: UserProfile;
  unreadAlertsCount: number;
  openAIExplanation: (stock: StockData) => void;
  onOpenRegister?: () => void;
  onOpenChatbot?: () => void;
  onOpenGoogleChat?: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeView,
  setActiveView,
  stocks,
  selectedStock,
  setSelectedStock,
  language,
  setLanguage,
  profile,
  unreadAlertsCount,
  openAIExplanation,
  onOpenRegister,
  onOpenChatbot,
  onOpenGoogleChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const t = translations[language];

  // Search filtered stocks
  const searchResults = stocks.filter(
    (s) =>
      s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.bseCode.includes(searchQuery) ||
      s.sector.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 6);

  const navItems = [
    { id: 'landing', label: t.landing, icon: Home },
    { id: 'dashboard', label: t.dashboard, icon: BarChart3 },
    { id: 'watchlist', label: t.watchlist, icon: Coins },
    { id: 'game', label: t.games, icon: Gamepad2 },
    { id: 'compare', label: t.compare, icon: GitCompare },
    { id: 'screener', label: t.screener, icon: Filter },
    { id: 'strategy', label: t.strategy, icon: Sliders },
    { id: 'backtest', label: t.backtest, icon: Cpu },
    { id: 'sectors', label: t.sectors, icon: Layers },
    { id: 'portfolio', label: t.portfolio, icon: Briefcase },
    { id: 'history', label: t.history, icon: History },
  ];

  const languages: { code: SupportedLanguage; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'gu', label: 'ગુજરાતી' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'mr', label: 'मराठी' },
    { code: 'bn', label: 'বাংলা' },
  ];

  const [benchmarks, setBenchmarks] = useState<{
    name: string;
    exchange: 'NSE' | 'BSE';
    value: number;
    change: number;
    changePercent: number;
    isLive: boolean;
  }[]>([
    { name: 'NIFTY 50', exchange: 'NSE', value: 23146.15, change: 148.85, changePercent: 0.65, isLive: true },
    { name: 'SENSEX', exchange: 'BSE', value: 74729.27, change: 413.67, changePercent: 0.56, isLive: true },
    { name: 'BANK NIFTY', exchange: 'NSE', value: 55844.00, change: 33.50, changePercent: 0.06, isLive: true },
    { name: 'NIFTY IT', exchange: 'NSE', value: 31924.10, change: 1204.30, changePercent: 3.92, isLive: true },
    { name: 'INDIA VIX', exchange: 'NSE', value: 14.03, change: -0.04, changePercent: -0.28, isLive: true },
  ]);

  React.useEffect(() => {
    const loadBenchmarks = async () => {
      try {
        const res = await fetch('/api/market/benchmarks');
        if (res.ok) {
          const data = await res.json();
          if (data?.benchmarks?.length) {
            setBenchmarks(data.benchmarks);
          }
        }
      } catch {}
    };
    loadBenchmarks();
    const interval = setInterval(loadBenchmarks, 25000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#D96B43]/20 bg-[#131211]/95 backdrop-blur-md">
      {/* Live Market Official Benchmarks Strip with Green/Red indicators */}
      <div className="hidden sm:flex items-center gap-6 overflow-x-auto py-1 px-4 text-[11px] font-mono border-b border-[#D96B43]/15 bg-[#131211] text-[#F7EEDB]/80 select-none scrollbar-none">
        <div className="flex items-center gap-1.5 font-bold text-[#22C55E] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
          <span>OFFICIAL INDICES</span>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          {benchmarks.map((idx) => {
            const isPos = idx.change >= 0;
            return (
              <div key={idx.name} className="flex items-center gap-1.5">
                <span className="text-[#8CB4E0] font-semibold">{idx.name}</span>
                <span className="font-bold text-[#F7EEDB]">
                  {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`flex items-center text-[10px] font-bold ${isPos ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {isPos ? '+' : ''}{idx.change.toFixed(2)} ({isPos ? '+' : ''}{idx.changePercent}%)
                </span>
              </div>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-3 text-[#F7EEDB]/50 text-[10px] shrink-0">
          <span className="text-[#22C55E] font-medium flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-[#22C55E]"></span>
            NSE · BSE OFFICIAL FEED
          </span>
          <span className="text-[#D96B43] font-semibold">YAHOO &amp; GOOGLE FINANCE</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 h-16 gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveView('landing')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D96B43] via-[#8CB4E0] to-[#D96B43] p-0.5 shadow-md shadow-[#D96B43]/20 group-hover:scale-105 transition">
              <div className="w-full h-full bg-[#131211] rounded-[10px] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#D96B43]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-[#F7EEDB]">MarKtXPO</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#D96B43]/20 text-[#D96B43] font-mono font-bold border border-[#D96B43]/35">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-[#8CB4E0]/80 hidden sm:block">Indian Equities Terminal</p>
            </div>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-xs sm:max-w-md">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#F7EEDB]/40 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/25 text-xs text-[#F7EEDB] placeholder-[#F7EEDB]/40 focus:outline-none focus:border-[#D96B43] focus:ring-1 focus:ring-[#D96B43] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-[#F7EEDB]/50 hover:text-[#F7EEDB] text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showSearchResults && searchQuery && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowSearchResults(false)}
              ></div>
              <div className="absolute left-0 right-0 top-11 z-40 rounded-xl bg-[#1A1816] border border-[#D96B43]/35 shadow-2xl overflow-hidden py-1">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-xs text-[#F7EEDB]/60 text-center">No stocks matching "{searchQuery}"</div>
                ) : (
                  searchResults.map((stock) => (
                    <button
                      key={stock.ticker}
                      onClick={() => {
                        setSelectedStock(stock);
                        setShowSearchResults(false);
                        setSearchQuery('');
                        setActiveView('dashboard');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#25221F] transition text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#F7EEDB]">{stock.ticker}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#131211] text-[#8CB4E0] font-mono">
                            {stock.bseCode}
                          </span>
                          <span className="text-[#F7EEDB]/60 text-[11px] truncate max-w-[140px]">{stock.name}</span>
                        </div>
                        <span className="text-[10px] text-[#D96B43]">{stock.sector}</span>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-bold text-[#F7EEDB]">₹{stock.currentPrice.toFixed(2)}</div>
                        <div className={stock.change >= 0 ? 'text-[#22C55E] text-[11px] font-bold' : 'text-[#EF4444] text-[11px] font-bold'}>
                          {stock.change >= 0 ? '+' : ''}{stock.changePercent}%
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Desktop Quick Nav Links */}
        <nav className="hidden xl:flex items-center gap-1.5 text-xs font-semibold">
          {navItems.slice(1, 6).map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-[#D96B43]/20 text-[#FFFDF8] border border-[#D96B43] shadow-[0_0_14px_rgba(217,107,67,0.4)] font-bold'
                    : 'text-[#F7EEDB]/70 hover:text-[#FFFDF8] hover:bg-[#1A1816] border border-transparent hover:border-[#8CB4E0]/50 hover:shadow-[0_0_10px_rgba(140,180,224,0.25)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[#D96B43]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Tools: Language, Alerts, MxpO PWA Button, Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* PWA Install Button (with 'MxpO' label) */}
          <PWAInstallButton compact />

          {/* Language Switcher */}
          <div className="relative group">
            <button
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#8CB4E0]/40 bg-[#1A1816] text-xs font-medium text-[#F7EEDB] hover:text-[#FFFDF8] hover:border-[#8CB4E0] hover:shadow-[0_0_12px_rgba(140,180,224,0.35)] transition"
              title="Change Language / भाषा बदलें"
            >
              <Globe className="w-3.5 h-3.5 text-[#8CB4E0]" />
              <span className="uppercase font-mono text-[11px] font-bold">{language}</span>
            </button>
            <div className="absolute right-0 top-9 hidden group-hover:block z-50 w-36 rounded-xl bg-[#1A1816] border border-[#D96B43]/45 shadow-[0_4px_24px_rgba(0,0,0,0.7),0_0_16px_rgba(217,107,67,0.2)] py-1 overflow-hidden">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition ${
                    language === l.code ? 'bg-[#D96B43]/25 text-[#FFFDF8] font-bold' : 'text-[#F7EEDB]/80 hover:bg-[#25221F]'
                  }`}
                >
                  <span>{l.label}</span>
                  <span className="text-[10px] text-[#8CB4E0] font-mono uppercase">{l.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Alerts Bell */}
          <button
            onClick={() => setActiveView('alerts')}
            title="Real-time Trade Alerts"
            className="relative p-2 rounded-xl border border-[#8CB4E0]/40 bg-[#1A1816] text-[#F7EEDB] hover:text-[#FFFDF8] hover:border-[#8CB4E0] hover:shadow-[0_0_12px_rgba(140,180,224,0.35)] transition"
          >
            <Bell className="w-4 h-4 text-[#8CB4E0]" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D96B43] text-[#FFFDF8] text-[9px] font-extrabold flex items-center justify-center animate-pulse border border-[#F7EEDB]/50 shadow-[0_0_8px_rgba(217,107,67,0.6)]">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Google Chat Integration Button */}
          {onOpenGoogleChat && (
            <button
              onClick={onOpenGoogleChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D96B43]/40 bg-[#1A1816] hover:bg-[#D96B43]/20 hover:border-[#D96B43] text-[#F7EEDB] hover:text-[#FFFDF8] text-xs font-semibold shadow-md shadow-[#D96B43]/10 transition"
              title="Open Google Chat Market Intelligence Dispatcher"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#D96B43]" />
              <span className="hidden sm:inline">Google Chat</span>
            </button>
          )}

          {/* AI Quant Chatbot Button */}
          {onOpenChatbot && (
            <button
              onClick={onOpenChatbot}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D96B43]/40 bg-[#1A1816] hover:bg-[#D96B43]/20 hover:border-[#D96B43] text-[#F7EEDB] hover:text-[#FFFDF8] text-xs font-semibold shadow-md shadow-[#D96B43]/10 transition"
              title="Open NseBse Gemini Quant Chatbot"
            >
              <Bot className="w-3.5 h-3.5 text-[#D96B43]" />
              <span className="hidden sm:inline">AI Chatbot</span>
            </button>
          )}

          {/* Register / Sign In Button */}
          {onOpenRegister && (
            <button
              onClick={onOpenRegister}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs shadow-md shadow-[#D96B43]/20 transition"
              title="Register New Trader in Firestore Cloud Database"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Register / Sign In</span>
            </button>
          )}

          {/* Profile / Settings Button */}
          <button
            onClick={() => setActiveView('profile')}
            className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition text-xs font-medium ${
              activeView === 'profile'
                ? 'bg-[#D96B43]/25 border-[#D96B43] shadow-[0_0_14px_rgba(217,107,67,0.4)] text-[#FFFDF8]'
                : 'border-[#D96B43]/35 bg-[#1A1816] text-[#F7EEDB] hover:border-[#D96B43] hover:shadow-[0_0_12px_rgba(217,107,67,0.3)] hover:text-[#FFFDF8]'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-[#D96B43] flex items-center justify-center text-[10px] font-bold text-[#FFFDF8]">
              {profile.name.charAt(0)}
            </div>
            <span className="hidden md:inline font-medium text-[#F7EEDB]">{profile.name.split(' ')[0]}</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-[#D96B43]/35 bg-[#1A1816] text-[#F7EEDB] hover:border-[#D96B43] hover:shadow-[0_0_12px_rgba(217,107,67,0.3)] hover:text-[#FFFDF8] xl:hidden transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#D96B43]/20 bg-[#131211] p-4 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition ${
                    active
                      ? 'bg-[#D96B43]/25 text-[#FFFDF8] border border-[#D96B43]/50'
                      : 'text-[#F7EEDB]/80 bg-[#1A1816] border border-[#D96B43]/15 hover:bg-[#25221F]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#D96B43]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {onOpenGoogleChat && (
            <button
              onClick={() => {
                onOpenGoogleChat();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold text-[#F7EEDB] bg-[#1A1816] border border-[#D96B43]/30 hover:bg-[#D96B43]/20 transition"
            >
              <MessageSquare className="w-4 h-4 text-[#D96B43]" />
              <span>Google Chat Market Dispatcher</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
