import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import useSocialStore from '../stores/useSocialStore'
import useMarketStore from '../stores/useMarketStore'
import useUserStore from '../stores/useUserStore'

/**
 * Sets up Supabase Realtime subscriptions for:
 * - stocks (price updates from cron / Alpaca)
 * - chat_messages
 * - marketplace_orders
 * - corporation_members
 * - profiles (cash / reputation updates)
 * - transactions
 *
 * Replaces the old hook that pointed at the non-existent `market_data` table.
 */
export function useRealtimeSubscription(userId) {
  const channelRef = useRef(null)
  const presenceRef = useRef(null)

  useEffect(() => {
    // Public channels always active (stocks + marketplace)
    const publicChannel = supabase
      .channel('empire-hub-public')

      // ── Stock price updates ────────────────────────────────
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'stocks',   // ← corrected table name
      }, (payload) => {
        const { symbol, price, change_percent } = payload.new
        useMarketStore.getState().updateStockPrice(symbol, price, change_percent)
      })

      // ── Marketplace listings ───────────────────────────────
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'marketplace_orders',
      }, () => {
        useMarketStore.getState().fetchMarketplace()
      })

      .subscribe()

    return () => supabase.removeChannel(publicChannel)
  }, []) // public subscriptions never change

  useEffect(() => {
    if (!userId) return

    const userChannel = supabase
      .channel('empire-hub-user-' + userId)

      // ── Profile updates (cash, reputation) ────────────────
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      }, (payload) => {
        useUserStore.setState((s) => ({ user: { ...s.user, ...payload.new } }))
      })

      // ── New transactions ───────────────────────────────────
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        useUserStore.setState((s) => ({
          transactions: [payload.new, ...(s.transactions || [])].slice(0, 100),
        }))
      })
      
      // ── Friendships updates ────────────────────────────────
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
      }, () => {
        useSocialStore.getState().fetchFriends()
      })

      .subscribe()

    channelRef.current = userChannel

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [userId])

  // ── Presence ───────────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    const presenceChannel = supabase.channel('global-presence', {
      config: { presence: { key: userId } },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const onlineIds = Object.keys(state)
        useSocialStore.setState({ onlineUsers: onlineIds })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          })
        }
      })

    presenceRef.current = presenceChannel

    return () => {
      if (presenceRef.current) supabase.removeChannel(presenceRef.current)
    }
  }, [userId])
}
