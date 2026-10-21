# Implementation Plan: Daily Market Challenge with Streaks & XP Multipliers

## 1. User Request & Clarification Summary

### User Intent
The user requested a **'Daily Market Challenge'** feature inside `TradingGameView` where students and traders must analyze a daily-generated historical candlestick chart pattern and correctly determine the next institutional market move (e.g., bull continuation, resistance rejection, mean reversion bounce, breakdown exit).

### Clarified Decisions
Based on Phase 1 interaction:
1. **Daily Attempt Enforcement**: One scored attempt per calendar day, preserving streak integrity, alongside an unlocked **Practice Replay Mode** so students can study and retry the pattern freely after completing their official daily submission.
2. **Reward & Streak Structure**: Consecutive daily streak counter with streak multipliers ($1.0\times$, $1.25\times$, $1.5\times$, $2.0\times$ XP bonus), animated streak flame badges (`🔥 3-Day Flame`, `⚡ 7-Day Flash`, `🏆 14-Day Legend`), and streak preservation check.

---

## 2. Domain-Specific Design & Layout Architecture

Adhering to the **Education & Interactive Simulations** design reference:
- **Two-Zone Interactive Learning Stage**:
  - **Zone A (Interactive Daily Canvas)**: Full-width candlestick chart with dynamic OHLC wicks, 20 EMA, volume profile, support/resistance bands, and hidden outcome candles revealed upon submission.
  - **Zone B (Decision & Rationale Deck)**: Clear scenario prompt ("What is your next move as a disciplined market participant?"), 4 distinct tactical choices (Momentum Continuation, Support Retest, Counter-Trend Trap, Premature Exit), and post-decision institutional debrief.
- **Visual Language & Anti-Slop Discipline**:
  - Palette: Dark obsidian (`#131211`), terracotta (`#D96B43`), emerald bull green (`#22C55E`), red bear (`#EF4444`), warm cream text (`#F7EEDB`), and amber streak flame (`#F59E0B`).
  - Strict zero-pill metadata typography: Clean unboxed stats with dot separators (`Day 14 · Reliance Breakout · 15-Min Candle`).
  - JetBrains Mono for prices, percentages, and multiplier readouts (`2.0x XP Streak`).
- **Sound & Motion**:
  - Auditory feedback: Success chime on correct daily prediction, warning tone on mistake, and level-up fanfare on streak milestones.
  - Animated candle reveal: Smooth rendering of the next 4–6 candles demonstrating how smart money played the setup.

---

## 3. Technical Architecture & State Machine

### A. Daily Deterministic Pattern Generator (`src/data/dailyChallengeData.ts`)
- Seed-based generator using current date string (`YYYY-MM-DD` in Indian Standard Time `Asia/Kolkata` / local day).
- Rotating pool of realistic historical Indian equity scenarios (NIFTY 50 breakouts, Reliance morning gaps, HDFC Bank hammer reversals, TCS earnings resistance, Coal India dividend yield floors, Tata Motors pullback bounces).
- Provides:
  - `dateKey`: e.g., `"2026-10-21"`
  - `stockTicker` & `stockName`: e.g., `"RELIANCE"`, `"Reliance Industries Ltd."`
  - `setupTitle`: e.g., `"The 15-Minute Bull Flag Breakout"`
  - `timeframe`: e.g., `"15-Min Chart"`
  - `initialCandles`: 6-8 candles leading up to the critical decision point
  - `question`: "Uptrend momentum is surging into morning resistance. What is your next move?"
  - `options`: 4 tactical choices with detailed explanations, trader vs. investor comparisons, and revealed outcome candles
  - `baseXP`: 200 XP

### B. Daily Streak & Scored Attempt State (`src/hooks/useDailyChallenge.ts` or inline state)
- State persisted in `localStorage` (`mxpo_daily_challenge`):
  ```typescript
  interface DailyChallengeRecord {
    lastCompletedDate: string; // "2026-10-21"
    currentStreak: number;     // e.g., 4 days
    highestStreak: number;     // e.g., 12 days
    dailyHistory: Record<string, {
      completed: boolean;
      score: number;
      chosenOptionId: string;
      xpEarned: number;
      isCorrect: boolean;
    }>;
  }
  ```
- **Streak Calculation Logic**:
  - If last completed date was **yesterday**: `currentStreak = currentStreak + 1`.
  - If last completed date was **today**: Already completed for the day; enable Practice Replay mode.
  - If last completed date was **before yesterday**: Streak resets to 1 upon today's first completion.
- **XP Multiplier Scaling**:
  - 1–2 days: $1.0\times$ (200 XP)
  - 3–4 days: $1.25\times$ (250 XP) + `🔥 Flame Novice`
  - 5–6 days: $1.5\times$ (300 XP) + `🔥 Flame Veteran`
  - 7+ days: $2.0\times$ (400 XP) + `⚡ Market Legend Badge`

---

## 4. Step-by-Step Implementation Steps

1. **Create `src/data/dailyChallengeData.ts`**:
   - Define data types (`DailyChallenge`, `DailyChallengeProgress`).
   - Implement date-keyed scenario selector `getDailyChallenge(date?: Date): DailyChallenge`.
   - Seed rich Indian market candlestick scenarios with both Bull and Bear setups.

2. **Create `src/components/DailyMarketChallenge.tsx`**:
   - Header with active Streak Flame counter (`🔥 4-Day Streak · 1.5x XP Active`), countdown timer to next daily challenge (`Next challenge in: 14h 22m`), and highest streak badge.
   - Status banner: "Today's Scored Attempt" or "Completed Today · Practice Replay Mode".
   - `GameCandleChart` rendering the pre-decision pattern.
   - 4 tactical choices with role badges (Trader vs Investor vs Trap).
   - Interactive reveal: displays outcome candles, institutional debrief, XP earned with streak bonus animation, and "Replay in Practice Mode" button.

3. **Integrate into `src/views/TradingGameView.tsx`**:
   - Add new prominent tab: `Daily Market Challenge (🔥 Streak)` alongside Level Challenges, Paper Trading, and Flashcards.
   - Connect earned XP into global player XP and rank progression.
   - Sync sound effects on daily success/failure.

4. **Update Translations (`src/i18n/translations.ts`)**:
   - Add `dailyChallenge: string` for all 6 languages (`en`, `hi`, `gu`, `ta`, `mr`, `bn`).

---

## 5. Verification & Testing Strategy

1. **Deterministic Daily Challenge Test**:
   - Verify that challenge generates the exact same pattern for a given calendar date, and transitions automatically on date change.
2. **Streak & Multiplier Verification**:
   - Verify 1st day completion awards $1.0\times$ base XP.
   - Verify consecutive day completion increments streak and applies $1.25\times$ / $1.5\times$ / $2.0\times$ bonus.
   - Verify missed day resets current streak to 1 without erasing `highestStreak`.
3. **Practice Replay Mode Test**:
   - After scoring today's challenge, verify the user can replay and test alternate choices in Practice Mode without altering their locked daily score.
4. **Code Quality**:
   - Run `lint_applet` (`tsc --noEmit`) to verify zero TypeScript errors.
   - Run `compile_applet` (`npm run build`) to ensure clean bundle compilation.
