-- ============================================================
-- EMPIRE HUB – Database Helper Functions & Views
-- Migration 3: Computed views, leaderboard, net-worth view
-- ============================================================

-- ─── View: leaderboard ──────────────────────────────────────
-- Computes net_worth = cash + sum(portfolio market value) + sum(business values)
-- Used by the leaderboard page.  Updates on every read (simple view, not materialized).
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id,
  p.username,
  p.cash,
  p.reputation,
  p.corporation_id,
  p.premium,
  p.created_at,
  COALESCE(biz.total_biz_value, 0)       AS total_business_value,
  COALESCE(port.total_stock_value, 0)    AS total_stock_value,
  p.cash
    + COALESCE(biz.total_biz_value, 0)
    + COALESCE(port.total_stock_value, 0) AS net_worth
FROM public.profiles p

-- Business value: sum of (upgrade_cost * level * 0.8) per owned business
LEFT JOIN LATERAL (
  SELECT SUM(b.upgrade_cost * b.level * 0.8) AS total_biz_value
  FROM public.businesses b
  WHERE b.owner_id = p.id
) biz ON true

-- Portfolio value: sum of (quantity * current stock price)
LEFT JOIN LATERAL (
  SELECT SUM(po.quantity * s.price) AS total_stock_value
  FROM public.portfolios po
  JOIN public.stocks s ON s.symbol = po.symbol
  WHERE po.user_id = p.id
) port ON true;

-- Grant read access to authenticated users
GRANT SELECT ON public.leaderboard TO authenticated;

-- ─── View: corporation_stats ─────────────────────────────────
CREATE OR REPLACE VIEW public.corporation_stats AS
SELECT
  c.id,
  c.name,
  c.tag,
  c.bank,
  c.member_cap,
  c.created_at,
  COUNT(cm.user_id)              AS member_count,
  SUM(cm.contribution)           AS total_contributions
FROM public.corporations c
LEFT JOIN public.corporation_members cm ON cm.corporation_id = c.id
GROUP BY c.id;

GRANT SELECT ON public.corporation_stats TO authenticated;

-- ─── Function: get_user_portfolio_value(user_id) ────────────
-- Returns the current market value of a user's portfolio.
CREATE OR REPLACE FUNCTION public.get_user_portfolio_value(p_user_id uuid)
RETURNS numeric(16,2)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(po.quantity * s.price), 0)
  FROM portfolios po
  JOIN stocks s ON s.symbol = po.symbol
  WHERE po.user_id = p_user_id;
$$;

-- ─── Function: calculate_offline_earnings(user_id) ──────────
-- Pure SQL version for quick server-side checks (edge fn uses its own logic).
CREATE OR REPLACE FUNCTION public.calculate_offline_earnings(p_user_id uuid)
RETURNS numeric(14,2)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    SUM(
      b.revenue_per_minute
      * LEAST(
          EXTRACT(EPOCH FROM (now() - p.last_collected_at)) / 60.0,
          480  -- 8 hours cap in minutes
        )
      * 0.5   -- offline multiplier
    ),
    0
  )
  FROM businesses b
  JOIN profiles p ON p.id = b.owner_id
  WHERE b.owner_id = p_user_id;
$$;

-- ─── Function: expire_old_takeover_attempts ─────────────────
-- Marks expired pending takeovers; call from cron or manually.
CREATE OR REPLACE FUNCTION public.expire_old_takeover_attempts()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt integer;
BEGIN
  UPDATE takeover_attempts
  SET status = 'expired'
  WHERE status = 'pending'
    AND defense_expires < now();
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

-- ─── Trigger: auto-expire limit orders older than 24h ────────
-- Runs as a deferred check; in production, also call from cron.
CREATE OR REPLACE FUNCTION public.expire_limit_orders()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.limit_orders
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
  RETURN NULL;
END;
$$;

-- Fire whenever limit_orders table is written to
CREATE TRIGGER trg_expire_limit_orders
  AFTER INSERT OR UPDATE ON public.limit_orders
  FOR EACH STATEMENT EXECUTE FUNCTION public.expire_limit_orders();

-- ─── Index for leaderboard sorting ───────────────────────────
-- Fast cash-based ranking without materializing net_worth
CREATE INDEX IF NOT EXISTS idx_profiles_cash ON public.profiles (cash DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_reputation ON public.profiles (reputation DESC);
