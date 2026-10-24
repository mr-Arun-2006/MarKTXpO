import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  X,
  Radio,
  FileText,
  TrendingUp,
  Layers,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  GoogleChatSpace,
  GoogleChatMessage,
  ChatApiError,
  connectGoogleChat,
  disconnectGoogleChat,
  fetchChatSpaces,
  fetchSpaceMessages,
  sendChatMessage,
  getCachedChatAccessToken,
  GOOGLE_PROJECT_ID,
} from '../services/googleChatService';
import { StockData } from '../types/market';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stocks: StockData[];
  initialShareText?: string;
  initialTemplate?: 'ARBITRAGE' | 'SECTOR' | 'VOLATILITY' | 'CUSTOM';
}

export const GoogleChatModal: React.FC<Props> = ({
  isOpen,
  onClose,
  stocks,
  initialShareText,
  initialTemplate = 'CUSTOM',
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(getCachedChatAccessToken());
  const [connecting, setConnecting] = useState(false);
  const [spaces, setSpaces] = useState<GoogleChatSpace[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<GoogleChatSpace | null>(null);
  const [spaceMessages, setSpaceMessages] = useState<GoogleChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeTab, setActiveTab] = useState<'DISPATCH' | 'SPACES' | 'RECENT_MESSAGES'>('DISPATCH');

  // Message composer state
  const [messageText, setMessageText] = useState<string>(initialShareText || '');
  const [selectedTemplate, setSelectedTemplate] = useState<'ARBITRAGE' | 'SECTOR' | 'VOLATILITY' | 'CUSTOM'>(
    initialTemplate
  );

  // Mandatory confirmation dialog state
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // API error state
  const [apiError, setApiError] = useState<ChatApiError | null>(null);

  // Keep access token state updated
  useEffect(() => {
    if (isOpen) {
      const cached = getCachedChatAccessToken();
      setAccessToken(cached);
      if (cached) {
        loadSpaces(cached);
      }
    }
  }, [isOpen]);

  // Update initial message text if prop changes
  useEffect(() => {
    if (initialShareText) {
      setMessageText(initialShareText);
    }
  }, [initialShareText]);

  // Load spaces
  const loadSpaces = async (token?: string) => {
    setLoadingSpaces(true);
    setApiError(null);
    const result = await fetchChatSpaces(token || accessToken || undefined);
    setLoadingSpaces(false);
    if (result.error) {
      setApiError(result.error);
      setSpaces([]);
    } else {
      setSpaces(result.spaces);
      if (result.spaces.length > 0 && !selectedSpace) {
        setSelectedSpace(result.spaces[0]);
      }
    }
  };

  // Load space messages
  const loadMessages = async (space: GoogleChatSpace) => {
    if (!space) return;
    setLoadingMessages(true);
    setApiError(null);
    const result = await fetchSpaceMessages(space.name, accessToken || undefined);
    setLoadingMessages(false);
    if (result.error) {
      setApiError(result.error);
    } else {
      setSpaceMessages(result.messages);
    }
  };

  // Handle Google OAuth Sign-in with Chat Scopes
  const handleConnect = async () => {
    setConnecting(true);
    setApiError(null);
    try {
      const { accessToken: token } = await connectGoogleChat();
      setAccessToken(token);
      await loadSpaces(token);
    } catch (err: any) {
      setApiError({
        isConfigError: false,
        message: err?.message || 'Failed to authenticate with Google Chat scopes.',
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleChat();
    setAccessToken(null);
    setSpaces([]);
    setSelectedSpace(null);
    setSpaceMessages([]);
  };

  // Preset Template Generators
  const applyTemplate = (template: 'ARBITRAGE' | 'SECTOR' | 'VOLATILITY' | 'CUSTOM') => {
    setSelectedTemplate(template);
    if (template === 'ARBITRAGE') {
      const topArb = [...stocks].sort((a, b) => Math.abs(b.spreadPercent) - Math.abs(a.spreadPercent)).slice(0, 3);
      const text = `🚨 *NseBse Market Intelligence: Dual-Exchange Arbitrage Alert*
Timestamp: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST

Top Inter-Exchange Price Differentials:
${topArb
  .map(
    (s, i) =>
      `${i + 1}. *${s.ticker}* (${s.name})
   • NSE: ₹${s.nsePrice.toFixed(2)} | BSE: ₹${s.bsePrice.toFixed(2)}
   • Gross Spread: ${Math.abs(s.spreadPercent).toFixed(2)}% (₹${Math.abs(s.nsePrice - s.bsePrice).toFixed(2)})
   • Action: ${s.arbitrageDirection.replace(/_/g, ' ')}`
  )
  .join('\n\n')}

_Dispatched via NseBse AI Real-Time Surveillance Engine_`;
      setMessageText(text);
    } else if (template === 'SECTOR') {
      const text = `📊 *NseBse Sector Rotation & Industry Divergence Brief*
Date: ${new Date().toLocaleDateString('en-IN')}

Key Sector Movements Observed:
• *Banking & Financials*: Strong institutional accumulation on private lending leaders.
• *Information Technology*: Mid-tier outperformance on USD tailwinds.
• *Capital Goods & Infrastructure*: Multi-year order book visibility driving momentum.

_Live Sector Heatmap active on NseBse Intelligence Terminal._`;
      setMessageText(text);
    } else if (template === 'VOLATILITY') {
      const text = `⚠️ *NseBse Volatility Expansion Alert*
Active surveillance triggers:
• Stock: *RELIANCE* (NSE)
• Intraday Range: ₹52.40 vs 14-Day Avg Range: ₹31.20
• Expansion Factor: *1.68x* (>1.5x threshold)
• Status: Directional momentum expansion confirmed across dual exchanges.

_Take necessary risk mitigation or tighten trailing stops._`;
      setMessageText(text);
    } else {
      setMessageText('');
    }
  };

  // Step 1: User initiates send -> opens MANDATORY confirmation dialog
  const handleInitiateSend = () => {
    if (!selectedSpace) {
      alert('Please select a Google Chat Space first.');
      return;
    }
    if (!messageText.trim()) {
      alert('Please enter a message or choose a template.');
      return;
    }
    // Open mandatory confirmation modal
    setConfirmationOpen(true);
  };

  // Step 2: User explicitly confirms destructive/mutating send action in dialog
  const handleConfirmSend = async () => {
    if (!selectedSpace || !messageText.trim()) return;
    setSending(true);
    setApiError(null);
    setSendSuccess(false);

    const result = await sendChatMessage(selectedSpace.name, messageText.trim(), accessToken || undefined);
    setSending(false);
    setConfirmationOpen(false);

    if (result.error) {
      setApiError(result.error);
    } else {
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 5000);
      // Reload recent space messages to verify arrival
      loadMessages(selectedSpace);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-[#1A1816] border border-[#D96B43]/40 shadow-2xl overflow-hidden text-[#F7EEDB]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#D96B43]/20 flex items-start justify-between gap-4 bg-[#131211]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#D96B43]/20 text-[#D96B43]">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#F7EEDB]">
                Google Chat Market Intelligence Dispatcher
              </h3>
            </div>
            <p className="text-xs text-[#F7EEDB]/60">
              Broadcast live Indian equity signals, arbitrage alerts, and sector summaries directly to your Google Workspace Chat Spaces.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {accessToken && (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25221F] hover:bg-red-950/60 text-red-300 border border-red-500/30 text-xs font-semibold transition"
                title="Disconnect Google Chat session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Disconnect</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#25221F] hover:bg-[#35302B] text-[#F7EEDB]/70 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Authentication Banner */}
        {!accessToken ? (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 bg-[#161412] border-b border-[#D96B43]/15">
            <div className="w-14 h-14 rounded-2xl bg-[#D96B43]/15 border border-[#D96B43]/30 flex items-center justify-center text-[#D96B43]">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h4 className="text-base font-bold text-[#F7EEDB]">Connect your Google Workspace Account</h4>
              <p className="text-xs text-[#F7EEDB]/70 leading-relaxed">
                To send trade notifications and browse your company spaces, authenticate with your Google Workspace (Business or Enterprise) account.
              </p>
            </div>

            {/* Official Material Styled "Sign in with Google" button */}
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-semibold text-xs shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                ></path>
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                ></path>
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                ></path>
              </svg>
              <span>{connecting ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>

            {/* Prerequisite Footnote */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#F7EEDB]/50 max-w-md text-left bg-[#131211] p-3 rounded-xl border border-[#D96B43]/15">
              <Info className="w-4 h-4 text-[#D96B43] shrink-0" />
              <span>
                <strong>Prerequisite:</strong> Google Chat user API requires a Business/Enterprise Google Workspace account. Consumer @gmail.com accounts are not supported by Google Chat's user API.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Connected State Bar & Navigation Tabs */}
            <div className="px-4 py-2.5 bg-[#161412] border-b border-[#D96B43]/15 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">Google Chat Connected</span>
                <span className="text-[#F7EEDB]/40">·</span>
                <span className="text-[#F7EEDB]/70">Project: {GOOGLE_PROJECT_ID}</span>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 bg-[#131211] p-1 rounded-xl border border-[#D96B43]/15">
                <button
                  onClick={() => setActiveTab('DISPATCH')}
                  className={`px-3 py-1 rounded-lg font-sans font-semibold transition ${
                    activeTab === 'DISPATCH'
                      ? 'bg-[#D96B43] text-[#131211]'
                      : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                  }`}
                >
                  Dispatch Signal
                </button>
                <button
                  onClick={() => {
                    setActiveTab('SPACES');
                    loadSpaces();
                  }}
                  className={`px-3 py-1 rounded-lg font-sans font-semibold transition ${
                    activeTab === 'SPACES'
                      ? 'bg-[#D96B43] text-[#131211]'
                      : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                  }`}
                >
                  Spaces ({spaces.length})
                </button>
                {selectedSpace && (
                  <button
                    onClick={() => {
                      setActiveTab('RECENT_MESSAGES');
                      loadMessages(selectedSpace);
                    }}
                    className={`px-3 py-1 rounded-lg font-sans font-semibold transition ${
                      activeTab === 'RECENT_MESSAGES'
                        ? 'bg-[#D96B43] text-[#131211]'
                        : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
                    }`}
                  >
                    Recent Messages
                  </button>
                )}
              </div>
            </div>

            {/* Error / Prerequisite 404 Guide Banner */}
            {apiError && (
              <div className="m-4 p-4 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-amber-300">
                      {apiError.isConfigError ? 'One-Time Google Chat App Configuration Required' : 'API Notice'}
                    </div>
                    <p className="leading-relaxed text-amber-200/90">{apiError.message}</p>
                    {apiError.consoleUrl && (
                      <div className="pt-2">
                        <a
                          href={apiError.consoleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-100 font-bold transition"
                        >
                          <span>Open Google Cloud Chat API Configuration</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <p className="text-[11px] text-amber-300/70 mt-1">
                          In Google Cloud Console, enter an App Name (e.g. "NseBse Trading Alerts"), an Avatar URL, and Description, then click Save.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Success Toast */}
            {sendSuccess && (
              <div className="mx-4 mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Message successfully posted to <strong>{selectedSpace?.displayName || selectedSpace?.name}</strong>!</span>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {activeTab === 'DISPATCH' && (
                <div className="space-y-4">
                  {/* Space Target Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-[#F7EEDB]/70 font-bold block">
                      Target Google Chat Space
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedSpace?.name || ''}
                        onChange={(e) => {
                          const found = spaces.find((s) => s.name === e.target.value);
                          if (found) setSelectedSpace(found);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/30 text-xs text-[#F7EEDB] focus:outline-none focus:border-[#D96B43]"
                      >
                        {spaces.length === 0 ? (
                          <option value="">No spaces available (or app configuration pending)</option>
                        ) : (
                          spaces.map((s) => (
                            <option key={s.name} value={s.name}>
                              {s.displayName || s.name} ({s.type || s.spaceType || 'Space'})
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        onClick={() => loadSpaces()}
                        disabled={loadingSpaces}
                        className="p-2 rounded-xl bg-[#25221F] hover:bg-[#35302B] text-[#F7EEDB]/80 hover:text-white border border-[#D96B43]/20 transition"
                        title="Refresh Spaces list"
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingSpaces ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Template Quick Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-[#F7EEDB]/70 font-bold block">
                      Market Intelligence Templates
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => applyTemplate('ARBITRAGE')}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          selectedTemplate === 'ARBITRAGE'
                            ? 'bg-[#D96B43]/20 border-[#D96B43] text-[#F7EEDB]'
                            : 'bg-[#131211] border-[#D96B43]/15 text-[#F7EEDB]/70 hover:bg-[#25221F]'
                        }`}
                      >
                        <Radio className="w-4 h-4 text-[#D96B43] mb-1" />
                        <span className="font-bold">Arbitrage Alert</span>
                        <span className="text-[10px] text-[#F7EEDB]/50">NSE vs BSE spread</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyTemplate('SECTOR')}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          selectedTemplate === 'SECTOR'
                            ? 'bg-[#D96B43]/20 border-[#D96B43] text-[#F7EEDB]'
                            : 'bg-[#131211] border-[#D96B43]/15 text-[#F7EEDB]/70 hover:bg-[#25221F]'
                        }`}
                      >
                        <Layers className="w-4 h-4 text-emerald-400 mb-1" />
                        <span className="font-bold">Sector Rotation</span>
                        <span className="text-[10px] text-[#F7EEDB]/50">Heatmap leadership</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyTemplate('VOLATILITY')}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          selectedTemplate === 'VOLATILITY'
                            ? 'bg-[#D96B43]/20 border-[#D96B43] text-[#F7EEDB]'
                            : 'bg-[#131211] border-[#D96B43]/15 text-[#F7EEDB]/70 hover:bg-[#25221F]'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4 text-amber-400 mb-1" />
                        <span className="font-bold">Volatility Breakout</span>
                        <span className="text-[10px] text-[#F7EEDB]/50">Range expansion</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyTemplate('CUSTOM')}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          selectedTemplate === 'CUSTOM'
                            ? 'bg-[#D96B43]/20 border-[#D96B43] text-[#F7EEDB]'
                            : 'bg-[#131211] border-[#D96B43]/15 text-[#F7EEDB]/70 hover:bg-[#25221F]'
                        }`}
                      >
                        <FileText className="w-4 h-4 text-[#8CB4E0] mb-1" />
                        <span className="font-bold">Custom Note</span>
                        <span className="text-[10px] text-[#F7EEDB]/50">Compose from scratch</span>
                      </button>
                    </div>
                  </div>

                  {/* Message Composer */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono text-[#F7EEDB]/60">
                      <span>Message Content (Google Chat Markdown supported: *bold*, _italics_)</span>
                      <span>{messageText.length} chars</span>
                    </div>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      rows={6}
                      placeholder="Type a market message or select one of the presets above..."
                      className="w-full p-3 rounded-xl bg-[#131211] border border-[#D96B43]/30 text-xs font-mono text-[#F7EEDB] placeholder-[#F7EEDB]/40 focus:outline-none focus:border-[#D96B43] focus:ring-1 focus:ring-[#D96B43] transition resize-y"
                    />
                  </div>

                  {/* Send Action Trigger */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-[11px] text-[#F7EEDB]/50 flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#D96B43]" />
                      <span>Explicit confirmation requested before sending to Chat.</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleInitiateSend}
                      disabled={!selectedSpace || !messageText.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D96B43] hover:bg-[#B85D3B] text-[#131211] font-bold text-xs shadow-lg shadow-[#D96B43]/20 transition disabled:opacity-40"
                    >
                      <Send className="w-4 h-4" />
                      <span>Review &amp; Send to Space</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'SPACES' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#F7EEDB]/70 font-bold">
                      Accessible Google Chat Spaces
                    </h4>
                    <button
                      onClick={() => loadSpaces()}
                      className="text-xs text-[#D96B43] hover:underline flex items-center gap-1 font-mono"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>

                  {spaces.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#F7EEDB]/50 bg-[#131211] rounded-xl border border-[#D96B43]/15">
                      No Google Chat spaces found. Ensure your account is a member of at least one space or room.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {spaces.map((s) => (
                        <div
                          key={s.name}
                          onClick={() => {
                            setSelectedSpace(s);
                            setActiveTab('DISPATCH');
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition ${
                            selectedSpace?.name === s.name
                              ? 'bg-[#D96B43]/15 border-[#D96B43]'
                              : 'bg-[#131211] border-[#D96B43]/15 hover:bg-[#25221F]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-xs text-[#F7EEDB]">{s.displayName || 'Direct Conversation'}</div>
                              <div className="text-[10px] text-[#F7EEDB]/50 font-mono mt-0.5">{s.name}</div>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-[#D96B43]/20 text-[#D96B43]">
                              {s.type || s.spaceType || 'SPACE'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'RECENT_MESSAGES' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider text-[#F7EEDB]/70 font-bold">
                        Messages in {selectedSpace?.displayName || selectedSpace?.name}
                      </h4>
                      <p className="text-[10px] text-[#F7EEDB]/50 font-mono">Recent communication stream</p>
                    </div>
                    <button
                      onClick={() => selectedSpace && loadMessages(selectedSpace)}
                      className="text-xs text-[#D96B43] hover:underline flex items-center gap-1 font-mono"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>

                  {loadingMessages ? (
                    <div className="p-8 text-center text-xs text-[#F7EEDB]/50 bg-[#131211] rounded-xl">
                      Loading recent space messages...
                    </div>
                  ) : spaceMessages.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#F7EEDB]/50 bg-[#131211] rounded-xl border border-[#D96B43]/15">
                      No messages found in this space.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {spaceMessages.map((msg, i) => (
                        <div key={msg.name || i} className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono text-[#F7EEDB]/60">
                            <span className="font-bold text-[#F7EEDB]">{msg.sender?.displayName || 'Chat Participant'}</span>
                            <span>{msg.createTime ? new Date(msg.createTime).toLocaleTimeString('en-IN') : ''}</span>
                          </div>
                          <div className="text-xs text-[#F7EEDB]/90 whitespace-pre-wrap font-sans">{msg.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3.5 bg-[#131211] border-t border-[#D96B43]/20 flex items-center justify-between text-xs text-[#F7EEDB]/60">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px]">Chat API: chat.googleapis.com</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#25221F] hover:bg-[#35302B] text-[#F7EEDB] transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* =========================================================================
          MANDATORY CONFIRMATION MODAL
          Enforces explicit user confirmation prior to mutating/sending data via Google Workspace APIs
         ========================================================================= */}
      {confirmationOpen && selectedSpace && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-2xl bg-[#1A1816] border border-[#D96B43]/60 shadow-2xl p-5 space-y-4 text-[#F7EEDB]">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#D96B43]/20 text-[#D96B43] shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-[#F7EEDB]">Confirm Sending Message to Google Chat</h4>
                <p className="text-xs text-[#F7EEDB]/70">
                  You are about to post a market intelligence message to the following Google Workspace space on your behalf:
                </p>
              </div>
            </div>

            {/* Destination Space Pill */}
            <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/30 space-y-1 font-mono text-xs">
              <div className="text-[10px] text-[#F7EEDB]/50 uppercase">Recipient Space:</div>
              <div className="font-bold text-white flex items-center justify-between">
                <span>{selectedSpace.displayName || selectedSpace.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#D96B43]/20 text-[#D96B43]">
                  {selectedSpace.type || selectedSpace.spaceType || 'SPACE'}
                </span>
              </div>
            </div>

            {/* Message Preview */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#F7EEDB]/60">Message Content Preview:</span>
              <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/20 max-h-40 overflow-y-auto text-xs font-mono text-[#F7EEDB]/90 whitespace-pre-wrap">
                {messageText}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D96B43]/15">
              <button
                type="button"
                onClick={() => setConfirmationOpen(false)}
                disabled={sending}
                className="px-4 py-2 rounded-xl bg-[#25221F] hover:bg-[#35302B] text-[#F7EEDB]/80 hover:text-white text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#D96B43] hover:bg-[#B85D3B] text-[#131211] font-bold text-xs shadow-lg shadow-[#D96B43]/30 transition"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending to Space...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
