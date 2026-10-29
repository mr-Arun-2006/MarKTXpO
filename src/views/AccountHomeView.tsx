import React from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  CheckCircle2,
  Settings2,
  UserRound,
  WalletCards,
} from 'lucide-react';
import type { UserProfile } from '../types/market';

interface Props {
  profile: UserProfile;
  isGuest: boolean;
  onNavigate: (view: string) => void;
  onSignOut: () => void | Promise<void>;
}

export const AccountHomeView: React.FC<Props> = ({
  profile,
  isGuest,
  onNavigate,
  onSignOut,
}) => {
  const firstName = profile.name?.trim().split(/\s+/)[0] || 'there';

  const shortcuts = [
    {
      title: 'Watchlist',
      description: 'Keep the stocks you follow in one place.',
      view: 'watchlist',
      icon: WalletCards,
    },
    {
      title: 'Portfolio & risk',
      description: 'Review positions and understand portfolio risk.',
      view: 'portfolio',
      icon: BriefcaseBusiness,
    },
    {
      title: 'Price alerts',
      description: 'Review your market alerts and preferences.',
      view: 'alerts',
      icon: BellRing,
    },
    {
      title: 'End-of-day analysis',
      description: 'Explore closing data and technical indicators.',
      view: 'eod',
      icon: Activity,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D96B43]">Your workspace</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#F7EEDB] sm:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#F7EEDB]/65">
              Your market tools and account details are in one place. Choose what you want to do next.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D96B43] px-5 py-3 text-sm font-bold text-[#131211] transition hover:brightness-110"
          >
            <BarChart3 className="h-4 w-4" />
            Open market terminal
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_2fr]">
          <article className="rounded-2xl border border-[#D96B43]/25 bg-[#1A1816] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D96B43]/15 text-lg font-bold text-[#F7EEDB]">
                {(profile.name || 'U').trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-base font-semibold text-[#F7EEDB]">{profile.name || 'Your account'}</h2>
                <p className="mt-1 break-all text-sm text-[#F7EEDB]/60">{profile.email || 'No email address available'}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#22C55E]/25 bg-[#22C55E]/10 px-2.5 py-1 text-xs font-medium text-[#86EFAC]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isGuest ? 'Guest session' : 'Signed in'}
                </span>
              </div>
            </div>
            <div className="my-5 border-t border-white/10" />
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[#F7EEDB]/60">Preferred exchange</span>
              <span className="font-semibold text-[#F7EEDB]">{profile.preferredExchange === 'BOTH' ? 'NSE + BSE' : profile.preferredExchange}</span>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#D96B43]/30 px-3 py-2 text-sm font-semibold text-[#F7EEDB] transition hover:bg-[#D96B43]/10"
              >
                <Settings2 className="h-4 w-4" />
                Account settings
              </button>
              <button
                type="button"
                onClick={() => { void onSignOut(); }}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-[#F7EEDB]/70 transition hover:border-white/25 hover:text-[#F7EEDB]"
              >
                Sign out
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#1A1816]/60 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-[#D96B43]" />
              <h2 className="text-base font-semibold text-[#F7EEDB]">Start here</h2>
            </div>
            <p className="mt-1 text-sm text-[#F7EEDB]/60">Your main tools, without the clutter.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => onNavigate(item.view)}
                    className="group flex min-h-24 items-start gap-3 rounded-xl border border-white/10 bg-[#131211] p-4 text-left transition hover:border-[#D96B43]/50 hover:bg-[#201C19]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D96B43]/10 text-[#D96B43]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#F7EEDB]">{item.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#F7EEDB]/55">{item.description}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#F7EEDB]/35 transition group-hover:translate-x-0.5 group-hover:text-[#D96B43]" />
                  </button>
                );
              })}
            </div>
          </article>
        </div>

        <p className="text-xs leading-5 text-[#F7EEDB]/45">
          Market data may be delayed and is provided for research and education. MarKTXpO is not a broker and does not place trades.
        </p>
      </div>
    </section>
  );
};
