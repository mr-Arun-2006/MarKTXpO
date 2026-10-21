import { DividendRecord, StockData, WatchlistStockItem } from '../types/market';

export const INITIAL_DIVIDEND_RECORDS: DividendRecord[] = [
  {
    id: 'div-coalindia-2026-1',
    ticker: 'COALINDIA',
    companyName: 'Coal India Ltd.',
    bseCode: '533278',
    sector: 'Metals & Mining',
    exDate: '2026-11-06',
    recordDate: '2026-11-07',
    paymentDate: '2026-11-28',
    dividendPerShare: 18.50,
    dividendYield: 5.25,
    type: 'Interim',
    financialYear: 'FY 2026-27',
    status: 'Upcoming',
    payoutRatio: 68.4,
    remarks: '1st Interim Dividend recommended by Board with record thermal dispatches.',
  },
  {
    id: 'div-vedl-2026-3',
    ticker: 'VEDL',
    companyName: 'Vedanta Ltd.',
    bseCode: '500295',
    sector: 'Metals & Mining',
    exDate: '2026-11-12',
    recordDate: '2026-11-13',
    paymentDate: '2026-12-02',
    dividendPerShare: 22.00,
    dividendYield: 6.10,
    type: 'Interim',
    financialYear: 'FY 2026-27',
    status: 'Upcoming',
    payoutRatio: 74.2,
    remarks: '3rd Interim dividend declared from strong zinc and aluminium cash generation.',
  },
  {
    id: 'div-ioc-2026-1',
    ticker: 'IOC',
    companyName: 'Indian Oil Corporation',
    bseCode: '530965',
    sector: 'Oil & Gas',
    exDate: '2026-11-18',
    recordDate: '2026-11-19',
    paymentDate: '2026-12-08',
    dividendPerShare: 8.00,
    dividendYield: 5.80,
    type: 'Interim',
    financialYear: 'FY 2026-27',
    status: 'Upcoming',
    payoutRatio: 62.0,
    remarks: 'Interim cash distribution driven by strong refining margins.',
  },
  {
    id: 'div-ongc-2026-1',
    ticker: 'ONGC',
    companyName: 'Oil & Natural Gas Corp',
    bseCode: '500312',
    sector: 'Oil & Gas',
    exDate: '2026-11-24',
    recordDate: '2026-11-25',
    paymentDate: '2026-12-15',
    dividendPerShare: 11.25,
    dividendYield: 4.25,
    type: 'Interim',
    financialYear: 'FY 2026-27',
    status: 'Upcoming',
    payoutRatio: 48.5,
    remarks: '1st Interim dividend following KG-DWN offshore crude ramp-up.',
  },
  {
    id: 'div-powergrid-2026-1',
    ticker: 'POWERGRID',
    companyName: 'Power Grid Corp of India',
    bseCode: '532898',
    sector: 'Utilities & Power',
    exDate: '2026-11-27',
    recordDate: '2026-11-28',
    paymentDate: '2026-12-18',
    dividendPerShare: 5.50,
    dividendYield: 3.90,
    type: 'Interim',
    financialYear: 'FY 2026-27',
    status: 'Upcoming',
    payoutRatio: 65.0,
    remarks: 'Regulated tariff return ensuring defensive high payout predictability.',
  },
  {
    id: 'div-ntpc-2026-1',
    ticker: 'NTPC',
    companyName: 'NTPC Ltd.',
    bseCode: '532555',
    sector: 'Utilities & Power',
    exDate: '2026-12-03',
    recordDate: '2026-12-04',
    paymentDate: '2026-12-23',
    dividendPerShare: 4.25,
    dividendYield: 3.10,
    type: 'Interim',
    financialYear: 'FY 2026-27',
    status: 'Announced',
    payoutRatio: 42.0,
    remarks: 'Interim dividend approved ahead of renewable energy subsidiary IPO.',
  },
  {
    id: 'div-itc-2026-1',
    ticker: 'ITC',
    companyName: 'ITC Ltd.',
    bseCode: '500875',
    sector: 'Consumer FMCG',
    exDate: '2026-12-10',
    recordDate: '2026-12-11',
    paymentDate: '2026-12-30',
    dividendPerShare: 7.75,
    dividendYield: 2.85,
    type: 'Interim',
    financialYear: 'FY 2026-27',
    status: 'Announced',
    payoutRatio: 82.5,
    remarks: 'Interim dividend following hotels business demerger completion.',
  },
  {
    id: 'div-hcltech-2026-3',
    ticker: 'HCLTECH',
    companyName: 'HCL Technologies Ltd.',
    bseCode: '532281',
    sector: 'Information Tech',
    exDate: '2026-12-16',
    recordDate: '2026-12-17',
    paymentDate: '2027-01-05',
    dividendPerShare: 14.00,
    dividendYield: 3.40,
    type: 'Interim',
    financialYear: 'FY 2026-27',
    status: 'Announced',
    payoutRatio: 86.0,
    remarks: 'Quarterly payout commitment reaffirmed with $14/share dividend.',
  },
  {
    id: 'div-tcs-2026-special',
    ticker: 'TCS',
    companyName: 'Tata Consultancy Services',
    bseCode: '532540',
    sector: 'Information Tech',
    exDate: '2027-01-08',
    recordDate: '2027-01-09',
    paymentDate: '2027-01-26',
    dividendPerShare: 24.00,
    dividendYield: 1.85,
    type: 'Special',
    financialYear: 'FY 2026-27',
    status: 'Announced',
    payoutRatio: 78.0,
    remarks: 'Special dividend celebrating 20 years of public listing & cash return.',
  },
  {
    id: 'div-infy-2026-interim',
    ticker: 'INFY',
    companyName: 'Infosys Ltd.',
    bseCode: '500209',
    sector: 'Information Tech',
    exDate: '2026-10-29',
    recordDate: '2026-10-30',
    paymentDate: '2026-11-20',
    dividendPerShare: 21.00,
    dividendYield: 2.10,
    type: 'Interim',
    financialYear: 'FY 2026-27',
    status: 'Upcoming',
    payoutRatio: 65.0,
    remarks: 'Interim payout as free cash flow generation reached $820M.',
  },
  {
    id: 'div-techm-2026-1',
    ticker: 'TECHM',
    companyName: 'Tech Mahindra Ltd.',
    bseCode: '532755',
    sector: 'Information Tech',
    exDate: '2026-11-05',
    recordDate: '2026-11-06',
    paymentDate: '2026-11-26',
    dividendPerShare: 15.00,
    dividendYield: 2.30,
    type: 'Interim',
    financialYear: 'FY 2026-27',
    status: 'Upcoming',
    payoutRatio: 70.0,
    remarks: 'Turnaround strategy driving higher quarterly capital returns to investors.',
  },
  {
    id: 'div-hindzinc-2026-special',
    ticker: 'HINDZINC',
    companyName: 'Hindustan Zinc Ltd.',
    bseCode: '500188',
    sector: 'Metals & Mining',
    exDate: '2026-12-22',
    recordDate: '2026-12-23',
    paymentDate: '2027-01-14',
    dividendPerShare: 28.00,
    dividendYield: 5.90,
    type: 'Special',
    financialYear: 'FY 2026-27',
    status: 'Announced',
    payoutRatio: 88.0,
    remarks: 'Large special dividend approved using accumulated reserves.',
  },
  {
    id: 'div-recltd-2026-2',
    ticker: 'RECLTD',
    companyName: 'REC Ltd.',
    bseCode: '532955',
    sector: 'Financials & NBFC',
    exDate: '2026-11-15',
    recordDate: '2026-11-16',
    paymentDate: '2026-12-05',
    dividendPerShare: 4.50,
    dividendYield: 4.80,
    type: 'Interim',
    financialYear: 'FY 2026-27',
    status: 'Upcoming',
    payoutRatio: 46.0,
    remarks: '2nd Interim dividend supported by record power disbursements.',
  },
  {
    id: 'div-pfc-2026-2',
    ticker: 'PFC',
    companyName: 'Power Finance Corporation',
    bseCode: '532810',
    sector: 'Financials & NBFC',
    exDate: '2026-11-20',
    recordDate: '2026-11-21',
    paymentDate: '2026-12-10',
    dividendPerShare: 4.00,
    dividendYield: 4.60,
    type: 'Interim',
    financialYear: 'FY 2026-27',
    status: 'Upcoming',
    payoutRatio: 44.0,
    remarks: 'Strong quarterly loan growth and lowest NPA levels in 5 years.',
  },
  {
    id: 'div-hdfc-2026-final',
    ticker: 'HDFCBANK',
    companyName: 'HDFC Bank Ltd.',
    bseCode: '500180',
    sector: 'Banking & Financials',
    exDate: '2026-06-25',
    recordDate: '2026-06-26',
    paymentDate: '2026-07-15',
    dividendPerShare: 19.50,
    dividendYield: 1.15,
    type: 'Final',
    financialYear: 'FY 2025-26',
    status: 'Paid',
    payoutRatio: 22.0,
    remarks: 'Annual dividend credited to shareholders post AGM confirmation.',
  },
  {
    id: 'div-icici-2026-final',
    ticker: 'ICICIBANK',
    companyName: 'ICICI Bank Ltd.',
    bseCode: '532174',
    sector: 'Banking & Financials',
    exDate: '2026-07-02',
    recordDate: '2026-07-03',
    paymentDate: '2026-07-22',
    dividendPerShare: 10.00,
    dividendYield: 0.85,
    type: 'Final',
    financialYear: 'FY 2025-26',
    status: 'Paid',
    payoutRatio: 18.0,
    remarks: 'Full year dividend paid with capital adequacy ratio at 16.8%.',
  },
  {
    id: 'div-reliance-2026-final',
    ticker: 'RELIANCE',
    companyName: 'Reliance Industries Ltd.',
    bseCode: '500325',
    sector: 'Energy & Telecom',
    exDate: '2026-08-19',
    recordDate: '2026-08-20',
    paymentDate: '2026-09-08',
    dividendPerShare: 10.00,
    dividendYield: 0.38,
    type: 'Final',
    financialYear: 'FY 2025-26',
    status: 'Paid',
    payoutRatio: 12.0,
    remarks: 'Approved at annual AGM alongside retail/telecom updates.',
  },
  {
    id: 'div-sbin-2026-final',
    ticker: 'SBIN',
    companyName: 'State Bank of India',
    bseCode: '500112',
    sector: 'Banking & Financials',
    exDate: '2026-05-22',
    recordDate: '2026-05-23',
    paymentDate: '2026-06-12',
    dividendPerShare: 13.70,
    dividendYield: 1.62,
    type: 'Final',
    financialYear: 'FY 2025-26',
    status: 'Paid',
    payoutRatio: 21.5,
    remarks: 'Record net profit of ₹61,000 Cr in FY26 driving higher payout.',
  },
  {
    id: 'div-lt-2026-final',
    ticker: 'LT',
    companyName: 'Larsen & Toubro Ltd.',
    bseCode: '500510',
    sector: 'Capital Goods',
    exDate: '2026-07-16',
    recordDate: '2026-07-17',
    paymentDate: '2026-08-04',
    dividendPerShare: 28.00,
    dividendYield: 0.95,
    type: 'Final',
    financialYear: 'FY 2025-26',
    status: 'Paid',
    payoutRatio: 32.0,
    remarks: 'Final dividend alongside ₹10,000 Cr share buyback tranche.',
  },
  {
    id: 'div-bharti-2026-final',
    ticker: 'BHARTIARTL',
    companyName: 'Bharti Airtel Ltd.',
    bseCode: '532454',
    sector: 'Telecom',
    exDate: '2026-08-05',
    recordDate: '2026-08-06',
    paymentDate: '2026-08-25',
    dividendPerShare: 8.00,
    dividendYield: 0.65,
    type: 'Final',
    financialYear: 'FY 2025-26',
    status: 'Paid',
    payoutRatio: 24.0,
    remarks: 'ARPU expanded to ₹235 driving free cash generation.',
  },
  {
    id: 'div-tatamotors-2026-final',
    ticker: 'TATAMOTORS',
    companyName: 'Tata Motors Passenger Vehicles',
    bseCode: '500570',
    sector: 'Automobile',
    exDate: '2026-06-11',
    recordDate: '2026-06-12',
    paymentDate: '2026-07-01',
    dividendPerShare: 6.00,
    dividendYield: 0.85,
    type: 'Final',
    financialYear: 'FY 2025-26',
    status: 'Paid',
    payoutRatio: 26.0,
    remarks: 'First regular dividend cycle post demerger and net debt elimination.',
  },
];

