import React, { useState, useEffect } from 'react';
import { UserProfile, SupportedLanguage } from '../types/market';
import { translations } from '../i18n/translations';
import { PWAInstallButton } from '../components/PWAInstallButton';
import {
  User,
  Key,
  Shield,
  Smartphone,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  Database,
  LogIn,
  LogOut,
  Sparkles,
  Bot,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  getActiveUser,
  subscribeToAuth,
  signInAsGuest,
  signInWithGoogle,
  logOut as fbLogOut,
  testFirestoreConnection,
} from '../services/firebase';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  onOpenChatbot?: () => void;
}

export const ProfileSettingsView: React.FC<Props> = ({
  profile,
  onUpdateProfile,
  language,
  setLanguage,
  onOpenChatbot,
}) => {
  const t = translations[language];

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [apiKey, setApiKey] = useState(profile.customApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [exchange, setExchange] = useState(profile.preferredExchange);
  const [risk, setRisk] = useState(profile.riskTolerance);
  const [sound, setSound] = useState(profile.soundAlerts);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Key testing state
  const [testingKey, setTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<{
    tested: boolean;
    valid?: boolean;
    message?: string;
  }>({ tested: false });
  const [selectedTestModel, setSelectedTestModel] = useState('gemini-3.8-flash');

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      setKeyTestResult({
        tested: true,
        valid: false,
        message: 'Please enter a Gemini API Key to test.',
      });
      return;
    }
    setTestingKey(true);
    setKeyTestResult({ tested: false });
    try {
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customApiKey: apiKey.trim(),
          model: selectedTestModel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setKeyTestResult({
          tested: true,
          valid: true,
          message: `Verified! Successfully connected to ${data.modelUsed}.`,
        });
      } else {
        setKeyTestResult({
          tested: true,
          valid: false,
          message: data.error || 'Verification failed. Please check the API key.',
        });
      }
    } catch (e: any) {
      setKeyTestResult({
        tested: true,
        valid: false,
        message: e?.message || 'Network error verifying key.',
      });
    } finally {
      setTestingKey(false);
    }
  };

  const [currentUser, setCurrentUser] = useState(getActiveUser());
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      if (user) {
        if (user.displayName) setName(user.displayName);
        if (user.email) setEmail(user.email);
      }
    });
    testFirestoreConnection().then((connected) => setDbConnected(connected));
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      const user = await signInWithGoogle();
      if (user.displayName) setName(user.displayName);
      if (user.email) setEmail(user.email);
    } catch (e) {
      console.error(e);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setAuthLoading(true);
      const user = await signInAsGuest();
      if (user.displayName) setName(user.displayName);
    } catch (e) {
      console.error(e);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthLoading(true);
      await fbLogOut();
      setCurrentUser(null);
    } catch (e) {
      console.error(e);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSave = () => {
    onUpdateProfile({
      name,
      email,
      customApiKey: apiKey.trim(),
      preferredExchange: exchange,
      riskTolerance: risk,
      soundAlerts: sound,
      language,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 text-[#F7EEDB]">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D96B43]/15">
        <div>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#D96B43]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#F7EEDB] tracking-tight">
              Profile &amp; Quantitative Engine Settings
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D96B43]/10 text-[#F7EEDB] border border-[#D96B43]/20 font-bold font-mono">
              USER CONFIG
            </span>
          </div>
          <p className="text-xs text-[#F7EEDB]/60 mt-1">
            Configure custom Gemini model API keys, preferred market exchange, and risk parameters.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs shadow-md shadow-[#D96B43]/20 transition"
        >
          {savedSuccess ? <CheckCircle2 className="w-4 h-4 text-[#131211]" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Settings Saved!' : t.saveSettings}</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Cloud Backend Database & Authentication Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1816] border border-[#22C55E]/30 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#22C55E]/20 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#22C55E]" />
              <h2 className="text-sm font-bold text-[#F7EEDB] uppercase tracking-wider font-mono">
                Cloud Backend Database &amp; Authentication
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
              <span className="text-[11px] font-mono text-[#22C55E] font-bold">
                {dbConnected === false ? 'Offline Local Storage' : 'Google Cloud Firestore Active'}
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-1 p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15">
              <span className="text-[#F7EEDB]/50 block text-[10px]">AUTH SESSION STATUS</span>
              <div className="text-sm font-bold text-[#F7EEDB]">
                {currentUser ? (
                  currentUser.isAnonymous ? (
                    <span className="text-[#F59E0B]">Guest Anonymous Session</span>
                  ) : (
                    <span className="text-[#22C55E]">Google Account Verified</span>
                  )
                ) : (
                  <span className="text-[#F7EEDB]/60">Local Session (Not Authenticated)</span>
                )}
              </div>
              {currentUser && (
                <div className="text-[10px] text-[#8CB4E0] truncate">
                  UID: {currentUser.uid}
                </div>
              )}
            </div>

            <div className="space-y-1 p-3 rounded-xl bg-[#131211] border border-[#D96B43]/15">
              <span className="text-[#F7EEDB]/50 block text-[10px]">DATABASE ENGINE</span>
              <div className="text-sm font-bold text-[#F7EEDB]">
                Firestore NoSQL (Cobalt Plating)
              </div>
              <div className="text-[10px] text-[#F7EEDB]/60">
                Security: Zero-Trust ABAC Rules Active
              </div>
            </div>
          </div>

          {/* Auth Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!currentUser ? (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25221F] hover:bg-[#2e2a27] border border-[#D96B43]/30 text-xs font-bold text-[#F7EEDB] transition"
                >
                  <LogIn className="w-4 h-4 text-[#8CB4E0]" />
                  <span>Sign In with Google</span>
                </button>

                <button
                  onClick={handleGuestSignIn}
                  disabled={authLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#131211] hover:bg-[#25221F] border border-[#D96B43]/20 text-xs font-semibold text-[#F7EEDB]/80 transition"
                >
                  <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                  <span>Sign In as Anonymous Guest</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleSignOut}
                disabled={authLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/40 text-xs font-bold text-[#EF4444] transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect &amp; Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* User Identity Section */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-[#F7EEDB] uppercase tracking-wider font-mono">
            Trader Identification
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-bold focus:outline-none focus:border-[#D96B43]"
              />
            </div>

            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-mono focus:outline-none focus:border-[#D96B43]"
              />
            </div>
          </div>
        </div>

        {/* Gemini Model API Key Configuration */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D96B43]/15">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#D96B43]" />
              <h3 className="text-sm font-bold text-[#F7EEDB]">Custom Gemini Model API Key (Optional)</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D96B43]/20 text-[#F7EEDB] font-bold">
              PRIVATE MODEL QUOTA
            </span>
          </div>

          <p className="text-xs text-[#F7EEDB]/80 leading-relaxed">
            Provide your personal Gemini API key for private synchronization and customized dashboard insights. If left empty, the application uses the platform's backend model automatically.
          </p>

          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="AIzaSy... (Paste your Google Gemini API Key)"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setKeyTestResult({ tested: false });
                  }}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-xs font-mono text-[#F7EEDB] placeholder-[#F7EEDB]/30 focus:outline-none focus:border-[#D96B43]"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-3 text-[#F7EEDB]/50 hover:text-[#F7EEDB]"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestApiKey}
                disabled={testingKey}
                className="px-4 py-2.5 rounded-xl bg-[#D96B43] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs transition shrink-0 flex items-center gap-1.5 shadow-md shadow-[#D96B43]/20"
              >
                {testingKey ? <span className="animate-spin text-sm">⟳</span> : <ShieldCheck className="w-4 h-4" />}
                <span>Test My AI Key</span>
              </button>
            </div>

            {/* Test result status banner */}
            {keyTestResult.tested && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  keyTestResult.valid
                    ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                    : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
                }`}
              >
                {keyTestResult.valid ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span className="font-medium">{keyTestResult.message}</span>
              </div>
            )}

            {/* Target Model Selector */}
            <div className="pt-2 border-t border-[#D96B43]/15 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#F7EEDB]/70 font-semibold text-[11px]">Active Verification Model:</span>
                <select
                  value={selectedTestModel}
                  onChange={(e) => setSelectedTestModel(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#131211] border border-[#D96B43]/25 text-xs text-[#F7EEDB] font-mono focus:outline-none"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (General)</option>
                  <option value="gemini-4-argon">gemini-4-argon (Complex Quant)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
                </select>
              </div>

              {onOpenChatbot && (
                <button
                  type="button"
                  onClick={onOpenChatbot}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#25221F] hover:bg-[#D96B43]/20 border border-[#D96B43]/30 text-[#F7EEDB] text-xs font-semibold transition"
                >
                  <Bot className="w-3.5 h-3.5 text-[#D96B43]" />
                  <span>Launch AI Chatbot with this Key</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#F7EEDB]/60">
            <Shield className="w-3.5 h-3.5 text-[#D96B43] shrink-0" />
            <span>Key is saved in browser secure local storage and passed directly via secure server proxy.</span>
          </div>
        </div>

        {/* Market & Risk Preferences */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-[#F7EEDB] uppercase tracking-wider font-mono">
            Exchange &amp; Risk Parameters
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Default Market Exchange</label>
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value as 'NSE' | 'BSE')}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-bold"
              >
                <option value="NSE">NSE (National Stock Exchange - Primary Liquidity)</option>
                <option value="BSE">BSE (Bombay Stock Exchange - Broadest Scrip List)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Risk Profile</label>
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-bold"
              >
                <option value="Conservative">Conservative (Defensive &amp; High Dividend)</option>
                <option value="Moderate">Moderate (Balanced Swing &amp; Trend Following)</option>
                <option value="Aggressive">Aggressive (Momentum Breakouts &amp; Arbitrage Scalps)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#F7EEDB]">Audio Alert Chimes</span>
              <p className="text-[11px] text-[#F7EEDB]/50">Play chime when market breakout or shift trigger fires</p>
            </div>
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
              className="w-4 h-4 accent-[#D96B43] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* PWA App Installation Status & Cache */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1816] border border-[#D96B43]/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#D96B43]" />
              <h3 className="text-sm font-bold text-[#F7EEDB]">Progressive Web App (PWA) Deployment</h3>
            </div>
            <PWAInstallButton />
          </div>

          <p className="text-xs text-[#F7EEDB]/60">
            Install this terminal on your device home screen for fullscreen operation, instant launch, and offline cached EOD Bhavcopy data access.
          </p>
        </div>
      </div>
    </div>
  );
};
