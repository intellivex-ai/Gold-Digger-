import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, ShieldAlert, Coins, Zap, Wind, Info, X } from 'lucide-react'
import useEconomyStore from '../stores/useEconomyStore'

const EVENT_ICONS = {
  boom:     { Icon: TrendingUp,    color: '#3DD68C', label: 'MARKET BOOM'     },
  crash:    { Icon: TrendingDown,  color: '#FF6B6B', label: 'MARKET CRASH'    },
  shortage: { Icon: ShieldAlert,   color: '#FF9F43', label: 'SUPPLY SHORTAGE' },
  windfall: { Icon: Coins,         color: '#F5C842', label: 'WINDFALL EVENT'  },
  scandal:  { Icon: Zap,           color: '#B56EFF', label: 'CORPORATE SCANDAL'},
  tax:      { Icon: Wind,          color: '#8892B0', label: 'TAX REFORM'      },
}

function EventCard({ event }) {
  const cfg = EVENT_ICONS[event.event_type] || EVENT_ICONS.boom
  const { Icon, color, label } = cfg
  const impact = parseFloat(event.multiplier)
  const isPositive = impact >= 1
  const pct = Math.abs(Math.round((impact - 1) * 100))
  const timeLeft = Math.max(0, (new Date(event.end_at) - Date.now()) / 3600000)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden p-4"
      style={{
        background: `linear-gradient(135deg, ${color}18 0%, rgba(13,14,22,0.95) 100%)`,
        border: `1px solid ${color}44`,
        boxShadow: `0 0 20px ${color}18`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <div className="text-[10px] font-black tracking-widest" style={{ color }}>
            {label}
          </div>
          <div className="text-sm font-bold" style={{ color: 'var(--col-text-1)' }}>
            {event.title}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div
            className="text-lg font-black"
            style={{ color: isPositive ? '#3DD68C' : '#FF6B6B' }}
          >
            {isPositive ? '+' : '-'}{pct}%
          </div>
          <div className="text-[10px]" style={{ color: 'var(--col-text-3)' }}>
            {event.sector ? event.sector.toUpperCase() : 'ALL SECTORS'}
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--col-text-2)' }}>
        {event.description}
      </p>

      <div className="flex items-center justify-between text-[11px]">
        <span style={{ color: 'var(--col-text-3)' }}>Ends in</span>
        <span className="font-black" style={{ color }}>
          {timeLeft >= 1 ? `${timeLeft.toFixed(1)}h` : `${Math.round(timeLeft * 60)}m`}
        </span>
      </div>

      {/* Glow bar at bottom */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5"
        style={{ background: color }}
        initial={{ width: '100%' }}
        animate={{ width: `${(timeLeft / 12) * 100}%` }}
        transition={{ duration: 1 }}
      />
    </motion.div>
  )
}

export default function EconomyEvents({ onClose }) {
  const { events, fetchEvents } = useEconomyStore()

  useEffect(() => { fetchEvents() }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        onClick={e => e.stopPropagation()}
        className="w-full rounded-t-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #151620 0%, #0E0F18 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '80vh',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black" style={{ color: 'var(--col-text-1)' }}>
                🌍 Global Economy Events
              </h2>
              <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>
                {events.length} active event{events.length !== 1 ? 's' : ''} affecting all players
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <X size={16} style={{ color: 'var(--col-text-2)' }} />
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '60vh' }}>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Info size={32} className="mx-auto mb-3" style={{ color: 'var(--col-text-3)' }} />
                <p style={{ color: 'var(--col-text-3)' }}>No active events right now.</p>
                <p className="text-xs mt-1" style={{ color: 'var(--col-text-3)' }}>Check back soon — the market is always moving.</p>
              </div>
            ) : (
              <AnimatePresence>
                {events.map(e => <EventCard key={e.id} event={e} />)}
              </AnimatePresence>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
