-- ============================================================
-- EMPIRE HUB – Complete Database Schema Migration
-- Supabase PostgreSQL – numeric types used throughout to
-- prevent floating-point inaccuracies in all financial fields.
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_net";     -- async http (edge function webhooks)

-- ─── Helper: updated_at trigger ─────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLE 1: profiles  (extends auth.users 1-to-1)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username         text        UNIQUE NOT NULL,
  cash             numeric(16,2) NOT NULL DEFAULT 10000,
  reputation       integer     NOT NULL DEFAULT 0,
  corporation_id   uuid,
  last_collected_at timestamptz NOT NULL DEFAULT now(),
  premium          boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_corporation_id ON public.profiles(corporation_id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE 2: corporations  (defined before profiles FK lands)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.corporations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        UNIQUE NOT NULL,
  tag         text        UNIQUE NOT NULL CHECK (char_length(tag) <= 4),
  bank        numeric(16,2) NOT NULL DEFAULT 0 CHECK (bank >= 0),
  member_cap  integer     NOT NULL DEFAULT 5,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_corporations_updated_at
  BEFORE UPDATE ON public.corporations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Now add the FK from profiles -> corporations ────────────
-- (profiles table created first; corporations created second; add constraint now)
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_corporation
  FOREIGN KEY (corporation_id) REFERENCES public.corporations(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.profiles VALIDATE CONSTRAINT fk_profiles_corporation;

-- ============================================================
-- TABLE 3: businesses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.businesses (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type               text        NOT NULL CHECK (type IN ('retail','real_estate','manufacturing','tech')),
  name               text        NOT NULL,
  level              integer     NOT NULL DEFAULT 1 CHECK (level >= 1),
  revenue_per_minute numeric(10,2) NOT NULL DEFAULT 0,
  upgrade_cost       numeric(10,2) NOT NULL DEFAULT 1000,
  location           text,
  manager_level      integer     NOT NULL DEFAULT 0 CHECK (manager_level >= 0 AND manager_level <= 10),
  staff_morale       integer     NOT NULL DEFAULT 50 CHECK (staff_morale >= 0 AND staff_morale <= 100),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_businesses_owner_id ON public.businesses(owner_id);

CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE 4: portfolios  (user stock holdings)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portfolios (
  user_id    uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol     text          NOT NULL,
  quantity   integer       NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  avg_price  numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, symbol)
);

CREATE INDEX idx_portfolios_user_id ON public.portfolios(user_id);

CREATE TRIGGER trg_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE 5: transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN (
                'stock_buy','stock_sell','offline_collect',
                'business_upgrade','marketplace_sell','marketplace_buy',
                'corp_deposit','corp_withdraw','hostile_takeover'
              )),
  amount      numeric(14,2) NOT NULL,
  description text,
  created_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);

-- ============================================================
-- TABLE 6: stocks  (live market data, updated by cron)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stocks (
  symbol         text          PRIMARY KEY,
  name           text          NOT NULL,
  price          numeric(10,2) NOT NULL DEFAULT 0,
  change_percent numeric(6,2)  NOT NULL DEFAULT 0,
  volume         bigint        NOT NULL DEFAULT 0,
  sector         text,
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

-- Seed with common tickers so frontend works from day 1
INSERT INTO public.stocks (symbol, name, price, change_percent, sector) VALUES
  ('AAPL',  'Apple Inc.',               175.50,  1.23, 'tech'),
  ('TSLA',  'Tesla Inc.',               215.30, -0.87, 'auto'),
  ('NVDA',  'NVIDIA Corp.',             430.00,  2.10, 'tech'),
  ('MSFT',  'Microsoft Corp.',          320.75,  0.55, 'tech'),
  ('GOOGL', 'Alphabet Inc.',            135.20, -0.30, 'tech'),
  ('AMZN',  'Amazon.com Inc.',          178.90,  1.05, 'retail'),
  ('META',  'Meta Platforms Inc.',      487.65,  3.20, 'tech'),
  ('JPM',   'JPMorgan Chase & Co.',     198.40, -0.45, 'finance'),
  ('BRK',   'Berkshire Hathaway',       355.00,  0.10, 'finance'),
  ('V',     'Visa Inc.',               278.30,  0.75, 'finance')
ON CONFLICT (symbol) DO NOTHING;

-- ============================================================
-- TABLE 7: marketplace_orders
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id  uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type  text          NOT NULL,
  item_id    text          NOT NULL,
  price      numeric(10,2) NOT NULL CHECK (price > 0),
  quantity   integer       NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status     text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','fulfilled','cancelled')),
  created_at timestamptz   NOT NULL DEFAULT now(),
  updated_at timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_orders_status ON public.marketplace_orders(status);
CREATE INDEX idx_marketplace_orders_seller_id ON public.marketplace_orders(seller_id);

CREATE TRIGGER trg_marketplace_orders_updated_at
  BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE 8: corporation_members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.corporation_members (
  corporation_id uuid          NOT NULL REFERENCES public.corporations(id) ON DELETE CASCADE,
  user_id        uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role           text          NOT NULL CHECK (role IN ('ceo','cfo','officer','member')),
  contribution   numeric(14,2) NOT NULL DEFAULT 0,
  joined_at      timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (corporation_id, user_id)
);

CREATE INDEX idx_corp_members_user_id ON public.corporation_members(user_id);

-- ============================================================
-- TABLE 9: chat_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel        text        NOT NULL CHECK (channel IN ('global','corp','dm')),
  recipient_id   uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  corporation_id uuid        REFERENCES public.corporations(id) ON DELETE CASCADE,
  message        text        NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_channel ON public.chat_messages(channel, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender_id);

-- ============================================================
-- TABLE 10: global_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.global_events (
  id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type     text        NOT NULL,
  data     jsonb       NOT NULL DEFAULT '{}',
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at   timestamptz,
  active   boolean     NOT NULL DEFAULT true
);

CREATE INDEX idx_global_events_active ON public.global_events(active, end_at);

-- ============================================================
-- TABLE 11: limit_orders  (for limit-price stock orders)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.limit_orders (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol       text          NOT NULL,
  quantity     integer       NOT NULL CHECK (quantity > 0),
  limit_price  numeric(10,2) NOT NULL CHECK (limit_price > 0),
  side         text          NOT NULL CHECK (side IN ('buy','sell')),
  status       text          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','filled','cancelled','expired')),
  created_at   timestamptz   NOT NULL DEFAULT now(),
  expires_at   timestamptz   NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_limit_orders_user_id ON public.limit_orders(user_id);
CREATE INDEX idx_limit_orders_symbol ON public.limit_orders(symbol, status);

-- ============================================================
-- TABLE 12: takeover_attempts  (hostile takeover state machine)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.takeover_attempts (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id     uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id       uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id     uuid          NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  bid_amount      numeric(14,2) NOT NULL,
  defense_expires timestamptz   NOT NULL DEFAULT (now() + interval '24 hours'),
  status          text          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','defended','completed','expired')),
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 13: rate_limits  (simple per-user call throttling)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      text        NOT NULL,
  call_count  integer     NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action)
);

-- ============================================================
-- REALTIME: enable on specified tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.stocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.corporations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.corporation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_events;

-- ============================================================
-- AUTO-CREATE PROFILE ON NEW USER SIGNUP  (Auth trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
