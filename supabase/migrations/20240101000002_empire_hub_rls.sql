-- ============================================================
-- EMPIRE HUB – Row Level Security Policies
-- All tables have RLS enabled; service-role key bypasses RLS.
-- Edge Functions use service-role, so they are unrestricted.
-- ============================================================

-- ─── Enable RLS on every table ──────────────────────────────
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.limit_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takeover_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles
-- ============================================================
-- Anyone can read any profile (leaderboard, social)
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No direct INSERT from client (trigger handles it)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- businesses
-- ============================================================
-- Everyone can browse businesses
CREATE POLICY "businesses_select_all"
  ON public.businesses FOR SELECT
  USING (true);

-- Only the owner can insert
CREATE POLICY "businesses_insert_own"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only the owner can update
CREATE POLICY "businesses_update_own"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Only the owner can delete
CREATE POLICY "businesses_delete_own"
  ON public.businesses FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================
-- portfolios
-- ============================================================
-- Users can only see their own holdings
CREATE POLICY "portfolios_select_own"
  ON public.portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "portfolios_insert_own"
  ON public.portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "portfolios_update_own"
  ON public.portfolios FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "portfolios_delete_own"
  ON public.portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- transactions  (no direct INSERT – edge functions only)
-- ============================================================
CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Edge functions use service-role which bypasses RLS; block client INSERT
-- (Leave no INSERT policy so anon/user roles cannot insert directly)

-- ============================================================
-- stocks  (public read; only service-role can write via cron fn)
-- ============================================================
CREATE POLICY "stocks_select_all"
  ON public.stocks FOR SELECT
  USING (true);

-- ============================================================
-- marketplace_orders
-- ============================================================
CREATE POLICY "marketplace_orders_select_all"
  ON public.marketplace_orders FOR SELECT
  USING (true);

CREATE POLICY "marketplace_orders_insert_own"
  ON public.marketplace_orders FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- Seller can only cancel their own listing (status -> 'cancelled')
CREATE POLICY "marketplace_orders_update_own"
  ON public.marketplace_orders FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id AND status IN ('active','cancelled'));

-- ============================================================
-- corporations
-- ============================================================
CREATE POLICY "corporations_select_all"
  ON public.corporations FOR SELECT
  USING (true);

-- Only a CEO (checked via corporation_members) can update their corp
CREATE POLICY "corporations_update_ceo"
  ON public.corporations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.corporation_members cm
      WHERE cm.corporation_id = id
        AND cm.user_id = auth.uid()
        AND cm.role = 'ceo'
    )
  );

-- ============================================================
-- corporation_members
-- ============================================================
CREATE POLICY "corp_members_select_all"
  ON public.corporation_members FOR SELECT
  USING (true);

-- CEO can invite (insert) new members to their corporation
CREATE POLICY "corp_members_insert_ceo"
  ON public.corporation_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.corporation_members cm
      WHERE cm.corporation_id = corporation_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'ceo'
    )
  );

-- Members can leave (delete own row); CEO can kick any member
CREATE POLICY "corp_members_delete_own_or_ceo"
  ON public.corporation_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.corporation_members cm
      WHERE cm.corporation_id = corporation_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'ceo'
    )
  );

-- ============================================================
-- chat_messages
-- ============================================================
-- Global: all users can read
-- Corp: only members of that corporation
-- DM: only sender or recipient
CREATE POLICY "chat_messages_select"
  ON public.chat_messages FOR SELECT
  USING (
    channel = 'global'
    OR (channel = 'corp' AND EXISTS (
          SELECT 1 FROM public.corporation_members cm
          WHERE cm.corporation_id = corporation_id
            AND cm.user_id = auth.uid()))
    OR (channel = 'dm' AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
  );

CREATE POLICY "chat_messages_insert_own"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- ============================================================
-- global_events  (public read only)
-- ============================================================
CREATE POLICY "global_events_select_all"
  ON public.global_events FOR SELECT
  USING (true);

-- ============================================================
-- limit_orders
-- ============================================================
CREATE POLICY "limit_orders_select_own"
  ON public.limit_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "limit_orders_insert_own"
  ON public.limit_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "limit_orders_update_own"
  ON public.limit_orders FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- takeover_attempts
-- ============================================================
CREATE POLICY "takeover_select_involved"
  ON public.takeover_attempts FOR SELECT
  USING (auth.uid() = attacker_id OR auth.uid() = target_id);

-- ============================================================
-- rate_limits  (internal; no client access needed)
-- ============================================================
-- No public policies – only service-role can read/write
