import React, { useState } from 'react';
import {
  BarChart3,
  GitCompare,
  Filter,
  Briefcase,
  Menu,
  X,
  Sliders,
  Cpu,
  Layers,
  History,
  Settings,
  Download,
  Home,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Coins,
  Gamepad2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  activeView: string;
  setActiveView: (view: string) => void;
  unreadAlertsCount: number;
}

export const MobileBottomNav: React.FC<Props> = ({
  activeView,
  setActiveView,
  unreadAlertsCount,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const mainTabs = [
    { id: 'dashboard', label: 'Terminal', icon: BarChart3 },
    { id: 'watchlist', label: 'Watchlist', icon: Coins },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'screener', label: 'Screener', icon: Filter },
  ];

  const moreItems = [
    { id: 'landing', label: 'Home Overview', icon: Home, desc: 'Intro & features' },
    { id: 'game', label: 'Trader Academy Game', icon: Gamepad2, desc: 'Interactive charts & paper trading' },
    { id: 'portfolio', label: 'Portfolio Risk', icon: Briefcase, desc: 'VaR & beta analysis' },
    { id: 'strategy', label: 'Strategy Builder', icon: Sliders, desc: 'Custom rules & entries' },
    { id: 'backtest', label: 'Backtesting Engine', icon: Cpu, desc: 'Historical simulations' },
    { id: 'sectors', label: 'Sector Analysis', icon: Layers, desc: 'NSE sectoral indices' },
    { id: 'history', label: 'Bhavcopy Repository', icon: History, desc: 'Daily OHLCV records' },
    { id: 'profile', label: 'Settings & Profile', icon: Settings, desc: 'Language, alerts, keys' },
  ];

  const handleTabClick = (viewId: string) => {
    setActiveView(viewId);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Mobile Bottom Navigation Bar (Visible only on < lg screens) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#131211]/95 backdrop-blur-xl border-t border-[#D96B43]/30 px-2 pt-1 pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.8)]"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        aria-label="Mobile Navigation"
      >
        <div className="flex items-center justify-around">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 min-w-[56px] ${
                  isActive
                    ? 'text-[#FFFDF8]'
                    : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                }`}
              >
                <div
                  className={`p-1 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#D96B43] text-[#131211] shadow-[0_0_12px_rgba(217,107,67,0.5)]'
                      : 'text-inherit'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] mt-0.5 tracking-tight font-medium ${
                    isActive ? 'text-[#D96B43] font-bold' : 'text-[#F7EEDB]/70'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More / Menu Drawer Toggle */}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 min-w-[56px] ${
              drawerOpen || !mainTabs.some((t) => t.id === activeView)
                ? 'text-[#FFFDF8]'
                : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
            }`}
          >
            <div
              className={`p-1 rounded-lg relative transition-all ${
                drawerOpen
                  ? 'bg-[#8CB4E0] text-[#131211] shadow-[0_0_12px_rgba(140,180,224,0.5)]'
                  : 'text-inherit'
              }`}
            >
              {drawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              {unreadAlertsCount > 0 && !drawerOpen && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#D96B43] animate-pulse" />
              )}
            </div>
            <span
              className={`text-[10px] mt-0.5 tracking-tight font-medium ${
                drawerOpen ? 'text-[#8CB4E0] font-bold' : 'text-[#F7EEDB]/70'
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Slide-up Drawer for Secondary Views & Quick PWA Install */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#1A1816] border-t border-[#D96B43]/40 p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Header with drag indicator */}
            <div className="flex flex-col items-center pb-2 border-b border-[#D96B43]/20">
              <div className="w-10 h-1 rounded-full bg-[#F7EEDB]/20 mb-3" />
              <div className="w-full flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#F7EEDB] flex items-center gap-2">
                    <span>MarKtXPO Terminal</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D96B43]/20 text-[#D96B43] font-mono font-bold">
                      PWA
                    </span>
                  </h3>
                  <p className="text-xs text-[#F7EEDB]/60">Select analytics view or install app</p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-xl bg-[#25221F] text-[#F7EEDB]/70 hover:text-[#FFFDF8]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PWA Install Promo Box inside drawer */}
            {!isInstalled && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#D96B43]/20 via-[#1A1816] to-[#8CB4E0]/15 border border-[#D96B43]/40 flex items-center justify-between gap-3 shadow-[0_0_16px_rgba(217,107,67,0.15)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D96B43] text-[#FFFDF8] flex items-center justify-center font-bold text-sm shrink-0 shadow-lg shadow-[#D96B43]/30">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#FFFDF8]">Install MxpO PWA</h4>
                    <p className="text-[11px] text-[#F7EEDB]/70">Add to home screen for fast fullscreen trading</p>
                  </div>
                </div>

                {isInstallable ? (
                  <button
                    onClick={async () => {
                      await install();
                      setDrawerOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D96B43] text-[#131211] font-bold text-xs hover:brightness-110 active:scale-95 shrink-0 shadow-[0_0_12px_rgba(217,107,67,0.4)]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install</span>
                  </button>
                ) : isIOS ? (
                  <button
                    onClick={() => setShowIOSModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8CB4E0] text-[#131211] font-bold text-xs shrink-0"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>How to add</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-[#8CB4E0] font-mono">Install from browser</span>
                )}
              </div>
            )}

            {isInstalled && (
              <div className="p-2.5 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center gap-2 text-xs text-[#22C55E]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Running as verified Standalone PWA on your device.</span>
              </div>
            )}

            {/* Grid of Views */}
            <div className="grid grid-cols-2 gap-2.5">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`p-3 rounded-xl border text-left transition-all active:scale-95 flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-[#D96B43]/20 border-[#D96B43] shadow-[0_0_12px_rgba(217,107,67,0.3)]'
                        : 'bg-[#131211] border-[#D96B43]/20 hover:border-[#D96B43]/60'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isActive ? 'bg-[#D96B43] text-[#131211]' : 'bg-[#1A1816] text-[#D96B43]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#F7EEDB] truncate">{item.label}</div>
                      <div className="text-[10px] text-[#F7EEDB]/50 truncate">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Offline & Exchange badges */}
            <div className="pt-2 border-t border-[#D96B43]/20 flex items-center justify-between text-[11px] font-mono text-[#F7EEDB]/60">
              <span className="flex items-center gap-1 text-[#22C55E]">
                <ShieldCheck className="w-3.5 h-3.5" />
                NSE &amp; BSE Certified Feeds
              </span>
              <span>v2.4.0 Standalone</span>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Installation Instruction Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1A1816] border border-[#D96B43]/40 p-6 shadow-2xl text-[#F7EEDB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D96B43]/20 border border-[#D96B43]/40 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-[#D96B43]" />
                </div>
                <h3 className="text-base font-bold text-[#F7EEDB]">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-[#F7EEDB]/50 hover:text-[#F7EEDB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-[#F7EEDB]/85">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#131211] border border-[#D96B43]/20">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D96B43] text-[#131211] text-xs font-bold shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Tap the <strong className="text-[#FFFDF8]">Share button</strong> (square with arrow up) at the bottom of Safari.
                </p>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#131211] border border-[#D96B43]/20">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D96B43] text-[#131211] text-xs font-bold shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Scroll down the share sheet and tap <strong className="text-[#FFFDF8]">Add to Home Screen</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#131211] border border-[#D96B43]/20">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D96B43] text-[#131211] text-xs font-bold shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Confirm by tapping <strong className="text-[#FFFDF8]">Add</strong> in the top-right corner.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-[#D96B43] text-[#131211] py-2.5 text-xs font-bold hover:brightness-110 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
