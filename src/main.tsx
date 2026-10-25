import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister any stale service workers that may intercept preview iframe requests
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    })
    .catch(() => {});
  if ('caches' in window) {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {});
  }
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#131211] text-[#F7EEDB] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-[#D96B43]">Terminal Recovery Mode</h2>
            <p className="text-xs text-[#F7EEDB]/70 font-mono break-words">
              {this.state.error?.message || 'An unexpected rendering issue occurred.'}
            </p>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('marktxpo_active_fallback_user');
                } catch {}
                window.location.reload();
              }}
              className="w-full py-2.5 rounded-xl bg-[#D96B43] text-[#131211] font-bold text-xs hover:brightness-110 transition"
            >
              Reload Terminal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
