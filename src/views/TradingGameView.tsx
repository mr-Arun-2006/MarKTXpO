import React, { useState, useEffect } from 'react';
import { StockData, SupportedLanguage } from '../types/market';
import { GAME_LEVELS, GameLevel, ScenarioOption, GameCandle } from '../data/tradingGameData';
import { GameCandleChart } from '../components/GameCandleChart';
import { PaperTradingSandbox } from '../components/PaperTradingSandbox';
import { PatternFlashcards } from '../components/PatternFlashcards';
import { DailyMarketChallenge } from '../components/DailyMarketChallenge';
import {
  Gamepad2,
  Trophy,
  Award,
  Zap,
  Flame,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Star,
  Download,
  Coins,
} from 'lucide-react';
import {
  playSuccessSound,
  playErrorSound,
  playLevelUpSound,
  playClickSound,
} from '../utils/soundEffects';
import jsPDF from 'jspdf';
import { auth, saveDbGameProgress, getDbGameProgress } from '../services/firebase';

interface Props {
  stocks: StockData[];
  language: SupportedLanguage;
  onNavigateToDashboard: () => void;
}

export const TradingGameView: React.FC<Props> = ({ stocks, language, onNavigateToDashboard }) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'daily' | 'levels' | 'paper_sandbox' | 'patterns'>('daily');

  // Sound preference
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mxpo_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Level Progression State
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [completedLevels, setCompletedLevels] = useState<Record<number, { stars: number; score: number }>>(() => {
    try {
      const saved = localStorage.getItem('mxpo_game_progress');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [totalXP, setTotalXP] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mxpo_game_xp');
      if (saved) return parseInt(saved) || 0;
    } catch {}
    return 250;
  });

  // Current level play state
  const currentLevel: GameLevel = GAME_LEVELS[currentLevelIdx] || GAME_LEVELS[0];
  const [selectedOption, setSelectedOption] = useState<ScenarioOption | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [displayedCandles, setDisplayedCandles] = useState<GameCandle[]>(currentLevel.initialCandles);

  // Sync state to current level
  useEffect(() => {
    setSelectedOption(null);
    setRevealed(false);
    setDisplayedCandles(currentLevel.initialCandles);
  }, [currentLevelIdx]);

  // Load cloud progress if user is authenticated
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const cloudData = await getDbGameProgress(user.uid);
        if (cloudData) {
          if (cloudData.totalXP > totalXP) setTotalXP(cloudData.totalXP);
          if (cloudData.completedLevels) {
            try {
              const parsed = JSON.parse(cloudData.completedLevels);
              setCompletedLevels((prev) => ({ ...prev, ...parsed }));
            } catch {}
          }
        }
      }
    });
    return () => unsub();
  }, []);

  // Persist progress
  const saveProgress = (levelNum: number, stars: number, score: number, xpGained: number) => {
    const updated = {
      ...completedLevels,
      [levelNum]: { stars: Math.max(completedLevels[levelNum]?.stars || 0, stars), score },
    };
    setCompletedLevels(updated);
    const newXP = totalXP + xpGained;
    setTotalXP(newXP);
    try {
      localStorage.setItem('mxpo_game_progress', JSON.stringify(updated));
      localStorage.setItem('mxpo_game_xp', newXP.toString());
    } catch {}

    if (auth.currentUser) {
      saveDbGameProgress({
        id: `progress-${auth.currentUser.uid}`,
        userId: auth.currentUser.uid,
        completedLevels: JSON.stringify(updated),
        totalXP: newXP,
        currentStreak: 1,
        highestStreak: 1,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('mxpo_sound_enabled', next.toString());
    } catch {}
  };

  // Handle Option Select
  const handleSelectOption = (opt: ScenarioOption) => {
    if (revealed) return;
    setSelectedOption(opt);
    setRevealed(true);

    // Merge revealed outcome candles onto chart
    setDisplayedCandles([...currentLevel.initialCandles, ...opt.revealedCandles]);

    const stars = opt.score >= 90 ? 3 : opt.score >= 70 ? 2 : 1;
    const isWin = opt.isCorrect;

    if (soundEnabled) {
      if (isWin) {
        playSuccessSound();
      } else {
        playErrorSound();
      }
    }

    // Award XP
    saveProgress(currentLevel.levelNumber, stars, opt.score, isWin ? currentLevel.xpReward : 25);
  };

  // Next Level Handler
  const handleNextLevel = () => {
    if (soundEnabled) playClickSound();
    if (currentLevelIdx < GAME_LEVELS.length - 1) {
      setCurrentLevelIdx((prev) => prev + 1);
      if (soundEnabled) playLevelUpSound();
    }
  };

  // Reset Level
  const handleRetryLevel = () => {
    if (soundEnabled) playClickSound();
    setSelectedOption(null);
    setRevealed(false);
    setDisplayedCandles(currentLevel.initialCandles);
  };

  // Student Rank Title based on XP
  const getRankTitle = (xp: number) => {
    if (xp >= 1500) return 'Market Maestro 🏆';
    if (xp >= 1000) return 'Institutional Navigator ⚡';
    if (xp >= 600) return 'Breakout Specialist 📈';
    return 'Junior Floor Trader 🎯';
  };

  const totalStars = Object.values(completedLevels).reduce((acc, l) => acc + l.stars, 0);
  const maxPossibleStars = GAME_LEVELS.length * 3;
  const isGameCompleted = Object.keys(completedLevels).length >= GAME_LEVELS.length;

  // Generate and Download PDF Certificate
  const downloadCertificate = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Dark elegant certificate styling
    doc.setFillColor(19, 18, 17);
    doc.rect(0, 0, 297, 210, 'F');

    // Outer and Inner Gold Borders
    doc.setDrawColor(217, 107, 67);
    doc.setLineWidth(3);
    doc.rect(10, 10, 277, 190);

    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.8);
    doc.rect(14, 14, 269, 182);

    // Title
    doc.setTextColor(247, 238, 219);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('CERTIFICATE OF ACHIEVEMENT', 148.5, 45, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(217, 107, 67);
    doc.text('INDIAN EQUITIES TRADING & MARKET ACADEMY', 148.5, 56, { align: 'center' });

    // Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(247, 238, 219);
    doc.text('This is to certify that the student trader has successfully mastered', 148.5, 80, { align: 'center' });

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text('CANDLESTICK PATTERNS, BULL MARKET DYNAMICS & RISK MANAGEMENT', 148.5, 94, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(247, 238, 219);
    doc.text(
      `Completing ${Object.keys(completedLevels).length} Real-World Scenario Levels with ${totalStars} Total Stars and ${totalXP} XP Points.`,
      148.5,
      108,
      { align: 'center' }
    );

    // Metadata Strip
    doc.setFontSize(10);
    doc.setTextColor(140, 180, 224);
    doc.text(`Rank Awarded: ${getRankTitle(totalXP)}`, 148.5, 126, { align: 'center' });
    doc.text(`Date of Completion: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 148.5, 134, { align: 'center' });
    doc.text('Verified by MarKtXPO Intelligent Analytics Engine · NSE & BSE Simulation Floor', 148.5, 142, { align: 'center' });

    // Signatures
    doc.setDrawColor(247, 238, 219);
    doc.setLineWidth(0.5);
    doc.line(45, 175, 105, 175);
    doc.line(192, 175, 252, 175);

    doc.setFontSize(10);
    doc.setTextColor(247, 238, 219);
    doc.text('Lead Market Mentor', 75, 182, { align: 'center' });
    doc.text('MarKtXPO Dean of Trading', 222, 182, { align: 'center' });

    doc.save('MarKtXPO_Trader_Certificate.pdf');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Academy Header & Gamification Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#1A1816] p-5 rounded-2xl border border-[#D96B43]/30 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider bg-[#D96B43]/20 text-[#D96B43] border border-[#D96B43]/40 flex items-center gap-1">
              <Gamepad2 className="w-3 h-3" /> STUDENT TRADING ACADEMY
            </span>
            <span className="text-xs text-[#22C55E] font-mono flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Interactive Chart Game
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#F7EEDB] tracking-tight">
            Candlestick Scenario Game & Paper Trading Floor
          </h1>
          <p className="text-xs text-[#F7EEDB]/70 max-w-2xl">
            Learn how professional traders and long-term investors make disciplined decisions in bull markets,
            breakouts, support bounces, and pullbacks through level-by-level real candle challenges.
          </p>
        </div>

        {/* HUD Badges & XP */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-3 rounded-xl bg-[#131211] border border-[#D96B43]/20 text-center min-w-[100px]">
            <span className="text-[10px] text-[#F7EEDB]/50 block font-mono">PLAYER RANK</span>
            <span className="text-xs font-bold font-mono text-[#D96B43]">{getRankTitle(totalXP)}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#131211] border border-[#22C55E]/30 text-center min-w-[90px]">
            <span className="text-[10px] text-[#F7EEDB]/50 block font-mono">TOTAL XP</span>
            <span className="text-base font-bold font-mono text-[#22C55E]">⚡ {totalXP}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#131211] border border-[#8CB4E0]/30 text-center min-w-[90px]">
            <span className="text-[10px] text-[#F7EEDB]/50 block font-mono">STARS EARNED</span>
            <span className="text-base font-bold font-mono text-[#F59E0B]">
              ⭐ {totalStars} / {maxPossibleStars}
            </span>
          </div>

          <button
            onClick={toggleSound}
            className={`p-3 rounded-xl border transition flex items-center gap-1.5 text-xs font-mono font-bold ${
              soundEnabled
                ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                : 'bg-[#131211] border-[#D96B43]/20 text-[#F7EEDB]/40'
            }`}
            title={soundEnabled ? 'Sound FX Enabled' : 'Sound FX Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'FX ON' : 'MUTED'}</span>
          </button>

          <button
            onClick={downloadCertificate}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#D96B43] hover:bg-[#c45a32] text-[#131211] font-bold text-xs shadow-md transition"
            title="Download Verified Academy Certificate"
          >
            <Download className="w-4 h-4" />
            <span>Certificate</span>
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#D96B43]/20 pb-2">
        <button
          onClick={() => {
            setActiveTab('daily');
            if (soundEnabled) playClickSound();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'daily'
              ? 'bg-[#F59E0B] text-[#131211] shadow-[0_0_14px_rgba(245,158,11,0.4)]'
              : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#1A1816]'
          }`}
        >
          <Flame className="w-4 h-4 text-[#F59E0B] animate-pulse" />
          <span>Daily Market Challenge (🔥 Streak Multiplier)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('levels');
            if (soundEnabled) playClickSound();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'levels'
              ? 'bg-[#D96B43] text-[#131211] shadow-lg'
              : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#1A1816]'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Level by Level Challenges ({GAME_LEVELS.length} Scenarios)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('paper_sandbox');
            if (soundEnabled) playClickSound();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'paper_sandbox'
              ? 'bg-[#D96B43] text-[#131211] shadow-lg'
              : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#1A1816]'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Live Paper Trading Sandbox (₹10L Capital)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('patterns');
            if (soundEnabled) playClickSound();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'patterns'
              ? 'bg-[#D96B43] text-[#131211] shadow-lg'
              : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB] hover:bg-[#1A1816]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Candlestick Flashcards & Pattern Quiz</span>
        </button>
      </div>

      {/* ================= TAB 0: DAILY MARKET CHALLENGE ================= */}
      {activeTab === 'daily' && (
        <DailyMarketChallenge
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onAwardXP={(xp) => {
            setTotalXP((prev) => {
              const updated = prev + xp;
              try {
                localStorage.setItem('mxpo_game_xp', updated.toString());
              } catch {}
              return updated;
            });
          }}
        />
      )}

      {/* ================= TAB 1: LEVEL BY LEVEL SCENARIOS ================= */}
      {activeTab === 'levels' && (
        <div className="space-y-6">
          {/* Level Progression Track / Stepper */}
          <div className="p-4 rounded-xl bg-[#1A1816] border border-[#D96B43]/20 shadow-md">
            <span className="text-[11px] font-mono text-[#F7EEDB]/60 uppercase tracking-wider block mb-3">
              Academy Curriculum Road Map
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {GAME_LEVELS.map((lvl, idx) => {
                const isCurrent = currentLevelIdx === idx;
                const isPassed = completedLevels[lvl.levelNumber];
                const stars = isPassed ? isPassed.stars : 0;

                return (
                  <button
                    key={lvl.id}
                    onClick={() => {
                      setCurrentLevelIdx(idx);
                      if (soundEnabled) playClickSound();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-[#D96B43]/20 border-[#D96B43] shadow-[0_0_12px_rgba(217,107,67,0.3)] ring-1 ring-[#D96B43]'
                        : isPassed
                        ? 'bg-[#22C55E]/10 border-[#22C55E]/30 hover:border-[#22C55E]/60'
                        : 'bg-[#131211] border-[#D96B43]/15 hover:border-[#D96B43]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-[#F7EEDB]/60">
                        LVL {lvl.levelNumber}
                      </span>
                      {stars > 0 && (
                        <div className="flex items-center text-[10px] text-[#F59E0B]">
                          {'★'.repeat(stars)}
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-bold text-[#F7EEDB] truncate mt-1">
                      {lvl.stockTicker}
                    </div>
                    <div className="text-[9px] text-[#8CB4E0] font-sans truncate">
                      {lvl.badgeName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Level Header & Market Situation */}
          <div className="p-6 rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D96B43]/15 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#D96B43] text-[#131211] font-mono font-bold">
                    LEVEL {currentLevel.levelNumber}
                  </span>
                  <span className="text-xs text-[#8CB4E0] font-mono">
                    {currentLevel.stockTicker} ({currentLevel.stockName}) · {currentLevel.timeframe}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#F7EEDB] mt-1">{currentLevel.title}</h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-[#131211] text-[#22C55E] font-mono font-bold border border-[#22C55E]/30">
                  +{currentLevel.xpReward} XP Reward
                </span>
                <button
                  onClick={handleRetryLevel}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#25221F] hover:bg-[#D96B43]/20 text-[#F7EEDB]/70 hover:text-[#F7EEDB] text-xs font-mono transition border border-[#D96B43]/20"
                  title="Reset Scenario"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            </div>

            {/* Situation Briefing */}
            <div className="p-4 rounded-xl bg-[#131211] border border-[#D96B43]/20">
              <span className="text-[11px] font-mono text-[#8CB4E0] uppercase tracking-wider block mb-1">
                Market Intelligence Briefing
              </span>
              <p className="text-xs text-[#F7EEDB]/90 leading-relaxed">
                {currentLevel.situationDescription}
              </p>
            </div>

            {/* Interactive Candlestick Chart */}
            <GameCandleChart
              candles={displayedCandles}
              supportLevel={currentLevel.supportLevel}
              resistanceLevel={currentLevel.resistanceLevel}
              height={320}
            />

            {/* Decision Prompt & Options */}
            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-xl bg-[#D96B43]/15 border border-[#D96B43]/40">
                <h3 className="text-sm font-bold text-[#F7EEDB] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D96B43]" />
                  <span>{currentLevel.question}</span>
                </h3>
              </div>

              {/* 4 Choices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentLevel.options.map((opt) => {
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
                      disabled={revealed}
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

            {/* Revealed Outcome & Institutional Explanation */}
            {revealed && selectedOption && (
              <div className="p-5 rounded-2xl bg-[#131211] border border-[#D96B43]/30 shadow-lg space-y-4 animate-in fade-in duration-300">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D96B43]/15 pb-3">
                  <div className="flex items-center gap-2">
                    {selectedOption.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#EF4444]" />
                    )}
                    <h4 className="text-sm font-bold text-[#F7EEDB]">{selectedOption.feedbackTitle}</h4>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-[#F7EEDB]/60">Scenario P&L Outcome:</span>
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
                      Market Rationale & Analysis
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

                <div className="p-3 rounded-xl bg-[#D96B43]/10 border border-[#D96B43]/30 flex items-center justify-between">
                  <span className="text-xs text-[#D96B43] font-semibold italic">
                    💡 {selectedOption.keyRule}
                  </span>

                  {currentLevelIdx < GAME_LEVELS.length - 1 && (
                    <button
                      onClick={handleNextLevel}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#22C55E] hover:bg-[#1ea750] text-[#131211] font-bold text-xs shadow-md transition ml-3 shrink-0"
                    >
                      <span>Proceed to Level {currentLevel.levelNumber + 1}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: LIVE PAPER TRADING SANDBOX ================= */}
      {activeTab === 'paper_sandbox' && (
        <PaperTradingSandbox stocks={stocks} soundEnabled={soundEnabled} />
      )}

      {/* ================= TAB 3: FLASHCARDS & QUIZ ================= */}
      {activeTab === 'patterns' && (
        <PatternFlashcards soundEnabled={soundEnabled} />
      )}
    </div>
  );
};
