import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

const MOCK_ASSETS = [
  { symbol: 'EMPX',  name: 'Empire Token', price: 420.69,  change_24h:  12.34, market_cap: 42069000, volatility: 0.35, can_stake: true,  stake_apy: 18.5 },
  { symbol: 'DARKC', name: 'DarkCoin',     price:   0.003, change_24h:  -8.20, market_cap:  3000000, volatility: 0.80, can_stake: false, stake_apy: 0 },
  { symbol: 'HYPE',  name: 'HypeCoin',     price: 150.00,  change_24h:  45.00, market_cap: 15000000, volatility: 0.90, can_stake: false, stake_apy: 0 },
  { symbol: 'VAULTX',name: 'VaultX',       price:  88.50,  change_24h:   2.10, market_cap:  8850000, volatility: 0.20, can_stake: true,  stake_apy: 12.0 },
  { symbol: 'RUGZ',  name: 'RugZilla',     price:   0.50,  change_24h:  -2.50, market_cap:   500000, volatility: 0.99, can_stake: false, stake_apy: 0 },
  { symbol: 'GOLDX', name: 'Gold Coin',    price:   1.00,  change_24h:   0.00, market_cap: 10000000, volatility: 0.05, can_stake: false, stake_apy: 0 },
]

const useCryptoStore = create(persist((set, get) => ({
  assets: [],
  portfolio: [],   // { symbol, quantity, avg_price, staked_qty }
  isLoading: false,
  priceHistory: {}, // symbol -> [{ time, price }]

  fetchAssets: async () => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.from('crypto_assets').select('*').order('market_cap', { ascending: false })
      if (error) throw error
      set({ assets: data || [], isLoading: false })
    } catch {
      set({ assets: MOCK_ASSETS, isLoading: false })
    }
  },

  fetchPortfolio: async (userId) => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('crypto_portfolios')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      set({ portfolio: data || [] })
    } catch { /* keep */ }
  },

  buyCrypto: async (symbol, usdAmount) => {
    const { assets } = get()
    const asset = assets.find(a => a.symbol === symbol)
    if (!asset) return { success: false, message: 'Asset not found' }
    const qty = usdAmount / parseFloat(asset.price)

    // Rug pull check
    if (asset.symbol === 'RUGZ' && Math.random() < 0.15) {
      return { success: false, message: '💀 RUG PULL! Your investment vanished instantly.' }
    }

    try {
      // Deduct cash from profile (via RPC or direct update — simplified)
      const { error } = await supabase.rpc('crypto_buy', { p_symbol: symbol, p_usd: usdAmount }).catch(() => ({ error: true }))
      if (error) throw new Error('RPC unavailable — demo mode')

      set(s => ({
        portfolio: s.portfolio.some(p => p.symbol === symbol)
          ? s.portfolio.map(p => p.symbol === symbol
              ? { ...p, quantity: p.quantity + qty, avg_price: (p.avg_price * p.quantity + usdAmount) / (p.quantity + qty) }
              : p)
          : [...s.portfolio, { symbol, quantity: qty, avg_price: asset.price, staked_qty: 0 }]
      }))
      return { success: true, qty }
    } catch {
      // Demo mode — just update local state
      set(s => ({
        portfolio: s.portfolio.some(p => p.symbol === symbol)
          ? s.portfolio.map(p => p.symbol === symbol
              ? { ...p, quantity: p.quantity + qty, avg_price: (p.avg_price * p.quantity + usdAmount) / (p.quantity + qty) }
              : p)
          : [...s.portfolio, { symbol, quantity: qty, avg_price: asset.price, staked_qty: 0 }]
      }))
      return { success: true, qty }
    }
  },

  sellCrypto: async (symbol, qty) => {
    const { assets, portfolio } = get()
    const asset = assets.find(a => a.symbol === symbol)
    const holding = portfolio.find(p => p.symbol === symbol)
    if (!asset || !holding || holding.quantity < qty) return { success: false, message: 'Insufficient holdings' }
    const proceeds = qty * parseFloat(asset.price)

    set(s => ({
      portfolio: s.portfolio.map(p =>
        p.symbol === symbol ? { ...p, quantity: p.quantity - qty } : p
      ).filter(p => p.quantity > 0)
    }))
    return { success: true, proceeds }
  },

  /** Simulate price movement locally */
  simulatePrices: () => {
    const interval = setInterval(() => {
      set(s => ({
        assets: s.assets.map(a => {
          const vol = parseFloat(a.volatility || 0.15)
          const swing = (Math.random() - 0.5) * 2 * vol * parseFloat(a.price)
          const newPrice = Math.max(0.0001, parseFloat(a.price) + swing)
          const change = ((newPrice - parseFloat(a.price)) / parseFloat(a.price)) * 100
          return { ...a, price: newPrice, change_24h: change }
        })
      }))
    }, 4000)
    return () => clearInterval(interval)
  },

  getHolding: (symbol) => get().portfolio.find(p => p.symbol === symbol) || null,
  getTotalValue: () => {
    const { assets, portfolio } = get()
    return portfolio.reduce((sum, p) => {
      const asset = assets.find(a => a.symbol === p.symbol)
      return sum + (asset ? parseFloat(asset.price) * p.quantity : 0)
    }, 0)
  },
}), { name: 'crypto-storage' }))

export default useCryptoStore
