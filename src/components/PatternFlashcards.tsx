import React, { useState } from 'react';
import { FLASHCARD_PATTERNS, FlashcardPattern } from '../data/tradingGameData';
import { Sparkles, CheckCircle2, ChevronRight, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { playClickSound, playSuccessSound, playErrorSound } from '../utils/soundEffects';

interface Props {
  soundEnabled: boolean;
  onCompleteQuiz?: (score: number) => void;
}

export const PatternFlashcards: React.FC<Props> = ({ soundEnabled, onCompleteQuiz }) => {
  const [selectedPattern, setSelectedPattern] = useState<FlashcardPattern>(FLASHCARD_PATTERNS[0]);
  const [quizMode, setQuizMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const currentQuizItem = FLASHCARD_PATTERNS[quizIndex];

  const handleSelectQuizAnswer = (answer: string) => {
    if (quizSelectedAnswer !== null) return;
    setQuizSelectedAnswer(answer);

    const isCorrect = answer === currentQuizItem.type;
    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
      if (soundEnabled) playSuccessSound();
    } else {
      if (soundEnabled) playErrorSound();
    }
  };

  const handleNextQuiz = () => {
    if (quizIndex < FLASHCARD_PATTERNS.length - 1) {
      setQuizIndex((prev) => prev + 1);
      setQuizSelectedAnswer(null);
    } else {
      setQuizCompleted(true);
      if (onCompleteQuiz) {
        onCompleteQuiz(quizScore);
      }
    }
  };

  const handleRestartQuiz = () => {
    setQuizIndex(0);
    setQuizSelectedAnswer(null);
    setQuizScore(0);
    setQuizCompleted(false);
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1A1816] p-3 rounded-xl border border-[#D96B43]/20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setQuizMode(false);
              if (soundEnabled) playClickSound();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              !quizMode
                ? 'bg-[#D96B43] text-[#131211] font-bold shadow-md'
                : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB]'
            }`}
          >
            Study Guide (Interactive Flashcards)
          </button>
          <button
            onClick={() => {
              setQuizMode(true);
              handleRestartQuiz();
              if (soundEnabled) playClickSound();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              quizMode
                ? 'bg-[#D96B43] text-[#131211] font-bold shadow-md'
                : 'text-[#F7EEDB]/70 hover:text-[#F7EEDB]'
            }`}
          >
            Quick Pattern Quiz ({FLASHCARD_PATTERNS.length} Questions)
          </button>
        </div>

        <span className="text-xs text-[#8CB4E0] font-mono">
          {quizMode ? `Score: ${quizScore}/${FLASHCARD_PATTERNS.length}` : 'Master Key Market Candlesticks'}
        </span>
      </div>

      {!quizMode ? (
        /* ============ FLASHCARD STUDY MODE ============ */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Left pattern list */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-[#F7EEDB]/60 uppercase tracking-wider block px-1">
              Select Candlestick Formation
            </span>
            {FLASHCARD_PATTERNS.map((pat) => {
              const isSelected = selectedPattern.id === pat.id;
              return (
                <button
                  key={pat.id}
                  onClick={() => {
                    setSelectedPattern(pat);
                    if (soundEnabled) playClickSound();
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#25221F] border-[#D96B43] shadow-md'
                      : 'bg-[#1A1816] border-[#D96B43]/15 hover:border-[#D96B43]/40'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-[#F7EEDB]">{pat.name}</div>
                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        pat.type === 'Bullish'
                          ? 'text-[#22C55E]'
                          : pat.type === 'Bearish'
                          ? 'text-[#EF4444]'
                          : 'text-[#8CB4E0]'
                      }`}
                    >
                      {pat.type} · Reliability: {pat.reliabilityScore}%
                    </span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 transition ${
                      isSelected ? 'text-[#D96B43] translate-x-0.5' : 'text-[#F7EEDB]/30'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right Detailed Visual Flashcard */}
          <div className="md:col-span-2 p-5 rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D96B43]/15 pb-4">
              <div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider border ${
                    selectedPattern.type === 'Bullish'
                      ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                      : selectedPattern.type === 'Bearish'
                      ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                      : 'bg-[#8CB4E0]/15 text-[#8CB4E0] border-[#8CB4E0]/30'
                  }`}
                >
                  {selectedPattern.type}
                </span>
                <h3 className="text-lg font-bold text-[#F7EEDB] mt-1">{selectedPattern.name}</h3>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[#F7EEDB]/60 block font-mono">Institutional Reliability</span>
                <span className="text-lg font-bold font-mono text-[#22C55E]">
                  {selectedPattern.reliabilityScore}%
                </span>
              </div>
            </div>

            {/* Visual SVG Diagram of the Pattern */}
            <div className="p-6 rounded-xl bg-[#131211] border border-[#D96B43]/20 flex items-center justify-center">
              <svg width="220" height="150" viewBox="0 0 220 150" className="overflow-visible">
                {selectedPattern.sampleCandles.map((c, idx) => {
                  const x = 50 + idx * 60;
                  const isBull = c.close >= c.open;
                  const color = isBull ? '#22C55E' : '#EF4444';

                  // Map 85..115 to 130..20
                  const yMin = 85;
                  const yMax = 118;
                  const mapY = (val: number) => 135 - ((val - yMin) / (yMax - yMin)) * 115;

                  const highY = mapY(c.high);
                  const lowY = mapY(c.low);
                  const openY = mapY(c.open);
                  const closeY = mapY(c.close);

                  const bodyTop = Math.min(openY, closeY);
                  const bodyHeight = Math.max(Math.abs(closeY - openY), 3);

                  return (
                    <g key={`sample-${idx}`}>
                      {/* Wick */}
                      <line
                        x1={x}
                        y1={highY}
                        x2={x}
                        y2={lowY}
                        stroke={color}
                        strokeWidth={2.4}
                        strokeLinecap="round"
                      />
                      {/* Body */}
                      <rect
                        x={x - 14}
                        y={bodyTop}
                        width={28}
                        height={bodyHeight}
                        fill={color}
                        stroke={color}
                        strokeWidth={1}
                        rx={2.5}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Anatomy Description */}
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl bg-[#131211]/80 border border-[#D96B43]/15">
                <h4 className="text-[11px] font-bold text-[#8CB4E0] uppercase font-mono mb-1">
                  Pattern Anatomy & Recognition
                </h4>
                <p className="text-[#F7EEDB]/85">{selectedPattern.description}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30">
                <h4 className="text-[11px] font-bold text-[#22C55E] uppercase font-mono mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> How a Trader Executes This Setup
                </h4>
                <p className="text-[#F7EEDB]/90">{selectedPattern.howToTrade}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============ INTERACTIVE QUIZ MODE ============ */
        <div className="max-w-xl mx-auto p-6 rounded-2xl bg-[#1A1816] border border-[#D96B43]/30 shadow-xl space-y-6">
          {!quizCompleted ? (
            <>
              <div className="flex items-center justify-between text-xs font-mono text-[#F7EEDB]/60 border-b border-[#D96B43]/15 pb-3">
                <span>
                  Question {quizIndex + 1} of {FLASHCARD_PATTERNS.length}
                </span>
                <span className="text-[#22C55E] font-bold">Current Score: {quizScore}</span>
              </div>

              <div className="text-center space-y-2">
                <span className="text-[11px] text-[#8CB4E0] font-mono uppercase tracking-wider block">
                  Identify Pattern Bias
                </span>
                <h3 className="text-xl font-bold text-[#F7EEDB]">{currentQuizItem.name}</h3>
                <p className="text-xs text-[#F7EEDB]/70 max-w-md mx-auto">{currentQuizItem.description}</p>
              </div>

              {/* Quiz SVG preview */}
              <div className="p-4 rounded-xl bg-[#131211] border border-[#D96B43]/20 flex items-center justify-center">
                <svg width="180" height="110" viewBox="0 0 180 110" className="overflow-visible">
                  {currentQuizItem.sampleCandles.map((c, idx) => {
                    const x = 50 + idx * 50;
                    const isBull = c.close >= c.open;
                    const color = isBull ? '#22C55E' : '#EF4444';
                    const yMin = 85;
                    const yMax = 118;
                    const mapY = (val: number) => 100 - ((val - yMin) / (yMax - yMin)) * 85;

                    return (
                      <g key={`quiz-${idx}`}>
                        <line
                          x1={x}
                          y1={mapY(c.high)}
                          x2={x}
                          y2={mapY(c.low)}
                          stroke={color}
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                        <rect
                          x={x - 11}
                          y={Math.min(mapY(c.open), mapY(c.close))}
                          width={22}
                          height={Math.max(Math.abs(mapY(c.close) - mapY(c.open)), 3)}
                          fill={color}
                          rx={2}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Three Options */}
              <div className="space-y-2.5">
                {(['Bullish', 'Bearish', 'Neutral/Indecision'] as const).map((bias) => {
                  let btnColor = 'bg-[#131211] border-[#D96B43]/20 hover:border-[#D96B43]/50 text-[#F7EEDB]';
                  if (quizSelectedAnswer !== null) {
                    if (bias === currentQuizItem.type) {
                      btnColor = 'bg-[#22C55E]/20 border-[#22C55E] text-[#22C55E] font-bold';
                    } else if (quizSelectedAnswer === bias) {
                      btnColor = 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444] font-bold';
                    } else {
                      btnColor = 'opacity-40 bg-[#131211] border-[#D96B43]/10 text-[#F7EEDB]/40';
                    }
                  }

                  return (
                    <button
                      key={bias}
                      onClick={() => handleSelectQuizAnswer(bias)}
                      disabled={quizSelectedAnswer !== null}
                      className={`w-full py-3 px-4 rounded-xl border text-sm text-left transition flex items-center justify-between ${btnColor}`}
                    >
                      <span>{bias} Formation</span>
                      {quizSelectedAnswer !== null && bias === currentQuizItem.type && (
                        <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {quizSelectedAnswer !== null && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNextQuiz}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D96B43] hover:bg-[#c45a32] text-[#131211] font-bold text-xs shadow-md transition"
                  >
                    <span>
                      {quizIndex < FLASHCARD_PATTERNS.length - 1 ? 'Next Question' : 'View Final Score'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <Sparkles className="w-12 h-12 text-[#22C55E] mx-auto animate-bounce" />
              <h3 className="text-xl font-bold text-[#F7EEDB]">Pattern Quiz Completed!</h3>
              <p className="text-sm text-[#F7EEDB]/70">
                You scored <strong className="text-[#22C55E] font-mono">{quizScore}</strong> out of{' '}
                <strong className="text-[#F7EEDB] font-mono">{FLASHCARD_PATTERNS.length}</strong> (
                {Math.round((quizScore / FLASHCARD_PATTERNS.length) * 100)}% Accuracy)
              </p>

              <button
                onClick={handleRestartQuiz}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D96B43] text-[#131211] font-bold text-xs shadow-md hover:bg-[#c45a32] transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Quiz</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
