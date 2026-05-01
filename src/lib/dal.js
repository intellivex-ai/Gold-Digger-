import { supabase, callEdgeFunction } from './supabase'

/**
 * Data Access Layer (DAL)
 * Centralizes database interactions to separate DB logic from UI state/game logic.
 */
export const DAL = {
  // ==========================================
  // User Profiles
  // ==========================================
  getProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, cash, level, xp, talent_points, offshore_balance')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data;
  },

  // ==========================================
  // Real Estate
  // ==========================================
  getRealEstateLots: async () => {
    // Only fetching needed columns instead of '*'
    const { data, error } = await supabase
      .from('real_estate_lots')
      .select('id, name, district, base_price, rental_base, max_tier, available');
      
    if (error) throw error;
    return data;
  },
  
  getPlayerProperties: async (userId) => {
    const { data, error } = await supabase
      .from('player_properties')
      .select('*, lot:real_estate_lots(name, district, rental_base, max_tier)')
      .eq('user_id', userId);
      
    if (error) throw error;
    return data;
  },

  purchaseProperty: async (lotId, userId, lotRentalBase) => {
    const { data, error } = await supabase
      .from('player_properties')
      .insert({ user_id: userId, lot_id: lotId, tier: 1, rental_rate: lotRentalBase })
      .select('*, lot:real_estate_lots(name, district, rental_base, max_tier)')
      .single();
    if (error) throw error;
    return data;
  },

  upgradeProperty: async (propertyId, newTier, newRent) => {
    const { error } = await supabase
      .from('player_properties')
      .update({ tier: newTier, rental_rate: newRent })
      .eq('id', propertyId);
    if (error) throw error;
  },

  collectRent: async (propertyId) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('player_properties')
      .update({ last_collected_at: now })
      .eq('id', propertyId);
    if (error) throw error;
    return now;
  }
};
