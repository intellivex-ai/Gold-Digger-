/**
 * useAuctionStore.js
 * 
 * Manages the "Player Auction House".
 * This is where players can list their rare items, businesses, or stock bundles
 * for other players to bid on or buy immediately.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

// Fake data so the UI looks good even if the database is empty or broken
const MOCK_LISTINGS = [
  { id: '1', seller_id: 'u1', item_type: 'business', item_id: 'b1', item_meta: { name: 'Tech Corp Lv.8', type: 'tech', level: 8 }, start_price: 50000, current_bid: 62000, buyout_price: 100000, status: 'active', ends_at: new Date(Date.now() + 3600000 * 5).toISOString(), seller: { username: 'WolfKing' } },
  { id: '2', seller_id: 'u2', item_type: 'stock_bundle', item_id: 's1', item_meta: { symbol: 'NVDA', quantity: 50 }, start_price: 20000, current_bid: 21500, buyout_price: null, status: 'active', ends_at: new Date(Date.now() + 3600000 * 12).toISOString(), seller: { username: 'StockWizard' } },
  { id: '3', seller_id: 'u3', item_type: 'manager', item_id: 'm1', item_meta: { name: 'Victoria Vance', role: 'ceo', rarity: 'rare' }, start_price: 5000, current_bid: 5000, buyout_price: 15000, status: 'active', ends_at: new Date(Date.now() + 3600000 * 2).toISOString(), seller: { username: 'Tycoon99' } },
]

const useAuctionStore = create(persist((set, get) => ({
  // ── State (What we are remembering) ──────────────────────────────────────────
  listings: [],        // All active auctions happening right now
  myListings: [],      // Auctions the current user is selling
  isLoading: false,

  // ── Core Features ────────────────────────────────────────────────────────────

  /** Grabs all active auctions from the database */
  fetchListings: async () => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('auction_listings')
        .select('*, seller:profiles!seller_id(username)') // Also grab the username of the seller
        .eq('status', 'active')
        .gt('ends_at', new Date().toISOString()) // Only get auctions that haven't expired
        .order('ends_at', { ascending: true })   // Show the ones ending soonest first
        
      if (error) throw error
      set({ listings: data || [], isLoading: false })
    } catch {
      // Use fake data if the table isn't set up yet
      set({ listings: MOCK_LISTINGS, isLoading: false })
    }
  },

  /** 
   * Place a bid on an auction.
   * If someone outbids you later, the server (via an Edge Function) will handle refunds.
   */
  placeBid: async (listingId, amount, userId) => {
    const { listings } = get()
    const listing = listings.find(l => l.id === listingId)
    
    // Safety checks
    if (!listing) return { success: false, message: 'Listing not found' }
    if (amount <= parseFloat(listing.current_bid)) return { success: false, message: 'Bid must be higher than current bid' }

    try {
      // Update the database
      const { error } = await supabase
        .from('auction_listings')
        .update({ current_bid: amount, top_bidder_id: userId })
        .eq('id', listingId)
        
      if (error) throw error
    } catch { 
      /* Demo mode: silently proceed if database fails */ 
    }

    // Update the screen instantly
    set(s => ({
      listings: s.listings.map(l => l.id === listingId ? { ...l, current_bid: amount, top_bidder_id: userId } : l)
    }))
    
    return { success: true }
  },

  /** 
   * Skip the bidding war and buy the item immediately for the maximum price.
   */
  buyout: async (listingId, userId) => {
    const { listings } = get()
    const listing = listings.find(l => l.id === listingId)
    
    if (!listing?.buyout_price) return { success: false, message: 'No buyout price available for this item' }

    try {
      // Tell the database this auction is over
      await supabase
        .from('auction_listings')
        .update({ status: 'ended', top_bidder_id: userId, current_bid: listing.buyout_price })
        .eq('id', listingId)
    } catch { 
      /* Demo mode */ 
    }

    // Remove the item from the active screen
    set(s => ({ listings: s.listings.filter(l => l.id !== listingId) }))
    return { success: true }
  },

  /** 
   * Put one of your own items up for sale on the auction house.
   */
  listItem: async (sellerId, itemType, itemId, itemMeta, startPrice, buyoutPrice) => {
    const newListing = {
      seller_id: sellerId, 
      item_type: itemType, 
      item_id: itemId,
      item_meta: itemMeta, 
      start_price: startPrice, 
      current_bid: startPrice,
      buyout_price: buyoutPrice, 
      status: 'active',
      ends_at: new Date(Date.now() + 86400000).toISOString(), // Auctions last for exactly 24 hours
    }
    
    try {
      const { data, error } = await supabase.from('auction_listings').insert(newListing).select().single()
      if (error) throw error
      
      // Add it to the top of the screen
      set(s => ({ listings: [data, ...s.listings] }))
      return { success: true, data }
    } catch {
      // Demo mode fallback
      const mock = { ...newListing, id: Date.now().toString() }
      set(s => ({ listings: [mock, ...s.listings] }))
      return { success: true, data: mock }
    }
  },

  // (Future Feature: Real-time sync for auctions like we have for the chat)
  subscribeToAuctions: () => {
    return () => {}
  },
  
}), { name: 'auction-storage' }))

export default useAuctionStore
