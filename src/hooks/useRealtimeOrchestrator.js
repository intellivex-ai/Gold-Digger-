/**
 * useRealtimeOrchestrator.js
 * 
 * This hook is like a switchboard operator. When a user logs in, it 
 * automatically connects all their live data streams (chat, business income, etc.).
 * When they log out, it disconnects everything so we don't waste data.
 */

import { useEffect, useRef } from 'react'
import useUserStore from '../stores/useUserStore'
import useMarketStore from '../stores/useMarketStore'
import useBusinessStore from '../stores/useBusinessStore'
import useSocialStore from '../stores/useSocialStore'

export function useRealtimeOrchestrator() {
  // Grab the user's info to see if they are logged in
  const { user, isAuthenticated } = useUserStore()
  
  // Grab the functions needed to start listening for changes
  const { subscribeToStocks, subscribeToMarketplace, fetchStocks, fetchMarketplace } = useMarketStore()
  const { subscribeToBusinesses, fetchBusinesses } = useBusinessStore()
  const { subscribeToCorporation, subscribeToChat, setActiveChatChannel } = useSocialStore()

  // We keep a list of "cleanup" functions so we can turn off listeners later
  const cleanupRef = useRef([])

  // 1. PUBLIC DATA: Things everyone needs to see (Stocks, Marketplace)
  useEffect(() => {
    // Start listening for live changes
    const stockUnsub = subscribeToStocks()
    const marketUnsub = subscribeToMarketplace()
    
    // Also fetch the current data right now so the screen isn't empty
    fetchStocks()
    fetchMarketplace()

    // Save the "turn off" functions
    cleanupRef.current.push(stockUnsub, marketUnsub)

    // When the app closes, turn off the listeners
    return () => {
      cleanupRef.current.forEach((fn) => { try { fn?.() } catch {} })
      cleanupRef.current = []
    }
  }, []) // Empty array means run once when app starts

  // 2. PRIVATE DATA: Things only the logged-in user should see
  useEffect(() => {
    // If they aren't logged in, do nothing
    if (!isAuthenticated || !user?.id) return

    // Turn on user-specific live updates
    const profileUnsub  = useUserStore.getState().subscribeToProfile(user.id)
    const txUnsub       = useUserStore.getState().subscribeToTransactions(user.id)
    const bizUnsub      = subscribeToBusinesses(user.id)
    const chatUnsub     = subscribeToChat('corp') // Listen to the corporation chat by default

    // Fetch initial private data
    fetchBusinesses(user.id)
    setActiveChatChannel('corp')

    // If the user is in a corporation, listen to corporation updates too
    let corpUnsub = () => {}
    if (user.corporation_id) {
      corpUnsub = subscribeToCorporation(user.corporation_id)
      useSocialStore.getState().fetchCorporation(user.corporation_id)
    }

    // When the user logs out or leaves, turn off all their private listeners
    return () => {
      try { profileUnsub?.() } catch {}
      try { txUnsub?.() } catch {}
      try { bizUnsub?.() } catch {}
      try { chatUnsub?.() } catch {}
      try { corpUnsub?.() } catch {}
    }
  }, [isAuthenticated, user?.id, user?.corporation_id]) // Re-run if login status or corporation changes

  // This hook just runs logic in the background, it doesn't draw anything
  return null
}
