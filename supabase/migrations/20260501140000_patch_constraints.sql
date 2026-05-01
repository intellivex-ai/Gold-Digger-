-- ============================================================
-- EMPIRE HUB – Schema Improvements
-- Adds missing constraints and triggers for data integrity
-- ============================================================

-- 1. Add missing positive constraints to prevent negative financial values
ALTER TABLE public.crypto_portfolios 
  ADD CONSTRAINT crypto_qty_positive CHECK (quantity >= 0);

ALTER TABLE public.vc_investments 
  ADD CONSTRAINT vc_amount_positive CHECK (amount >= 0);

ALTER TABLE public.real_estate_lots 
  ADD CONSTRAINT lot_price_positive CHECK (base_price >= 0);

-- 2. Prevent a business from supplying itself in the supply chain
ALTER TABLE public.supply_chain_links 
  ADD CONSTRAINT prevent_self_supply CHECK (consumer_biz_id != supplier_biz_id);

-- 3. Add missing updated_at triggers for tables introduced in Wave 13
CREATE TRIGGER trg_crypto_portfolios_updated_at
  BEFORE UPDATE ON public.crypto_portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_player_properties_updated_at
  BEFORE UPDATE ON public.player_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
