/**
 * useCryptoStore.js
 * 
 * Manages the cryptocurrency market in the game.
 * Crypto in this game is highly volatile and entirely simulated locally.
 * It includes funny mechanics like random "Rug Pulls" where coins go to zero.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware' // Lets us save data to the browser's local storage
import { supabase } from '../lib/supabase'

// Fake fallback data in case the database isn't set up yet
const MOCK_ASSETS = [
  { symbol: 'EMPX',  name: 'Empire Token', price: 420.69,  change_24h:  12.34, market_cap: 42069000, volatility: 0.35, can_stake: true,  stake_apy: 18.5 },
  { symbol: 'DARKC', name: 'DarkCoin',     price:   0.003, change_24h:  -8.20, market_cap:  3000000, volatility: 0.80, can_stake: false, stake_apy: 0 },
  { symbol: 'HYPE',  name: 'HypeCoin',     price: 150.00,  change_24h:  45.00, market_cap: 15000000, volatility: 0.90, can_stake: false, stake_apy: 0 },
  { symbol: 'VAULTX',name: 'VaultX',       price:  88.50,  change_24h:   2.10, market_cap:  8850000, volatility: 0.20, can_stake: true,  stake_apy: 12.0 },
  { symbol: 'RUGZ',  name: 'RugZilla',     price:   0.50,  change_24h:  -2.50, market_cap:   500000, volatility: 0.99, can_stake: false, stake_apy: 0 },
  { symbol: 'GOLDX', name: 'Gold Coin',    price:   1.00,  change_24h:   0.00, market_cap: 10000000, volatility: 0.05, can_stake: false, stake_apy: 0 },
]

const useCryptoStore = create(persist((set, get) => ({
  // ── State (What we are remembering) ──────────────────────────────────────────
  assets: [],        // List of all cryptos available to buy
  portfolio: [],     // The user's wallet: { symbol, quantity, avg_price, staked_qty }
  isLoading: false,
  priceHistory: {},  // Used for drawing mini charts

  // ── Core Features ────────────────────────────────────────────────────────────

  /** Grab available crypto coins from the database */
  fetchAssets: async () => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.from('crypto_assets').select('*').order('market_cap', { ascending: false })
      if (error) throw error
      set({ assets: data || [], isLoading: false })
    } catch {
      // If the table is missing, just use our fake ones
      set({ assets: MOCK_ASSETS, isLoading: false })
    }
  },

  /** Grab the user's specific crypto holdings */
  fetchPortfolio: async (userId) => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('crypto_portfolios')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      set({ portfolio: data || [] })
    } catch { 
      /* silently ignore errors and keep existing state */ 
    }
  },

  /** Buy some crypto using cash */
  buyCrypto: async (symbol, usdAmount) => {
    const { assets } = get()
    const asset = assets.find(a => a.symbol === symbol)
    if (!asset) return { success: false, message: 'Asset not found' }
    
    // Calculate how many coins they get for their money
    const qty = usdAmount / parseFloat(asset.price)

    // FUN FEATURE: Rug Pull Check
    // If they buy RugZilla, there's a 15% chance it goes to zero instantly.
    if (asset.symbol === 'RUGZ' && Math.random() < 0.15) {
      return { success: false, message: '💀 RUG PULL! Your investment vanished instantly.' }
    }

    try {
      // Attempt to charge the user's account via the database
      const { error } = await supabase.rpc('crypto_buy', { p_symbol: symbol, p_usd: usdAmount }).catch(() => ({ error: true }))
      
      // If the database function isn't set up yet, fallback to local Demo Mode
      if (error) throw new Error('RPC unavailable — demo mode')

      // Database charge worked, now update the screen locally
      set(s => ({
        portfolio: s.portfolio.some(p => p.symbol === symbol)
          ? s.portfolio.map(p => p.symbol === symbol
              ? { ...p, quantity: p.quantity + qty, avg_price: (p.avg_price * p.quantity + usdAmount) / (p.quantity + qty) }
              : p)
          : [...s.portfolio, { symbol, quantity: qty, avg_price: asset.price, staked_qty: 0 }]
      }))
      return { success: true, qty }
    } catch {
      // ── Demo Mode Fallback ──
      // If database is broken, just let them buy it locally for fun
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

  /** Sell crypto back for cash */
  sellCrypto: async (symbol, qty) => {
    const { assets, portfolio } = get()
    const asset = assets.find(a => a.symbol === symbol)
    const holding = portfolio.find(p => p.symbol === symbol)
    
    // Prevent selling coins they don't own
    if (!asset || !holding || holding.quantity < qty) return { success: false, message: 'Insufficient holdings' }
    
    const proceeds = qty * parseFloat(asset.price)

    // Update screen to remove the coins
    set(s => ({
      portfolio: s.portfolio.map(p =>
        p.symbol === symbol ? { ...p, quantity: p.quantity - qty } : p
      ).filter(p => p.quantity > 0) // Remove entirely if they sold all of it
    }))
    return { success: true, proceeds }
  },

  /** 
   * Simulate wild price movements locally.
   * Crypto changes rapidly every 4 seconds based on its specific "volatility" score.
   */
  simulatePrices: () => {
    const interval = setInterval(() => {
      set(s => ({
        assets: s.assets.map(a => {
          // Keep track of a "base" price so it doesn't drift to infinity
          const basePrice = a.base_price || parseFloat(a.price) || 1
          const vol = parseFloat(a.volatility || 0.15) // High volatility = massive swings
          
          // Random math to simulate market chaos
          const swing = (Math.random() - 0.5) * 0.05 * vol * basePrice
          let newPrice = parseFloat(a.price) + swing
          
          // Rubber-band effect: Pull the price back if it goes too far from base
          if (newPrice > basePrice * 1.5) newPrice -= Math.abs(swing) * 2
          if (newPrice < basePrice * 0.5) newPrice += Math.abs(swing) * 2
          
          // Price can never go below $0.0001
          newPrice = Math.max(0.0001, newPrice)
          const change = ((newPrice - basePrice) / basePrice) * 100
          
          return { ...a, base_price: basePrice, price: newPrice, change_24h: change }
        })
      }))
    }, 4000)
    
    return () => clearInterval(interval)
  },

  // ── Helper Functions ─────────────────────────────────────────────────────────

  getHolding: (symbol) => get().portfolio.find(p => p.symbol === symbol) || null,
  
  /** Sum up the USD value of every crypto coin the user holds */
  getTotalValue: () => {
    const { assets, portfolio } = get()
    return portfolio.reduce((sum, p) => {
      const asset = assets.find(a => a.symbol === p.symbol)
      return sum + (asset ? parseFloat(asset.price) * p.quantity : 0)
    }, 0)
  },
  
}), { name: 'crypto-storage' })) // This saves the wallet to the browser so demo mode remembers purchases

export default useCryptoStore
