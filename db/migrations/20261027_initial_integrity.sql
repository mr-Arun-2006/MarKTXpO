-- Initial schema and integrity constraints. Existing rows are not rewritten.
CREATE TABLE IF NOT EXISTS public.users (
  id serial PRIMARY KEY, uid text NOT NULL UNIQUE, email text NOT NULL,
  display_name text, role text NOT NULL DEFAULT 'user', language text NOT NULL DEFAULT 'en',
  total_xp integer NOT NULL DEFAULT 0, virtual_capital double precision NOT NULL DEFAULT 1000000,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT users_total_xp_nonnegative CHECK (total_xp >= 0),
  CONSTRAINT users_virtual_capital_positive CHECK (virtual_capital > 0)
);
CREATE TABLE IF NOT EXISTS public.watchlist (
  id serial PRIMARY KEY, user_id text NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  ticker text NOT NULL, stock_name text NOT NULL, exchange text NOT NULL DEFAULT 'NSE',
  target_price double precision, notes text, added_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT watchlist_exchange_valid CHECK (exchange IN ('NSE', 'BSE', 'BOTH')),
  CONSTRAINT watchlist_target_price_positive CHECK (target_price IS NULL OR target_price > 0)
);
CREATE TABLE IF NOT EXISTS public.portfolio (
  id serial PRIMARY KEY, user_id text NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  ticker text NOT NULL, stock_name text NOT NULL, type text NOT NULL DEFAULT 'BUY',
  shares integer NOT NULL, entry_price double precision NOT NULL, stop_loss double precision,
  target_price double precision, is_paper_trade boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'OPEN', created_at timestamp NOT NULL DEFAULT now(), closed_at timestamp,
  CONSTRAINT portfolio_type_valid CHECK (type IN ('BUY', 'SHORT')),
  CONSTRAINT portfolio_status_valid CHECK (status IN ('OPEN', 'CLOSED')),
  CONSTRAINT portfolio_shares_positive CHECK (shares > 0),
  CONSTRAINT portfolio_entry_price_positive CHECK (entry_price > 0)
);
CREATE TABLE IF NOT EXISTS public.trade_alerts (
  id serial PRIMARY KEY, user_id text NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  ticker text NOT NULL, condition text NOT NULL, threshold double precision NOT NULL,
  intraday_range double precision, average_14_day_range double precision,
  expansion_ratio double precision, is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT trade_alerts_condition_valid CHECK (condition IN ('ABOVE', 'BELOW', 'ARBITRAGE_SPREAD', 'VOLATILITY_EXPANSION')),
  CONSTRAINT trade_alerts_threshold_nonnegative CHECK (threshold >= 0)
);

-- Upgrade already-existing tables without rewriting or deleting legacy rows.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_total_xp_nonnegative') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_total_xp_nonnegative CHECK (total_xp >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_virtual_capital_positive') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_virtual_capital_positive CHECK (virtual_capital > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watchlist_exchange_valid') THEN
    ALTER TABLE public.watchlist ADD CONSTRAINT watchlist_exchange_valid CHECK (exchange IN ('NSE', 'BSE', 'BOTH')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watchlist_target_price_positive') THEN
    ALTER TABLE public.watchlist ADD CONSTRAINT watchlist_target_price_positive CHECK (target_price IS NULL OR target_price > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_type_valid') THEN
    ALTER TABLE public.portfolio ADD CONSTRAINT portfolio_type_valid CHECK (type IN ('BUY', 'SHORT')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_status_valid') THEN
    ALTER TABLE public.portfolio ADD CONSTRAINT portfolio_status_valid CHECK (status IN ('OPEN', 'CLOSED')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_shares_positive') THEN
    ALTER TABLE public.portfolio ADD CONSTRAINT portfolio_shares_positive CHECK (shares > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_entry_price_positive') THEN
    ALTER TABLE public.portfolio ADD CONSTRAINT portfolio_entry_price_positive CHECK (entry_price > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trade_alerts_condition_valid') THEN
    ALTER TABLE public.trade_alerts ADD CONSTRAINT trade_alerts_condition_valid CHECK (condition IN ('ABOVE', 'BELOW', 'ARBITRAGE_SPREAD', 'VOLATILITY_EXPANSION')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trade_alerts_threshold_nonnegative') THEN
    ALTER TABLE public.trade_alerts ADD CONSTRAINT trade_alerts_threshold_nonnegative CHECK (threshold >= 0) NOT VALID;
  END IF;
END $$;
ALTER TABLE public.users ALTER COLUMN total_xp SET DEFAULT 0;
CREATE INDEX IF NOT EXISTS watchlist_user_added_at_idx ON public.watchlist (user_id, added_at);
CREATE INDEX IF NOT EXISTS portfolio_user_created_at_idx ON public.portfolio (user_id, created_at);
CREATE INDEX IF NOT EXISTS trade_alerts_user_created_at_idx ON public.trade_alerts (user_id, created_at);
