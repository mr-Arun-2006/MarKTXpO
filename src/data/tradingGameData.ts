export interface GameCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  annotation?: string;
}

export interface ScenarioOption {
  id: string;
  label: string;
  role: 'Trader' | 'Investor' | 'Gambler/Trap';
  isCorrect: boolean;
  score: number; // 0 to 100
  feedbackTitle: string;
  explanation: string;
  traderVsInvestorInsight: string;
  revealedCandles: GameCandle[];
  pnlReturnPct: number;
  keyRule: string;
}

export interface GameLevel {
  id: number;
  levelNumber: number;
  title: string;
  badgeName: string;
  conceptTag: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  stockTicker: string;
  stockName: string;
  timeframe: string;
  situationDescription: string;
  initialCandles: GameCandle[];
  supportLevel?: number;
  resistanceLevel?: number;
  ema20?: number[];
  question: string;
  options: ScenarioOption[];
  educationalGuide: {
    patternName: string;
    whatHappened: string;
    traderPlaybook: string;
    investorPlaybook: string;
    riskManagementTip: string;
  };
  xpReward: number;
}

export const GAME_LEVELS: GameLevel[] = [
  {
    id: 1,
    levelNumber: 1,
    title: 'The Bullish Breakout: Momentum Continuation',
    badgeName: 'Green Horn Surfer',
    conceptTag: 'Trend Following & Trailing Stops',
    difficulty: 'Beginner',
    stockTicker: 'RELIANCE',
    stockName: 'Reliance Industries Ltd.',
    timeframe: '15-Min Intraday',
    situationDescription:
      'RELIANCE has formed 3 consecutive full-bodied green candles (Three White Soldiers) breaking cleanly through morning resistance at ₹2,920. Volume is 1.8x the 20-period average, and the 20 EMA is pointing sharply upward.',
    supportLevel: 2915,
    resistanceLevel: 2950,
    initialCandles: [
      { time: '09:15', open: 2900, high: 2912, low: 2898, close: 2908, volume: 14000 },
      { time: '09:30', open: 2908, high: 2918, low: 2905, close: 2915, volume: 18000 },
      { time: '09:45', open: 2915, high: 2925, low: 2912, close: 2924, volume: 24000, annotation: 'Breakout Candle' },
      { time: '10:00', open: 2924, high: 2938, low: 2922, close: 2936, volume: 32000, annotation: 'Expanding Volume' },
      { time: '10:15', open: 2936, high: 2952, low: 2934, close: 2948, volume: 41000, annotation: '3rd Green Candle' },
    ],
    question:
      'The bull market candles are in a powerful uptrend. What is your NEXT MOVE as a disciplined market participant?',
    options: [
      {
        id: 'opt-1-ride',
        label: 'Enter Long / Hold with a Trailing Stop-Loss just below the 20 EMA',
        role: 'Trader',
        isCorrect: true,
        score: 100,
        feedbackTitle: 'Excellent Decision! Ride the Trend With Defined Risk',
        explanation:
          'In strong bullish momentum, you let winners run while letting a dynamic Trailing Stop Loss protect your open profits. Selling immediately cuts gains short, while shorting without a reversal trigger is the #1 beginner account killer.',
        traderVsInvestorInsight:
          'Trader Move: Trail stops below previous candle lows or 20 EMA. Investor Move: Hold core position and avoid emotional premature exits during institutional momentum.',
        revealedCandles: [
          { time: '10:30', open: 2948, high: 2962, low: 2945, close: 2958, volume: 39000 },
          { time: '10:45', open: 2958, high: 2975, low: 2955, close: 2972, volume: 45000, annotation: 'Target 1 Reached!' },
          { time: '11:00', open: 2972, high: 2980, low: 2968, close: 2978, volume: 29000 },
          { time: '11:15', open: 2978, high: 2985, low: 2974, close: 2982, volume: 25000 },
        ],
        pnlReturnPct: 3.8,
        keyRule: 'Rule of Trend: The trend is your friend until the bend at the end. Never fight strong green momentum.',
      },
      {
        id: 'opt-1-pullback',
        label: 'Wait for a Pullback / Retest toward ₹2,925 before placing fresh orders',
        role: 'Investor',
        isCorrect: true,
        score: 85,
        feedbackTitle: 'Smart Conservative Move! Patience Pays',
        explanation:
          'Waiting for a shallow pullback to prior broken resistance (now support) gives a superior Risk-to-Reward ratio (1:3+), preventing you from chasing at the exact high of a 3-candle extension.',
        traderVsInvestorInsight:
          'Investor Move: Scaling in on pullbacks lowers cost basis. Trader Note: If momentum is ultra-strong, the market might not pull back, leaving aggressive breakout traders ahead.',
        revealedCandles: [
          { time: '10:30', open: 2948, high: 2952, low: 2932, close: 2935, volume: 19000, annotation: 'Healthy Pullback' },
          { time: '10:45', open: 2935, high: 2950, low: 2930, close: 2948, volume: 31000, annotation: 'Support Retested' },
          { time: '11:00', open: 2948, high: 2970, low: 2945, close: 2968, volume: 38000 },
        ],
        pnlReturnPct: 2.9,
        keyRule: 'Rule of Patience: Never chase extended green candles. Buy the retest of support.',
      },
      {
        id: 'opt-1-short',
        label: 'Sell Short immediately because "It has gone up too much too fast"',
        role: 'Gambler/Trap',
        isCorrect: false,
        score: 10,
        feedbackTitle: 'Dangerous Trap! Never Stand in Front of a Freight Train',
        explanation:
          'Trying to pick the top of a fresh bull breakout without any bearish reversal pattern (like a Shooting Star or Bearish Engulfing) leads to catastrophic short squeezes.',
        traderVsInvestorInsight:
          'Institutional Reality: In strong uptrends, overbought conditions can stay overbought for hours or days as algorithms push liquidity higher.',
        revealedCandles: [
          { time: '10:30', open: 2948, high: 2968, low: 2947, close: 2965, volume: 42000, annotation: 'Short Squeeze!' },
          { time: '10:45', open: 2965, high: 2982, low: 2960, close: 2980, volume: 51000, annotation: 'Stop Out Triggered' },
        ],
        pnlReturnPct: -4.2,
        keyRule: 'Cardinal Sin: Do not short an asset merely because you think it is "too high". Price can always go higher.',
      },
      {
        id: 'opt-1-panic-exit',
        label: 'Sell 100% of your holdings right now to lock in small profit',
        role: 'Trader',
        isCorrect: false,
        score: 40,
        feedbackTitle: 'Premature Exit: Cutting Your Winners Short',
        explanation:
          'While booking profit feels safe, taking a 0.5% profit on a trade with 3% to 5% trend potential creates an asymmetrical negative expectancy over the long run.',
        traderVsInvestorInsight:
          'Pro Trader Tip: Sell 30-50% to take risk off the table, but leave the remaining 50% with a trailing stop to capture multi-bagger moves.',
        revealedCandles: [
          { time: '10:30', open: 2948, high: 2965, low: 2945, close: 2962, volume: 35000 },
          { time: '10:45', open: 2962, high: 2985, low: 2960, close: 2982, volume: 44000, annotation: 'Rallied ₹34 without you' },
        ],
        pnlReturnPct: 0.6,
        keyRule: 'Expectancy Principle: Let your winners run; cut your losers short. Never invert this equation.',
      },
    ],
    educationalGuide: {
      patternName: 'Three White Soldiers (Trend Continuation)',
      whatHappened:
        'Three consecutive bullish candles with higher closes, minimal upper wicks, and expanding volume show clear institutional accumulation.',
      traderPlaybook:
        'Keep long positions alive with trailing stops set 1 ATR or previous candle swing-low below current price.',
      investorPlaybook:
        'Do not panic-sell when fundamental triggers confirm technical price action. Add capital systematically.',
      riskManagementTip:
        'Risk no more than 1% to 2% of total portfolio capital on any single breakout trade.',
    },
    xpReward: 150,
  },

  {
    id: 2,
    levelNumber: 2,
    title: 'The Resistance Trap: Breakout vs. Fakeout',
    badgeName: 'Resistance Breaker',
    conceptTag: 'Support/Resistance & Confirmation',
    difficulty: 'Beginner',
    stockTicker: 'TCS',
    stockName: 'Tata Consultancy Services',
    timeframe: 'Daily Chart',
    situationDescription:
      'TCS has reached its heavy 6-month horizontal resistance at ₹4,150. A large green candle pushes into the resistance zone, but the trading day still has 45 minutes left before market close (3:30 PM).',
    supportLevel: 4050,
    resistanceLevel: 4150,
    initialCandles: [
      { time: 'Day -4', open: 4020, high: 4060, low: 4010, close: 4050, volume: 150000 },
      { time: 'Day -3', open: 4050, high: 4095, low: 4040, close: 4080, volume: 180000 },
      { time: 'Day -2', open: 4080, high: 4120, low: 4070, close: 4110, volume: 210000 },
      { time: 'Day -1', open: 4110, high: 4135, low: 4095, close: 4125, volume: 195000 },
      { time: 'Today', open: 4125, high: 4165, low: 4120, close: 4155, volume: 340000, annotation: 'Touching ₹4,150 Resistance' },
    ],
    question:
      'Price is piercing major resistance at ₹4,150 during live trade. What is your NEXT MOVE as a professional trader/investor?',
    options: [
      {
        id: 'opt-2-wait-close',
        label: 'Wait for the Daily Candle Close above ₹4,150 + Next-day confirmation before buying',
        role: 'Trader',
        isCorrect: true,
        score: 100,
        feedbackTitle: 'Master Trader Discipline! Avoiding Bull Traps',
        explanation:
          'Over 60% of intraday penetrations through major resistance fail by market close, leaving long upper wicks (bull traps). Waiting for the actual candle close filters out false breakouts.',
        traderVsInvestorInsight:
          'Trader: A candle is NOT a breakout until it closes beyond the line. Investor: Patiently setting limit orders on retest of confirmed levels preserves capital.',
        revealedCandles: [
          { time: '3:30 Close', open: 4155, high: 4165, low: 4130, close: 4135, volume: 490000, annotation: 'Failed to Close Above!' },
          { time: 'Next Day', open: 4130, high: 4140, low: 4085, close: 4090, volume: 380000, annotation: 'Rejection Confirmed' },
        ],
        pnlReturnPct: 0.0,
        keyRule: 'Breakout Law: Confirmation requires candle close. Intraday wicks are not confirmed breakouts.',
      },
      {
        id: 'opt-2-market-buy',
        label: 'Buy with 100% margin at the exact intraday high of ₹4,165',
        role: 'Gambler/Trap',
        isCorrect: false,
        score: 15,
        feedbackTitle: 'FOMO Victim: Caught in a Classic Bull Trap',
        explanation:
          'Buying directly into heavy resistance without confirmation is buying when institutional smart money is distributing to retail buyers.',
        traderVsInvestorInsight:
          'Psychology Check: The urge to buy instantly comes from fear of missing out (FOMO). Smart money waits for structural confirmation.',
        revealedCandles: [
          { time: '3:30 Close', open: 4155, high: 4165, low: 4130, close: 4135, volume: 490000, annotation: 'Upper Wick Bull Trap' },
          { time: 'Next Day', open: 4130, high: 4140, low: 4085, close: 4090, volume: 380000, annotation: '-₹75 Loss per share' },
        ],
        pnlReturnPct: -3.8,
        keyRule: 'Do not buy at resistance; buy at support or buy the confirmed retest of broken resistance.',
      },
      {
        id: 'opt-2-partial-profit',
        label: 'If already holding from ₹4,050, book partial profit (30-50%) into the resistance spike',
        role: 'Investor',
        isCorrect: true,
        score: 95,
        feedbackTitle: 'Top Tier Portfolio Strategy! Selling into Strength',
        explanation:
          'Taking partial profits into strong resistance guarantees gains while maintaining exposure in case a genuine breakout occurs later.',
        traderVsInvestorInsight:
          'Professional investors scale out into resistance and scale in at value support.',
        revealedCandles: [
          { time: '3:30 Close', open: 4155, high: 4165, low: 4130, close: 4135, volume: 490000 },
          { time: 'Next Day', open: 4130, high: 4140, low: 4085, close: 4090, volume: 380000, annotation: 'Cash secured at peak' },
        ],
        pnlReturnPct: 2.4,
        keyRule: 'Scale Out Rule: Sell half at resistance, trail stop to breakeven on the remainder.',
      },
    ],
    educationalGuide: {
      patternName: 'Bull Trap & Resistance Rejection',
      whatHappened:
        'A sharp intraday move above key resistance that fails to close above it creates a long upper shadow, signaling aggressive institutional selling.',
      traderPlaybook:
        'Always look for the closing price. If trading breakouts, place stop orders slightly above the high with an automatic stop loss.',
      investorPlaybook:
        'Do not chase large-cap tech stocks at 52-week highs without fundamental earnings expansion.',
      riskManagementTip:
        'When testing resistance, tighten stops on existing holdings to preserve unrealized gains.',
    },
    xpReward: 200,
  },

  {
    id: 3,
    levelNumber: 3,
    title: 'The Overbought Warning: RSI Divergence & Exhaustion Candle',
    badgeName: 'Divergence Detective',
    conceptTag: 'Momentum Oscillators & Pin Bars',
    difficulty: 'Intermediate',
    stockTicker: 'HDFCBANK',
    stockName: 'HDFC Bank Ltd.',
    timeframe: 'Daily Chart',
    situationDescription:
      'HDFCBANK rallied for 7 straight sessions from ₹1,420 to ₹1,540. Today it printed an inverted hammer / shooting star with a tall upper wick at ₹1,550. The 14-period RSI has crossed 82 (Extreme Overbought) and is making a lower high while price made a higher high.',
    supportLevel: 1480,
    resistanceLevel: 1550,
    initialCandles: [
      { time: 'Day -3', open: 1475, high: 1505, low: 1470, close: 1500, volume: 420000 },
      { time: 'Day -2', open: 1500, high: 1525, low: 1495, close: 1520, volume: 480000 },
      { time: 'Day -1', open: 1520, high: 1538, low: 1515, close: 1535, volume: 390000 },
      { time: 'Today', open: 1535, high: 1552, low: 1528, close: 1532, volume: 620000, annotation: 'Shooting Star + RSI 82' },
    ],
    question:
      'The chart displays an Exhaustion Shooting Star candle and Bearish RSI Divergence after a multi-day rally. What is your NEXT MOVE?',
    options: [
      {
        id: 'opt-3-tighten-trail',
        label: 'Tighten Trailing Stop-Loss to today\'s low (₹1,528) and book 50% profit',
        role: 'Trader',
        isCorrect: true,
        score: 100,
        feedbackTitle: 'Flawless Risk Management! Locking In the Peak',
        explanation:
          'When RSI reaches extreme overbought territory (>80) alongside a shooting star pattern, momentum is slowing down. Tightening your trailing stop to the low of the rejection candle protects the majority of profits.',
        traderVsInvestorInsight:
          'Trader: A break below ₹1,528 confirms the short-term top. Investor: Expect a healthy cooling period back toward the 20 EMA.',
        revealedCandles: [
          { time: 'Day +1', open: 1528, high: 1532, low: 1505, close: 1510, volume: 510000, annotation: 'Stop Triggered @ ₹1,528' },
          { time: 'Day +2', open: 1510, high: 1518, low: 1488, close: 1492, volume: 480000, annotation: 'RSI Cools to 55' },
          { time: 'Day +3', open: 1492, high: 1502, low: 1485, close: 1498, volume: 320000, annotation: 'Support Base Forms' },
        ],
        pnlReturnPct: 7.2,
        keyRule: 'Protect Peak Gains: Never let a massive 8% winner turn into a red trade when warning signals appear.',
      },
      {
        id: 'opt-3-buy-more',
        label: 'Add more shares because HDFC Bank is fundamentally strong and "can\'t fall"',
        role: 'Gambler/Trap',
        isCorrect: false,
        score: 20,
        feedbackTitle: 'Mistake: Buying at the Exhaustion Climax',
        explanation:
          'Even the best companies experience 3-5% cyclical pullbacks. Adding capital after 7 consecutive green days at RSI 82 is buying at maximum institutional selling pressure.',
        traderVsInvestorInsight:
          'Good Company ≠ Good Entry Price. Valuation and technical timing must align.',
        revealedCandles: [
          { time: 'Day +1', open: 1528, high: 1532, low: 1505, close: 1510, volume: 510000 },
          { time: 'Day +2', open: 1510, high: 1518, low: 1488, close: 1492, volume: 480000, annotation: '-₹40 drawdown' },
        ],
        pnlReturnPct: -2.8,
        keyRule: 'Momentum Law: What goes vertical eventually moves horizontal or pulls back.',
      },
    ],
    educationalGuide: {
      patternName: 'Shooting Star & Bearish Divergence',
      whatHappened:
        'Buyers pushed price to ₹1,552 intraday, but bears overwhelmed them by close, pushing price near the open and leaving a long upper wick.',
      traderPlaybook:
        'Aggressive short trades can be taken on a break of the shooting star low with a stop above the high.',
      investorPlaybook:
        'Hold existing core positions if holding for 3+ years, but halt fresh cash deployments until a support test.',
      riskManagementTip:
        'RSI > 80 does not mean short immediately, but it ALWAYS means do not initiate fresh aggressive breakout longs.',
    },
    xpReward: 250,
  },

  {
    id: 4,
    levelNumber: 4,
    title: 'The Golden Pullback: 20 EMA Hammer Bounce',
    badgeName: 'Pullback Sniper',
    conceptTag: 'Mean Reversion in Trend & Candlestick Hammers',
    difficulty: 'Intermediate',
    stockTicker: 'INFY',
    stockName: 'Infosys Ltd.',
    timeframe: 'Daily Chart',
    situationDescription:
      'INFY is in an established primary bull market. Over the last 3 days, it experienced a minor healthy consolidation from ₹1,680 down to ₹1,610, landing directly on the rising 20-day Exponential Moving Average. Today it printed a pristine Bullish Hammer with a long lower shadow (wick 2.5x body).',
    supportLevel: 1600,
    resistanceLevel: 1680,
    initialCandles: [
      { time: 'Day -3', open: 1675, high: 1682, low: 1655, close: 1660, volume: 180000 },
      { time: 'Day -2', open: 1660, high: 1665, low: 1630, close: 1635, volume: 160000 },
      { time: 'Day -1', open: 1635, high: 1640, low: 1612, close: 1615, volume: 140000, annotation: 'Light Volume Dip' },
      { time: 'Today', open: 1615, high: 1632, low: 1598, close: 1628, volume: 310000, annotation: 'Hammer on 20 EMA' },
    ],
    question:
      'A Bullish Hammer has formed right on the rising 20 EMA support with high volume rejection of lower prices. What is your NEXT MOVE?',
    options: [
      {
        id: 'opt-4-buy-hammer',
        label: 'Buy Long above the Hammer High (₹1,632) with Stop-Loss below the Hammer Wick (₹1,595)',
        role: 'Trader',
        isCorrect: true,
        score: 100,
        feedbackTitle: 'Textbook Execution! High Asymmetry Trade Setup',
        explanation:
          'This is the highest probability setup in trend trading: Primary Trend (Bullish) + Dynamic Support (20 EMA) + Reversal Candlestick (Hammer) + Tight Stop Loss (below ₹1,595). Risk is ₹37, Target is ₹80+ (1:2.2+ Risk-to-Reward).',
        traderVsInvestorInsight:
          'Trader: Enters on trigger break of ₹1,632. Investor: Excellent spot for SIP top-up or swing positioning.',
        revealedCandles: [
          { time: 'Day +1', open: 1633, high: 1655, low: 1630, close: 1650, volume: 350000, annotation: 'Trigger Hit!' },
          { time: 'Day +2', open: 1650, high: 1675, low: 1645, close: 1670, volume: 380000 },
          { time: 'Day +3', open: 1670, high: 1705, low: 1668, close: 1698, volume: 490000, annotation: 'Target Reached (₹1,698)' },
        ],
        pnlReturnPct: 4.3,
        keyRule: 'The Golden Setup: Strong trend + pullback to key moving average + hammer candle = High probability long.',
      },
      {
        id: 'opt-4-panic-sell',
        label: 'Sell and exit because "The stock dropped 3 days in a row and broke ₹1,600 intraday"',
        role: 'Gambler/Trap',
        isCorrect: false,
        score: 15,
        feedbackTitle: 'Retail Trap: Shaken Out at the Exact Bottom',
        explanation:
          'The intraday dip below ₹1,600 was a liquidity sweep by institutions to trigger retail stop losses before absorbing shares and pushing the hammer up.',
        traderVsInvestorInsight:
          'Focus on where the candle CLOSES, not where it temporarily dips during morning panic.',
        revealedCandles: [
          { time: 'Day +1', open: 1633, high: 1655, low: 1630, close: 1650, volume: 350000 },
          { time: 'Day +2', open: 1650, high: 1675, low: 1645, close: 1670, volume: 380000, annotation: 'Rallied ₹70 without you' },
        ],
        pnlReturnPct: -1.2,
        keyRule: 'Shakeout Psychology: Institutional smart money hunts stops at obvious round numbers (₹1,600). Watch the close.',
      },
    ],
    educationalGuide: {
      patternName: 'Bullish Hammer at 20 EMA',
      whatHappened:
        'Sellers tried to drive price lower early in the session, but buyers stepped in aggressively, bidding price back to close near the session high.',
      traderPlaybook:
        'Risk is predefined: Stop loss is placed 2-3 rupees below the lower shadow of the hammer.',
      investorPlaybook:
        'High quality blue chips testing the 20-day or 50-day moving average are prime opportunities to accumulate.',
      riskManagementTip:
        'Always ensure target is at least 2x the distance to your stop loss before entering.',
    },
    xpReward: 300,
  },

  {
    id: 5,
    levelNumber: 5,
    title: 'The 9:15 AM Opening Bell: Gap-Up Strategy',
    badgeName: 'Opening Bell Strategist',
    conceptTag: 'Opening Range Breakout (ORB) & Gap Psychology',
    difficulty: 'Advanced',
    stockTicker: 'TATAMOTORS',
    stockName: 'Tata Motors Ltd.',
    timeframe: '5-Min Intraday',
    situationDescription:
      'Tata Motors closed yesterday at ₹980. Following blockbuster global quarterly vehicle sales numbers, it opens at 9:15 AM with a huge 2.5% Gap Up at ₹1,005. Retail orders are rushing in with green frenzy in the pre-open.',
    supportLevel: 980,
    resistanceLevel: 1015,
    initialCandles: [
      { time: 'Yesterday', open: 975, high: 984, low: 972, close: 980, volume: 1200000 },
      { time: '09:15 Open', open: 1005, high: 1012, low: 1002, close: 1008, volume: 450000, annotation: '2.5% Gap Up' },
    ],
    question:
      'The market just opened with a massive gap up. Retail traders are blindly buying at market price. What is your NEXT MOVE as a seasoned student trader?',
    options: [
      {
        id: 'opt-5-orb-wait',
        label: 'Wait for the 15-Minute Opening Range (09:15 to 09:30) to establish High & Low before trading',
        role: 'Trader',
        isCorrect: true,
        score: 100,
        feedbackTitle: 'Exceptional Patience! The 15-Minute ORB Rule',
        explanation:
          'The first 15 minutes of the Indian market (09:15-09:30) are filled with overnight emotional orders and high spread slippage. Waiting for the Opening Range allows institutional volume to define clear support and resistance levels.',
        traderVsInvestorInsight:
          'Pro Rule: If 09:30 candle breaks above the 15-min high with volume, buy the continuation. If it breaks low, expect a gap fill toward ₹985.',
        revealedCandles: [
          { time: '09:20', open: 1008, high: 1014, low: 1004, close: 1010, volume: 380000 },
          { time: '09:25', open: 1010, high: 1015, low: 1006, close: 1013, volume: 320000, annotation: '15-Min High: ₹1,015' },
          { time: '09:30', open: 1013, high: 1024, low: 1012, close: 1022, volume: 680000, annotation: 'ORB Breakout Confirmed!' },
          { time: '09:35', open: 1022, high: 1032, low: 1020, close: 1030, volume: 550000, annotation: 'Target Reached (₹1,030)' },
        ],
        pnlReturnPct: 2.1,
        keyRule: 'Opening Bell Rule: Never execute market orders in the first 5 minutes. Let the opening range establish equilibrium.',
      },
      {
        id: 'opt-5-chase-market',
        label: 'Hit "BUY MARKET" at 09:15:02 AM with maximum leverage to capture the surge',
        role: 'Gambler/Trap',
        isCorrect: false,
        score: 10,
        feedbackTitle: 'Slippage & Trap Hazard! Chasing the Gap',
        explanation:
          'Entering market orders at 9:15 AM suffers from huge bid-ask spreads, broker queue delays, and frequent profit booking by overnight institutional players who sell into retail enthusiasm.',
        traderVsInvestorInsight:
          'Amateur traders buy at the open; professional traders observe the open and execute on confirmed structures.',
        revealedCandles: [
          { time: '09:20', open: 1008, high: 1014, low: 998, close: 1000, volume: 550000, annotation: 'Morning Flush to ₹998' },
        ],
        pnlReturnPct: -1.6,
        keyRule: 'Slippage Alert: Fast market execution at the opening tick gives the worst average fill price.',
      },
    ],
    educationalGuide: {
      patternName: 'Opening Range Breakout (ORB)',
      whatHappened:
        'A large overnight news catalyst caused a gap up. The initial 15-minute range establishes the boundaries between buyers and profit takers.',
      traderPlaybook:
        'Mark the 15-minute high and low. Enter in the direction of the breakout with a stop loss at the midpoint of the range.',
      investorPlaybook:
        'Long-term investors avoid buying on gap-up earnings days; they wait 2-3 trading days for post-earnings consolidation.',
      riskManagementTip:
        'Keep position size smaller on gap days because volatility (ATR) is elevated.',
    },
    xpReward: 350,
  },

  {
    id: 6,
    levelNumber: 6,
    title: 'The High-Dividend Value Shield: Cash Flow vs Capital Gains',
    badgeName: 'Dividend Sentinel',
    conceptTag: 'Dividend Yield Floor & Value Investing Strategy',
    difficulty: 'Advanced',
    stockTicker: 'COALINDIA',
    stockName: 'Coal India Ltd.',
    timeframe: 'Weekly Chart',
    situationDescription:
      'Coal India has a 7.8% Dividend Yield (surpassing the 10-Yr G-Sec bond rate of 6.95%). The stock is trading in a consolidation range at ₹440 with an Ex-Dividend date coming up in 18 days (₹15.50 DPS announced). The broader market is experiencing a mild correction.',
    supportLevel: 425,
    resistanceLevel: 475,
    initialCandles: [
      { time: 'Week -3', open: 450, high: 458, low: 438, close: 442, volume: 8500000 },
      { time: 'Week -2', open: 442, high: 446, low: 435, close: 440, volume: 6200000 },
      { time: 'Week -1', open: 440, high: 445, low: 436, close: 438, volume: 5900000 },
      { time: 'This Week', open: 438, high: 448, low: 437, close: 445, volume: 11000000, annotation: '₹15.50 Dividend Announced' },
    ],
    question:
      'You are managing an investment portfolio. Broader index is volatile, but Coal India offers 7.8% yield and solid cash flows. What is your NEXT MOVE as an investor vs trader?',
    options: [
      {
        id: 'opt-6-dividend-accumulate',
        label: 'Investor Move: Accumulate shares before the Record Date for high cash flow yield + capital appreciation',
        role: 'Investor',
        isCorrect: true,
        score: 100,
        feedbackTitle: 'Outstanding Value Investing Strategy!',
        explanation:
          'High dividend yield acts as a structural price floor because institutional yield-seekers bid up the stock before the record date. Collecting the ₹15.50 DPS while holding at key value support generates passive income and downside protection.',
        traderVsInvestorInsight:
          'Investor Move: Reinvest dividends to harness the 8th wonder of the world (Compounding). Trader Move: Trade the pre-dividend run-up and exit just before the ex-date.',
        revealedCandles: [
          { time: 'Week +1', open: 445, high: 462, low: 444, close: 458, volume: 14000000, annotation: 'Pre-Ex Run-Up' },
          { time: 'Week +2', open: 458, high: 474, low: 455, close: 470, volume: 16500000, annotation: 'Ex-Date: ₹15.50 credited' },
        ],
        pnlReturnPct: 6.8,
        keyRule: 'Dividend Floor Principle: Stocks with 7%+ sustainable payout yields resist severe market crashes.',
      },
      {
        id: 'opt-6-ignore',
        label: 'Ignore the stock completely because "PSU dividend stocks never grow"',
        role: 'Gambler/Trap',
        isCorrect: false,
        score: 25,
        feedbackTitle: 'Flawed Perspective: Overlooking Total Shareholder Return (TSR)',
        explanation:
          'Total Return consists of Capital Gains + Reinvested Dividends. High dividend stocks often beat high-flying speculative stocks over full economic cycles.',
        traderVsInvestorInsight:
          'Smart money treats high-yield dividend champions as synthetic high-yield corporate bonds with equity upside.',
        revealedCandles: [
          { time: 'Week +1', open: 445, high: 462, low: 444, close: 458, volume: 14000000 },
          { time: 'Week +2', open: 458, high: 474, low: 455, close: 470, volume: 16500000, annotation: '+₹25 Gain + ₹15.50 Cash' },
        ],
        pnlReturnPct: 0.0,
        keyRule: 'Total Return Mindset: Always calculate Dividend Yield + EPS Growth = Total Expected Return.',
      },
    ],
    educationalGuide: {
      patternName: 'Pre-Dividend Run-Up & Yield Support',
      whatHappened:
        'When a dividend record date is scheduled, retail and mutual funds accumulate shares to capture the payout, creating steady upward price drift.',
      traderPlaybook:
        'Buy 2-3 weeks before the ex-date; sell 1-2 days before the ex-date to capture capital appreciation without waiting for ex-date dividend tax.',
      investorPlaybook:
        'Hold across ex-date, deposit cash payout into high-dividend reinvestment plan (DRIP).',
      riskManagementTip:
        'Check Payout Ratio (< 70% is safe). Ensure dividend is paid from real operating free cash flow, not debt.',
    },
    xpReward: 400,
  },
];

