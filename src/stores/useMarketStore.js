import { create } from 'zustand'
import { supabase, callEdgeFunction } from '../lib/supabase'
const useMarketStore = create((set, get) => ({
  stocks: [],                  // start empty – fetchStocks() populates on mount
  marketplaceOrders: [],       // start empty – fetchMarketplace() populates
  portfolio: [],
  limitOrders: [],
  watchlist: ['AAPL', 'TSLA', 'NVDA'],
  isLoading: false,
  isLoadingPortfolio: false,
  isLoadingMarketplace: false,
  searchQuery: '',

  setSearchQuery: (q) => set({ searchQuery: q }),

  // ── Fetch stocks from Supabase ─────────
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

  // ── Subscribe to realtime stock updates ───────────────────
  subscribeToStocks: () => {
    const channel = supabase
      .channel('stocks-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stocks' }, (payload) => {
        const updated = payload.new
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

  /** Update a single stock price from realtime subscription */
  updateStockPrice: (symbol, price, changePercent) => {
    set((s) => ({
      stocks: s.stocks.map((st) =>
        st.symbol === symbol
          ? { ...st, price, change_percent: changePercent, change: +(price * changePercent / 100).toFixed(2) }
          : st
      ),
    }))
  },

  // ── Portfolio ──────────────────────────────────────────────
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

  // ── Marketplace ────────────────────────────────────────────
  fetchMarketplace: async () => {
    set({ isLoadingMarketplace: true })
    try {
      const { data, error } = await supabase
        .from('marketplace_orders')
        .select('*, seller:profiles(username)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) throw error
      set({ marketplaceOrders: data || [], isLoadingMarketplace: false })
    } catch {
      set({ marketplaceOrders: [], isLoadingMarketplace: false })
    }
  },

  // ── Subscribe to marketplace realtime ─────────────────────
  subscribeToMarketplace: () => {
    const channel = supabase
      .channel('marketplace-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_orders' }, () => {
        get().fetchMarketplace()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  // ── Stock trading ──────────────────────────────────────────
  buyStock: async (symbol, quantity, orderType = 'market', limitPrice) => {
    try {
      const data = await callEdgeFunction('stock-trade', { symbol, quantity, side: 'buy', orderType, limitPrice })
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  sellStock: async (symbol, quantity, orderType = 'market', limitPrice) => {
    try {
      const data = await callEdgeFunction('stock-trade', { symbol, quantity, side: 'sell', orderType, limitPrice })
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  // ── Marketplace buy ────────────────────────────────────────
  buyMarketplaceItem: async (orderId) => {
    try {
      const data = await callEdgeFunction('marketplace-buy', { orderId })
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  // ── Create marketplace listing ────────────────────────────
  createMarketplaceOrder: async (order) => {
    const tempOrder = { ...order, id: 'temp-' + Date.now(), status: 'active' }
    set((s) => ({ marketplaceOrders: [tempOrder, ...s.marketplaceOrders] }))
    try {
      const { data, error } = await supabase.from('marketplace_orders').insert(order).select().single()
      if (error) throw error
      set((s) => ({
        marketplaceOrders: s.marketplaceOrders.map((o) => o.id === tempOrder.id ? data : o),
      }))
      return { success: true, data }
    } catch (e) {
      set((s) => ({ marketplaceOrders: s.marketplaceOrders.filter((o) => o.id !== tempOrder.id) }))
      return { success: false, message: e.message }
    }
  },

  // ── Cancel own listing ────────────────────────────────────
  cancelMarketplaceOrder: async (orderId) => {
    try {
      const { error } = await supabase
        .from('marketplace_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
      if (error) throw error
      set((s) => ({
        marketplaceOrders: s.marketplaceOrders.filter((o) => o.id !== orderId),
      }))
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  toggleWatchlist: (symbol) => {
    set((s) => ({
      watchlist: s.watchlist.includes(symbol)
        ? s.watchlist.filter((s) => s !== symbol)
        : [...s.watchlist, symbol],
    }))
  },

  getFilteredStocks: () => {
    const { stocks, searchQuery } = get()
    if (!searchQuery) return stocks
    const q = searchQuery.toUpperCase()
    return stocks.filter((s) => s.symbol.includes(q) || (s.name ?? '').toUpperCase().includes(q))
  },

  getStockBySymbol: (symbol) => get().stocks.find((s) => s.symbol === symbol) || null,
  getPortfolioPosition: (symbol) => get().portfolio.find((p) => p.symbol === symbol) || null,

  /** 
   * Starts a local "visual ticker" simulation.
   * This adds tiny random fluctuations to the prices in memory to make the UI feel alive.
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

          // Extreme safety check
          if (isNaN(newPrice) || newPrice <= 0) newPrice = parseFloat(s.price || 150)
          if (isNaN(newChange)) newChange = parseFloat(s.change_percent || 0)

          return {
            ...s,
            price: newPrice.toFixed(2),
            change_percent: newChange.toFixed(2)
          }
        })
      })
    }, 2500)
    return () => clearInterval(interval)
  }
}))

export default useMarketStore
