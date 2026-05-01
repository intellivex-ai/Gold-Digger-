/**
 * ReputationBadge.jsx
 * 
 * A visual indicator of a player's social ranking.
 * Based on their "reputation score", they are placed into a tier (Legend, Elite, etc.)
 * which defines the icon, color, and glowing effects of the badge.
 */

import { Shield, Star, Crown, Zap, Flame } from 'lucide-react'

// The Tier logic. Array order matters: we find the FIRST tier where score >= min.
// So highest tiers must be at the top.
const TIERS = [
  {
    min: 90, label: 'LEGEND', icon: Crown,
    color: '#F5C842', bg: 'rgba(245,200,66,0.12)',
    border: 'rgba(245,200,66,0.40)', glow: 'rgba(245,200,66,0.50)',
    textShadow: '0 0 8px rgba(245,200,66,0.8)',
  },
  {
    min: 75, label: 'ELITE', icon: Flame,
    color: '#FF7A30', bg: 'rgba(255,122,48,0.12)',
    border: 'rgba(255,122,48,0.40)', glow: 'rgba(255,122,48,0.40)',
    textShadow: '0 0 8px rgba(255,122,48,0.7)',
  },
  {
    min: 50, label: 'TRUSTED', icon: Star,
    color: '#3DD68C', bg: 'rgba(61,214,140,0.10)',
    border: 'rgba(61,214,140,0.35)', glow: 'rgba(61,214,140,0.30)',
    textShadow: '0 0 8px rgba(61,214,140,0.6)',
  },
  {
    min: 25, label: 'RISING', icon: Zap,
    color: '#5B9CF6', bg: 'rgba(91,156,246,0.10)',
    border: 'rgba(91,156,246,0.30)', glow: 'rgba(91,156,246,0.25)',
    textShadow: '0 0 8px rgba(91,156,246,0.5)',
  },
  {
    min: 0, label: 'NEWCOMER', icon: Shield,
    color: '#8892B0', bg: 'rgba(136,146,176,0.08)',
    border: 'rgba(136,146,176,0.20)', glow: 'none',
    textShadow: 'none',
  },
]

export default function ReputationBadge({ score = 0, large = false }) {
  // Find the appropriate tier based on the score
  const tier = TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1]
  const Icon = tier.icon
  const size = large ? 14 : 11

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full select-none"
      style={{
        padding: large ? '5px 12px' : '3px 9px',
        background: tier.bg,
        border: `1px solid ${tier.border}`,
        boxShadow: tier.glow !== 'none'
          ? `0 0 12px ${tier.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`
          : 'inset 0 1px 0 rgba(255,255,255,0.06)', // Fallback for newcomer (no glow)
      }}
    >
      {/* Dynamic Lucide Icon */}
      <Icon
        size={size}
        style={{ color: tier.color, filter: `drop-shadow(0 0 4px ${tier.glow})` }}
        fill={tier.color}
        fillOpacity={0.5}
      />
      
      {/* Tier Label (e.g. ELITE) */}
      <span
        className={`font-black tracking-widest ${large ? 'text-xs' : 'text-[10px]'}`}
        style={{ color: tier.color, textShadow: tier.textShadow }}
      >
        {tier.label}
      </span>
      
      {/* Exact Score Number */}
      <span
        className={`font-bold ${large ? 'text-xs' : 'text-[10px]'}`}
        style={{ color: tier.color, opacity: 0.7 }}
      >
        · {score}
      </span>
    </div>
  )
}
