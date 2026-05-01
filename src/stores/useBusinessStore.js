/**
 * useBusinessStore.js
 * 
 * This file manages the user's businesses.
 * It tracks what they own, handles upgrading them, and collects their money.
 * It also handles the "hostile takeover" feature where players can bid on businesses.
 */

import { create } from 'zustand'
import { supabase, callEdgeFunction } from '../lib/supabase'

const useBusinessStore = create((set, get) => ({
  // ── State (What we are remembering) ──────────────────────────────────────────
  businesses: [],      // A list of all the businesses the user owns
  isLoading: false,    // Is the app currently fetching data?

  // ── Core Features ────────────────────────────────────────────────────────────

  /**
   * Fetches all businesses owned by the specific user.
   */
  fetchBusinesses: async (userId) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: true }) // Oldest first
        
      if (error) throw error
      set({ businesses: data || [], isLoading: false })
    } catch {
      set({ businesses: [], isLoading: false })
    }
  },

  /** 
   * Listens to the database live.
   * If the user upgrades a business on their phone, their computer screen 
   * will update instantly without refreshing.
   */
  subscribeToBusinesses: (userId) => {
    const channel = supabase
      .channel('businesses-realtime-' + userId)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'businesses', filter: `owner_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            // Update an existing business in the list
            set((s) => ({
              businesses: s.businesses.map((b) => b.id === payload.new.id ? { ...b, ...payload.new } : b),
            }))
          } else if (payload.eventType === 'INSERT') {
            // Add a brand new business to the list
            set((s) => ({ businesses: [...s.businesses, payload.new] }))
          } else if (payload.eventType === 'DELETE') {
            // Remove a business (e.g. if they lost it in a takeover)
            set((s) => ({ businesses: s.businesses.filter((b) => b.id !== payload.old.id) }))
          }
        })
      .subscribe()
      
    return () => supabase.removeChannel(channel)
  },

  /** 
   * Upgrades a business to increase its revenue.
   * We use an Edge Function to process the math on the server securely.
   */
  upgradeBusiness: async (businessId) => {
    const { businesses } = get()
    const biz = businesses.find((b) => b.id === businessId)
    if (!biz) return { success: false, message: 'Business not found' }

    // 1. Optimistic Update: Make the change on the screen INSTANTLY
    const optimistic = businesses.map((b) =>
      b.id === businessId
        ? { ...b, level: b.level + 1, upgrade_cost: Math.floor(b.upgrade_cost * 1.6) }
        : b
    )
    set({ businesses: optimistic })

    // 2. Actually send the request to the server
    try {
      const data = await callEdgeFunction('upgrade-business', { businessId })
      
      // 3. Update the screen with the TRUE numbers returned from the server
      set((s) => ({
        businesses: s.businesses.map((b) =>
          b.id === businessId
            ? { ...b, level: data.level, revenue_per_minute: data.revenue_per_minute, upgrade_cost: data.upgrade_cost }
            : b
        ),
      }))
      return { success: true, data }
    } catch (e) {
      // 4. If the server says "no" (e.g. not enough money), revert the screen back
      set({ businesses })  
      return { success: false, message: e.message || 'Upgrade failed. Please try again.' }
    }
  },

  /** 
   * Create a new business and save it directly to the database.
   */
  createBusiness: async (businessData) => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert(businessData)
        .select()
        .single()
        
      if (error) throw error
      set((s) => ({ businesses: [...s.businesses, data] }))
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  /** 
   * Calculates and collects all money the user made while the app was closed.
   */
  collectOfflineEarnings: async () => {
    try {
      const data = await callEdgeFunction('collect-offline', {})
      return { success: true, earned: data.earned, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  /** 
   * Initiates a hostile takeover against another player's business.
   * If the bid is high enough, ownership changes!
   */
  initiateTakeover: async (businessId, bidAmount) => {
    try {
      const data = await callEdgeFunction('process-takeover', {
        action: 'initiate', businessId, bidAmount,
      })
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  // ── Helper Functions ─────────────────────────────────────────────────────────

  getById: (id) => get().businesses.find((b) => b.id === id) || null,

  /** Calculates total income per minute across ALL owned businesses */
  getTotalRevenuePerMinute: () =>
    get().businesses.reduce((sum, b) => sum + parseFloat(b.revenue_per_minute || 0), 0),
}))

export default useBusinessStore
