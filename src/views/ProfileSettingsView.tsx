import React, { useState } from 'react';
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
} from 'lucide-react';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

export const ProfileSettingsView: React.FC<Props> = ({
  profile,
  onUpdateProfile,
  language,
  setLanguage,
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

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
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
