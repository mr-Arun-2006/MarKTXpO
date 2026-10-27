import React, { useState } from 'react';
import { UserProfile, SupportedLanguage } from '../types/market';
import { translations } from '../i18n/translations';
import { getFirebaseAuthErrorMessage } from '../utils/firebaseAuthError';
import { registerNewUser, loginWithEmail } from '../services/firebase';
import {
  Lock,
  Mail,
  TrendingUp,
  X,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: Partial<UserProfile>) => void;
  language: SupportedLanguage;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  language,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const t = translations[language];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      if (isRegister) {
        await registerNewUser({
          email: email.trim(),
          password,
          displayName: name.trim(),
          language,
        });
      } else {
        await loginWithEmail(email.trim(), password);
      }
      onLoginSuccess({
        name: name.trim() || email.trim().split('@')[0] || 'Trader',
        email: email.trim(),
      });
      onClose();
    } catch (error: unknown) {
      setErrorMessage(getFirebaseAuthErrorMessage(error, 'email'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-[#F7EEDB]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#D96B43]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D96B43]/10 border border-[#D96B43]/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#D96B43]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F7EEDB]">
                {isRegister ? 'Create Terminal Account' : 'Terminal Login'}
              </h2>
              <span className="text-[10px] text-[#D96B43] font-mono">NSE &amp; BSE QUANT SUITE</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#F7EEDB]/50 hover:text-[#F7EEDB]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs leading-5 text-[#F7EEDB]/60">
          Create an account or sign in using Firebase Authentication. Demo identity shortcuts are disabled so each user receives a real, isolated session.
        </p>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#D96B43]/15 w-full"></div>
          <span className="bg-[#1A1816] px-3 text-[10px] text-[#F7EEDB]/40 uppercase tracking-wider font-mono">
            Or Account Access
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && <p role="alert" className="max-h-40 overflow-y-auto whitespace-pre-line break-words rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-red-200">{errorMessage}</p>}
          {isRegister && (
            <div>
              <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Rohan Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] focus:outline-none focus:border-[#D96B43]"
              />
            </div>
          )}

          <div>
            <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#F7EEDB]/40 absolute left-3 top-2.5" />
              <input
                type="email"
                placeholder="trader@nse-bse.ai"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] focus:outline-none focus:border-[#D96B43]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#F7EEDB]/70 font-semibold mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#F7EEDB]/40 absolute left-3 top-2.5" />
              <input
                type="password"
                placeholder="At least 6 characters"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-[#F7EEDB] focus:outline-none focus:border-[#D96B43]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/40 hover:bg-[#D96B43] hover:text-[#131211] text-[#F7EEDB] font-bold text-xs transition disabled:opacity-50"
          >
            {loading ? 'Connecting to Firebase…' : isRegister ? 'Register & Enter Terminal' : 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-[#F7EEDB]/60">
          <span>{isRegister ? 'Already have an account?' : "Don't have an account?"}</span>{' '}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-[#D96B43] hover:underline font-bold"
          >
            {isRegister ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};
