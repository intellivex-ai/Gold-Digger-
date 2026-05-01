/**
 * useBlackMarketStore.js
 * 
 * Manages the "Black Market" mini-game.
 * Players can attempt high-risk, high-reward smuggling operations.
 * If they succeed, they get a lot of money. If they get busted, they pay a massive fine.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import useUserStore from './useUserStore'

// Fake fallback items if the database isn't populated
const BM_ITEMS = [
  { id: '1', name: 'Smuggled Tech Components', risk_level: 0.18, cost: 5000, max_payout: 22500, description: 'High-grade chips, no questions asked.' },
  { id: '2', name: 'Insider Market Data',      risk_level: 0.12, cost: 2000, max_payout: 6400, description: 'Stolen financial forecasts. Very illegal.' },
  { id: '3', name: 'Ghost Shell Company',      risk_level: 0.25, cost: 15000, max_payout: 90000, description: 'Offshore shell for tax evasion.' },
  { id: '4', name: 'Stolen Patents',           risk_level: 0.20, cost: 8000, max_payout: 40000, description: 'IP theft. Massive upside, massive risk.' },
  { id: '5', name: 'Crypto Washing',           risk_level: 0.08, cost: 1000, max_payout: 2500, description: 'Clean dirty coins through the mixer.' },
]

const useBlackMarketStore = create(persist((set, get) => ({
  // ── State (What we are remembering) ──────────────────────────────────────────
  items: [],         // The list of illegal operations available right now
  runs: [],          // The user's history of past smuggling attempts
  isLoading: false,

  // ── Core Features ────────────────────────────────────────────────────────────

  /** Get the list of available black market operations from the database */
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

  /** Get the history of all the operations this specific user has attempted */
  fetchRuns: async (userId) => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('black_market_runs')
        .select('*')
        .eq('user_id', userId)
        .order('run_at', { ascending: false }) // Newest first
        .limit(20) // Only keep the last 20 so the phone doesn't freeze
        
      if (error) throw error
      set({ runs: data || [] })
    } catch { 
      /* Demo mode */ 
    }
  },

  /**
   * Attempt a Black Market Operation!
   * This is where the risk math happens.
   */
  runOperation: async (itemId, userId) => {
    const { items } = get()
    const item = items.find(i => i.id === itemId)
    if (!item) throw new Error('Item not found')
    
    // Add a fake 1.5 second delay to build suspense before giving the result
    await new Promise(r => setTimeout(r, 1500))

    // ── The Math ──
    // Math.random() is between 0 and 1. If risk is 0.20 (20%), we bust if random < 0.20
    const isBusted = Math.random() < item.risk_level
    
    // If busted, payout is 0. If successful, payout is max_payout.
    const payout = isBusted ? 0 : item.max_payout
    
    // If busted, the fine is 1.5x what they paid. If successful, no fine.
    const bustFine = isBusted ? item.cost * 1.5 : 0
    
    // Calculate total money gained/lost
    const netProfit = payout - item.cost - bustFine
    
    // Actually add/remove the cash from the user's wallet
    useUserStore.getState().updateCash(netProfit)

    // Create a receipt for this run
    const runRecord = {
      id: Date.now().toString(),
      item_id: itemId,
      user_id: userId,
      outcome: isBusted ? 'busted' : 'success',
      profit: netProfit,
      run_at: new Date().toISOString()
    }
    
    // Save it to our local history list (keeping max 50)
    set(s => ({ runs: [runRecord, ...s.runs].slice(0, 50) }))

    // Tell the UI what happened so it can show a nice alert
    return {
      success: !isBusted,
      message: isBusted ? `You were caught! Fine: $${bustFine}` : 'Successfully moved the goods!',
      payout,
      bustFine
    }
  },

  // ── Helper Functions ─────────────────────────────────────────────────────────

  /** Calculates what percentage of the time the user succeeds */
  getSuccessRate: () => {
    const { runs } = get()
    if (!runs.length) return null
    
    const successes = runs.filter(r => r.outcome === 'success').length
    return Math.round((successes / runs.length) * 100)
  },

  /** Calculates the total amount of money earned strictly from successful runs */
  getTotalEarned: () => get().runs
    .filter(r => r.outcome === 'success')
    .reduce((sum, r) => sum + parseFloat(r.profit || 0), 0),
    
}), { name: 'blackmarket-storage' })) // Saves their history locally for Demo Mode

export default useBlackMarketStore
