import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

const MOCK_LOTS = [
  { id: '1', name: 'Main Street Shop',       district: 'downtown',    base_price: 50000,   rental_base: 250,   max_tier: 5 },
  { id: '2', name: 'City Apartment Block',   district: 'downtown',    base_price: 120000,  rental_base: 600,   max_tier: 5 },
  { id: '3', name: 'Beachfront Villa',       district: 'waterfront',  base_price: 500000,  rental_base: 2500,  max_tier: 5 },
  { id: '4', name: 'Industrial Warehouse',   district: 'industrial',  base_price: 80000,   rental_base: 400,   max_tier: 5 },
  { id: '5', name: 'Tech Park Office',       district: 'downtown',    base_price: 200000,  rental_base: 1000,  max_tier: 5 },
  { id: '6', name: 'Suburban Homes Complex', district: 'suburbs',     base_price: 150000,  rental_base: 750,   max_tier: 5 },
  { id: '7', name: 'Private Island',         district: 'island',      base_price: 5000000, rental_base: 25000, max_tier: 3 },
  { id: '8', name: 'Harbour Marina',         district: 'waterfront',  base_price: 800000,  rental_base: 4000,  max_tier: 5 },
]

const useRealEstateStore = create(persist((set, get) => ({
  lots: [],
  properties: [],  // user-owned
  isLoading: false,

  fetchLots: async () => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.from('real_estate_lots').select('*')
      if (error) throw error
      set({ lots: data || [], isLoading: false })
    } catch {
      set({ lots: MOCK_LOTS, isLoading: false })
    }
  },

  fetchProperties: async (userId) => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('player_properties')
        .select('*, lot:real_estate_lots(*)')
        .eq('user_id', userId)
      if (error) throw error
      set({ properties: data || [] })
    } catch { /* demo */ }
  },

  purchaseLot: async (lotId, userId) => {
    const { lots, properties } = get()
    const lot = lots.find(l => l.id === lotId)
    if (!lot) return { success: false, message: 'Lot not found' }
    if (properties.some(p => p.lot_id === lotId)) return { success: false, message: 'Already owned' }

    try {
      const { data, error } = await supabase
        .from('player_properties')
        .insert({ user_id: userId, lot_id: lotId, tier: 1, rental_rate: lot.rental_base })
        .select('*, lot:real_estate_lots(*)')
        .single()
      if (error) throw error
      set(s => ({ properties: [...s.properties, data] }))
      return { success: true, data }
    } catch {
      // Demo mode
      const mockProp = { id: `p_${lotId}`, user_id: userId, lot_id: lotId, tier: 1, rental_rate: lot.rental_base, lot }
      set(s => ({ properties: [...s.properties, mockProp] }))
      return { success: true, data: mockProp }
    }
  },

  upgradePropery: async (propertyId) => {
    const { properties } = get()
    const prop = properties.find(p => p.id === propertyId)
    if (!prop) return { success: false }
    const maxTier = prop.lot?.max_tier || 5
    if (prop.tier >= maxTier) return { success: false, message: 'Max tier reached' }

    const newTier = prop.tier + 1
    const newRent = (prop.lot?.rental_base || prop.rental_rate) * newTier

    try {
      await supabase.from('player_properties').update({ tier: newTier, rental_rate: newRent }).eq('id', propertyId)
    } catch { /* demo */ }

    set(s => ({
      properties: s.properties.map(p => p.id === propertyId ? { ...p, tier: newTier, rental_rate: newRent } : p)
    }))
    return { success: true }
  },

  collectRent: async (propertyId) => {
    const { properties } = get()
    const prop = properties.find(p => p.id === propertyId)
    if (!prop) return { success: false, earned: 0 }
    const now = new Date()
    const lastCollected = new Date(prop.last_collected_at || now)
    const minutesElapsed = Math.max(0, (now - lastCollected) / 60000)
    const earned = minutesElapsed * parseFloat(prop.rental_rate || 0)

    try {
      await supabase.from('player_properties').update({ last_collected_at: now.toISOString() }).eq('id', propertyId)
    } catch { /* demo */ }

    set(s => ({
      properties: s.properties.map(p => p.id === propertyId ? { ...p, last_collected_at: now.toISOString() } : p)
    }))
    return { success: true, earned: Math.round(earned * 100) / 100 }
  },

  getTotalRentalIncome: () => get().properties.reduce((sum, p) => sum + parseFloat(p.rental_rate || 0), 0),
}), { name: 'realestate-storage' }))

export default useRealEstateStore
