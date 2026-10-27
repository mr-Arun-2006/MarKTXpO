import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
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
  totalXP: integer('total_xp').default(0).notNull(),
  virtualCapital: doublePrecision('virtual_capital').default(1000000).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  check('users_total_xp_nonnegative', sql`${table.totalXP} >= 0`),
  check('users_virtual_capital_positive', sql`${table.virtualCapital} > 0`),
]);

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
}, (table) => [
  check('watchlist_exchange_valid', sql`${table.exchange} in ('NSE', 'BSE', 'BOTH')`),
  check('watchlist_target_price_positive', sql`${table.targetPrice} IS NULL OR ${table.targetPrice} > 0`),
  index('watchlist_user_added_at_idx').on(table.userId, table.addedAt),
]);

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
}, (table) => [
  check('portfolio_type_valid', sql`${table.type} in ('BUY', 'SHORT')`),
  check('portfolio_status_valid', sql`${table.status} in ('OPEN', 'CLOSED')`),
  check('portfolio_shares_positive', sql`${table.shares} > 0`),
  check('portfolio_entry_price_positive', sql`${table.entryPrice} > 0`),
  index('portfolio_user_created_at_idx').on(table.userId, table.createdAt),
]);

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
}, (table) => [
  check('trade_alerts_condition_valid', sql`${table.condition} in ('ABOVE', 'BELOW', 'ARBITRAGE_SPREAD', 'VOLATILITY_EXPANSION')`),
  check('trade_alerts_threshold_nonnegative', sql`${table.threshold} >= 0`),
  index('trade_alerts_user_created_at_idx').on(table.userId, table.createdAt),
]);

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
