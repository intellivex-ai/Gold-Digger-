import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import useSocialStore from '../stores/useSocialStore'
import useMarketStore from '../stores/useMarketStore'
import useUserStore from '../stores/useUserStore'

/**
 * useRealtimeSubscription
 * 
 * This hook sets up live connections to the database (Supabase).
 * It listens for database changes (like a stock price updating) and instantly
 * updates the local app state so the user sees the changes without refreshing.
 * 
 * @param {string} userId - The ID of the currently logged-in user
 */
export function useRealtimeSubscription(userId) {
  const channelRef = useRef(null)
  const presenceRef = useRef(null)

  // ── 1. PUBLIC SUBSCRIPTIONS (Things everyone sees) ───────────────────────
  useEffect(() => {
    // Create a generic "public" channel
    const publicChannel = supabase
      .channel('empire-hub-public')

      // Listen for any UPDATE to the "stocks" table
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'stocks',
      }, (payload) => {
        // When a stock changes, tell our market store to update the UI
        const { symbol, price, change_percent } = payload.new
        useMarketStore.getState().updateStockPrice(symbol, price, change_percent)
      })

      // Listen for ANY change (INSERT, UPDATE, DELETE) to the marketplace
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'marketplace_orders',
      }, () => {
        // When the market changes, just fetch the fresh list
        useMarketStore.getState().fetchMarketplace()
      })

      // Start listening!
      .subscribe()

    // When the app closes, remove the channel
    return () => supabase.removeChannel(publicChannel)
  }, []) // Empty array = never restart this public listener

  // ── 2. PRIVATE SUBSCRIPTIONS (Things only this user sees) ────────────────
  useEffect(() => {
    // If they aren't logged in, don't set up private listeners
    if (!userId) return

    // Create a specific channel just for this user
    const userChannel = supabase
      .channel('empire-hub-user-' + userId)

      // Listen for updates to THEIR profile (e.g., cash increasing)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`, // ONLY listen to this specific user's row
      }, (payload) => {
        // Update their cash/stats in the local store
        useUserStore.setState((s) => ({ user: { ...s.user, ...payload.new } }))
      })

      // Listen for new transactions (e.g., buying something)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        // Add the new transaction to the top of the list
        useUserStore.setState((s) => ({
          transactions: [payload.new, ...(s.transactions || [])].slice(0, 100),
        }))
      })
      
      // Listen for changes to friendships (someone accepts a request)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
        // Note: No filter here, but fetchFriends() uses the user's ID securely
      }, () => {
        useSocialStore.getState().fetchFriends()
      })

      .subscribe()

    channelRef.current = userChannel

    // Clean up when the user logs out
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [userId]) // Re-run this if the userId changes (log out / log in)

  // ── 3. PRESENCE (Who is online right now?) ───────────────────────────────
  useEffect(() => {
    if (!userId) return

    // Create a special presence channel
    const presenceChannel = supabase.channel('global-presence', {
      config: { presence: { key: userId } },
    })

    presenceChannel
      // When anyone joins or leaves, this "sync" event fires
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        // state is an object where keys are user IDs. We grab the keys to get a list of online IDs.
        const onlineIds = Object.keys(state)
        useSocialStore.setState({ onlineUsers: onlineIds })
      })
      // Start the channel, and when connected, announce that WE are online
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          })
        }
      })

    presenceRef.current = presenceChannel

    // Clean up when logging out (removes us from the online list)
    return () => {
      if (presenceRef.current) supabase.removeChannel(presenceRef.current)
    }
  }, [userId])
}
