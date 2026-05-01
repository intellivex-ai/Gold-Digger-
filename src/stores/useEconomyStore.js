/**
 * useEconomyStore.js
 * 
 * This file handles global "Economy Events" (e.g. "Tech Boom", "Supply Crunch").
 * These are random events that apply multipliers to specific business sectors,
 * making some businesses earn more or less money temporarily.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

// Fake events to show if the database table isn't set up yet
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

// Singleton channel — ensures we don't open multiple connections to the database by mistake
let _channel = null

const useEconomyStore = create(persist((set, get) => ({
  // ── State (What we are remembering) ──────────────────────────────────────────
  events: [],          // Active global events
  isLoading: false,

  // ── Core Features ────────────────────────────────────────────────────────────

  /** 
   * Fetches all currently active economy events from the database.
   */
  fetchEvents: async () => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('economy_events')
        .select('*')
        .eq('active', true)
        .gt('end_at', new Date().toISOString()) // Only get events that haven't expired
        .order('created_at', { ascending: false })
        
      if (error) throw error
      set({ events: data || [], isLoading: false })
    } catch {
      // If the table doesn't exist yet, use our fake data so the UI doesn't crash
      set({ events: MOCK_EVENTS, isLoading: false })
    }
  },

  /**
   * Listens for live changes to economy events (e.g. when an admin triggers one).
   * It uses a special "singleton" pattern so that even if React mounts twice,
   * we only ever open ONE connection to the database.
   */
  subscribeToEvents: () => {
    // If we're already listening, do nothing
    if (_channel) return () => {}

    try {
      _channel = supabase
        .channel('economy-events-singleton')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'economy_events' },
          () => get().fetchEvents() // Whenever anything changes, grab the fresh list
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            // If the connection fails, silently fall back
            supabase.removeChannel(_channel)
            _channel = null
          }
        })
    } catch {
      _channel = null
    }

    // Return a function to clean up the listener later
    return () => {
      if (_channel) {
        supabase.removeChannel(_channel)
        _channel = null
      }
    }
  },

  // ── Helper Functions ─────────────────────────────────────────────────────────

  /** 
   * Calculates the combined multiplier for a specific business sector.
   * Example: If Tech has a 1.5x boom and a 0.8x shortage, it returns 1.2.
   * If there are no events for the sector, it returns 1.0 (normal).
   */
  getSectorMultiplier: (sector) => {
    const { events } = get()
    return events
      .filter(e => e.active && (!e.sector || e.sector === sector))
      .reduce((acc, e) => acc * parseFloat(e.multiplier || 1), 1)
  },

  /** Gets a list of just the active events */
  getActiveEvents: () => get().events.filter(e => e.active),
  
}), { name: 'economy-storage' }))

export default useEconomyStore