// Initial default watchlist stocks (focused on high dividend & core Indian champions)
export const DEFAULT_WATCHLIST_TICKERS: WatchlistStockItem[] = [
  { ticker: 'COALINDIA', addedAt: '2026-10-01', sharesHeld: 150, customTargetYield: 5.0, notes: 'PSU high dividend anchor' },
  { ticker: 'VEDL', addedAt: '2026-10-02', sharesHeld: 100, customTargetYield: 6.0, notes: 'Commodity cycle cash flow' },
  { ticker: 'ITC', addedAt: '2026-10-05', sharesHeld: 120, customTargetYield: 3.0, notes: 'FMCG cash cow' },
  { ticker: 'HCLTECH', addedAt: '2026-10-08', sharesHeld: 50, customTargetYield: 3.2, notes: 'Quarterly payout consistency' },
  { ticker: 'TCS', addedAt: '2026-10-10', sharesHeld: 30, customTargetYield: 2.0, notes: 'Blue chip IT Compounder' },
  { ticker: 'INFY', addedAt: '2026-10-12', sharesHeld: 60, customTargetYield: 2.2, notes: 'High FCF return to holders' },
  { ticker: 'HDFCBANK', addedAt: '2026-10-15', sharesHeld: 80, customTargetYield: 1.5, notes: 'Core banking allocation' },
  { ticker: 'RELIANCE', addedAt: '2026-10-18', sharesHeld: 40, customTargetYield: 1.0, notes: 'Broad market leader' },
];

