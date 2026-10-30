import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  FileEdit,
  Inbox,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { StockData } from '../types/market';
import {
  getGmailAccessToken,
  authenticateWithGmail,
  getGmailProfile,
  listGmailMessages,
  sendGmailEmail,
  createGmailDraft,
  buildMarketReportEmailHtml,
  GmailProfile,
  GmailMessageSummary,
} from '../services/gmail';
import { auth, getActiveUser } from '../services/firebase';

interface GmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: StockData[];
  selectedStock?: StockData;
  userEmail?: string;
  userName?: string;
}

export const GmailModal: React.FC<GmailModalProps> = ({
  isOpen,
  onClose,
  stocks,
  selectedStock,
  userEmail,
  userName,
}) => {
  const [activeTab, setActiveTab] = useState<'send' | 'inbox' | 'profile'>('send');
  const [accessToken, setAccessToken] = useState<string | null>(getGmailAccessToken());
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Profile
  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Compose State
  const defaultTo = userEmail || getActiveUser()?.email || 'kumarsasi8940@gmail.com';
  const [recipient, setRecipient] = useState(defaultTo);
  const [subject, setSubject] = useState('MarKtXPO Daily Indian Equity & Arbitrage Digest');
  const [customNote, setCustomNote] = useState('Here is the latest live market intelligence snapshot across NSE and BSE.');
  const [templateType, setTemplateType] = useState<'DAILY' | 'ARBITRAGE' | 'STOCK_FOCUS' | 'CUSTOM'>('DAILY');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  // Confirmation Modal State (MANDATORY for Mutating / Destructive Workspace API calls)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'SEND' | 'DRAFT' | null>(null);

  // Inbox Search State
  const [inboxQuery, setInboxQuery] = useState('market OR NSE OR BSE OR contract');
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageSummary | null>(null);

  // Sync token state on open
  useEffect(() => {
    if (isOpen) {
      const current = getGmailAccessToken();
      setAccessToken(current);
      if (current) {
        loadProfile(current);
      }
    }
  }, [isOpen]);

  // Update default recipient when userEmail changes
  useEffect(() => {
    if (userEmail && !recipient) {
      setRecipient(userEmail);
    }
  }, [userEmail]);

  // Update subject based on template
  useEffect(() => {
    if (templateType === 'DAILY') {
      setSubject('MarKtXPO Daily Indian Equity & Arbitrage Digest');
    } else if (templateType === 'ARBITRAGE') {
      setSubject('🚨 MarKtXPO Arbitrage Spread Alert — Cross-Exchange Discrepancies');
    } else if (templateType === 'STOCK_FOCUS') {
      const ticker = selectedStock?.ticker || stocks[0]?.ticker || 'EQUITY';
      setSubject(`MarKtXPO Stock Intelligence Brief: ${ticker}`);
    } else {
      setSubject('MarKtXPO Indian Equity Market Update');
    }
  }, [templateType, selectedStock, stocks]);

  const loadProfile = async (token: string) => {
    setIsLoadingProfile(true);
    try {
      const prof = await getGmailProfile(token);
      setProfile(prof);
      if (prof.emailAddress && (!recipient || recipient === 'kumarsasi8940@gmail.com')) {
        setRecipient(prof.emailAddress);
      }
    } catch (err: any) {
      console.warn('Gmail Profile check error:', err?.message);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const result = await authenticateWithGmail();
      if (result.accessToken) {
        setAccessToken(result.accessToken);
        await loadProfile(result.accessToken);
      } else if (result.errorMessage) {
        setAuthError(result.errorMessage);
      }
    } catch {
      setAuthError('Google Workspace Gmail sign-in was not completed.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleFetchInbox = async () => {
    if (!accessToken) return;
    setIsLoadingInbox(true);
    try {
      const list = await listGmailMessages(accessToken, inboxQuery, 10);
      setMessages(list);
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to list Gmail messages.');
    } finally {
      setIsLoadingInbox(false);
    }
  };

  // Generate HTML content based on template
  const getCompiledEmailHtml = () => {
    let focusStocks = stocks.slice(0, 5);
    if (templateType === 'ARBITRAGE') {
      focusStocks = [...stocks].sort(
        (a, b) =>
          Math.abs(b.nsePrice - b.bsePrice) / (b.nsePrice || 1) -
          Math.abs(a.nsePrice - a.bsePrice) / (a.nsePrice || 1)
      ).slice(0, 5);
    } else if (templateType === 'STOCK_FOCUS' && selectedStock) {
      focusStocks = [selectedStock];
    }

    const benchmarks = [
      { name: 'NIFTY 50', value: 24350, changePercent: 0.42 },
      { name: 'BSE SENSEX', value: 80120, changePercent: 0.38 },
      { name: 'NIFTY BANK', value: 52180, changePercent: -0.15 },
    ];

    return buildMarketReportEmailHtml({
      title: subject,
      traderName: userName || getActiveUser()?.displayName || 'Trader',
      summaryText: customNote,
      stocks: focusStocks.map((s) => ({
        ticker: s.ticker,
        name: s.name,
        nsePrice: s.nsePrice,
        bsePrice: s.bsePrice,
        spread: (Math.abs(s.nsePrice - s.bsePrice) / (s.nsePrice || 1)) * 100,
        changePercent: s.changePercent,
      })),
      benchmarks,
    });
  };

  // Trigger explicit confirmation before sending or drafting (MANDATORY REQUIREMENT)
  const promptSendConfirmation = () => {
    setPendingAction('SEND');
    setShowConfirmModal(true);
  };

  const promptDraftConfirmation = () => {
    setPendingAction('DRAFT');
    setShowConfirmModal(true);
  };

  // Execute confirmed mutating Workspace API operation
  const executeConfirmedAction = async () => {
    if (!accessToken) return;
    setShowConfirmModal(false);
    setIsSending(true);
    setSendSuccessMessage(null);
    setAuthError(null);

    const htmlBody = getCompiledEmailHtml();
    const payload = {
      to: recipient.trim(),
      from: profile?.emailAddress || undefined,
      subject: subject.trim(),
      htmlBody,
      plainText: `${subject}\n\n${customNote}\n\nGenerated by MarKtXPO Indian Equity Intelligence.`,
    };

    try {
      if (pendingAction === 'SEND') {
        const res = await sendGmailEmail(accessToken, payload);
        setSendSuccessMessage(`Email dispatched successfully via Gmail! (Message ID: ${res.id})`);
      } else if (pendingAction === 'DRAFT') {
        const res = await createGmailDraft(accessToken, payload);
        setSendSuccessMessage(`Draft created in your Gmail inbox! (Draft ID: ${res.id})`);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to complete Gmail operation. You may need to grant Gmail permissions.');
    } finally {
      setIsSending(false);
      setPendingAction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-950/40 via-slate-900 to-indigo-950/30 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Gmail Workspace Dispatch</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Send live market alerts, export EOD reports, and scan contract notes directly in Gmail.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Barrier if Token Missing */}
        {!accessToken ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Mail className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-xl font-bold text-white">Connect Your Gmail Account</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
               
              </p>
            </div>

            {authError && (
              <div className="max-w-md w-full p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-left flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Official Material Styled Sign In with Google Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isLoadingAuth}
                className="group relative inline-flex items-center justify-center px-6 py-3 font-medium text-slate-800 bg-white hover:bg-slate-100 rounded-xl transition duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span className="text-sm font-semibold tracking-wide">
                    {isLoadingAuth ? '.....' : 'Sign in with Google to Connect Gmail'}
                  </span>
                </div>
              </button>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>.</span>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex items-center justify-between px-6 pt-3 border-b border-slate-800 bg-slate-900/50">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('send')}
                  className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
                    activeTab === 'send'
                      ? 'border-red-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Send Market Brief</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('inbox');
                    if (messages.length === 0) handleFetchInbox();
                  }}
                  className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
                    activeTab === 'inbox'
                      ? 'border-red-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  <span>Gmail Contract Notes Feed</span>
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
                    activeTab === 'profile'
                      ? 'border-red-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Workspace Status</span>
                </button>
              </div>

              {profile && (
                <div className="text-xs text-slate-400 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-mono text-slate-300">{profile.emailAddress}</span>
                </div>
              )}
            </div>

            {/* Notification / Toast Banner */}
            {sendSuccessMessage && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{sendSuccessMessage}</span>
                </div>
                <button
                  onClick={() => setSendSuccessMessage(null)}
                  className="text-emerald-400 hover:text-emerald-200 text-xs font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {authError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{authError}</span>
                </div>
                <button
                  onClick={() => setAuthError(null)}
                  className="text-red-400 hover:text-red-200 text-xs font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Tab 1: Send / Compose */}
            {activeTab === 'send' && (
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Form Controls */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Report Template
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'DAILY', label: 'EOD Market Digest' },
                          { id: 'ARBITRAGE', label: 'Arbitrage Alert' },
                          { id: 'STOCK_FOCUS', label: `Stock: ${selectedStock?.ticker || 'Focus'}` },
                          { id: 'CUSTOM', label: 'Custom Dispatch' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTemplateType(t.id as any)}
                            className={`p-2.5 rounded-lg text-xs font-semibold text-left transition border ${
                              templateType === t.id
                                ? 'bg-red-500/20 border-red-500/50 text-white'
                                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Recipient Gmail / Email
                      </label>
                      <input
                        type="email"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="trader@gmail.com"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Trader Notes / Briefing Summary
                      </label>
                      <textarea
                        rows={3}
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="Add your executive market takeaway..."
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-500 transition resize-none"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={promptSendConfirmation}
                        disabled={isSending || !recipient.trim()}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-red-600/30"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSending ? 'Sending...' : 'Send via Gmail'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={promptDraftConfirmation}
                        disabled={isSending || !recipient.trim()}
                        className="flex items-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-sm rounded-xl transition border border-slate-700"
                        title="Save as Draft in Gmail"
                      >
                        <FileEdit className="w-4 h-4" />
                        <span>Save Draft</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Live Email Preview */}
                  <div className="flex flex-col">
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Rendered HTML Preview
                    </label>
                    <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 p-4 overflow-y-auto max-h-[380px] text-xs">
                      <div className="border-b border-slate-800 pb-3 mb-3">
                        <div className="text-slate-400 font-semibold">Subject: <span className="text-white font-normal">{subject}</span></div>
                        <div className="text-slate-400 font-semibold">To: <span className="text-slate-200 font-mono">{recipient}</span></div>
                      </div>
                      <div
                        className="email-html-preview pointer-events-none"
                        dangerouslySetInnerHTML={{ __html: getCompiledEmailHtml() }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Inbox Feed */}
            {activeTab === 'inbox' && (
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="flex items-center space-x-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={inboxQuery}
                      onChange={(e) => setInboxQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFetchInbox()}
                      placeholder="Search Gmail for contract notes, orders, or stocks..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchInbox}
                    disabled={isLoadingInbox}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition border border-slate-700"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingInbox ? 'animate-spin' : ''}`} />
                    <span>Search</span>
                  </button>
                </div>

                {isLoadingInbox ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    Scanning your Gmail inbox for matching market correspondence...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    No recent messages found matching <code className="text-slate-200">"{inboxQuery}"</code>.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMessage(m)}
                        className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer flex flex-col space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300 truncate max-w-xs">{m.from}</span>
                          <span className="text-slate-500 text-[11px] shrink-0">{m.date}</span>
                        </div>
                        <div className="text-sm font-bold text-white truncate">{m.subject}</div>
                        <div className="text-xs text-slate-400 line-clamp-2">{m.snippet}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Workspace Profile & Status */}
            {activeTab === 'profile' && (
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
                    Connected Google Workspace Account
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-slate-400">Authorized Email Address</div>
                      <div className="text-white font-mono font-bold text-sm mt-1">
                        {profile?.emailAddress || 'Connected'}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-slate-400">Total Inbox Messages</div>
                      <div className="text-white font-mono font-bold text-sm mt-1">
                        {profile?.messagesTotal?.toLocaleString('en-IN') || 'Active'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="text-xs font-semibold text-slate-300 mb-2">Granted OAuth Permissions:</h4>
                    <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>https://mail.google.com/ (Full Gmail access)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>https://www.googleapis.com/auth/gmail.send (Send on user's behalf)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>https://www.googleapis.com/auth/gmail.readonly (Read message metadata)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>https://www.googleapis.com/auth/gmail.compose (Draft creation)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={handleSignIn}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg border border-slate-700 transition"
                    >
                      Re-authorize Workspace Token
                    </button>
                    <a
                      href="https://mail.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-xs text-red-400 hover:text-red-300"
                    >
                      <span>Open Web Gmail</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Selected Message Inspector Modal */}
        {selectedMessage && (
          <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col z-20 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white truncate max-w-lg">{selectedMessage.subject}</h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs mb-4 text-slate-300">
              <div><strong className="text-slate-400">From:</strong> {selectedMessage.from}</div>
              <div><strong className="text-slate-400">Date:</strong> {selectedMessage.date}</div>
              <div><strong className="text-slate-400">Message ID:</strong> <code className="text-slate-400">{selectedMessage.id}</code></div>
            </div>
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 overflow-y-auto leading-relaxed">
              {selectedMessage.snippet}
            </div>
            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Back to Feed
              </button>
            </div>
          </div>
        )}

        {/* MANDATORY USER CONFIRMATION DIALOG FOR MUTATING / DESTRUCTIVE WORKSPACE OPERATIONS */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center space-x-3 text-red-400">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {pendingAction === 'SEND' ? 'Confirm Email Dispatch' : 'Confirm Save Draft'}
                  </h3>
                  <p className="text-xs text-slate-400">Google Workspace Gmail Permission Confirmation</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 text-slate-300">
                <p>
                  You are about to {pendingAction === 'SEND' ? 'send an email' : 'create a draft'} using your connected
                  Gmail account:
                </p>
                <div className="pt-1">
                  <div><strong>To:</strong> <span className="font-mono text-slate-200">{recipient}</span></div>
                  <div><strong>Subject:</strong> <span className="text-slate-200">{subject}</span></div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  This action mutates data in your Google Workspace account on your behalf.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeConfirmedAction}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-600/30"
                >
                  {pendingAction === 'SEND' ? 'Confirm & Send' : 'Confirm & Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
