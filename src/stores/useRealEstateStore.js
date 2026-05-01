/**
 * useRealEstateStore.js
 * 
 * Manages the Real Estate mini-game.
 * Players can buy empty lots, build properties, upgrade them in "tiers",
 * and then manually click to collect rent over time.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DAL } from '../lib/dal'

// Fake properties in case the database isn't set up yet
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
  // ── State (What we are remembering) ──────────────────────────────────────────
  lots: [],           // All the available empty plots of land in the game
  properties: [],     // The specific buildings the logged-in user owns
  isLoading: false,

  // ── Core Features ────────────────────────────────────────────────────────────

  /** Grabs the catalog of land for sale from the database */
  fetchLots: async () => {
    set({ isLoading: true })
    try {
      const data = await DAL.getRealEstateLots();
      set({ lots: data || [], isLoading: false })
    } catch {
      set({ lots: MOCK_LOTS, isLoading: false })
    }
  },

  /** Grabs all the buildings the user owns, including the land data (via JOIN) */
  fetchProperties: async (userId) => {
    if (!userId) return
    try {
      const data = await DAL.getPlayerProperties(userId);
      set({ properties: data || [] })
    } catch { 
      /* Demo mode: fail silently */ 
    }
  },

  /** Buy a piece of land and put a Tier 1 building on it */
  purchaseLot: async (lotId, userId) => {
    const { lots, properties } = get()
    
    const lot = lots.find(l => l.id === lotId)
    if (!lot) return { success: false, message: 'Lot not found' }
    
    // Check if they already own it
    if (properties.some(p => p.lot_id === lotId)) return { success: false, message: 'Already owned' }

    try {
      const data = await DAL.purchaseProperty(lotId, userId, lot.rental_base);
      
      // Instantly add it to their screen
      set(s => ({ properties: [...s.properties, data] }))
      return { success: true, data }
    } catch {
      // ── Demo Mode Fallback ──
      // If db fails, fake it locally so they can still play
      const mockProp = { id: `p_${lotId}`, user_id: userId, lot_id: lotId, tier: 1, rental_rate: lot.rental_base, lot }
      set(s => ({ properties: [...s.properties, mockProp] }))
      return { success: true, data: mockProp }
    }
  },

  /** Upgrade an existing building to the next tier (level) to increase rent */
  upgradeProperty: async (propertyId) => {
    const { properties } = get()
    const prop = properties.find(p => p.id === propertyId)
    if (!prop) return { success: false }
    
    // Prevent upgrading past the max size allowed for that plot of land
    const maxTier = prop.lot?.max_tier || 5
    if (prop.tier >= maxTier) return { success: false, message: 'Max tier reached' }

    // Calculate new rent (Base Rent * New Tier level)
    const newTier = prop.tier + 1
    const newRent = (prop.lot?.rental_base || prop.rental_rate) * newTier

    try {
      await DAL.upgradeProperty(propertyId, newTier, newRent);
    } catch { /* Demo mode */ }

    // Update screen instantly
    set(s => ({
      properties: s.properties.map(p => p.id === propertyId ? { ...p, tier: newTier, rental_rate: newRent } : p)
    }))
    
    return { success: true }
  },

  /** 
   * Collect money from a specific property.
   * Based on how many actual minutes have passed since the last time they collected.
   */
  collectRent: async (propertyId) => {
    const { properties } = get()
    const prop = properties.find(p => p.id === propertyId)
    if (!prop) return { success: false, earned: 0 }
    
    const now = new Date()
    const lastCollected = new Date(prop.last_collected_at || now)
    
    // Calculate difference in minutes
    const minutesElapsed = Math.max(0, (now - lastCollected) / 60000)
    const earned = minutesElapsed * parseFloat(prop.rental_rate || 0)

    try {
      // Tell the database we collected it just now
      const newTime = await DAL.collectRent(propertyId);
      
      // Reset the timer on the screen
      set(s => ({
        properties: s.properties.map(p => p.id === propertyId ? { ...p, last_collected_at: newTime } : p)
      }))
    } catch { 
      /* Demo mode */ 
      set(s => ({
        properties: s.properties.map(p => p.id === propertyId ? { ...p, last_collected_at: now.toISOString() } : p)
      }))
    }
    
    // Return money rounded to 2 decimal places (cents)
    return { success: true, earned: Math.round(earned * 100) / 100 }
  },

  // ── Helper Functions ─────────────────────────────────────────────────────────

  /** Adds up the total "rent per minute" across all buildings they own */
  getTotalRentalIncome: () => get().properties.reduce((sum, p) => sum + parseFloat(p.rental_rate || 0), 0),
  
}), { name: 'realestate-storage' })) // Saves their buildings locally for demo mode

export default useRealEstateStore
