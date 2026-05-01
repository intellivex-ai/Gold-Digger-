/**
 * AchievementGrid.jsx
 * 
 * Displays a grid of user achievements.
 * Handles the visual difference between locked and unlocked achievements,
 * including varying rarities (Legendary, Epic, etc.) with corresponding colors and glows.
 */

import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Building2, BarChart2, Gem, Shield, Star, Award, Lock } from 'lucide-react'

// Map string keys from the database to actual Lucide React components
const ICON_MAP = {
  'dollar-sign': DollarSign,
  'trending-up': TrendingUp,
  'building':    Building2,
  'bar-chart':   BarChart2,
  'gem':         Gem,
  'shield':      Shield,
  'star':        Star,
  'award':       Award,
}

// ── Rarity → Color Mapping ──
// Defines the visual hierarchy of achievements.
const RARITY_COLORS = {
  legendary: { color: '#F5C842', bg: 'rgba(245,200,66,0.12)', border: 'rgba(245,200,66,0.30)', glow: 'rgba(245,200,66,0.4)' },
  epic:      { color: '#B56EFF', bg: 'rgba(181,110,255,0.10)', border: 'rgba(181,110,255,0.28)', glow: 'rgba(181,110,255,0.35)' },
  rare:      { color: '#5B9CF6', bg: 'rgba(91,156,246,0.10)',  border: 'rgba(91,156,246,0.28)',  glow: 'rgba(91,156,246,0.30)' },
  uncommon:  { color: '#3DD68C', bg: 'rgba(61,214,140,0.10)',  border: 'rgba(61,214,140,0.25)',  glow: 'rgba(61,214,140,0.25)' },
  common:    { color: '#8892B0', bg: 'rgba(136,146,176,0.08)', border: 'rgba(136,146,176,0.18)', glow: 'none' },
}

export default function AchievementGrid({ achievements = [] }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {achievements.map((a, i) => {
        // Resolve the icon component (fallback to Star)
        const IconComp = ICON_MAP[a.icon] || Star
        
        // Resolve rarity colors (fallback to common)
        const rarity   = RARITY_COLORS[a.rarity || 'common']
        
        // Check unlock status. We default to assuming it's unlocked unless explicitly false
        const unlocked = a.unlocked !== false

        return (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, scale: 0.7, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            // Stagger the entrance animation slightly based on index
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 400, damping: 22 }}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center relative overflow-hidden"
            style={{
              // Locked achievements appear greyed out and have no glow
              background: unlocked ? rarity.bg : 'rgba(255,255,255,0.02)',
              border: `1px solid ${unlocked ? rarity.border : 'rgba(255,255,255,0.06)'}`,
              boxShadow: unlocked && rarity.glow !== 'none'
                ? `0 0 14px ${rarity.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
                : 'inset 0 1px 0 rgba(255,255,255,0.04)',
              opacity: unlocked ? 1 : 0.45,
            }}
          >
            {/* ── Shine streak (Unlocked Only) ── */}
            {/* Adds a premium metallic sheen to the top edge of the card */}
            {unlocked && (
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${rarity.color}40, transparent)` }}
              />
            )}

            {/* ── Icon Box ── */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: unlocked
                  ? `${rarity.color}18`
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${unlocked ? rarity.border : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {unlocked
                ? <IconComp size={18} style={{ color: rarity.color, filter: `drop-shadow(0 0 4px ${rarity.glow})` }} />
                : <Lock size={16} style={{ color: 'var(--col-text-3)' }} /> // Replace icon with padlock if locked
              }
            </div>

            {/* ── Achievement Name ── */}
            <p
              className="text-[10px] font-black leading-tight"
              style={{ color: unlocked ? rarity.color : 'var(--col-text-3)' }}
            >
              {a.name}
            </p>

            {/* ── Rarity Label ── */}
            <span
              className="text-[8px] font-black tracking-widest uppercase"
              style={{ color: unlocked ? `${rarity.color}80` : 'var(--col-text-3)' }}
            >
              {unlocked ? (a.rarity || 'Common') : 'Locked'}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
