import { create } from 'zustand'
import { supabase, callEdgeFunction } from '../lib/supabase'
const useBusinessStore = create((set, get) => ({
  businesses: [],
  isLoading: false,

  fetchBusinesses: async (userId) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: true })
      if (error) throw error
      set({ businesses: data || [], isLoading: false })
    } catch {
      set({ businesses: [], isLoading: false })
    }
  },

  /** Subscribe to realtime changes on own businesses */
  subscribeToBusinesses: (userId) => {
    const channel = supabase
      .channel('businesses-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'businesses', filter: `owner_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            set((s) => ({
              businesses: s.businesses.map((b) => b.id === payload.new.id ? { ...b, ...payload.new } : b),
            }))
          } else if (payload.eventType === 'INSERT') {
            set((s) => ({ businesses: [...s.businesses, payload.new] }))
          } else if (payload.eventType === 'DELETE') {
            set((s) => ({ businesses: s.businesses.filter((b) => b.id !== payload.old.id) }))
          }
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  /** Upgrade a business via edge function */
  upgradeBusiness: async (businessId) => {
    const { businesses } = get()
    const biz = businesses.find((b) => b.id === businessId)
    if (!biz) return { success: false, message: 'Business not found' }

    // Optimistic update
    const optimistic = businesses.map((b) =>
      b.id === businessId
        ? { ...b, level: b.level + 1, upgrade_cost: Math.floor(b.upgrade_cost * 1.6) }
        : b
    )
    set({ businesses: optimistic })

    try {
      const data = await callEdgeFunction('upgrade-business', { businessId })
      // Apply server truth
      set((s) => ({
        businesses: s.businesses.map((b) =>
          b.id === businessId
            ? { ...b, level: data.level, revenue_per_minute: data.revenue_per_minute, upgrade_cost: data.upgrade_cost }
            : b
        ),
      }))
      return { success: true, data }
    } catch (e) {
      set({ businesses })  // revert
      return { success: false, message: e.message || 'Upgrade failed. Please try again.' }
    }
  },

  /** Create a new business (direct DB insert; owned by current user via RLS) */
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

  /** Collect offline earnings via edge function */
  collectOfflineEarnings: async () => {
    try {
      const data = await callEdgeFunction('collect-offline', {})
      return { success: true, earned: data.earned, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  /** Initiate hostile takeover */
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

  getById: (id) => get().businesses.find((b) => b.id === id) || null,

  getTotalRevenuePerMinute: () =>
    get().businesses.reduce((sum, b) => sum + parseFloat(b.revenue_per_minute || 0), 0),
}))

export default useBusinessStore
