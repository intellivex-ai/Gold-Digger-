import { useEffect, Component } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, TrendingUp, TrendingDown, AlertTriangle, Wind, Coins } from 'lucide-react'
import useEconomyStore from '../stores/useEconomyStore'

const EVENT_CONFIG = {
  boom:     { icon: TrendingUp,    color: '#3DD68C', bg: 'rgba(61,214,140,0.12)',   label: 'BOOM'     },
  crash:    { icon: TrendingDown,  color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)',  label: 'CRASH'    },
  shortage: { icon: AlertTriangle, color: '#FF9F43', bg: 'rgba(255,159,67,0.12)',   label: 'SHORTAGE' },
  windfall: { icon: Coins,         color: '#F5C842', bg: 'rgba(245,200,66,0.12)',   label: 'WINDFALL' },
  scandal:  { icon: Zap,           color: '#B56EFF', bg: 'rgba(181,110,255,0.12)',  label: 'SCANDAL'  },
  tax:      { icon: Wind,          color: '#8892B0', bg: 'rgba(136,146,176,0.12)',  label: 'TAX'      },
}

function EventPill({ event }) {
  const cfg = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.boom
  const Icon = cfg.icon
  const timeLeft = Math.max(0, (new Date(event.end_at) - Date.now()) / 3600000)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-shrink-0"
      style={{ background: cfg.bg, border: `1px solid ${cfg.color}33` }}
    >
      <Icon size={12} style={{ color: cfg.color }} />
      <span className="text-xs font-black tracking-wide" style={{ color: cfg.color }}>
        {cfg.label}
      </span>
      <span className="text-xs font-semibold" style={{ color: 'var(--col-text-2)' }}>
        {event.sector ? event.sector.toUpperCase() : 'ALL'} ×{parseFloat(event.multiplier).toFixed(1)}
      </span>
      <span className="text-[10px]" style={{ color: 'var(--col-text-3)' }}>
        {timeLeft < 1 ? `${Math.round(timeLeft * 60)}m` : `${timeLeft.toFixed(1)}h`}
      </span>
    </motion.div>
  )
}

function BannerInner() {
  const events            = useEconomyStore((s) => s.events)
  const fetchEvents       = useEconomyStore((s) => s.fetchEvents)
  const subscribeToEvents = useEconomyStore((s) => s.subscribeToEvents)

  useEffect(() => {
    fetchEvents()
    // subscribeToEvents is idempotent — safe to call even in StrictMode
    const unsub = subscribeToEvents()
    return unsub
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!events.length) return null

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 overflow-x-auto flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg, rgba(245,200,66,0.05) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        /* hide scrollbar cross-browser */
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {/* Pulse live indicator */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#EF4444' }}
        />
        <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: 'var(--col-text-3)' }}>
          LIVE
        </span>
      </div>

      <div
        className="flex gap-2"
        style={{ overflow: 'hidden', overflowX: 'auto', scrollbarWidth: 'none' }}
      >
        <AnimatePresence>
          {events.map(e => <EventPill key={e.id} event={e} />)}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Class-based error boundary so a crash never propagates to Layout */
class EconomyBannerBoundary extends Component {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(err) {
    // Silently swallow — banner is non-critical UI
    console.warn('[EconomyEventBanner] non-fatal error:', err?.message)
  }

  render() {
    if (this.state.crashed) return null
    return this.props.children
  }
}

export default function EconomyEventBanner() {
  return (
    <EconomyBannerBoundary>
      <BannerInner />
    </EconomyBannerBoundary>
  )
}
