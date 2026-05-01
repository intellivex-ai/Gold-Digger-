import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

const BM_ITEMS = [
  { id: '1', name: 'Smuggled Tech Components', risk_level: 0.18, cost: 5000, max_payout: 22500, description: 'High-grade chips, no questions asked.' },
  { id: '2', name: 'Insider Market Data',      risk_level: 0.12, cost: 2000, max_payout: 6400, description: 'Stolen financial forecasts. Very illegal.' },
  { id: '3', name: 'Ghost Shell Company',      risk_level: 0.25, cost: 15000, max_payout: 90000, description: 'Offshore shell for tax evasion.' },
  { id: '4', name: 'Stolen Patents',           risk_level: 0.20, cost: 8000, max_payout: 40000, description: 'IP theft. Massive upside, massive risk.' },
  { id: '5', name: 'Crypto Washing',           risk_level: 0.08, cost: 1000, max_payout: 2500, description: 'Clean dirty coins through the mixer.' },
]

const useBlackMarketStore = create(persist((set, get) => ({
  items: [],
  runs: [],
  isLoading: false,

  fetchItems: async () => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.from('black_market_items').select('*')
      if (error) throw error
      set({ items: data || [], isLoading: false })
    } catch {
      set({ items: BM_ITEMS, isLoading: false })
    }
  },

  fetchRuns: async (userId) => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('black_market_runs')
        .select('*')
        .eq('user_id', userId)
        .order('run_at', { ascending: false })
        .limit(20)
      if (error) throw error
      set({ runs: data || [] })
    } catch { /* demo */ }
  },

  runOperation: async (itemId, userId) => {
    const { items } = get()
    const item = items.find(i => i.id === itemId)
    if (!item) throw new Error('Item not found')
    
    // Demo delay
    await new Promise(r => setTimeout(r, 1500))

    const isBusted = Math.random() < item.risk_level
    const payout = isBusted ? 0 : item.max_payout
    const bustFine = isBusted ? item.cost * 1.5 : 0

    return {
      success: !isBusted,
      message: isBusted ? `You were caught! Fine: $${bustFine}` : 'Successfully moved the goods!',
      payout,
      bustFine
    }
  },


  getSuccessRate: () => {
    const { runs } = get()
    if (!runs.length) return null
    const successes = runs.filter(r => r.outcome === 'success').length
    return Math.round((successes / runs.length) * 100)
  },

  getTotalEarned: () => get().runs
    .filter(r => r.outcome === 'success')
    .reduce((sum, r) => sum + parseFloat(r.profit || 0), 0),
}), { name: 'blackmarket-storage' }))

export default useBlackMarketStore
