import { create } from 'zustand'
import { supabase } from '../lib/supabase'
const useUserStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────────
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  isDemoMode: false,
  transactions: [],

  // ── Session ─────────────────────────────────────────────────
  setSession: (session) => {
    set({ session, isAuthenticated: !!session, isLoading: false })
    if (session) get().fetchProfile(session.user.id)
  },

  /** Load user profile from Supabase */
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
      set({ user: null })
    }
  },

  /** Subscribe to realtime profile updates (cash, reputation) */
  subscribeToProfile: (userId) => {
    const channel = supabase
      .channel('profile-realtime-' + userId)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          set((s) => ({ user: { ...s.user, ...payload.new } }))
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  },


  logout: async () => {
    await supabase.auth.signOut().catch(() => {})
    set({ user: null, session: null, isAuthenticated: false, isDemoMode: false, transactions: [] })
  },

  /** Collect offline earnings – calls edge function */
  collectEarnings: async () => {
    const { user } = get()
    if (!user) return 0

    try {
      const { data, error } = await supabase.functions.invoke('collect-offline', { body: {} })
      if (error) throw error
      const earned = data?.earned || 0
      // Profile cash updated by realtime subscription; also update locally
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

  /** Fetch transaction history */
  fetchTransactions: async (limit = 50) => {
    const { user } = get()
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      set({ transactions: data || [] })
    } catch {
      // keep existing
    }
  },

  /** Subscribe to new transactions */
  subscribeToTransactions: (userId) => {
    const channel = supabase
      .channel('transactions-realtime-' + userId)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          set((s) => ({ transactions: [payload.new, ...s.transactions].slice(0, 100) }))
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  updateCash: (delta) =>
    set((s) => ({ user: { ...s.user, cash: (parseFloat(s.user?.cash || 0) + delta) } })),

  /** Update username in profile */
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
      set((s) => ({ user: { ...s.user, ...data } }))
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },
}))

export default useUserStore
