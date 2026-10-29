import React, { useState } from 'react';
import {
  registerNewUser,
  loginWithEmail,
  signInWithGoogle,
  signInAsGuest,
  requestPasswordReset,
  RegisterUserInput,
} from '../services/firebase';
import { SupportedLanguage } from '../types/market';
import { getFirebaseAuthErrorMessage } from '../utils/firebaseAuthError';
import {
  X,
  UserPlus,
  LogIn,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: SupportedLanguage;
  initialMode?: 'register' | 'login';
  fullPage?: boolean;
  onSuccess?: () => void | Promise<void>;
}

export const RegisterUserModal: React.FC<Props> = ({
  isOpen,
  onClose,
  language,
  initialMode = 'register',
  fullPage = false,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
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
          setErrorMsg('Please enter your name.');
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
        setSuccessMsg('Account created. Opening your account…');
      } else {
        if (!email || !password) {
          setErrorMsg('Please enter both email and password.');
          setLoading(false);
          return;
        }
        await loginWithEmail(email.trim(), password);
        setSuccessMsg('Signed in successfully. Opening your account…');
      }

      window.setTimeout(() => {
        if (onSuccess) void onSuccess();
        else onClose();
      }, 500);
    } catch (err: unknown) {
      setErrorMsg(getFirebaseAuthErrorMessage(err, 'email'));
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
      setSuccessMsg('Google sign-in successful. Opening your account…');
      window.setTimeout(() => {
        if (onSuccess) void onSuccess();
        else onClose();
      }, 500);
    } catch (err: unknown) {
      setErrorMsg(getFirebaseAuthErrorMessage(err, 'google'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAuth = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await signInAsGuest();
      setSuccessMsg('Guest access is ready. Opening your account…');
      window.setTimeout(() => {
        if (onSuccess) void onSuccess();
        else onClose();
      }, 500);
    } catch (err: unknown) {
      setErrorMsg(getFirebaseAuthErrorMessage(err, 'guest'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Enter your email address above, then select “Forgot password?”.');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSuccessMsg('If an account uses this email, password reset instructions have been sent.');
    } catch {
      setErrorMsg('We could not send the reset email. Check the address and try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={fullPage
      ? 'min-h-[100dvh] w-full flex items-center justify-center bg-[#131211] px-4 py-6 sm:px-8 sm:py-10'
      : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200'}>
      <div className={`relative w-full ${fullPage ? 'max-w-md' : 'max-w-lg'} max-h-[calc(100dvh-2rem)] rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-2xl overflow-hidden text-[#F7EEDB]`}>
        {fullPage && (
          <div className="flex items-center gap-2.5 px-5 pt-5 pb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D96B43]/15 text-[#D96B43]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide text-[#F7EEDB]">MarKTXpO</p>
              <p className="text-xs text-[#F7EEDB]/55">Indian market intelligence</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-5 border-b border-[#D96B43]/20 flex items-center justify-between bg-[#131211]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#D96B43]/15 text-[#D96B43]">
              {mode === 'register' ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F7EEDB]">
                  {mode === 'register' ? 'Create your account' : 'Welcome back'}
                </h3>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#F7EEDB]/60">
                {mode === 'register'
                  ? 'Save your workspace and return to it anytime.'
                  : 'Sign in to return to your saved workspace.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={fullPage ? 'Back to home' : 'Close sign in'}
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
            <span>Sign in</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className={`p-5 space-y-4 ${fullPage ? 'max-h-[calc(100dvh-17rem)]' : 'max-h-[75vh]'} overflow-y-auto text-sm`}>
          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#FCA5A5] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="whitespace-pre-line break-words">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div role="status" aria-live="polite" className="p-3 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label htmlFor="auth-display-name" className="block text-[#F7EEDB]/80 font-semibold mb-1">
                Full name *
              </label>
              <input
                id="auth-display-name"
                name="name"
                autoComplete="name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-medium focus:outline-none focus:border-[#D96B43]"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-[#F7EEDB]/80 font-semibold mb-1">
              Email address *
            </label>
            <input
              id="auth-email"
              name="email"
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-mono focus:outline-none focus:border-[#D96B43]"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-[#F7EEDB]/80 font-semibold mb-1">
              Password {mode === 'register' ? '(at least 6 characters) *' : '*'}
            </label>
            <input
              id="auth-password"
              name="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              type="password"
              minLength={mode === 'register' ? 6 : undefined}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] font-mono focus:outline-none focus:border-[#D96B43]"
            />
          </div>

          {mode === 'login' && (
            <div className="-mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => { void handlePasswordReset(); }}
                disabled={loading}
                className="min-h-9 rounded-lg px-2 text-xs font-semibold text-[#DFA087] underline-offset-4 hover:underline disabled:opacity-50"
              >
                Forgot password?
              </button>
            </div>
          )}

          {mode === 'register' && (
            <details className="rounded-xl border border-white/10 bg-[#131211]/60 p-3">
              <summary className="cursor-pointer list-inside text-sm font-semibold text-[#F7EEDB]/80">
                Personalise your workspace <span className="font-normal text-[#F7EEDB]/45">(optional)</span>
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="auth-exchange" className="mb-1 block text-sm font-medium text-[#F7EEDB]/75">Preferred exchange</label>
                  <select
                    id="auth-exchange"
                    value={preferredExchange}
                    onChange={(e) => setPreferredExchange(e.target.value as 'NSE' | 'BSE' | 'BOTH')}
                    className="w-full rounded-xl border border-[#D96B43]/20 bg-[#131211] px-3 py-2.5 text-[#F7EEDB]"
                  >
                    <option value="BOTH">NSE and BSE</option>
                    <option value="NSE">NSE only</option>
                    <option value="BSE">BSE only</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="auth-experience" className="mb-1 block text-sm font-medium text-[#F7EEDB]/75">Experience level</label>
                  <select
                    id="auth-experience"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full rounded-xl border border-[#D96B43]/20 bg-[#131211] px-3 py-2.5 text-[#F7EEDB]"
                  >
                    <option value="Beginner Student">Beginner</option>
                    <option value="Active Swing Trader">Active trader</option>
                    <option value="Long-Term Investor">Long-term investor</option>
                    <option value="Arbitrage Specialist">Arbitrage specialist</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="auth-virtual-capital" className="mb-1 block text-sm font-medium text-[#F7EEDB]/75">Starting practice balance (₹)</label>
                  <input
                    id="auth-virtual-capital"
                    type="number"
                    min="100000"
                    max="10000000"
                    step="50000"
                    value={virtualCapital}
                    onChange={(e) => setVirtualCapital(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#D96B43]/20 bg-[#131211] px-3 py-2.5 font-mono text-[#F7EEDB]"
                  />
                </div>
                <p className="text-xs leading-5 text-[#F7EEDB]/45">You can change these preferences later in account settings.</p>
              </div>
            </details>
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
                <span>Create account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign in</span>
              </>
            )}
          </button>

          {/* Alternative Quick Sign-In Options */}
          <div className="pt-3 border-t border-[#D96B43]/15 space-y-2">
            <span className="text-[10px] text-[#F7EEDB]/50 block text-center uppercase tracking-wider font-mono">
              Or continue with
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="py-2 px-3 rounded-xl bg-[#131211] hover:bg-[#25221F] border border-[#D96B43]/25 font-semibold text-[11px] text-[#F7EEDB] flex items-center justify-center gap-1.5 transition"
              >
                <span className="font-bold text-[#8CB4E0]">G</span>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={handleGuestAuth}
                disabled={loading}
                className="py-2 px-3 rounded-xl bg-[#131211] hover:bg-[#25221F] border border-[#D96B43]/25 font-semibold text-[11px] text-[#F7EEDB]/80 flex items-center justify-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Try as guest</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