export interface FlashcardPattern {
  id: string;
  name: string;
  type: 'Bullish' | 'Bearish' | 'Neutral/Indecision';
  visualSvg: string; // Type identifier for visual candle rendering
  reliabilityScore: number; // 1-100
  description: string;
  howToTrade: string;
  sampleCandles: { open: number; high: number; low: number; close: number }[];
}

export const FLASHCARD_PATTERNS: FlashcardPattern[] = [
  {
    id: 'pat-hammer',
    name: 'Bullish Hammer',
    type: 'Bullish',
    visualSvg: 'hammer',
    reliabilityScore: 84,
    description: 'Small upper body with a long lower wick (at least 2x the body length) occurring after a downtrend.',
    howToTrade: 'Buy when the next candle breaks above the hammer body. Place stop-loss 1-2 points below the lower shadow.',
    sampleCandles: [
      { open: 105, high: 106, low: 98, close: 100 },
      { open: 100, high: 101, low: 90, close: 99 }, // Hammer
    ],
  },
  {
    id: 'pat-bullish-engulfing',
    name: 'Bullish Engulfing',
    type: 'Bullish',
    visualSvg: 'bullish_engulfing',
    reliabilityScore: 88,
    description: 'A small red candle completely engulfed by a large green candle that opens lower and closes higher.',
    howToTrade: 'Strong reversal trigger. Enter at close of green candle or retest of its midpoint with stop below the low.',
    sampleCandles: [
      { open: 100, high: 101, low: 95, close: 96 },
      { open: 94, high: 105, low: 93, close: 104 }, // Engulfing
    ],
  },
  {
    id: 'pat-shooting-star',
    name: 'Shooting Star (Bearish Reversal)',
    type: 'Bearish',
    visualSvg: 'shooting_star',
    reliabilityScore: 82,
    description: 'Small body near the bottom of the range with a long upper wick occurring at the top of an uptrend.',
    howToTrade: 'Exit longs or initiate short positions on break below the shooting star low with stop above the high wick.',
    sampleCandles: [
      { open: 95, high: 100, low: 94, close: 99 },
      { open: 100, high: 110, low: 99, close: 101 }, // Shooting star
    ],
  },
  {
    id: 'pat-morning-star',
    name: 'Morning Star (3-Candle Reversal)',
    type: 'Bullish',
    visualSvg: 'morning_star',
    reliabilityScore: 92,
    description: 'Large red candle, followed by a small-bodied indecision star (gap down), followed by a large green candle.',
    howToTrade: 'One of the most reliable bottom reversal patterns. Buy on close of the 3rd candle.',
    sampleCandles: [
      { open: 110, high: 111, low: 98, close: 100 },
      { open: 97, high: 99, low: 95, close: 96 },
      { open: 98, high: 109, low: 97, close: 108 },
    ],
  },
  {
    id: 'pat-doji',
    name: 'Doji (Market Indecision)',
    type: 'Neutral/Indecision',
    visualSvg: 'doji',
    reliabilityScore: 75,
    description: 'Open and close prices are virtually identical, showing fierce equilibrium between bulls and bears.',
    howToTrade: 'Wait for the following candle to confirm direction. Do not trade a lonely Doji without confirmation.',
    sampleCandles: [
      { open: 100, high: 105, low: 95, close: 100.2 },
    ],
  },
];
