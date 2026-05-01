import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

// Mock events shown when Supabase table doesn't exist yet
const MOCK_EVENTS = [
  {
    id: '1',
    title: 'Tech Boom',
    description: 'Tech sector revenue +50% for the next 6 hours!',
    event_type: 'boom',
    sector: 'tech',
    multiplier: 1.5,
    active: true,
    end_at: new Date(Date.now() + 6 * 3600000).toISOString(),
  },
  {
    id: '2',
    title: 'Supply Crunch',
    description: 'Manufacturing margins squeezed — 20% penalty.',
    event_type: 'shortage',
    sector: 'manufacturing',
    multiplier: 0.8,
    active: true,
    end_at: new Date(Date.now() + 3 * 3600000).toISOString(),
  },
]

// Singleton channel — prevents duplicate subscriptions in StrictMode
let _channel = null

const useEconomyStore = create(persist((set, get) => ({
  events: [],
  isLoading: false,

  fetchEvents: async () => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('economy_events')
        .select('*')
        .eq('active', true)
        .gt('end_at', new Date().toISOString())
        .order('created_at', { ascending: false })
      if (error) throw error
      set({ events: data || [], isLoading: false })
    } catch {
      // Table likely doesn't exist yet — use mock data so UI never crashes
      set({ events: MOCK_EVENTS, isLoading: false })
    }
  },

  /**
   * Subscribe to economy_events realtime changes.
   * Uses a module-level singleton so React StrictMode double-invocation
   * and duplicate callers never create a second channel.
   * Returns a cleanup function.
   */
  subscribeToEvents: () => {
    // Already subscribed — return a no-op cleanup
    if (_channel) return () => {}

    try {
      _channel = supabase
        .channel('economy-events-singleton')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'economy_events' },
          () => get().fetchEvents()
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            // Silently fall back — mock data is already shown
            supabase.removeChannel(_channel)
            _channel = null
          }
        })
    } catch {
      _channel = null
    }

    return () => {
      if (_channel) {
        supabase.removeChannel(_channel)
        _channel = null
      }
    }
  },

  /** Get combined multiplier for a sector (1.0 = no effect) */
  getSectorMultiplier: (sector) => {
    const { events } = get()
    return events
      .filter(e => e.active && (!e.sector || e.sector === sector))
      .reduce((acc, e) => acc * parseFloat(e.multiplier || 1), 1)
  },

  getActiveEvents: () => get().events.filter(e => e.active),
}), { name: 'economy-storage' }))

export default useEconomyStore
