// src/hooks/useRealtimeOrchestrator.js
// Central hook that wires up ALL realtime subscriptions after auth.
// Call this once in App.jsx after authentication.

import { useEffect, useRef } from 'react'
import useUserStore from '../stores/useUserStore'
import useMarketStore from '../stores/useMarketStore'
import useBusinessStore from '../stores/useBusinessStore'
import useSocialStore from '../stores/useSocialStore'

export function useRealtimeOrchestrator() {
  const { user, isAuthenticated } = useUserStore()
  const { subscribeToStocks, subscribeToMarketplace, fetchStocks, fetchMarketplace } = useMarketStore()
  const { subscribeToBusinesses, fetchBusinesses } = useBusinessStore()
  const { subscribeToCorporation, subscribeToChat, setActiveChatChannel } = useSocialStore()

  const cleanupRef = useRef([])

  useEffect(() => {
    // Always subscribe to stocks (public table)
    const stockUnsub = subscribeToStocks()
    const marketUnsub = subscribeToMarketplace()
    fetchStocks()
    fetchMarketplace()

    cleanupRef.current.push(stockUnsub, marketUnsub)

    return () => {
      cleanupRef.current.forEach((fn) => { try { fn?.() } catch {} })
      cleanupRef.current = []
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    // User-specific subscriptions
    const profileUnsub  = useUserStore.getState().subscribeToProfile(user.id)
    const txUnsub       = useUserStore.getState().subscribeToTransactions(user.id)
    const bizUnsub      = subscribeToBusinesses(user.id)
    const chatUnsub     = subscribeToChat('global')

    fetchBusinesses(user.id)
    setActiveChatChannel('global')

    let corpUnsub = () => {}
    if (user.corporation_id) {
      corpUnsub = subscribeToCorporation(user.corporation_id)
      useSocialStore.getState().fetchCorporation(user.corporation_id)
    }

    return () => {
      try { profileUnsub?.() } catch {}
      try { txUnsub?.() } catch {}
      try { bizUnsub?.() } catch {}
      try { chatUnsub?.() } catch {}
      try { corpUnsub?.() } catch {}
    }
  }, [isAuthenticated, user?.id, user?.corporation_id]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
