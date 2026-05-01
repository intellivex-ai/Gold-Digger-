/**
 * Dashboard.jsx
 * 
 * The main entry point post-login. Displays a high-level summary of the player's empire,
 * including total net worth, passive income generation, reputation, and level.
 * Features an interactive "Collect Earnings" mechanic that calculates offline revenue.
 */

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Zap, TrendingUp, TrendingDown, Shield, Swords,
  Bitcoin, Star, Building2, Hammer,
  Briefcase, Skull, Globe, User,
} from 'lucide-react'
import useUserStore from '../stores/useUserStore'
import useBusinessStore from '../stores/useBusinessStore'
import Card from '../components/Card'
import ProgressBar from '../components/ProgressBar'
import StockTicker from '../components/StockTicker'
import CollectButton from '../components/CollectButton'
import CoinShower from '../components/CoinShower'
import { DashboardSkeleton } from '../components/SkeletonLoader'
import logoSrc from '../assets/logo.svg'

/**
 * AnimatedNumber Component
 * 
 * Creates an odometer-style counting effect for large numbers (like Net Worth).
 * Uses requestAnimationFrame for a smooth 60fps cubic ease-out transition.
 */
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    prevRef.current = to
    if (from === to) return

    const start = Date.now()
    const duration = 600
    const raf = requestAnimationFrame(function tick() {
      const t = Math.min(1, (Date.now() - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // cubic ease-out
      setDisplay(from + (to - from) * eased)
      if (t < 1) requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [value])

  const fmt = (n) => {
    const abs = Math.abs(n)
    if (abs >= 1e9) return `${prefix}${(n / 1e9).toFixed(2)}B${suffix}`
    if (abs >= 1e6) return `${prefix}${(n / 1e6).toFixed(2)}M${suffix}`
    if (abs >= 1e3) return `${prefix}${(n / 1e3).toFixed(1)}k${suffix}`
    return `${prefix}${n.toFixed(decimals)}${suffix}`
  }

  return <span className="nums">{fmt(display)}</span>
}

// ── Passive Income Tier Progression ──
// Grants visual prestige based on how much the player earns per minute.
const TIERS = [
  { name: 'Hustler',       min: 0,     color: '#8892B0' },
  { name: 'Entrepreneur',  min: 50,    color: '#3DD68C' },
  { name: 'Tycoon',        min: 250,   color: '#5B9CF6' },
  { name: 'Industrialist', min: 1000,  color: '#B56EFF' },
  { name: 'Empire Builder', min: 5000, color: '#F5C842' },
]

export default function Dashboard() {
  const user            = useUserStore((s) => s.user)
  const collectEarnings = useUserStore((s) => s.collectEarnings)
  const businesses      = useBusinessStore((s) => s.businesses)
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses)

  const [collecting, setCollecting]             = useState(false)
  const [showCoins, setShowCoins]               = useState(false)
  const [uncollectedEarnings, setUncollectedEarnings] = useState(0)
  const [alerts, setAlerts]                     = useState([])

  // Fetch businesses on mount to calculate passive income
  useEffect(() => {
    if (user?.id) fetchBusinesses(user.id)
  }, [user?.id, fetchBusinesses])

  /**
   * Real-Time Earnings Tick
   * Calculates how much revenue has been generated since the `last_collected_at` timestamp.
   * Updates locally every second to create a dynamic "mining" effect in the UI.
   */
  useEffect(() => {
    if (!user?.last_collected_at) { setUncollectedEarnings(0); return }
    const revPerMin = businesses.reduce((s, b) => s + parseFloat(b.revenue_per_minute || 0), 0)
    if (revPerMin <= 0) { setUncollectedEarnings(0); return }
    
    const calc = () => {
      const ms = Math.max(0, Date.now() - new Date(user.last_collected_at).getTime())
      setUncollectedEarnings((ms / 60000) * revPerMin)
    }
    calc() // initial run
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [user?.last_collected_at, businesses])

  // Fetch recent system alerts/notifications
  useEffect(() => {
    if (!user?.id) return
    import('../lib/supabase').then(({ supabase }) => {
      supabase.from('notifications').select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(5)
        .then(({ data }) => setAlerts(data?.length ? data : []))
        .catch(() => setAlerts([]))
    })
  }, [user?.id])

  // Process the collection action and trigger the coin shower visual
  async function handleCollect() {
    if (collecting || uncollectedEarnings <= 0) return
    setCollecting(true)
    await collectEarnings()
    setShowCoins(true)
    setCollecting(false)
  }

  // Prevents rendering until user profile is fully hydrated
  if (!user) return <DashboardSkeleton />

  // ── Derived Economics ──
  const passiveIncome   = businesses.reduce((s, b) => s + parseFloat(b.revenue_per_minute || 0), 0)
  const businessesValue = businesses.reduce((s, b) => s + parseFloat(b.upgrade_cost || 0), 0)
  const netWorth        = parseFloat(user.cash || 0) + businessesValue
  const xpProgress      = (user.xp || 0) / (user.xpToNextLevel || 100000)

  // ── Tier Calculation ──
  const tierIdx         = [...TIERS].reverse().findIndex(t => passiveIncome >= t.min)
  const currentTier     = TIERS[TIERS.length - 1 - tierIdx] || TIERS[0]
  const nextTier        = TIERS[TIERS.length - tierIdx] || null
  let tierProgress      = nextTier
    ? Math.min(1, (passiveIncome - currentTier.min) / (nextTier.min - currentTier.min))
    : 1

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="relative px-4 pt-5 pb-4 space-y-3">
      {/* Interactive coin burst for earnings collection */}
      <CoinShower active={showCoins} onComplete={() => setShowCoins(false)} />

      {/* ── HEADER OVERVIEW ── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0"
            style={{
              border: '1.5px solid rgba(245,200,66,0.40)',
              boxShadow: '0 0 12px rgba(245,200,66,0.25)',
            }}
          >
            <img src={logoSrc} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'var(--col-text-3)' }}>
              {greeting}
            </p>
            <h1 className="text-2xl font-black tracking-tight"
              style={{ color: 'var(--col-text-1)' }}>
              {user?.username || 'Tycoon'} <Zap size={14} style={{ color: 'var(--col-gold)', display: 'inline', verticalAlign: 'middle' }} />
            </h1>
          </div>
        </div>
        
        {/* Avatar + Level Badge */}
        <div className="relative">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-base font-black"
            style={{
              background: 'linear-gradient(135deg, #5B9CF6, #B56EFF)',
              boxShadow: '0 0 20px rgba(91,156,246,0.4), 0 4px 12px rgba(0,0,0,0.5)',
              color: '#fff',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}
          >
            {user?.username?.slice(0, 2).toUpperCase() || 'GD'}
          </div>
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2"
            style={{
              background: 'linear-gradient(180deg, #F5C842, #C49B20)',
              borderColor: 'var(--col-bg)',
              color: '#1A1200',
              boxShadow: '0 0 8px rgba(245,200,66,0.5)',
            }}
          >
            {user?.level || 1}
          </div>
        </div>
      </div>

      {/* ── HERO NET WORTH CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="relative rounded-2xl overflow-hidden p-5"
          style={{
            background: 'linear-gradient(135deg, #0A1628 0%, #0D1F3C 50%, #0A1628 100%)',
            border: '1px solid rgba(91,156,246,0.25)',
            boxShadow: '0 0 40px rgba(91,156,246,0.12), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {/* Ambient glow orbs */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(91,156,246,0.15) 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(181,110,255,0.10) 0%, transparent 70%)', transform: 'translate(-20%, 20%)' }} />

          <div className="relative z-10">
            <p className="text-xs font-bold tracking-widest uppercase mb-1"
              style={{ color: 'rgba(91,156,246,0.7)' }}>
              Net Worth
            </p>
            <p className="text-4xl font-black tracking-tight"
              style={{ color: '#fff', textShadow: '0 0 30px rgba(255,255,255,0.2)' }}>
              <AnimatedNumber value={netWorth} prefix="$" />
            </p>

            {/* XP Progress Bar */}
            <div className="mt-4 mb-2">
              <div className="flex justify-between mb-1.5">
                <span className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: 'rgba(181,110,255,0.7)' }}>
                  XP · Level {user?.level || 1}
                </span>
                <span className="text-[10px] font-bold nums" style={{ color: 'var(--col-text-3)' }}>
                  {(user.xp || 0).toLocaleString()} / {(user.xpToNextLevel || 100000).toLocaleString()}
                </span>
              </div>
              <ProgressBar value={xpProgress} color="xp" chunky />
            </div>

            {/* Mini Stats Row */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Cash', value: user.cash || 0, color: '#3DD68C', prefix: '$' },
                { label: 'Income', value: passiveIncome, color: '#F5C842', suffix: '/m', prefix: '$' },
                { label: 'Rep', value: user.reputation || 0, color: '#B56EFF', suffix: '/100' },
              ].map(({ label, value, color, prefix = '', suffix = '' }) => (
                <div key={label}
                  className="rounded-xl p-2.5 text-center"
                  style={{
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  <p className="text-[9px] font-bold tracking-widest uppercase mb-1"
                    style={{ color: 'var(--col-text-3)' }}>
                    {label}
                  </p>
                  <p className="text-sm font-black nums"
                    style={{ color, textShadow: `0 0 8px ${color}60` }}>
                    <AnimatedNumber value={parseFloat(value)} prefix={prefix} suffix={suffix} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── PASSIVE INCOME TIER BOARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(245,200,66,0.20), rgba(245,200,66,0.08))',
                border: '1px solid rgba(245,200,66,0.25)',
                boxShadow: '0 0 12px rgba(245,200,66,0.20)',
              }}
            >
              <Zap size={20} fill="#F5C842" color="#F5C842" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: 'var(--col-text-3)' }}>
                Passive Income
              </p>
              <p className="text-xl font-black nums"
                style={{
                  color: '#F5C842',
                  textShadow: '0 0 12px rgba(245,200,66,0.5)',
                }}>
                <AnimatedNumber value={passiveIncome} prefix="$" suffix="/min" />
              </p>
            </div>
            {/* Active Tier Pill */}
            <div
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase"
              style={{
                background: `${currentTier.color}18`,
                border: `1px solid ${currentTier.color}40`,
                color: currentTier.color,
                textShadow: `0 0 8px ${currentTier.color}80`,
              }}
            >
              {currentTier.name}
            </div>
          </div>
          <ProgressBar value={tierProgress} color="gold" chunky />
          <div className="flex justify-between mt-2">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--col-text-3)' }}>
              {currentTier.name}
            </span>
            <span className="text-[10px] font-semibold" style={{ color: 'var(--col-text-3)' }}>
              {nextTier
                ? `${Math.round(tierProgress * 100)}% to ${nextTier.name}`
                : 'MAX TIER REACHED'}
            </span>
          </div>
        </Card>
      </motion.div>

      {/* ── CENTRAL FEATURE NAVIGATION ── */}
      {/* Quick links to deeper game systems */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: 'var(--col-text-3)' }}>
          Empire Hub
        </p>
        {/* 
          Feature Hub grid: 4-column on all phone sizes.
          Each item has generous vertical padding to ensure a minimum ~52px tap height.
        */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { to: '/crypto',          icon: Bitcoin,        label: 'Crypto',    color: '#B56EFF' },
            { to: '/skills',          icon: Star,           label: 'Skills',    color: '#F5C842' },
            { to: '/real-estate',     icon: Building2,      label: 'Property',  color: '#3DD68C' },
            { to: '/auction',         icon: Hammer,         label: 'Auction',   color: '#5B9CF6' },
            { to: '/venture-capital', icon: Briefcase,      label: 'VC Fund',   color: '#FF9F43' },
            { to: '/black-market',    icon: Skull,          label: 'B.Market',  color: '#FF6B6B' },
            { to: '/events',          icon: Globe,          label: 'Events',    color: '#8892B0' },
            { to: '/character',       icon: User,           label: 'Profile',   color: '#8892B0' },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 py-3.5 rounded-2xl active:scale-95 transition-transform"
              style={{ background: `${color}10`, border: `1px solid ${color}28`, textDecoration: 'none' }}
            >
              <Icon size={20} strokeWidth={1.8} style={{ color }} />
              <span className="text-[10px] font-black tracking-wider uppercase" style={{ color }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── EARNINGS COLLECTION CTA ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <CollectButton
          amount={uncollectedEarnings}
          loading={collecting}
          onClick={handleCollect}
        />
      </motion.div>

      {/* ── LIVE MARKETS TICKER ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <p className="text-[10px] font-black tracking-widest uppercase"
            style={{ color: 'var(--col-text-3)' }}>
            Live Markets
          </p>
        </div>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'rgba(0,0,0,0.30)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <StockTicker />
        </div>
      </motion.div>

      {/* ── NOTIFICATIONS / ALERTS ── */}
      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <p className="text-[10px] font-black tracking-widest uppercase mb-2"
            style={{ color: 'var(--col-text-3)' }}>
            Alerts
          </p>
          <div className="space-y-2">
            {alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

/**
 * Standardized card for rendering system notifications (market crashes, raids, etc.)
 */
function AlertCard({ alert }) {
  const isPositive = alert.color === 'positive'
  const color = isPositive ? 'var(--col-green)' : alert.color === 'negative' ? 'var(--col-red)' : 'var(--col-blue)'
  const Icon = isPositive ? TrendingUp : alert.color === 'negative' ? Shield : Swords

  return (
    <div
      className="flex gap-3 rounded-xl p-3"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <Icon size={15} style={{ color, marginTop: 1, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: 'var(--col-text-1)' }}>{alert.title}</p>
        <p className="text-xs truncate" style={{ color: 'var(--col-text-2)' }}>{alert.message}</p>
      </div>
    </div>
  )
}
