import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2, Monitor } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<Props> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running as an installed standalone PWA, show compact indicator
  if (isInstalled) {
    return (
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#8CB4E0] bg-[#8CB4E0]/15 border border-[#8CB4E0]/30 rounded-lg">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="font-mono">MxpO</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 4000);
    }
  };

  // Chromium / Android / Desktop standard install prompt flow
  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        title="Add MxpO App to your home screen or desktop"
        className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] px-3 py-1.5 text-xs font-bold text-[#FFFDF8] border border-[#F7EEDB]/40 hover:border-[#F7EEDB] shadow-md shadow-[#D96B43]/25 hover:shadow-[0_0_16px_rgba(217,107,67,0.45)] hover:brightness-110 active:scale-95 transition-all ${
          compact ? 'px-2 py-1' : ''
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{justInstalled ? 'Installed' : compact ? 'Install App' : 'Install PWA'}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowGuide(true)}
          title="Add MxpO App to home screen"
          className="flex items-center gap-1.5 rounded-xl border border-[#D96B43]/40 hover:border-[#D96B43] hover:shadow-[0_0_12px_rgba(217,107,67,0.35)] bg-[#1A1816] px-2.5 py-1.5 text-xs font-medium text-[#F7EEDB] hover:bg-[#25221F] hover:text-[#FFFDF8] transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#D96B43]" />
          <span>{compact ? 'Install' : 'Install App'}</span>
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-[#F7EEDB]">
              <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#D96B43]/15 border border-[#D96B43]/35 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-[#D96B43]" />
                  </div>
                  <h3 className="text-base font-bold text-[#F7EEDB]">Add MxpO App</h3>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="p-1 rounded-lg text-[#F7EEDB]/50 hover:text-[#F7EEDB] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-[#F7EEDB]/85">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#131211] border border-[#D96B43]/20">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D96B43]/20 text-[#D96B43] text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <p>
                    Tap the <strong className="text-[#F7EEDB]">Share</strong> button in the Safari toolbar.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#131211] border border-[#D96B43]/20">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D96B43]/20 text-[#D96B43] text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <p>
                    Scroll down and tap <strong className="text-[#F7EEDB]">Add to Home Screen</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#131211] border border-[#D96B43]/20">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D96B43]/20 text-[#D96B43] text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <p>
                    Tap <strong className="text-[#F7EEDB]">Add</strong> to place MxpO on your device.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#D96B43] text-[#FFFDF8] py-2.5 text-sm font-bold hover:brightness-110 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop manual guide button without using window.alert
  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        title="Add MxpO App"
        className="flex items-center gap-1.5 rounded-xl border border-[#D96B43]/30 bg-[#1A1816] px-3 py-1.5 text-xs font-medium text-[#F7EEDB] hover:border-[#D96B43]/60 hover:text-[#FFFDF8] transition"
      >
        <Download className="w-3.5 h-3.5 text-[#D96B43]" />
        <span>{compact ? 'Install' : 'Install App'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-[#F7EEDB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D96B43]/15 border border-[#D96B43]/35 flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-[#D96B43]" />
                </div>
                <h3 className="text-base font-bold text-[#F7EEDB]">Add MxpO App</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-[#F7EEDB]/50 hover:text-[#F7EEDB] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-[#F7EEDB]/85">
              <p>
                To install <strong className="text-[#F7EEDB]">MxpO</strong> as a standalone application on your device:
              </p>
              <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/20 space-y-2">
                <div className="flex items-center gap-2 text-[#F7EEDB]">
                  <Download className="w-4 h-4 text-[#D96B43]" />
                  <span>Click the install icon in your browser URL address bar</span>
                </div>
                <p className="text-[11px] text-[#F7EEDB]/60 pl-6">
                  Or open your browser menu (⋮) &rarr; "Install MarKtXPO" / "Install MxpO".
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-[#D96B43] text-[#FFFDF8] py-2 text-xs font-bold hover:brightness-110 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
