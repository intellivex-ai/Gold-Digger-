import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

const MOCK_LISTINGS = [
  { id: '1', seller_id: 'u1', item_type: 'business', item_id: 'b1', item_meta: { name: 'Tech Corp Lv.8', type: 'tech', level: 8 }, start_price: 50000, current_bid: 62000, buyout_price: 100000, status: 'active', ends_at: new Date(Date.now() + 3600000 * 5).toISOString(), seller: { username: 'WolfKing' } },
  { id: '2', seller_id: 'u2', item_type: 'stock_bundle', item_id: 's1', item_meta: { symbol: 'NVDA', quantity: 50 }, start_price: 20000, current_bid: 21500, buyout_price: null, status: 'active', ends_at: new Date(Date.now() + 3600000 * 12).toISOString(), seller: { username: 'StockWizard' } },
  { id: '3', seller_id: 'u3', item_type: 'manager', item_id: 'm1', item_meta: { name: 'Victoria Vance', role: 'ceo', rarity: 'rare' }, start_price: 5000, current_bid: 5000, buyout_price: 15000, status: 'active', ends_at: new Date(Date.now() + 3600000 * 2).toISOString(), seller: { username: 'Tycoon99' } },
]

const useAuctionStore = create(persist((set, get) => ({
  listings: [],
  myListings: [],
  isLoading: false,

  fetchListings: async () => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('auction_listings')
        .select('*, seller:profiles!seller_id(username)')
        .eq('status', 'active')
        .gt('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: true })
      if (error) throw error
      set({ listings: data || [], isLoading: false })
    } catch {
      set({ listings: MOCK_LISTINGS, isLoading: false })
    }
  },

  placeBid: async (listingId, amount, userId) => {
    const { listings } = get()
    const listing = listings.find(l => l.id === listingId)
    if (!listing) return { success: false, message: 'Listing not found' }
    if (amount <= parseFloat(listing.current_bid)) return { success: false, message: 'Bid must be higher than current bid' }

    try {
      const { error } = await supabase
        .from('auction_listings')
        .update({ current_bid: amount, top_bidder_id: userId })
        .eq('id', listingId)
      if (error) throw error
    } catch { /* demo */ }

    set(s => ({
      listings: s.listings.map(l => l.id === listingId ? { ...l, current_bid: amount, top_bidder_id: userId } : l)
    }))
    return { success: true }
  },

  buyout: async (listingId, userId) => {
    const { listings } = get()
    const listing = listings.find(l => l.id === listingId)
    if (!listing?.buyout_price) return { success: false, message: 'No buyout price' }

    try {
      await supabase.from('auction_listings').update({ status: 'ended', top_bidder_id: userId, current_bid: listing.buyout_price }).eq('id', listingId)
    } catch { /* demo */ }

    set(s => ({ listings: s.listings.filter(l => l.id !== listingId) }))
    return { success: true }
  },

  listItem: async (sellerId, itemType, itemId, itemMeta, startPrice, buyoutPrice) => {
    const newListing = {
      seller_id: sellerId, item_type: itemType, item_id: itemId,
      item_meta: itemMeta, start_price: startPrice, current_bid: startPrice,
      buyout_price: buyoutPrice, status: 'active',
      ends_at: new Date(Date.now() + 86400000).toISOString(),
    }
    try {
      const { data, error } = await supabase.from('auction_listings').insert(newListing).select().single()
      if (error) throw error
      set(s => ({ listings: [data, ...s.listings] }))
      return { success: true, data }
    } catch {
      const mock = { ...newListing, id: Date.now().toString() }
      set(s => ({ listings: [mock, ...s.listings] }))
      return { success: true, data: mock }
    }
  },

  subscribeToAuctions: () => {
    // Demo implementation
    return () => {}
  },
}), { name: 'auction-storage' }))

export default useAuctionStore
