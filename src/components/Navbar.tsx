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
  Mail,
  Activity,
  LogOut,
  LogIn,
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
  onOpenLogin?: () => void;
  onOpenChatbot?: () => void;
  onOpenGoogleChat?: () => void;
  onOpenGmail?: () => void;
  isAuthenticated?: boolean;
  onSignOut?: () => Promise<void> | void;
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
  onOpenLogin,
  onOpenChatbot,
  onOpenGoogleChat,
  onOpenGmail,
  isAuthenticated = false,
  onSignOut,
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

  const allNavItems = [
    { id: 'landing', label: t.landing, icon: Home },
    { id: 'dashboard', label: t.dashboard, icon: BarChart3 },
    { id: 'eod', label: 'EOD Analysis', icon: Activity },
    { id: 'watchlist', label: t.watchlist, icon: Coins },
    { id: 'game', label: t.games, icon: Gamepad2 },
    { id: 'compare', label: t.compare, icon: GitCompare },
    { id: 'screener', label: t.screener, icon: Filter },
    { id: 'strategy', label: t.strategy, icon: Sliders },
    { id: 'backtest', label: t.backtest, icon: Cpu },
    { id: 'sectors', label: t.sectors, icon: Layers },
    { id: 'portfolio', label: t.portfolio, icon: Briefcase },
    { id: 'history', label: t.history, icon: History },
    { id: 'account', label: 'Account', icon: UserPlus },
  ];
  const navItems = isAuthenticated ? allNavItems : allNavItems.filter((item) => item.id === 'landing');

  const languages: { code: SupportedLanguage; label: string }[] = [
    { code: 'TA', label: 'தமிழ்' },
    { code: 'EN', label: 'English' },
    { code: 'HI', label: 'हिन्दी' },
    { code: 'GU', label: 'ગુજરાતી' },
    { code: 'MR', label: 'मराठी' },
    { code: 'BN', label: 'বাংলা' },
  ];

  const [benchmarks, setBenchmarks] = useState<{
    name: string;
    exchange: 'NSE' | 'BSE';
    value: number;
    change: number;
    changePercent: number;
    isLive: boolean;
  }[]>([]);

  React.useEffect(() => {
    const loadBenchmarks = async () => {
      try {
        const res = await fetch('/api/market/benchmarks', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.benchmarks?.length) {
            setBenchmarks(data.benchmarks);
          }
        }
      } catch {}
    };
    loadBenchmarks();
    const interval = setInterval(loadBenchmarks, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#D96B43]/20 bg-[#131211]/95 backdrop-blur-md">
      {/* Live Market Official Benchmarks Strip with Green/Red indicators */}
      <div className="hidden sm:flex items-center gap-6 overflow-x-auto py-1 px-4 text-[11px] font-mono border-b border-[#D96B43]/15 bg-[#131211] text-[#F7EEDB]/80 select-none scrollbar-none">
        <div className="flex items-center gap-1.5 font-bold text-[#8CB4E0] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8CB4E0]"></span>
          <span>REFERENCE FEED</span>
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
         
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto flex items-center justify-between px-2.5 sm:px-5 lg:px-8 h-14 sm:h-16 gap-2 sm:gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <button        
            onClick={() => setActiveView('landing')}
            className="flex items-center gap-2 text-left group whitespace-nowrap shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#D96B43] via-[#8CB4E0] to-[#D96B43] p-0.5 shadow-md shadow-[#D96B43]/20 group-hover:scale-105 transition shrink-0">
              <div className="w-full h-full bg-[#131211] rounded-[10px] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#D96B43]" />
              </div>
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold tracking-tight text-[#F7EEDB]">MarKTXPO</span>
              </div>
              <p className="text-[10px] text-[#8CB4E0]/80 hidden sm:block">Indian Equities Terminal</p>
            </div>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 min-w-[110px] max-w-[200px] sm:max-w-xs lg:max-w-sm">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F7EEDB]/40 absolute left-2.5 sm:left-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full pl-8 sm:pl-9 pr-6 py-1.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/25 text-xs text-[#F7EEDB] placeholder-[#F7EEDB]/40 focus:outline-none focus:border-[#D96B43] focus:ring-1 focus:ring-[#D96B43] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-[#F7EEDB]/50 hover:text-[#F7EEDB] text-xs"
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
              <div className="absolute left-0 right-0 sm:w-80 top-11 z-40 rounded-xl bg-[#1A1816] border border-[#D96B43]/35 shadow-2xl overflow-hidden py-1">
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
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#F7EEDB]">{stock.ticker}</span>
                          <span className="text-[10px] text-[#8CB4E0] font-mono">
                            {stock.bseCode}
                          </span>
                          <span className="text-[#F7EEDB]/60 text-[11px] truncate max-w-[120px]">{stock.name}</span>
                        </div>
                        <span className="text-[10px] text-[#D96B43]">{stock.sector}</span>
                      </div>
                      <div className="text-right font-mono tabular-nums shrink-0">
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
        <nav className="hidden xl:flex items-center gap-1 text-xs font-semibold shrink-0">
          {navItems.filter((item) => ['dashboard', 'eod', 'watchlist', 'screener'].includes(item.id)).map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#D96B43]/20 text-[#FFFDF8] border border-[#D96B43] shadow-[0_0_14px_rgba(217,107,67,0.4)] font-bold'
                    : 'text-[#F7EEDB]/75 hover:text-[#FFFDF8] hover:bg-[#1A1816] border border-transparent hover:border-[#8CB4E0]/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[#D96B43]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Tools: PWA Install, Workspace, Alerts, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* PWA Install Button */}
          { /* <PWAInstallButton compact /> */}

          {/* Language Switcher (Desktop & Tablet) */}
          <div className="relative group hidden md:block">
            <button
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#8CB4E0]/40 bg-[#1A1816] text-xs font-medium text-[#F7EEDB] hover:text-[#FFFDF8] hover:border-[#8CB4E0] transition whitespace-nowrap shrink-0"
              title="Change Language / भाषा बदलें"
            >
              <Globe className="w-3.5 h-3.5 text-[#8CB4E0]" />
              <span className="uppercase font-mono text-[11px] font-bold">{language}</span>
            </button>
            <div className="absolute right-0 top-9 hidden group-hover:block z-50 w-36 rounded-xl bg-[#1A1816] border border-[#D96B43]/45 shadow-2xl py-1 overflow-hidden">
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
            className="relative p-2 rounded-xl border border-[#8CB4E0]/40 bg-[#1A1816] text-[#F7EEDB] hover:text-[#FFFDF8] hover:border-[#8CB4E0] transition shrink-0"
          >
            <Bell className="w-4 h-4 text-[#8CB4E0]" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D96B43] text-[#FFFDF8] text-[9px] font-extrabold flex items-center justify-center border border-[#F7EEDB]/50 tabular-nums">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Gmail Workspace Integration Button */}
          {onOpenGmail && (
            <button
              onClick={onOpenGmail}
              className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-red-500/40 bg-red-950/20 hover:bg-red-900/30 hover:border-red-500 text-red-200 hover:text-white text-xs font-semibold shadow-md shadow-red-500/10 transition whitespace-nowrap shrink-0"
              title="Open Gmail Workspace Market Dispatcher & Inbox Feed"
            >
              <Mail className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden lg:inline">Gmail</span>
            </button>
          )}

          {/* Google Chat Integration Button (Desktop/Tablet) */}
          {onOpenGoogleChat && (
            <button
              onClick={onOpenGoogleChat}
              className="hidden md:flex items-center gap-1.5 p-2 lg:px-2.5 lg:py-1.5 rounded-xl border border-[#D96B43]/40 bg-[#1A1816] hover:bg-[#D96B43]/20 hover:border-[#D96B43] text-[#F7EEDB] hover:text-[#FFFDF8] text-xs font-semibold transition whitespace-nowrap shrink-0"
              title="Open Google Chat Market Intelligence Dispatcher"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#D96B43]" />
              <span className="hidden 2xl:inline">Google Chat</span>
            </button>
          )}

          {/* AI Quant Chatbot Button (Desktop/Tablet) */}
          {onOpenChatbot && (
            <button
              onClick={onOpenChatbot}
              className="hidden sm:flex items-center gap-1.5 p-2 lg:px-2.5 lg:py-1.5 rounded-xl border border-[#D96B43]/40 bg-[#1A1816] hover:bg-[#D96B43]/20 hover:border-[#D96B43] text-[#F7EEDB] hover:text-[#FFFDF8] text-xs font-semibold transition whitespace-nowrap shrink-0"
              title="Open NseBse Gemini Quant Chatbot"
            >
              <Bot className="w-3.5 h-3.5 text-[#D96B43]" />
              <span className="hidden 2xl:inline">AI Chatbot</span>
            </button>
          )}

          {/* Clear sign-in choices for new and returning users */}
          {!isAuthenticated && onOpenRegister && (
            <button
              onClick={onOpenRegister}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs shadow-md shadow-[#D96B43]/20 transition whitespace-nowrap shrink-0"
              title="Create your MarKTXpO account"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Create account</span>
            </button>
          )}
          {!isAuthenticated && onOpenLogin && (
            <button
              onClick={onOpenLogin}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#D96B43]/35 bg-[#1A1816] text-[#F7EEDB] hover:bg-[#D96B43]/10 text-xs font-bold transition whitespace-nowrap shrink-0"
              title="Sign in to your account"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Sign in</span>
            </button>
          )}
          {isAuthenticated && onSignOut && (
            <button
              onClick={() => { void onSignOut(); }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#D96B43]/35 bg-[#1A1816] text-[#F7EEDB] hover:bg-[#D96B43]/15 text-xs font-bold transition whitespace-nowrap shrink-0"
              title="Sign out of the current Firebase account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Sign Out</span>
            </button>
          )}

          {/* Profile / Settings Button */}
          {isAuthenticated && (
            <button
              onClick={() => setActiveView('account')}
              title="Open your account"
              className={`hidden sm:flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition text-xs font-medium whitespace-nowrap shrink-0 ${
                activeView === 'account'
                  ? 'bg-[#D96B43]/25 border-[#D96B43] text-[#FFFDF8]'
                  : 'border-[#D96B43]/35 bg-[#1A1816] text-[#F7EEDB] hover:border-[#D96B43] hover:text-[#FFFDF8]'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-[#D96B43] flex items-center justify-center text-[10px] font-bold text-[#FFFDF8]">
                {profile.name.charAt(0)}
              </div>
              <span className="hidden 2xl:inline font-medium text-[#F7EEDB]">{profile.name.split(' ')[0]}</span>
            </button>
          )}

          {/* Mobile & Tablet Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-xl border border-[#D96B43]/35 bg-[#1A1816] text-[#F7EEDB] hover:border-[#D96B43] hover:text-[#FFFDF8] xl:hidden transition shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Tablet & Laptop Secondary Horizontal Navigation Strip (md to xl) */}
      <div className="hidden md:flex xl:hidden items-center gap-1.5 overflow-x-auto px-4 py-1.5 border-t border-[#D96B43]/15 bg-[#131211]/90 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                active
                  ? 'bg-[#D96B43]/20 text-[#FFFDF8] border border-[#D96B43]/60'
                  : 'text-[#F7EEDB]/70 hover:text-[#FFFDF8] hover:bg-[#1A1816]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-[#D96B43]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile & Tablet Menu Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#D96B43]/20 bg-[#131211] p-4 space-y-3 max-h-[80dvh] overflow-y-auto">
          {/* Quick Account & Language Row on Mobile */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#D96B43]/15">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono uppercase transition ${
                    language === l.code
                      ? 'bg-[#D96B43] text-[#131211] font-bold'
                      : 'bg-[#1A1816] text-[#F7EEDB]/75 border border-[#D96B43]/20'
                  }`}
                >
                  {l.code}
                </button>
              ))}
            </div>

            {!isAuthenticated && (
              <div className="grid w-full grid-cols-2 gap-2">
                {onOpenRegister && (
                  <button
                    onClick={() => {
                      onOpenRegister();
                      setMobileMenuOpen(false);
                    }}
                    className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] px-3 py-2 text-xs font-bold text-[#131211]"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Create account</span>
                  </button>
                )}
                {onOpenLogin && (
                  <button
                    onClick={() => {
                      onOpenLogin();
                      setMobileMenuOpen(false);
                    }}
                    className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#D96B43]/30 bg-[#1A1816] px-3 py-2 text-xs font-bold text-[#F7EEDB]"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign in</span>
                  </button>
                )}
              </div>
            )}
            {isAuthenticated && (
              <button
                onClick={() => {
                  setActiveView('account');
                  setMobileMenuOpen(false);
                }}
                className="flex min-h-10 items-center gap-2 rounded-xl border border-[#D96B43]/30 bg-[#1A1816] px-3 py-2 text-xs font-bold text-[#F7EEDB]"
              >
                <UserPlus className="h-3.5 w-3.5 text-[#D96B43]" />
                <span>My account</span>
              </button>
            )}
            {isAuthenticated && onSignOut && (
              <button
                onClick={() => {
                  void onSignOut();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D96B43]/30 bg-[#1A1816] text-[#F7EEDB] font-bold text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>

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
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                    active
                      ? 'bg-[#D96B43]/25 text-[#FFFDF8] border border-[#D96B43]/50'
                      : 'text-[#F7EEDB]/80 bg-[#1A1816] border border-[#D96B43]/15 hover:bg-[#25221F]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#D96B43] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {onOpenGmail && (
              <button
                onClick={() => {
                  onOpenGmail();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold text-red-200 bg-red-950/30 border border-red-500/40 hover:bg-red-900/40 transition min-h-[44px]"
              >
                <Mail className="w-4 h-4 text-red-400" />
                <span>Gmail Market Dispatcher</span>
              </button>
            )}

            {onOpenGoogleChat && (
              <button
                onClick={() => {
                  onOpenGoogleChat();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold text-[#F7EEDB] bg-[#1A1816] border border-[#D96B43]/30 hover:bg-[#D96B43]/20 transition min-h-[44px]"
              >
                <MessageSquare className="w-4 h-4 text-[#D96B43]" />
                <span>Google Chat Dispatcher</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