// 10-Yr Indian Government Bond Yield benchmark for dividend yield comparison
export const INDIA_10Y_BOND_YIELD = 6.82; // in %
export const NIFTY50_AVG_DIVIDEND_YIELD = 1.25; // in %

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
  baseYield = 2.0
): StockDividendConsistency {
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const years = ['25', '25', '26', '26', '26', '26', '26', '26', '26', '26', '26', '26'];

  // Specific payout months and consistency calibrations for core Indian stocks
  const tickerProfiles: Record<
    string,
    {
      payoutMonths: number[]; // indices 0-11
      consistencyScore: number;
      expectedPayouts: number;
      trend: 'increasing' | 'stable' | 'decreasing' | 'cyclical';
      rating: 'Superior' | 'Strong' | 'Moderate' | 'Cyclical';
      label: string;
      cagr: number;
      yieldShift: number[];
    }
  > = {
    COALINDIA: {
      payoutMonths: [0, 3, 8], // Nov, Feb, Jul
      consistencyScore: 98,
      expectedPayouts: 3,
      trend: 'increasing',
      rating: 'Superior',
      label: '98% High Payout Reliability',
      cagr: 16.4,
      yieldShift: [-0.35, -0.2, -0.15, 0.1, 0.05, 0.0, -0.1, 0.15, 0.25, 0.1, 0.05, 0],
    },
    VEDL: {
      payoutMonths: [0, 4, 7, 10], // Nov, Mar, Jun, Sep
      consistencyScore: 92,
      expectedPayouts: 4,
      trend: 'cyclical',
      rating: 'Strong',
      label: '92% Robust Commodity Cash Flow',
      cagr: 22.1,
      yieldShift: [0.4, 0.2, -0.1, -0.3, 0.2, 0.1, -0.2, 0.3, 0.1, -0.1, 0.2, 0],
    },
    ITC: {
      payoutMonths: [3, 8], // Feb, Jul
      consistencyScore: 100,
      expectedPayouts: 2,
      trend: 'increasing',
      rating: 'Superior',
      label: '100% Unbroken Aristocrat Record',
      cagr: 12.8,
      yieldShift: [-0.2, -0.15, -0.1, 0.1, 0.05, 0.0, -0.05, 0.1, 0.15, 0.05, 0.0, 0],
    },
    HCLTECH: {
      payoutMonths: [0, 2, 5, 8], // Nov, Jan, Apr, Jul
      consistencyScore: 100,
      expectedPayouts: 4,
      trend: 'increasing',
      rating: 'Superior',
      label: '100% Disciplined Quarterly Payer',
      cagr: 18.2,
      yieldShift: [-0.25, -0.2, -0.1, 0.05, 0.1, 0.0, -0.05, 0.15, 0.2, 0.1, 0.05, 0],
    },
    TCS: {
      payoutMonths: [2, 5, 8, 11], // Jan, Apr, Jul, Oct
      consistencyScore: 100,
      expectedPayouts: 4,
      trend: 'stable',
      rating: 'Superior',
      label: '100% Bluechip Cash Machine',
      cagr: 14.5,
      yieldShift: [-0.1, -0.05, 0.05, 0.0, -0.05, 0.1, 0.05, 0.0, 0.05, -0.05, 0.0, 0],
    },
    INFY: {
      payoutMonths: [0, 7], // Nov, Jun
      consistencyScore: 96,
      expectedPayouts: 2,
      trend: 'increasing',
      rating: 'Superior',
      label: '96% Free Cash Return Policy',
      cagr: 13.9,
      yieldShift: [-0.18, -0.12, -0.08, 0.0, -0.05, 0.05, 0.1, 0.15, 0.08, 0.02, 0.0, 0],
    },
    POWERGRID: {
      payoutMonths: [0, 3, 8], // Nov, Feb, Jul
      consistencyScore: 96,
      expectedPayouts: 3,
      trend: 'stable',
      rating: 'Superior',
      label: '96% Regulated Utility Cash Flow',
      cagr: 11.2,
      yieldShift: [-0.15, -0.1, 0.0, 0.05, 0.0, -0.05, 0.0, 0.1, 0.05, 0.0, 0.0, 0],
    },
    NTPC: {
      payoutMonths: [0, 3, 9], // Nov, Feb, Aug
      consistencyScore: 94,
      expectedPayouts: 3,
      trend: 'increasing',
      rating: 'Superior',
      label: '94% Clean Energy & PSU Cash',
      cagr: 15.1,
      yieldShift: [-0.2, -0.15, -0.05, 0.05, 0.0, -0.05, 0.0, 0.1, 0.15, 0.05, 0.0, 0],
    },
    IOC: {
      payoutMonths: [0, 4, 8], // Nov, Mar, Jul
      consistencyScore: 88,
      expectedPayouts: 3,
      trend: 'cyclical',
      rating: 'Strong',
      label: '88% High Refining Payout Yield',
      cagr: 19.3,
      yieldShift: [0.3, 0.15, -0.1, -0.25, 0.1, 0.0, -0.15, 0.2, 0.1, -0.05, 0.0, 0],
    },
    HINDZINC: {
      payoutMonths: [1, 6, 11], // Dec, May, Oct
      consistencyScore: 86,
      expectedPayouts: 3,
      trend: 'cyclical',
      rating: 'Strong',
      label: '86% High Reserves Distribution',
      cagr: 24.5,
      yieldShift: [0.45, 0.2, -0.15, -0.3, 0.15, 0.05, -0.2, 0.25, 0.1, -0.1, 0.05, 0],
    },
    RECLTD: {
      payoutMonths: [0, 3, 8], // Nov, Feb, Jul
      consistencyScore: 95,
      expectedPayouts: 3,
      trend: 'increasing',
      rating: 'Superior',
      label: '95% Infra Lending High Dividend',
      cagr: 17.8,
      yieldShift: [-0.3, -0.2, -0.1, 0.05, 0.1, 0.0, -0.05, 0.15, 0.2, 0.1, 0.05, 0],
    },
    PFC: {
      payoutMonths: [0, 3, 8], // Nov, Feb, Jul
      consistencyScore: 94,
      expectedPayouts: 3,
      trend: 'increasing',
      rating: 'Superior',
      label: '94% Power Lending Consistency',
      cagr: 16.9,
      yieldShift: [-0.28, -0.18, -0.08, 0.05, 0.08, 0.0, -0.05, 0.12, 0.18, 0.08, 0.04, 0],
    },
  };

  const profile = tickerProfiles[ticker] || {
    payoutMonths: [2, 8],
    consistencyScore: Math.round(85 + ((baseYield * 7) % 12)),
    expectedPayouts: baseYield > 2.5 ? 3 : 2,
    trend: baseYield > 2.5 ? 'increasing' : 'stable',
    rating: (baseYield > 2.5 ? 'Superior' : 'Strong') as 'Superior' | 'Strong',
    label: `${Math.round(85 + ((baseYield * 7) % 12))}% Stable Distribution`,
    cagr: Math.round((8 + baseYield * 2.5) * 10) / 10,
    yieldShift: [-0.15, -0.1, -0.05, 0.02, 0.05, -0.02, 0.04, 0.08, 0.02, -0.03, 0.01, 0],
  };

  const history12M: MonthlyDividendYield[] = months.map((m, idx) => {
    const shift = profile.yieldShift[idx] ?? 0;
    const computedYield = Math.max(0.1, Math.round((baseYield + shift) * 100) / 100);
    const isPayout = profile.payoutMonths.includes(idx);
    const dps = isPayout
      ? Math.round((computedYield * 14.5 * (1 + Math.sin(idx) * 0.2)) * 10) / 10
      : undefined;

    return {
      month: `${m} '${years[idx]}`,
      monthShort: m,
      yieldPercent: computedYield,
      dividendPerShare: dps,
      isPayoutMonth: isPayout,
    };
  });

  const allYields = history12M.map((h) => h.yieldPercent);
  const minYield12M = Math.min(...allYields);
  const maxYield12M = Math.max(...allYields);
  const avgYield12M = Math.round((allYields.reduce((a, b) => a + b, 0) / allYields.length) * 100) / 100;

  return {
    ticker,
    history12M,
    currentYield: baseYield,
    minYield12M,
    maxYield12M,
    avgYield12M,
    payoutConsistencyScore: profile.consistencyScore,
    payoutsInLast12M: profile.payoutMonths.length,
    expectedPayoutsPerYear: profile.expectedPayouts,
    trend: profile.trend,
    consistencyRating: profile.rating,
    consistencyLabel: profile.label,
    cagr3YrPercent: profile.cagr,
  };
}
