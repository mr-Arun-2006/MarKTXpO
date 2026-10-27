import { GameCandle, ScenarioOption } from './tradingGameData';

export interface DailyChallenge {
  id: string;
  dateKey: string; // YYYY-MM-DD
  title: string;
  themeBadge: string;
  stockTicker: string;
  stockName: string;
  timeframe: string;
  setupDescription: string;
  supportLevel?: number;
  resistanceLevel?: number;
  initialCandles: GameCandle[];
  question: string;
  options: ScenarioOption[];
  baseXP: number;
  educationalTakeaway: {
    patternName: string;
    marketPsychology: string;
    traderChecklist: string[];
    investorTakeaway: string;
  };
}

export interface DailyChallengeRecord {
  lastCompletedDate: string | null; // YYYY-MM-DD
  currentStreak: number;
  highestStreak: number;
  history: Record<
    string,
    {
      completedAt: string;
      chosenOptionId: string;
      isCorrect: boolean;
      score: number;
      xpEarned: number;
      streakAtTime: number;
    }
  >;
}

// Fictional educational scenarios. They are not current-market reports or verified historical exchange data.
const CHALLENGE_POOL: (Omit<DailyChallenge, 'dateKey' | 'id'> & { id?: string })[] = [
  {
    title: 'Practice Scenario: Nifty 50 Breakout Test',
    themeBadge: 'NIFTY Breakout',
    stockTicker: 'NIFTY 50',
    stockName: 'NSE Nifty 50 Benchmark Index',
    timeframe: 'Daily Candle',
    setupDescription:
      'In this hypothetical practice scenario, assume the index consolidates between 23,000 and 23,200. A fictional close at 23,240 breaks above resistance. No real institutional flows or current market event are being reported.',
    supportLevel: 23050,
    resistanceLevel: 23200,
    initialCandles: [
      { time: 'Day -4', open: 23020, high: 23110, low: 22990, close: 23080, volume: 180000 },
      { time: 'Day -3', open: 23080, high: 23150, low: 23040, close: 23115, volume: 195000 },
      { time: 'Day -2', open: 23115, high: 23180, low: 23090, close: 23140, volume: 210000 },
      { time: 'Day -1', open: 23140, high: 23190, low: 23110, close: 23165, volume: 205000, annotation: 'Compression at 23,190' },
      { time: 'Today', open: 23170, high: 23265, low: 23160, close: 23245, volume: 380000, annotation: 'Clean Breakout Above 23,200' },
    ],
    question:
      'NIFTY 50 has officially closed above heavy resistance at 23,200 on expanding institutional volume. What is your NEXT MOVE?',
    options: [
      {
        id: 'nifty-opt-ride',
        label: 'Enter Long on Index ETF / Futures with Stop Loss strictly below 23,160',
        role: 'Trader',
        isCorrect: true,
        score: 100,
        feedbackTitle: 'Flawless Execution! Riding Structural Breakouts',
        explanation:
          'When a major index cleanly breaks out of a multi-week compression range with 1.8x volume, smart money momentum typically carries the move forward. Placing your risk anchor (Stop Loss) below the breakout candle low (23,160) provides asymmetric 1:2.5+ risk-reward.',
        traderVsInvestorInsight:
          'Trader Play: Enter on the daily close or next morning opening tick. Investor Play: Rebalance equity allocation upward as the broader market trend turns decisively bullish.',
        revealedCandles: [
          { time: 'Day +1', open: 23250, high: 23340, low: 23230, close: 23320, volume: 410000, annotation: 'Surge to 23,320' },
          { time: 'Day +2', open: 23320, high: 23410, low: 23305, close: 23395, volume: 395000, annotation: 'Target 1 Reached!' },
          { time: 'Day +3', open: 23395, high: 23450, low: 23370, close: 23430, volume: 310000 },
        ],
        pnlReturnPct: 3.2,
        keyRule: 'Index Rule: Never counter-trend a multi-week breakout with expanding volume. Trail stops.',
      },
      {
        id: 'nifty-opt-pullback',
        label: 'Wait for a retest dip toward 23,200 before taking position',
        role: 'Investor',
        isCorrect: true,
        score: 90,
        feedbackTitle: 'Prudent Strategy: Buying the Retest',
        explanation:
          'Waiting for prior resistance (23,200) to act as new support gives an even tighter stop loss, though you risk missing part of the move if momentum is relentless.',
        traderVsInvestorInsight:
          'Conservative investors frequently deploy half capital immediately and hold half for the potential retest.',
        revealedCandles: [
          { time: 'Day +1', open: 23250, high: 23280, low: 23205, close: 23225, volume: 290000, annotation: 'Retest of 23,205' },
          { time: 'Day +2', open: 23225, high: 23360, low: 23215, close: 23350, volume: 380000, annotation: 'Bounce Off Retest' },
        ],
        pnlReturnPct: 2.5,
        keyRule: 'Retest Principle: Broken resistance becomes support. Patience gives superior risk control.',
      },
      {
        id: 'nifty-opt-short',
        label: 'Buy Put options or Short because "Markets are at an all-time high and due to crash"',
        role: 'Gambler/Trap',
        isCorrect: false,
        score: 15,
        feedbackTitle: 'Top-Fishing Trap: Counter-Trend Mistake',
        explanation:
          'All-time highs are a sign of institutional strength, not automatic weakness. Shorting without a confirmed bearish rejection structure usually leads to severe losses.',
        traderVsInvestorInsight:
          'Bearish bets require structural confirmation (e.g. lower low + distribution volume).',
        revealedCandles: [
          { time: 'Day +1', open: 23250, high: 23340, low: 23230, close: 23320, volume: 410000, annotation: 'Shorts Squeezed' },
          { time: 'Day +2', open: 23320, high: 23410, low: 23305, close: 23395, volume: 395000, annotation: 'Stop-Out Triggered' },
        ],
        pnlReturnPct: -4.1,
        keyRule: 'Cardinal Rule: All-time highs indicate momentum, not an automatic ceiling. Trade what you see.',
      },
    ],
    baseXP: 200,
    educationalTakeaway: {
      patternName: 'Horizontal Range Expansion & Breakout',
      marketPsychology:
        'Sellers who capped the 23,200 level for 9 sessions have covered their positions, while sideline institutions rush to allocate cash before prices run away.',
      traderChecklist: [
        'Confirm closing price is above resistance',
        'Verify volume is substantially higher than range average',
        'Place Stop Loss below the breakout candle base',
      ],
      investorTakeaway:
        'Bull market expansions validate ongoing equity accumulation. Avoid sitting 100% in cash during confirmed breakouts.',
    },
  },

  {
    id: 'tcs-pullback-challenge',
    title: 'TCS: The 200-Day EMA Value Trampoline',
    themeBadge: 'Value Rebound',
    stockTicker: 'TCS',
    stockName: 'Tata Consultancy Services',
    timeframe: 'Daily Candle',
    setupDescription:
      'After an earnings dip, TCS dropped 6% into its critical long-term institutional support: the 200-day Exponential Moving Average (₹3,950). Today it printed a Bullish Morning Star with strong buying volume off ₹3,940.',
    supportLevel: 3940,
    resistanceLevel: 4120,
    initialCandles: [
      { time: 'Day -3', open: 4040, high: 4055, low: 3980, close: 3990, volume: 220000 },
      { time: 'Day -2', open: 3990, high: 3995, low: 3940, close: 3950, volume: 280000, annotation: 'Touching 200 EMA' },
      { time: 'Day -1', open: 3950, high: 3965, low: 3935, close: 3945, volume: 210000, annotation: 'Doji at 200 EMA' },
      { time: 'Today', open: 3950, high: 4015, low: 3945, close: 4010, volume: 360000, annotation: 'Morning Star Complete' },
    ],
    question:
      'A pristine 3-candle Morning Star pattern has completed at the 200-day EMA institutional support. What is your NEXT MOVE?',
    options: [
      {
        id: 'tcs-opt-buy-morning-star',
        label: 'Buy TCS Long with Stop-Loss anchored below ₹3,930 (below the Doji tail)',
        role: 'Trader',
        isCorrect: true,
        score: 100,
        feedbackTitle: 'Master Class Entry! High Win-Rate Value Bounce',
        explanation:
          'The 200 EMA on large-cap tier-1 IT companies is the benchmark where domestic and sovereign funds step in. The Morning Star confirms buyers have seized control from sellers.',
        traderVsInvestorInsight:
          'Trader: Risk is ₹80, Target is ₹4,120 (₹110 gain = 1:1.4+ fast swing). Investor: Ideal spot to add a core allocation with high margin of safety.',
        revealedCandles: [
          { time: 'Day +1', open: 4015, high: 4060, low: 4010, close: 4055, volume: 320000 },
          { time: 'Day +2', open: 4055, high: 4110, low: 4045, close: 4100, volume: 340000, annotation: 'Target Reached (₹4,100)' },
        ],
        pnlReturnPct: 3.8,
        keyRule: 'Institutional Benchmark: The 200 EMA on blue chips with reversal patterns offers supreme risk-reward.',
      },
      {
        id: 'tcs-opt-panic-sell',
        label: 'Sell remaining shares because "IT sector is weak and might go lower"',
        role: 'Gambler/Trap',
        isCorrect: false,
        score: 20,
        feedbackTitle: 'Retail Mistake: Selling at Major Institutional Support',
        explanation:
          'Selling at the 200 EMA right after a Morning Star completes is giving away high-grade shares at the exact moment institutions are buying.',
        traderVsInvestorInsight:
          'Never sell into confirmed reversal patterns at major moving averages.',
        revealedCandles: [
          { time: 'Day +1', open: 4015, high: 4060, low: 4010, close: 4055, volume: 320000 },
          { time: 'Day +2', open: 4055, high: 4110, low: 4045, close: 4100, volume: 340000, annotation: 'Rallied ₹90 higher' },
        ],
        pnlReturnPct: -1.5,
        keyRule: 'Support Discipline: Buy support, sell resistance. Never panic sell at key institutional moving averages.',
      },
    ],
    baseXP: 220,
    educationalTakeaway: {
      patternName: 'Morning Star at 200-Day EMA',
      marketPsychology:
        'Selling momentum dried up completely on Day -1 (Doji), followed by an aggressive green impulse showing mutual funds absorbing supply.',
      traderChecklist: [
        'Identify 200 EMA support alignment',
        'Verify Morning Star candle 3 closes past midpoint of candle 1',
        'Set Stop Loss below lowest wick',
      ],
      investorTakeaway:
        'Large-cap companies with robust cash flows rarely stay below the 200 EMA for prolonged periods.',
    },
  },

  {
    id: 'hdfc-trap-challenge',
    title: 'HDFC Bank: The Symmetrical Triangle Squeeze',
    themeBadge: 'Volatility Squeeze',
    stockTicker: 'HDFCBANK',
    stockName: 'HDFC Bank Ltd.',
    timeframe: '1-Hour Chart',
    setupDescription:
      'HDFC Bank has been coiling inside a tightening symmetrical triangle for 4 days. Today at 11:15 AM, the price breaks aggressively to the upside, crossing ₹1,560 with volume spiking 2.2x over previous bars.',
    supportLevel: 1540,
    resistanceLevel: 1560,
    initialCandles: [
      { time: '09:15', open: 1548, high: 1555, low: 1546, close: 1552, volume: 140000 },
      { time: '10:00', open: 1552, high: 1556, low: 1550, close: 1554, volume: 160000 },
      { time: '10:45', open: 1554, high: 1558, low: 1552, close: 1557, volume: 180000, annotation: 'Coiling Apex' },
      { time: '11:15', open: 1557, high: 1572, low: 1556, close: 1570, volume: 390000, annotation: 'Triangle Breakout Surge' },
    ],
    question:
      'A high-volume upside breakout has occurred from the apex of a 4-day symmetrical triangle. What is your NEXT MOVE?',
    options: [
      {
        id: 'hdfc-opt-buy-breakout',
        label: 'Buy the breakout with Stop Loss set at the triangle apex (₹1,555)',
        role: 'Trader',
        isCorrect: true,
        score: 100,
        feedbackTitle: 'Sensational Breakout Timing! Triangle Expansion',
        explanation:
          'Symmetrical triangle breakouts after prolonged coiling release powerful volatility expansions. A stop loss placed just inside the triangle apex limits downside to < 1% while capturing the trend.',
        traderVsInvestorInsight:
          'Trader: Fast momentum move to ₹1,590. Investor: Reinforces that banking sector accumulation is underway.',
        revealedCandles: [
          { time: '12:00', open: 1570, high: 1582, low: 1568, close: 1580, volume: 340000 },
          { time: '12:45', open: 1580, high: 1595, low: 1578, close: 1592, volume: 410000, annotation: 'Target ₹1,590 Hit' },
        ],
        pnlReturnPct: 2.8,
        keyRule: 'Squeeze Rule: Energy compressed in a triangle expands exponentially upon breakout. Trade in direction of the break.',
      },
      {
        id: 'hdfc-opt-fade',
        label: 'Short the breakout candle because "HDFC Bank usually fake-breaks"',
        role: 'Gambler/Trap',
        isCorrect: false,
        score: 15,
        feedbackTitle: 'Blown Out: Counter-Trend Mistake on Squeeze Expansion',
        explanation:
          'When volume confirms a breakout with 2.2x size, fading it is suicide. You are absorbing institutional buy orders.',
        traderVsInvestorInsight:
          'Never short without a bearish pin bar or divergence confirmation.',
        revealedCandles: [
          { time: '12:00', open: 1570, high: 1582, low: 1568, close: 1580, volume: 340000 },
          { time: '12:45', open: 1580, high: 1595, low: 1578, close: 1592, volume: 410000, annotation: 'Stop Out @ ₹1,585' },
        ],
        pnlReturnPct: -2.3,
        keyRule: 'Volume Validation: When volume doubles on a pattern break, respect the expansion.',
      },
    ],
    baseXP: 210,
    educationalTakeaway: {
      patternName: 'Symmetrical Triangle Volatility Expansion',
      marketPsychology:
        'Higher lows and lower highs represented buyer-seller equilibrium until fresh institutional liquidity arrived to decisively tilt the balance.',
      traderChecklist: [
        'Measure distance of triangle base to project target',
        'Verify volume expansion on breakout bar',
        'Stop loss at previous swing low or triangle midpoint',
      ],
      investorTakeaway:
        'Triangle consolidations in healthy bull markets are typically continuation structures.',
    },
  },
];

