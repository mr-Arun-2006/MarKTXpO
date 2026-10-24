import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Users table (keyed on Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('user').notNull(),
  language: text('language').default('en').notNull(),
  totalXP: integer('total_xp').default(100).notNull(),
  virtualCapital: doublePrecision('virtual_capital').default(1000000).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Watchlist table
export const watchlist = pgTable('watchlist', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  ticker: text('ticker').notNull(),
  stockName: text('stock_name').notNull(),
  exchange: text('exchange').default('NSE').notNull(),
  targetPrice: doublePrecision('target_price'),
  notes: text('notes'),
  addedAt: timestamp('added_at').defaultNow().notNull(),
});

// Portfolio & Paper Trades table
export const portfolio = pgTable('portfolio', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  ticker: text('ticker').notNull(),
  stockName: text('stock_name').notNull(),
  type: text('type').default('BUY').notNull(), // BUY or SHORT
  shares: integer('shares').notNull(),
  entryPrice: doublePrecision('entry_price').notNull(),
  stopLoss: doublePrecision('stop_loss'),
  targetPrice: doublePrecision('target_price'),
  isPaperTrade: boolean('is_paper_trade').default(true).notNull(),
  status: text('status').default('OPEN').notNull(), // OPEN or CLOSED
  createdAt: timestamp('created_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
});

// Trade & Volatility Alerts table
export const tradeAlerts = pgTable('trade_alerts', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  ticker: text('ticker').notNull(),
  condition: text('condition').notNull(), // ABOVE, BELOW, ARBITRAGE_SPREAD, VOLATILITY_EXPANSION
  threshold: doublePrecision('threshold').notNull(),
  intradayRange: doublePrecision('intraday_range'),
  average14DayRange: doublePrecision('average_14_day_range'),
  expansionRatio: doublePrecision('expansion_ratio'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  watchlist: many(watchlist),
  portfolio: many(portfolio),
  tradeAlerts: many(tradeAlerts),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.uid],
  }),
}));

export const portfolioRelations = relations(portfolio, ({ one }) => ({
  user: one(users, {
    fields: [portfolio.userId],
    references: [users.uid],
  }),
}));

export const tradeAlertsRelations = relations(tradeAlerts, ({ one }) => ({
  user: one(users, {
    fields: [tradeAlerts.userId],
    references: [users.uid],
  }),
}));
