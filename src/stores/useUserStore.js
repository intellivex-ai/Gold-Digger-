/**
 * useUserStore.js
 * 
 * This file manages the "State" (memory) for the currently logged-in user.
 * It holds their profile data (like cash and reputation) and transaction history.
 * We use 'zustand' to make this data easily available anywhere in the app.
 */

import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useUserStore = create((set, get) => ({
  // ── State (What we are remembering) ──────────────────────────────────────────
  user: null,             // Profile data (cash, level, etc.)
  session: null,          // Auth session (login tokens)
  isAuthenticated: false, // Is the user logged in right now?
  isLoading: true,        // Are we currently checking their login status?
  isDemoMode: false,      // Used for offline testing
  transactions: [],       // History of what the user bought/sold

  // ── Session Management ───────────────────────────────────────────────────────
  
  /** 
   * Updates the app when a user logs in or out.
   * If they logged in, it immediately fetches their profile from the database.
   */
  setSession: (session) => {
    set({ session, isAuthenticated: !!session, isLoading: false })
    if (session) get().fetchProfile(session.user.id)
  },

  /** 
   * Fetches the user's profile details (cash, level) from Supabase.
   */
  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        
      if (error) throw error
      set({ user: data })
    } catch {
      // If we fail to fetch, clear the user data to be safe
      set({ user: null })
    }
  },

  /** 
   * Listens for live updates to the user's profile.
   * If a server edge-function updates their cash, this instantly updates the UI.
   */
  subscribeToProfile: (userId) => {
    const channel = supabase
      .channel('profile-realtime-' + userId)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          // Merge the new data into the existing user profile
          set((s) => ({ user: { ...s.user, ...payload.new } }))
        })
      .subscribe()
      
    // Return a function that lets us turn this listener off later
    return () => supabase.removeChannel(channel)
  },

  /** 
   * Logs the user out of Supabase and clears all their local memory.
   */
  logout: async () => {
    await supabase.auth.signOut().catch(() => {})
    set({ user: null, session: null, isAuthenticated: false, isDemoMode: false, transactions: [] })
  },

  // ── In-Game Actions ──────────────────────────────────────────────────────────

  /** 
   * Collects money earned while the user was offline.
   * We use an Edge Function for this so users can't cheat by changing their computer clock.
   */
  collectEarnings: async () => {
    const { user } = get()
    if (!user) return 0

    try {
      const { data, error } = await supabase.functions.invoke('collect-offline', { body: {} })
      if (error) throw error
      
      const earned = data?.earned || 0
      
      // Update our local screen immediately so it feels fast
      set((s) => ({
        user: { 
          ...s.user, 
          cash: (parseFloat(s.user?.cash || 0) + earned),
          last_collected_at: new Date().toISOString()
        },
      }))
      return earned
    } catch (e) {
      console.error('[collectEarnings]', e)
      return 0
    }
  },

  /** 
   * Fetches the user's past transactions (buying stocks, etc.)
   */
  fetchTransactions: async (limit = 50) => {
    const { user } = get()
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) // Newest first
        .limit(limit)
        
      if (error) throw error
      set({ transactions: data || [] })
    } catch {
      // Do nothing, keep whatever was already there
    }
  },

  /** 
   * Listens for new transactions in real-time so the history list updates instantly.
   */
  subscribeToTransactions: (userId) => {
    const channel = supabase
      .channel('transactions-realtime-' + userId)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          // Add the new transaction to the top of the list, keeping only the newest 100
          set((s) => ({ transactions: [payload.new, ...s.transactions].slice(0, 100) }))
        })
      .subscribe()
      
    return () => supabase.removeChannel(channel)
  },

  /** 
   * A quick helper to manually update cash on the screen without waiting for the server.
   * Note: This doesn't save to the database, it's just for visual speed.
   */
  updateCash: (delta) =>
    set((s) => ({ user: { ...s.user, cash: (parseFloat(s.user?.cash || 0) + delta) } })),

  /** 
   * Updates user profile settings (like changing their username).
   */
  updateProfile: async (updates) => {
    const { user } = get()
    if (!user?.id) return { success: false }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()
        
      if (error) throw error
      
      // Update the local screen with the new database values
      set((s) => ({ user: { ...s.user, ...data } }))
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },
}))

export default useUserStore
