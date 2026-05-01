/**
 * Businesses.jsx
 * 
 * The main "Empire" view where users manage their active businesses.
 * Displays a list of owned businesses, calculates total passive revenue per minute,
 * and provides access to the "Buy Business" marketplace modal.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, ChevronRight, TrendingUp, Coffee, Building2, Monitor, Factory, Store, Zap } from 'lucide-react'
import useBusinessStore from '../stores/useBusinessStore'
import useUserStore from '../stores/useUserStore'
import Card from '../components/Card'
import Button from '../components/Button'
import sounds from '../lib/soundManager'
import { BusinessesSkeleton } from '../components/SkeletonLoader'
import BuyBusinessModal from '../components/BuyBusinessModal'

// Dynamic icon mapping based on business category/type
const BIZ_ICONS = {
  coffee:   Coffee,
  building: Building2,
  monitor:  Monitor,
  factory:  Factory,
  store:    Store,
}

// Formats large numbers into readable string formats (e.g., $1.5M, $400k)
const fmtMoney = (n) => {
  if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}k`
  return `$${parseFloat(n).toFixed(0)}`
}

export default function Businesses() {
  // Store bindings
  const businesses      = useBusinessStore((s) => s.businesses)
  const isLoading       = useBusinessStore((s) => s.isLoading)
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses)
  const user            = useUserStore((s) => s.user)
  
  const navigate        = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Hydrate user's owned businesses on mount
  useEffect(() => { 
    if (user?.id) fetchBusinesses(user.id) 
  }, [user?.id, fetchBusinesses])

  if (isLoading && businesses.length === 0) return <BusinessesSkeleton />

  // Calculate aggregated passive income across all owned businesses
  const totalRevenue = businesses.reduce(
    (sum, b) => sum + parseFloat(b.revenue_per_minute || b.revenuePerMin || 0), 0
  )

  return (
    <div className="px-4 pt-5 pb-6">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--col-text-1)' }}>
            Your Empire
          </h1>
          <p className="text-xs font-semibold mt-0.5 nums" style={{ color: 'var(--col-text-3)' }}>
            {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} active
          </p>
        </div>
        
        {/* Total income badge (top right) */}
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{
            background: 'rgba(61,214,140,0.10)',
            border: '1px solid rgba(61,214,140,0.25)',
            boxShadow: '0 0 12px rgba(61,214,140,0.15)',
          }}
        >
          <Zap size={14} color="#3DD68C" fill="#3DD68C" />
          <span className="text-sm font-black nums"
            style={{ color: '#3DD68C', textShadow: '0 0 8px rgba(61,214,140,0.5)' }}>
            {fmtMoney(totalRevenue)}/min
          </span>
        </div>
      </div>

      {/* ── SUMMARY PILLS ── */}
      {/* High-level metrics for the player's empire */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Total Revenue" value={`${fmtMoney(totalRevenue)}/min`} color="#3DD68C" />
        <StatCard label="Businesses"    value={businesses.length} color="#5B9CF6" />
      </div>

      {/* ── BUSINESS LIST ── */}
      <div className="space-y-2 mb-5">
        {businesses.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">🏗️</p>
            <p className="text-sm font-bold" style={{ color: 'var(--col-text-3)' }}>
              No businesses yet
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--col-text-3)', opacity: 0.6 }}>
              Buy your first business to start earning
            </p>
          </div>
        )}

        {businesses.map((biz, i) => {
          // Resolve icon and metadata
          const IconComp  = BIZ_ICONS[biz.icon] || Store
          const revPerMin = parseFloat(biz.revenue_per_minute || biz.revenuePerMin || 0)
          const color     = biz.color || '#5B9CF6'

          return (
            <motion.div
              key={biz.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 25 }} // Staggered list entrance
            >
              <motion.div
                whileTap={{ scale: 0.98, x: 2 }}
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={() => { sounds.tap?.(); navigate(`/business/${biz.id}`) }}
                className="card cursor-pointer !p-0 overflow-hidden"
                style={{ borderColor: `${color}20` }}
              >
                {/* Visual accent line matching the business color */}
                <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

                <div className="flex items-center gap-4 p-4">
                  {/* Business Icon Container */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${color}15`,
                      border: `1px solid ${color}30`,
                      boxShadow: `0 0 12px ${color}20`,
                    }}
                  >
                    <IconComp size={22} style={{ color }} />
                  </div>

                  {/* Business Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-black truncate" style={{ color: 'var(--col-text-1)' }}>
                        {biz.name}
                      </p>
                      {/* Level Badge */}
                      <span
                        className="flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={{
                          background: `${color}18`,
                          border: `1px solid ${color}30`,
                          color: color,
                        }}
                      >
                        LV.{biz.level}
                      </span>
                    </div>
                    {/* Revenue Info */}
                    <div className="flex items-center gap-1">
                      <TrendingUp size={11} color="#3DD68C" />
                      <span className="text-xs font-bold nums" style={{ color: '#3DD68C' }}>
                        {fmtMoney(revPerMin)}/min
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--col-text-3)' }}>
                        · {biz.category}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={16} style={{ color: 'var(--col-text-3)', flexShrink: 0 }} />
                </div>
              </motion.div>
            </motion.div>
          )
        })}
      </div>

      {/* ── MARKETPLACE TRIGGER ── */}
      <motion.button
        className="btn-game-gold w-full"
        style={{ paddingTop: 14, paddingBottom: 14, fontSize: 15 }}
        whileTap={{ y: 3, scale: 0.98 }}
        onClick={() => { sounds.tap?.(); setIsModalOpen(true) }}
      >
        <Plus size={18} />
        Buy New Business
      </motion.button>

      {/* Modal overlays current screen rather than navigating away */}
      <BuyBusinessModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}

/**
 * Minor reusable component for the high-level summary metrics
 */
function StatCard({ label, value, color }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <p className="text-[9px] font-black tracking-widest uppercase mb-1" style={{ color: 'var(--col-text-3)' }}>{label}</p>
      <p className="text-base font-black nums" style={{ color, textShadow: `0 0 8px ${color}60` }}>{value}</p>
    </div>
  )
}
