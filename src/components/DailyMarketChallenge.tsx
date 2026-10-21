import React, { useState, useEffect } from 'react';
import {
  DailyChallenge,
  DailyChallengeRecord,
  getDailyChallenge,
  getStreakMultiplier,
  getTimeUntilNextDailyChallenge,
} from '../data/dailyChallengeData';
import { GameCandleChart } from './GameCandleChart';
import { ScenarioOption, GameCandle } from '../data/tradingGameData';
import {
  Flame,
  Clock,
  Trophy,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  Zap,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { playSuccessSound, playErrorSound, playLevelUpSound, playClickSound } from '../utils/soundEffects';

interface Props {
  soundEnabled: boolean;
  onAwardXP: (xp: number) => void;
}

export const DailyMarketChallenge: React.FC<Props> = ({ soundEnabled, onAwardXP }) => {
  const [challenge, setChallenge] = useState<DailyChallenge>(() => getDailyChallenge());
  const [countdown, setCountdown] = useState<string>(getTimeUntilNextDailyChallenge());

  // Stored Streak & Completion Data
  const [record, setRecord] = useState<DailyChallengeRecord>(() => {
    try {
      const saved = localStorage.getItem('mxpo_daily_challenge_record');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      lastCompletedDate: null,
      currentStreak: 0,
      highestStreak: 0,
      history: {},
    };
  });

  // Today's completion check
  const todayKey = challenge.dateKey;
  const isCompletedToday = Boolean(record.history[todayKey]);
  const savedTodayEntry = record.history[todayKey];

  // Active play state
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(isCompletedToday);
  const [selectedOption, setSelectedOption] = useState<ScenarioOption | null>(null);
  const [revealed, setRevealed] = useState<boolean>(isCompletedToday);
  const [displayedCandles, setDisplayedCandles] = useState<GameCandle[]>(challenge.initialCandles);

  // Timer countdown updater
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilNextDailyChallenge());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Initialize with today's saved option if already completed
  useEffect(() => {
    if (savedTodayEntry) {
      const opt = challenge.options.find((o) => o.id === savedTodayEntry.chosenOptionId);
      if (opt) {
        setSelectedOption(opt);
        setRevealed(true);
        setDisplayedCandles([...challenge.initialCandles, ...opt.revealedCandles]);
        setIsPracticeMode(true);
      }
    }
  }, [todayKey, savedTodayEntry]);

  // Streak Multiplier Info
  const streakInfo = getStreakMultiplier(record.currentStreak);

  // Handle Option Selection
  const handleSelectOption = (opt: ScenarioOption) => {
    if (revealed && !isPracticeMode) return;

    setSelectedOption(opt);
    setRevealed(true);
    setDisplayedCandles([...challenge.initialCandles, ...opt.revealedCandles]);

    // If already completed today, this is a practice replay (no new daily score overwrite)
    if (isCompletedToday) {
      if (soundEnabled) {
        if (opt.isCorrect) playSuccessSound();
        else playErrorSound();
      }
      return;
    }

    // Official First Scored Attempt of Today!
    const isWin = opt.isCorrect;
    const baseXP = challenge.baseXP;
    const xpWithMultiplier = Math.round(baseXP * streakInfo.multiplier);

    // Calculate new streak
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(
      yesterday.getDate()
    ).padStart(2, '0')}`;

    let nextStreak = 1;
    if (record.lastCompletedDate === yKey) {
      // Consecutive day streak!
      nextStreak = record.currentStreak + 1;
    } else if (record.lastCompletedDate === todayKey) {
      nextStreak = record.currentStreak;
    }

    const nextHighest = Math.max(record.highestStreak, nextStreak);

    const updatedRecord: DailyChallengeRecord = {
      lastCompletedDate: todayKey,
      currentStreak: nextStreak,
      highestStreak: nextHighest,
      history: {
        ...record.history,
        [todayKey]: {
          completedAt: new Date().toISOString(),
          chosenOptionId: opt.id,
          isCorrect: isWin,
          score: opt.score,
          xpEarned: isWin ? xpWithMultiplier : 50,
          streakAtTime: nextStreak,
        },
      },
    };

    setRecord(updatedRecord);
    try {
      localStorage.setItem('mxpo_daily_challenge_record', JSON.stringify(updatedRecord));
    } catch {}

    if (soundEnabled) {
      if (isWin) {
        playSuccessSound();
        if (nextStreak > 1) {
          setTimeout(playLevelUpSound, 400);
        }
      } else {
        playErrorSound();
      }
    }

    onAwardXP(isWin ? xpWithMultiplier : 50);
  };

  // Replay in Practice Mode
  const handleReplayPractice = () => {
    if (soundEnabled) playClickSound();
    setIsPracticeMode(true);
    setSelectedOption(null);
    setRevealed(false);
    setDisplayedCandles(challenge.initialCandles);
  };

  return (
    <div className="space-y-6">
      {/* Daily Challenge Banner & Streak Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Streak Flame Tracker */}
        <div className="p-4 rounded-xl bg-[#1A1816] border border-[#F59E0B]/40 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#F7EEDB]/60 block font-mono uppercase tracking-wider">
              Daily Streak
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-[#F59E0B]">
                {record.currentStreak}
              </span>
              <span className="text-xs text-[#F7EEDB]/80 font-mono">Day{record.currentStreak === 1 ? '' : 's'}</span>
            </div>
            <span className="text-[10px] text-[#F59E0B] font-mono font-semibold block mt-0.5">
              {streakInfo.badge}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B]">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Streak Multiplier */}
        <div className="p-4 rounded-xl bg-[#1A1816] border border-[#22C55E]/30 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#F7EEDB]/60 block font-mono uppercase tracking-wider">
              XP Multiplier Active
            </span>
            <div className="text-2xl font-bold font-mono text-[#22C55E] mt-1">
              {streakInfo.multiplier}x XP
            </div>
            <span className="text-[10px] text-[#22C55E]/80 font-mono">
              +{Math.round((streakInfo.multiplier - 1) * 100)}% Streak Bonus
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#22C55E]/15 text-[#22C55E]">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        {/* Best Streak Record */}
        <div className="p-4 rounded-xl bg-[#1A1816] border border-[#8CB4E0]/30 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#F7EEDB]/60 block font-mono uppercase tracking-wider">
              Best Streak Record
            </span>
            <div className="text-2xl font-bold font-mono text-[#8CB4E0] mt-1">
              {record.highestStreak} Day{record.highestStreak === 1 ? '' : 's'}
            </div>
            <span className="text-[10px] text-[#8CB4E0]/80 font-mono">
              Personal Best
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#8CB4E0]/15 text-[#8CB4E0]">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* Countdown to Next Challenge */}
        <div className="p-4 rounded-xl bg-[#1A1816] border border-[#D96B43]/20 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#F7EEDB]/60 block font-mono uppercase tracking-wider">
              Next Daily Reset
            </span>
            <div className="text-xl font-bold font-mono text-[#F7EEDB] mt-1">
              {countdown}
            </div>
            <span className="text-[10px] text-[#D96B43] font-mono">
              Resets at Midnight
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#D96B43]/15 text-[#D96B43]">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Challenge Card */}
      <div className="p-6 rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D96B43]/15 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 flex items-center gap-1">
                <Flame className="w-3 h-3" /> DAILY MARKET CHALLENGE
              </span>
              <span className="text-xs text-[#8CB4E0] font-mono">
                {challenge.dateKey} · {challenge.stockTicker} ({challenge.timeframe})
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#F7EEDB] mt-1">{challenge.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            {isCompletedToday ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] text-xs font-mono font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Scored Today
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D96B43]/20 border border-[#D96B43]/40 text-[#D96B43] text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5" /> 1 Scored Attempt
              </span>
            )}

            {isCompletedToday && (
              <button
                onClick={handleReplayPractice}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#25221F] hover:bg-[#D96B43]/20 text-[#F7EEDB] text-xs font-mono border border-[#D96B43]/25 transition"
                title="Practice Replay Mode"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Practice Replay</span>
              </button>
            )}
          </div>
        </div>

        {/* Market Intelligence Briefing */}
        <div className="p-4 rounded-xl bg-[#131211] border border-[#D96B43]/20">
          <span className="text-[11px] font-mono text-[#8CB4E0] uppercase tracking-wider block mb-1">
            Historical Market Setup &amp; Catalyst
          </span>
          <p className="text-xs text-[#F7EEDB]/90 leading-relaxed">
            {challenge.setupDescription}
          </p>
        </div>

        {/* Dynamic Candlestick Chart */}
        <GameCandleChart
          candles={displayedCandles}
          supportLevel={challenge.supportLevel}
          resistanceLevel={challenge.resistanceLevel}
          height={320}
        />

        {/* Decision Prompt & Options */}
        <div className="space-y-3 pt-2">
          <div className="p-3 rounded-xl bg-[#D96B43]/15 border border-[#D96B43]/40 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F7EEDB] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D96B43]" />
              <span>{challenge.question}</span>
            </h3>
            {isPracticeMode && (
              <span className="text-[10px] font-mono text-[#8CB4E0] uppercase">
                Practice Mode Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {challenge.options.map((opt) => {
              const isChosen = selectedOption?.id === opt.id;
              let cardStyle =
                'bg-[#131211] border-[#D96B43]/20 hover:border-[#D96B43]/60 text-[#F7EEDB]';

              if (revealed) {
                if (opt.isCorrect) {
                  cardStyle =
                    'bg-[#22C55E]/15 border-[#22C55E] text-[#22C55E] shadow-[0_0_12px_rgba(34,197,94,0.25)]';
                } else if (isChosen) {
                  cardStyle =
                    'bg-[#EF4444]/15 border-[#EF4444] text-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.25)]';
                } else {
                  cardStyle = 'opacity-40 bg-[#131211] border-[#D96B43]/10 text-[#F7EEDB]/40';
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt)}
                  disabled={revealed && !isPracticeMode}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${cardStyle}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        opt.role === 'Trader'
                          ? 'bg-[#8CB4E0]/20 text-[#8CB4E0]'
                          : opt.role === 'Investor'
                          ? 'bg-[#22C55E]/20 text-[#22C55E]'
                          : 'bg-[#EF4444]/20 text-[#EF4444]'
                      }`}
                    >
                      {opt.role} Mindset
                    </span>

                    {revealed && opt.isCorrect && (
                      <span className="flex items-center gap-1 text-xs font-bold text-[#22C55E]">
                        <CheckCircle2 className="w-4 h-4" /> Correct Choice
                      </span>
                    )}
                    {revealed && isChosen && !opt.isCorrect && (
                      <span className="flex items-center gap-1 text-xs font-bold text-[#EF4444]">
                        <XCircle className="w-4 h-4" /> Costly Move
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium leading-relaxed">{opt.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Revealed Outcome & Post-Decision Debrief */}
        {revealed && selectedOption && (
          <div className="p-5 rounded-2xl bg-[#131211] border border-[#D96B43]/30 shadow-lg space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D96B43]/15 pb-3">
              <div className="flex items-center gap-2">
                {selectedOption.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                ) : (
                  <XCircle className="w-5 h-5 text-[#EF4444]" />
                )}
                <div>
                  <h4 className="text-sm font-bold text-[#F7EEDB]">
                    {selectedOption.feedbackTitle}
                  </h4>
                  {selectedOption.isCorrect && !isPracticeMode && (
                    <span className="text-[11px] font-mono text-[#22C55E]">
                      +{challenge.baseXP} Base XP × {streakInfo.multiplier} Streak ={' '}
                      <strong>+{Math.round(challenge.baseXP * streakInfo.multiplier)} XP Awarded!</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-[#F7EEDB]/60">Expected Trade Return:</span>
                <span
                  className={`font-bold ${
                    selectedOption.pnlReturnPct >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  }`}
                >
                  {selectedOption.pnlReturnPct >= 0 ? '+' : ''}
                  {selectedOption.pnlReturnPct}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold text-[#8CB4E0] font-mono uppercase">
                  Institutional Trade Logic
                </h5>
                <p className="text-[#F7EEDB]/85">{selectedOption.explanation}</p>
              </div>

              <div className="space-y-2">
                <h5 className="text-[11px] font-bold text-[#22C55E] font-mono uppercase">
                  Trader vs. Investor Mindset
                </h5>
                <p className="text-[#F7EEDB]/85">{selectedOption.traderVsInvestorInsight}</p>
              </div>
            </div>

            {/* Checklist & Golden Rule */}
            <div className="p-3.5 rounded-xl bg-[#D96B43]/10 border border-[#D96B43]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#D96B43] font-semibold italic">
                  💡 {selectedOption.keyRule}
                </span>
                <span className="text-[10px] text-[#F7EEDB]/50 font-mono">
                  Come back tomorrow for your next streak bonus!
                </span>
              </div>

              {challenge.educationalTakeaway?.traderChecklist && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-[#D96B43]/15 text-[10px] font-mono text-[#F7EEDB]/70">
                  <span className="text-[#8CB4E0] font-bold">Checklist:</span>
                  {challenge.educationalTakeaway.traderChecklist.map((item, idx) => (
                    <span key={idx} className="bg-[#131211] px-2 py-0.5 rounded border border-[#D96B43]/20">
                      ✓ {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