// Seed generator to guarantee deterministic challenge for a given calendar date
export function getDailyChallenge(date: Date = new Date()): DailyChallenge {
  // Format as YYYY-MM-DD
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateKey = `${y}-${m}-${d}`;

  // Deterministic index from date string sum
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash << 5) - hash + dateKey.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CHALLENGE_POOL.length;
  const challenge = CHALLENGE_POOL[index];

  return {
    ...challenge,
    id: `daily-${dateKey}`,
    dateKey,
  };
}

// Get streak multiplier based on streak count
export function getStreakMultiplier(streak: number): {
  multiplier: number;
  label: string;
  badge: string;
} {
  if (streak >= 7) {
    return { multiplier: 2.0, label: '2.0x XP (Legendary Streak)', badge: '⚡ Market Legend' };
  }
  if (streak >= 5) {
    return { multiplier: 1.5, label: '1.5x XP (Flame Veteran)', badge: '🔥 Flame Veteran' };
  }
  if (streak >= 3) {
    return { multiplier: 1.25, label: '1.25x XP (Streak Hot)', badge: '🔥 Hot Streak' };
  }
  return { multiplier: 1.0, label: '1.0x XP (Standard)', badge: '🌱 Novice Flame' };
}

// Format time remaining until midnight local reset
export function getTimeUntilNextDailyChallenge(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}
