import React, { useState } from 'react';
import {
  registerNewUser,
  loginWithEmail,
  signInWithGoogle,
  signInAsGuest,
  RegisterUserInput,
} from '../services/firebase';
import { SupportedLanguage } from '../types/market';
import {
  X,
  UserPlus,
  LogIn,
  Sparkles,
  ShieldCheck,
  Database,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Wallet,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: SupportedLanguage;
  onSuccess?: () => void;
}

export const RegisterUserModal: React.FC<Props> = ({
  isOpen,
  onClose,
  language,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredExchange, setPreferredExchange] = useState<'NSE' | 'BSE' | 'BOTH'>('BOTH');
  const [experienceLevel, setExperienceLevel] = useState('Beginner Student');
  const [virtualCapital, setVirtualCapital] = useState(1000000);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!displayName.trim()) {
          setErrorMsg('Please enter your full name or trader handle.');
          setLoading(false);
          return;
        }
        if (!email.includes('@')) {
          setErrorMsg('Please enter a valid email address.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        const input: RegisterUserInput = {
          displayName: displayName.trim(),
          email: email.trim(),
          password,
          preferredExchange,
          experienceLevel,
          language,
          virtualCapital,
        };

        await registerNewUser(input);
        setSuccessMsg('Account registered! Trader profile, starter watchlists & +100 bonus XP provisioned.');
      } else {
        if (!email || !password) {
          setErrorMsg('Please enter both email and password.');
          setLoading(false);
          return;
        }
        await loginWithEmail(email.trim(), password);
        setSuccessMsg('Signed in successfully! Trader profile & watchlists synced.');
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      const code = String(err?.code || '').toLowerCase();
      if (code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Try signing in instead.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMsg('Incorrect email or password. Please verify and try again.');
      } else if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
        setErrorMsg('Sign-in popup was closed before completion. Please try again.');
      } else {
        setErrorMsg('Authentication failed. Please check your credentials or use Google Account Sign-In below.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await signInWithGoogle({
        displayName: displayName.trim() || undefined,
        email: email.trim() || undefined,
        preferredExchange,
        experienceLevel,
        language,
        virtualCapital,
      });
      setSuccessMsg('Authenticated with Google! Firestore & Cloud SQL profile synced with +100 XP.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      const code = String(err?.code || '').toLowerCase();
      if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
        setErrorMsg('Google sign-in window was closed. Click Google Account again when ready.');
      } else {
        setErrorMsg(err?.message || 'Google sign-in cancelled.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAuth = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await signInAsGuest();
      setSuccessMsg('Guest Sandbox session initiated with starter watchlists & ₹10L virtual capital.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Guest login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-2xl overflow-hidden text-[#F7EEDB]">
        {/* Header */}
        <div className="p-5 border-b border-[#D96B43]/20 flex items-center justify-between bg-[#131211]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#D96B43]/15 text-[#D96B43]">
              {mode === 'register' ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F7EEDB]">
                  {mode === 'register' ? 'Register New Trader Account' : 'Trader Account Sign In'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" /> Firestore Cloud DB
                </span>
              </div>
              <p className="text-[11px] text-[#F7EEDB]/60">
                {mode === 'register'
                  ? 'Create your persistent cloud profile, watchlist, and trading progress'
                  : 'Access your cloud portfolio, custom watchlists, and streak records'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#F7EEDB]/60 hover:text-[#F7EEDB] hover:bg-[#25221F] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-[#131211]/60 border-b border-[#D96B43]/15 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-[#D96B43] text-[#131211] font-bold shadow-md'
                : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Account</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-[#D96B43] text-[#131211] font-bold shadow-md'
                : 'text-[#F7EEDB]/60 hover:text-[#F7EEDB]'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Existing Sign In</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-[#F7EEDB]/80 font-semibold mb-1">
                Full Name / Trader Handle *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sasi Kumar or DalalStreet_Sniper"
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-medium focus:outline-none focus:border-[#D96B43]"
              />
            </div>
          )}

          <div>
            <label className="block text-[#F7EEDB]/80 font-semibold mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-mono focus:outline-none focus:border-[#D96B43]"
            />
          </div>

          <div>
            <label className="block text-[#F7EEDB]/80 font-semibold mb-1">
              Password {mode === 'register' ? '(minimum 6 characters) *' : '*'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-mono focus:outline-none focus:border-[#D96B43]"
            />
          </div>

          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#F7EEDB]/80 font-semibold mb-1">
                    Preferred Exchange
                  </label>
                  <select
                    value={preferredExchange}
                    onChange={(e) => setPreferredExchange(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] focus:outline-none focus:border-[#D96B43]"
                  >
                    <option value="BOTH">Dual NSE &amp; BSE (Recommended)</option>
                    <option value="NSE">NSE Only (National Stock Exchange)</option>
                    <option value="BSE">BSE Only (Bombay Stock Exchange)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#F7EEDB]/80 font-semibold mb-1">
                    Trader Profile Type
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] focus:outline-none focus:border-[#D96B43]"
                  >
                    <option value="Beginner Student">Student / Academy Learner</option>
                    <option value="Active Swing Trader">Active Swing Trader</option>
                    <option value="Long-Term Investor">Long-Term Value Investor</option>
                    <option value="Arbitrage Specialist">Arbitrage Specialist</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#F7EEDB]/80 font-semibold mb-1">
                  Starting Virtual Paper Capital
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="100000"
                    step="50000"
                    value={virtualCapital}
                    onChange={(e) => setVirtualCapital(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-mono focus:outline-none focus:border-[#D96B43]"
                  />
                  <span className="text-[11px] font-mono text-[#22C55E] px-2 py-1 rounded bg-[#22C55E]/15 border border-[#22C55E]/30 whitespace-nowrap">
                    ₹{(virtualCapital / 100000).toFixed(1)} Lakhs
                  </span>
                </div>
              </div>

              {/* Starter Perks Banner */}
              <div className="p-3 rounded-xl bg-[#D96B43]/10 border border-[#D96B43]/30 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#D96B43]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Automatic Starter Package Included</span>
                </div>
                <p className="text-[11px] text-[#F7EEDB]/70">
                  New registered profiles instantly receive +100 Welcome Academy XP and pre-provisioned starter watchlists for Reliance, TCS, and HDFC Bank stored in Firestore.
                </p>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] hover:brightness-110 active:scale-98 text-[#131211] font-bold shadow-md shadow-[#D96B43]/25 transition flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="animate-spin text-base">⟳</span>
            ) : mode === 'register' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Complete Registration &amp; Provision Cloud DB</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Account</span>
              </>
            )}
          </button>

          {/* Alternative Quick Sign-In Options */}
          <div className="pt-3 border-t border-[#D96B43]/15 space-y-2">
            <span className="text-[10px] text-[#F7EEDB]/50 block text-center uppercase tracking-wider font-mono">
              Or Authenticate With
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="py-2 px-3 rounded-xl bg-[#131211] hover:bg-[#25221F] border border-[#D96B43]/25 font-semibold text-[11px] text-[#F7EEDB] flex items-center justify-center gap-1.5 transition"
              >
                <span className="font-bold text-[#8CB4E0]">G</span>
                <span>Google Account</span>
              </button>

              <button
                type="button"
                onClick={handleGuestAuth}
                disabled={loading}
                className="py-2 px-3 rounded-xl bg-[#131211] hover:bg-[#25221F] border border-[#D96B43]/25 font-semibold text-[11px] text-[#F7EEDB]/80 flex items-center justify-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Guest Sandbox</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
