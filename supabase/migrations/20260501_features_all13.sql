-- ============================================================
-- EMPIRE HUB – Wave 1: All 13 Feature Tables
-- ============================================================

-- ── Alter profiles: new columns ──────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS talent_points    integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offshore_balance numeric(16,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS season_xp        integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS season_rank      integer,
  ADD COLUMN IF NOT EXISTS xp              integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level           integer       NOT NULL DEFAULT 1;

-- ── Alter businesses: new columns ───────────────────────────
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS csuite_bonus      numeric(5,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS supply_bonus      numeric(5,2) NOT NULL DEFAULT 1.00;

-- ── Alter transactions: widen type enum ─────────────────────
-- (PostgreSQL doesn't allow ALTER TYPE easily in migrations;
--  we'll use a text column with no enum constraint instead — already the case)

-- ============================================================
-- TABLE: economy_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.economy_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text        NOT NULL,
  event_type  text        NOT NULL CHECK (event_type IN ('boom','crash','shortage','windfall','scandal','tax')),
  sector      text,                    -- NULL = affects all sectors
  multiplier  numeric(4,2) NOT NULL DEFAULT 1.0,
  start_at    timestamptz NOT NULL DEFAULT now(),
  end_at      timestamptz NOT NULL DEFAULT (now() + interval '6 hours'),
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_economy_events_active ON public.economy_events(active, end_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.economy_events;

-- Seed a couple of starter events
INSERT INTO public.economy_events (title, description, event_type, sector, multiplier, end_at) VALUES
  ('Tech Boom', 'Investor frenzy drives tech profits up 50%!', 'boom', 'tech', 1.5, now() + interval '12 hours'),
  ('Global Supply Crunch', 'Manufacturing margins squeezed by 20%.', 'shortage', 'manufacturing', 0.8, now() + interval '8 hours')
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLE: seasons (competitive seasons)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seasons (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  number     integer     NOT NULL UNIQUE,
  start_at   timestamptz NOT NULL DEFAULT now(),
  end_at     timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  active     boolean     NOT NULL DEFAULT true,
  rewards    jsonb       NOT NULL DEFAULT '[]'
);

INSERT INTO public.seasons (number, end_at) VALUES (1, now() + interval '30 days')
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLE: skill_trees (static definitions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.skill_trees (
  id           uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_name    text   NOT NULL CHECK (tree_name IN ('wolf','tycoon','shadow','kingpin')),
  node_key     text   NOT NULL UNIQUE,
  label        text   NOT NULL,
  description  text   NOT NULL,
  icon         text   NOT NULL DEFAULT 'zap',
  cost_points  integer NOT NULL DEFAULT 1,
  requires     text,   -- node_key of prerequisite node
  effect_type  text   NOT NULL,  -- e.g. 'stock_discount','passive_boost','tax_reduce'
  effect_value numeric(6,4) NOT NULL DEFAULT 0.05
);

-- Seed skill tree nodes
INSERT INTO public.skill_trees (tree_name, node_key, label, description, icon, cost_points, requires, effect_type, effect_value) VALUES
  -- Wolf (stock market)
  ('wolf','wolf_1','Market Instinct','Reduce stock buy fees by 5%','trending-up',1,NULL,'stock_fee_discount',0.05),
  ('wolf','wolf_2','Insider Edge','Stock buy cost -10% additional','eye',2,'wolf_1','stock_fee_discount',0.10),
  ('wolf','wolf_3','Flash Trader','Unlock limit orders','zap',3,'wolf_2','unlock_limit_orders',1),
  ('wolf','wolf_4','The Oracle','See 48h stock forecast','star',4,'wolf_3','stock_forecast',1),
  -- Tycoon (businesses)
  ('tycoon','tycoon_1','Lean Operations','Business revenue +5%','briefcase',1,NULL,'passive_boost',0.05),
  ('tycoon','tycoon_2','Efficiency Drive','Business revenue +10%','trending-up',2,'tycoon_1','passive_boost',0.10),
  ('tycoon','tycoon_3','Corporate Expansion','Unlock C-Suite managers','users',3,'tycoon_2','unlock_csuite',1),
  ('tycoon','tycoon_4','Empire Mode','All passive income +25%','crown',5,'tycoon_3','passive_boost',0.25),
  -- Shadow (black market / crypto)
  ('shadow','shadow_1','Street Smarts','Black market bust chance -10%','shield',1,NULL,'bm_risk_reduce',0.10),
  ('shadow','shadow_2','Ghost Protocol','Crypto trades tax-free','ghost',2,'shadow_1','crypto_tax_free',1),
  ('shadow','shadow_3','Dark Connections','Unlock rare black market items','skull',3,'shadow_2','unlock_rare_bm',1),
  -- Kingpin (PvP / hostile)
  ('kingpin','kingpin_1','War Chest','Hostile takeover cost -10%','swords',1,NULL,'takeover_discount',0.10),
  ('kingpin','kingpin_2','Iron Curtain','Incoming takeover defense +15%','shield',2,'kingpin_1','defense_boost',0.15),
  ('kingpin','kingpin_3','Corporate Spy','Espionage success +20%','eye',3,'kingpin_2','espionage_boost',0.20)
ON CONFLICT (node_key) DO NOTHING;

-- ============================================================
-- TABLE: player_skills (which nodes each player has unlocked)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.player_skills (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  node_key   text NOT NULL REFERENCES public.skill_trees(node_key) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, node_key)
);

-- ============================================================
-- TABLE: crypto_assets (coin definitions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crypto_assets (
  symbol      text PRIMARY KEY,
  name        text NOT NULL,
  price       numeric(16,6) NOT NULL DEFAULT 0,
  change_24h  numeric(6,2)  NOT NULL DEFAULT 0,
  market_cap  numeric(20,2) NOT NULL DEFAULT 0,
  volatility  numeric(4,2)  NOT NULL DEFAULT 0.15,
  can_stake   boolean       NOT NULL DEFAULT false,
  stake_apy   numeric(5,2)  NOT NULL DEFAULT 0,
  is_rugpull  boolean       NOT NULL DEFAULT false,
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO public.crypto_assets (symbol,name,price,change_24h,volatility,can_stake,stake_apy) VALUES
  ('GOLDX', 'Gold Coin',      1.00,   0.00, 0.05, false, 0),
  ('EMPX',  'Empire Token', 420.69,  12.34, 0.35, true, 18.5),
  ('DARKC', 'DarkCoin',       0.003, -8.20, 0.80, false, 0),
  ('HYPE',  'HypeCoin',     150.00,  45.00, 0.90, false, 0),
  ('VAULTX','VaultX',         88.50,   2.10, 0.20, true, 12.0),
  ('RUGZ',  'RugZilla',        0.50,  -2.50, 0.99, false, 0)
ON CONFLICT (symbol) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_assets;

-- ============================================================
-- TABLE: crypto_portfolios
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crypto_portfolios (
  user_id     uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol      text          NOT NULL REFERENCES public.crypto_assets(symbol),
  quantity    numeric(18,6) NOT NULL DEFAULT 0,
  avg_price   numeric(16,6) NOT NULL DEFAULT 0,
  staked_qty  numeric(18,6) NOT NULL DEFAULT 0,
  updated_at  timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, symbol)
);

-- ============================================================
-- TABLE: real_estate_lots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.real_estate_lots (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text          NOT NULL,
  district    text          NOT NULL CHECK (district IN ('downtown','suburbs','waterfront','industrial','island')),
  base_price  numeric(14,2) NOT NULL,
  rental_base numeric(10,2) NOT NULL DEFAULT 0,  -- $/min when developed
  max_tier    integer       NOT NULL DEFAULT 5,
  available   boolean       NOT NULL DEFAULT true,
  created_at  timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO public.real_estate_lots (name, district, base_price, rental_base, max_tier) VALUES
  ('Main Street Shop', 'downtown', 50000, 250, 5),
  ('City Apartment Block', 'downtown', 120000, 600, 5),
  ('Beachfront Villa', 'waterfront', 500000, 2500, 5),
  ('Industrial Warehouse', 'industrial', 80000, 400, 5),
  ('Tech Park Office', 'downtown', 200000, 1000, 5),
  ('Suburban Homes Complex', 'suburbs', 150000, 750, 5),
  ('Private Island', 'island', 5000000, 25000, 3),
  ('Harbour Marina', 'waterfront', 800000, 4000, 5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLE: player_properties
-- ============================================================
CREATE TABLE IF NOT EXISTS public.player_properties (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lot_id      uuid          NOT NULL REFERENCES public.real_estate_lots(id),
  tier        integer       NOT NULL DEFAULT 1,
  rental_rate numeric(10,2) NOT NULL DEFAULT 0,
  last_collected_at timestamptz NOT NULL DEFAULT now(),
  purchased_at timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (lot_id)  -- one owner per lot
);

CREATE INDEX idx_player_properties_user ON public.player_properties(user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_properties;

-- ============================================================
-- TABLE: csuite_managers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.csuite_managers (
  id          uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  role        text   NOT NULL CHECK (role IN ('ceo','cfo','cmo','coo','cto')),
  name        text   NOT NULL,
  rarity      text   NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
  salary      numeric(10,2) NOT NULL,
  revenue_bonus numeric(4,2) NOT NULL DEFAULT 1.0,
  xp_bonus    numeric(4,2)  NOT NULL DEFAULT 1.0,
  special_perk text,
  avatar_color text  NOT NULL DEFAULT '#5B9CF6'
);

INSERT INTO public.csuite_managers (role,name,rarity,salary,revenue_bonus,xp_bonus,special_perk,avatar_color) VALUES
  ('ceo','Alex Growth','common',500,1.05,1.0,'Revenue +5%','#3DD68C'),
  ('ceo','Victoria Vance','rare',1200,1.15,1.05,'Revenue +15%, XP +5%','#5B9CF6'),
  ('ceo','Marcus Steel','epic',3000,1.30,1.10,'Revenue +30%, Crisis immunity','#B56EFF'),
  ('ceo','The Legend','legendary',10000,1.60,1.25,'Revenue +60%, Scandal shield','#F5C842'),
  ('cfo','Bob Numbers','common',400,1.02,1.0,'Cuts upgrade cost 5%','#8892B0'),
  ('cfo','Diana Quant','rare',1000,1.08,1.0,'Upgrade cost -15%','#5B9CF6'),
  ('cmo','Sam Viral','common',350,1.03,1.10,'XP +10%','#FF6B6B'),
  ('cmo','Lex Brand','epic',2500,1.12,1.25,'XP +25%, Unlock ad campaigns','#FF9F43'),
  ('cto','Dev Genius','rare',900,1.10,1.08,'Tech businesses +20%','#00D2FF'),
  ('coo','Ops Master','epic',2200,1.20,1.05,'All passive +20%','#A55EEA')
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLE: business_managers (which manager is in which business)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_managers (
  business_id  uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  manager_id   uuid NOT NULL REFERENCES public.csuite_managers(id),
  role         text NOT NULL,
  hired_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, role)
);

-- ============================================================
-- TABLE: auction_listings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auction_listings (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id    uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type    text          NOT NULL CHECK (item_type IN ('business','stock_bundle','crypto_bundle','manager')),
  item_id      text          NOT NULL,
  item_meta    jsonb         NOT NULL DEFAULT '{}',
  start_price  numeric(14,2) NOT NULL,
  current_bid  numeric(14,2) NOT NULL DEFAULT 0,
  buyout_price numeric(14,2),
  top_bidder_id uuid         REFERENCES public.profiles(id),
  status       text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended','cancelled')),
  ends_at      timestamptz   NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at   timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_auction_status ON public.auction_listings(status, ends_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_listings;

-- ============================================================
-- TABLE: black_market_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.black_market_runs (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_key   text          NOT NULL,
  investment numeric(14,2) NOT NULL,
  outcome    text          CHECK (outcome IN ('success','busted','pending')),
  profit     numeric(14,2),
  bust_fine  numeric(14,2),
  run_at     timestamptz   NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX idx_bm_runs_user ON public.black_market_runs(user_id, run_at DESC);

-- ============================================================
-- TABLE: supply_chain_links
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supply_chain_links (
  id              uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_biz_id uuid   NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_biz_id uuid   NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  material_type   text   NOT NULL,
  bonus_percent   numeric(4,2) NOT NULL DEFAULT 0.10,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (consumer_biz_id, supplier_biz_id)
);

-- ============================================================
-- TABLE: vc_investments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vc_investments (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id  uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  startup_name text          NOT NULL,
  amount       numeric(14,2) NOT NULL,
  stage        text          NOT NULL DEFAULT 'seed' CHECK (stage IN ('seed','series_a','series_b')),
  status       text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','success','failed')),
  roi_multiple numeric(4,2)  NOT NULL DEFAULT 0,
  resolves_at  timestamptz   NOT NULL DEFAULT (now() + interval '7 days'),
  invested_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_vc_investor ON public.vc_investments(investor_id);

-- ============================================================
-- TABLE: corporate_wars
-- ============================================================
CREATE TABLE IF NOT EXISTS public.corporate_wars (
  id              uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_corp   uuid   NOT NULL REFERENCES public.corporations(id) ON DELETE CASCADE,
  defender_corp   uuid   NOT NULL REFERENCES public.corporations(id) ON DELETE CASCADE,
  action_type     text   NOT NULL CHECK (action_type IN ('espionage','sabotage','treasury_raid')),
  status          text   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','defended')),
  cost            numeric(14,2) NOT NULL,
  damage_amount   numeric(14,2),
  declared_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.corporate_wars;
