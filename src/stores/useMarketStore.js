/**
 * useMarketStore.js
 * 
 * This file manages everything related to the Stock Market and the Player Marketplace.
 * It holds the list of stocks, tracks what the user owns (portfolio), handles buying/selling,
 * and even fakes a "live updating ticker" so the game feels active.
 */

import { create } from 'zustand'
import { supabase, callEdgeFunction } from '../lib/supabase'

const useMarketStore = create((set, get) => ({
  // ── State (What we are remembering) ──────────────────────────────────────────
  stocks: [],                  // List of all stocks in the game
  marketplaceOrders: [],       // List of items players are selling to each other
  portfolio: [],               // What stocks the logged-in user owns
  limitOrders: [],             // Future feature: "Buy when price drops to X"
  watchlist: ['AAPL', 'TSLA', 'NVDA'], // Stocks the user wants to keep an eye on
  isLoading: false,            
  isLoadingPortfolio: false,
  isLoadingMarketplace: false,
  searchQuery: '',             // What the user typed in the stock search bar

  /** Updates the search text for filtering stocks */
  setSearchQuery: (q) => set({ searchQuery: q }),

  // ── Core Data Fetching ───────────────────────────────────────────────────────

  /** 
   * Grabs the real stock prices from our database.
   */
  fetchStocks: async () => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.from('stocks').select('*').order('symbol')
      if (error) throw error
      set({ stocks: data || [], isLoading: false })
    } catch {
      set({ stocks: [], isLoading: false })
    }
  },

  /** 
   * Listens for actual market price updates from the database (e.g. from a real-world API).
   */
  subscribeToStocks: () => {
    const channel = supabase
      .channel('stocks-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stocks' }, (payload) => {
        const updated = payload.new
        
        // Find the specific stock that updated and change its price on the screen
        set((s) => ({
          stocks: s.stocks.map((st) =>
            st.symbol === updated.symbol
              ? { ...st, price: updated.price, change_percent: updated.change_percent, volume: updated.volume }
              : st
          ),
        }))
      })
      .subscribe()
      
    return () => supabase.removeChannel(channel)
  },

  /** 
   * Helper function to manually update a stock's price on screen.
   */
  updateStockPrice: (symbol, price, changePercent) => {
    set((s) => ({
      stocks: s.stocks.map((st) =>
        st.symbol === symbol
          ? { ...st, price, change_percent: changePercent, change: +(price * changePercent / 100).toFixed(2) }
          : st
      ),
    }))
  },

  // ── Portfolio & Player Marketplace ───────────────────────────────────────────

  /** 
   * Gets the list of stocks the user currently owns.
   */
  fetchPortfolio: async (userId) => {
    if (!userId) return
    set({ isLoadingPortfolio: true })
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      set({ portfolio: data || [], isLoadingPortfolio: false })
    } catch {
      set({ isLoadingPortfolio: false })
    }
  },

  /** 
   * Grabs the list of active items players are selling on the marketplace.
   */
  fetchMarketplace: async () => {
    set({ isLoadingMarketplace: true })
    try {
      const { data, error } = await supabase
        .from('marketplace_orders')
        .select('*, seller:profiles(username)')
        .eq('status', 'active')
        .order('created_at', { ascending: false }) // Show newest items first
        if (error) throw error
      set({ marketplaceOrders: data || [], isLoadingMarketplace: false })
    } catch {
      set({ marketplaceOrders: [], isLoadingMarketplace: false })
    }
  },

  /** 
   * Keeps the marketplace screen updated if someone lists a new item or buys one.
   */
  subscribeToMarketplace: () => {
    const channel = supabase
      .channel('marketplace-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_orders' }, () => {
        // Any time anything changes, just grab a fresh list
        get().fetchMarketplace()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  // ── Trading Actions ──────────────────────────────────────────────────────────

  /** 
   * Buy a stock. Uses an Edge Function so users can't cheat their money.
   */
  buyStock: async (symbol, quantity, orderType = 'market', limitPrice) => {
    try {
      const data = await callEdgeFunction('stock-trade', { symbol, quantity, side: 'buy', orderType, limitPrice })
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  /** 
   * Sell a stock. Uses an Edge Function.
   */
  sellStock: async (symbol, quantity, orderType = 'market', limitPrice) => {
    try {
      const data = await callEdgeFunction('stock-trade', { symbol, quantity, side: 'sell', orderType, limitPrice })
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  /** 
   * Buy an item from another player on the marketplace.
   */
  buyMarketplaceItem: async (orderId) => {
    try {
      const data = await callEdgeFunction('marketplace-buy', { orderId })
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  /** 
   * Put an item up for sale on the marketplace.
   */
  createMarketplaceOrder: async (order) => {
    // Show it on the screen immediately before the server even responds (makes app feel fast)
    const tempOrder = { ...order, id: 'temp-' + Date.now(), status: 'active' }
    set((s) => ({ marketplaceOrders: [tempOrder, ...s.marketplaceOrders] }))
    
    try {
      const { data, error } = await supabase.from('marketplace_orders').insert(order).select().single()
      if (error) throw error
      
      // Replace our temporary order with the real one from the server
      set((s) => ({
        marketplaceOrders: s.marketplaceOrders.map((o) => o.id === tempOrder.id ? data : o),
      }))
      return { success: true, data }
    } catch (e) {
      // If it failed, remove the temporary fake order from the screen
      set((s) => ({ marketplaceOrders: s.marketplaceOrders.filter((o) => o.id !== tempOrder.id) }))
      return { success: false, message: e.message }
    }
  },

  /** 
   * Take down an item you listed for sale.
   */
  cancelMarketplaceOrder: async (orderId) => {
    try {
      const { error } = await supabase
        .from('marketplace_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
      if (error) throw error
      
      // Remove it from the screen
      set((s) => ({
        marketplaceOrders: s.marketplaceOrders.filter((o) => o.id !== orderId),
      }))
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  // ── Helper Functions ─────────────────────────────────────────────────────────

  /** Adds or removes a stock from the user's quick-view watchlist */
  toggleWatchlist: (symbol) => {
    set((s) => ({
      watchlist: s.watchlist.includes(symbol)
        ? s.watchlist.filter((sym) => sym !== symbol) // Remove if it's there
        : [...s.watchlist, symbol],                   // Add if it's not
    }))
  },

  /** Returns only the stocks that match what the user typed in the search bar */
  getFilteredStocks: () => {
    const { stocks, searchQuery } = get()
    if (!searchQuery) return stocks
    
    const q = searchQuery.toUpperCase()
    return stocks.filter((s) => s.symbol.includes(q) || (s.name ?? '').toUpperCase().includes(q))
  },

  getStockBySymbol: (symbol) => get().stocks.find((s) => s.symbol === symbol) || null,
  getPortfolioPosition: (symbol) => get().portfolio.find((p) => p.symbol === symbol) || null,

  // ── Visual Tricks ────────────────────────────────────────────────────────────

  /** 
   * Starts a local "visual ticker" simulation.
   * Real stock markets move constantly. We don't want to make thousands of database requests,
   * so we add tiny random fluctuations to the prices directly in memory every 2.5 seconds.
   * This makes the UI flash green and red and feel "alive" without any server cost.
   */
  startLocalSimulation: () => {
    const interval = setInterval(() => {
      const { stocks } = get()
      if (stocks.length === 0) return

      set({
        stocks: stocks.map(s => {
          // Add a tiny jitter (+/- 0.02%)
          const jitter = 1 + (Math.random() - 0.5) * 0.0004
          let newPrice = parseFloat(s.price || 0) * jitter
          
          // Slightly drift the change percent too
          const drift = (Math.random() - 0.5) * 0.01
          let newChange = parseFloat(s.change_percent || 0) + drift

          // Extreme safety check: If a price breaks, reset it to something normal
          if (isNaN(newPrice) || newPrice <= 0) newPrice = parseFloat(s.price || 150)
          if (isNaN(newChange)) newChange = parseFloat(s.change_percent || 0)

          return {
            ...s,
            price: Number(newPrice.toFixed(2)),
            change_percent: Number(newChange.toFixed(2))
          }
        })
      })
    }, 2500)
    
    // Return a function to stop the fake ticking if we leave the page
    return () => clearInterval(interval)
  }
}))

export default useMarketStore
