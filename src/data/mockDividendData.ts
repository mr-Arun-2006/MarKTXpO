import { DividendRecord, StockData, WatchlistStockItem } from '../types/market';

export const INITIAL_DIVIDEND_RECORDS: DividendRecord[] = [];

export const DEFAULT_WATCHLIST_TICKERS: WatchlistStockItem[] = [];

// Live benchmark and government-bond yields are unavailable until a verified provider is configured.
export const INDIA_10Y_BOND_YIELD: number | null = null;
export const NIFTY50_AVG_DIVIDEND_YIELD: number | null = null;

// Helper function to classify dividend yield tier
export function getDividendYieldTier(yieldPercent: number): {
  tier: 'SUPER_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
  label: string;
  badgeClass: string;
} {
  if (yieldPercent >= 4.5) {
    return {
      tier: 'SUPER_HIGH',
      label: 'Super Yield (>4.5%)',
      badgeClass: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40 shadow-[0_0_8px_rgba(34,197,94,0.25)]',
    };
  }
  if (yieldPercent >= 2.5) {
    return {
      tier: 'HIGH',
      label: 'High Yield (2.5 - 4.5%)',
      badgeClass: 'bg-[#D96B43]/20 text-[#D96B43] border-[#D96B43]/45 shadow-[0_0_8px_rgba(217,107,67,0.25)]',
    };
  }
  if (yieldPercent >= 1.2) {
    return {
      tier: 'MODERATE',
      label: 'Moderate Yield (1.2 - 2.5%)',
      badgeClass: 'bg-[#8CB4E0]/15 text-[#8CB4E0] border-[#8CB4E0]/35',
    };
  }
  return {
    tier: 'LOW',
    label: 'Growth / Low Yield (<1.2%)',
    badgeClass: 'bg-[#F7EEDB]/10 text-[#F7EEDB]/60 border-[#F7EEDB]/20',
  };
}

// Generate calendar days for a given year & month (0-indexed month)
export interface CalendarDayInfo {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: DividendRecord[];
}

export function generateCalendarDays(year: number, month: number, records: DividendRecord[]): CalendarDayInfo[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const todayStr = new Date().toISOString().split('T')[0];

  // Starting weekday (0 = Sun, 1 = Mon ... 6 = Sat)
  const startingDay = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  // Days from previous month to pad the grid
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const calendarDays: CalendarDayInfo[] = [];

  // Previous month padding
  for (let i = startingDay - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const dateStr = prevDate.toISOString().split('T')[0];
    const events = records.filter((r) => r.exDate === dateStr || r.paymentDate === dateStr || r.recordDate === dateStr);
    calendarDays.push({
      date: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      events,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const currDate = new Date(year, month, d);
    const dateStr = currDate.toISOString().split('T')[0];
    const events = records.filter((r) => r.exDate === dateStr || r.paymentDate === dateStr || r.recordDate === dateStr);
    calendarDays.push({
      date: dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      events,
    });
  }

  // Next month padding to fill a complete 35 or 42 grid
  const remainingSlots = 35 - calendarDays.length;
  if (remainingSlots > 0) {
    for (let n = 1; n <= remainingSlots; n++) {
      const nextDate = new Date(year, month + 1, n);
      const dateStr = nextDate.toISOString().split('T')[0];
      const events = records.filter((r) => r.exDate === dateStr || r.paymentDate === dateStr || r.recordDate === dateStr);
      calendarDays.push({
        date: dateStr,
        dayNumber: n,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events,
      });
    }
  }

  return calendarDays;
}

// 12-Month Dividend Yield History & Consistency Models
export interface MonthlyDividendYield {
  month: string; // e.g. "Nov '25"
  monthShort: string; // e.g. "Nov"
  yieldPercent: number; // in %
  dividendPerShare?: number; // ₹ paid this month (if any)
  isPayoutMonth?: boolean;
}

export interface StockDividendConsistency {
  ticker: string;
  history12M: MonthlyDividendYield[];
  currentYield: number;
  minYield12M: number;
  maxYield12M: number;
  avgYield12M: number;
  payoutConsistencyScore: number; // 0 - 100%
  payoutsInLast12M: number;
  expectedPayoutsPerYear: number;
  trend: 'increasing' | 'stable' | 'decreasing' | 'cyclical';
  consistencyRating: 'Superior' | 'Strong' | 'Moderate' | 'Cyclical';
  consistencyLabel: string;
  cagr3YrPercent: number;
}

// Generates calibrated 12-month historical dividend yield trajectory and payout consistency
export function get12MonthDividendYieldHistory(
  ticker: string,
  baseYield = 0,
): StockDividendConsistency {
  // Do not synthesize payout dates or a yield curve. Only historical provider events are available.
  return {
    ticker,
    history12M: [],
    currentYield: baseYield,
    minYield12M: baseYield,
    maxYield12M: baseYield,
    avgYield12M: baseYield,
    payoutConsistencyScore: 0,
    payoutsInLast12M: 0,
    expectedPayoutsPerYear: 0,
    trend: 'cyclical',
    consistencyRating: 'Cyclical',
    consistencyLabel: 'Verified 12-month payout history unavailable',
    cagr3YrPercent: 0,
  };
}
