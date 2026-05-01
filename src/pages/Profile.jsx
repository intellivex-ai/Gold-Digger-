/**
 * Profile.jsx
 * 
 * The central user hub displaying identity information, global wealth statistics,
 * lifestyle assets, and unlocked achievements.
 * Also handles basic profile mutations (username editing) and application logout.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Edit3, Check, X, LogOut, Star, Crown, Home, Car, Watch } from 'lucide-react'
import useUserStore from '../stores/useUserStore'
import useBusinessStore from '../stores/useBusinessStore'
import Card from '../components/Card'
import Button from '../components/Button'
import ReputationBadge from '../components/ReputationBadge'
import AchievementGrid from '../components/AchievementGrid'
import ProgressBar from '../components/ProgressBar'

// Map strings from DB to respective Lucide components
const LIFESTYLE_ICONS = { home: Home, car: Car, watch: Watch }

// Framer Motion variants for staggered child entry animations
const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }
}

export default function Profile() {
  // Store bindings
  const user          = useUserStore((s) => s.user)
  const logout        = useUserStore((s) => s.logout)
  const updateProfile = useUserStore((s) => s.updateProfile)
  const businesses    = useBusinessStore((s) => s.businesses)

  // Local State: Profile Editing
  const [isEditing, setIsEditing] = useState(false)
  const [editName,  setEditName]  = useState('')
  const [isSaving,  setIsSaving]  = useState(false)
  const [error,     setError]     = useState('')

  if (!user) return null

  // ── Derived Statistics ──
  const xpProgress    = (user.xp || 0) / (user.xpToNextLevel || 100000)
  const passiveIncome = businesses.reduce((s, b) => s + parseFloat(b.revenue_per_minute || 0), 0)
  const businessValue = businesses.reduce((s, b) => s + parseFloat(b.upgrade_cost || 0), 0)
  // Net worth calculation: Liquid Cash + Sum of all business valuation
  const netWorth      = parseFloat(user.cash || 0) + businessValue

  // Normalize lifestyle data into iterable array
  const lifestyle = [
    { label: 'Residence', data: user.lifestyle?.house },
    { label: 'Vehicle',   data: user.lifestyle?.car },
    { label: 'Watch',     data: user.lifestyle?.watch },
  ]

  // Formatter for stat cards
  const fmtMoney = (n) => {
    if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`
    if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`
    if (n >= 1e3) return `$${(n/1e3).toFixed(1)}k`
    return `$${n.toLocaleString()}`
  }

  // ── Handlers ──
  const handleEditClick = () => { 
    setEditName(user.username)
    setError('')
    setIsEditing(true) 
  }
  
  const handleSave = async () => {
    if (!editName.trim()) { 
      setError('Username cannot be empty')
      return 
    }
    if (editName === user.username) { 
      setIsEditing(false)
      return 
    }
    
    setIsSaving(true)
    setError('')
    
    const { success, message } = await updateProfile({ username: editName.trim() })
    setIsSaving(false)
    
    if (success) {
      setIsEditing(false)
    } else {
      setError(message || 'That username might be taken.')
    }
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="px-4 pt-5 pb-8 space-y-3">

      {/* ── HEADER ── */}
      <motion.div variants={item} className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--col-text-1)' }}>
          Profile
        </h1>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-bold tracking-wide px-3 py-2 rounded-lg transition-all active:opacity-70"
          style={{
            color: 'var(--col-red)',
            background: 'rgba(255,90,90,0.08)',
            border: '1px solid rgba(255,90,90,0.20)',
          }}
        >
          <LogOut size={12} />
          LOGOUT
        </button>
      </motion.div>

      {/* ── IDENTITY & PROGRESS CARD ── */}
      <motion.div variants={item}>
        <div
          className="relative rounded-2xl overflow-hidden p-5"
          style={{
            background: 'linear-gradient(135deg, #0D1225 0%, #131830 50%, #0D1225 100%)',
            border: '1px solid rgba(245,200,66,0.18)',
            boxShadow: '0 0 32px rgba(245,200,66,0.08), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          {/* Ambient glow effect in background */}
          <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(245,200,66,0.06) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

          <div className="relative z-10 flex items-center gap-4">
            
            {/* Avatar Hexagon/Square */}
            <div className="relative flex-shrink-0">
              <motion.div
                animate={{ boxShadow: ['0 0 20px rgba(245,200,66,0.3)', '0 0 40px rgba(245,200,66,0.6)', '0 0 20px rgba(245,200,66,0.3)'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black"
                style={{
                  background: 'linear-gradient(135deg, #1A2050, #252A60)',
                  border: '2px solid rgba(245,200,66,0.35)',
                  color: '#F5C842',
                  textShadow: '0 0 12px rgba(245,200,66,0.7)',
                }}
              >
                {user.username?.slice(0, 2).toUpperCase()}
              </motion.div>

              {/* Level Indicator Ring */}
              <div
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2"
                style={{
                  background: 'linear-gradient(180deg, #F5C842, #C49B20)',
                  borderColor: '#0D1225',
                  color: '#1A1200',
                  boxShadow: '0 0 10px rgba(245,200,66,0.6)',
                }}
              >
                {user.level || 1}
              </div>
            </div>

            {/* User Details & Editing Logic */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                // Edit Mode View
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="input-dark text-base font-black w-full"
                    placeholder="Username"
                    disabled={isSaving}
                  />
                  {error && <p className="text-xs font-semibold" style={{ color: 'var(--col-red)' }}>{error}</p>}
                  <div className="flex gap-2">
                    <Button variant="accent" size="sm" onClick={handleSave} loading={isSaving} className="flex-1">
                      <Check size={13} /> Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving} className="flex-1">
                      <X size={13} /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // Standard View
                <>
                  <h2 className="text-xl font-black tracking-tight truncate"
                    style={{ color: 'var(--col-text-1)' }}>
                    {user.username}
                  </h2>
                  <p className="text-xs mb-2" style={{ color: 'var(--col-text-3)' }}>
                    {user.email || 'Premium Member'}
                  </p>
                  <ReputationBadge score={user.reputation || 0} large />
                </>
              )}
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="relative z-10 mt-4">
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] font-black tracking-widest uppercase"
                style={{ color: 'rgba(181,110,255,0.7)' }}>
                XP Progress
              </span>
              <span className="text-[10px] font-bold nums" style={{ color: 'var(--col-text-3)' }}>
                {(user.xp || 0).toLocaleString()} / {(user.xpToNextLevel || 100000).toLocaleString()}
              </span>
            </div>
            <ProgressBar value={xpProgress} color="xp" chunky />
          </div>

          {/* Edit Trigger */}
          {!isEditing && (
            <div className="relative z-10 mt-4">
              <Button variant="ghost" size="sm" onClick={handleEditClick}>
                <Edit3 size={13} />
                Edit Profile
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── WEALTH STATS GRID ── */}
      <motion.div variants={item}>
        <Card>
          <p className="text-[10px] font-black tracking-widest uppercase mb-3"
            style={{ color: 'var(--col-text-3)' }}>
            Wealth Stats
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Net Worth',       value: fmtMoney(netWorth),       color: '#F5C842' },
              { label: 'Cash on Hand',    value: fmtMoney(user.cash || 0), color: '#3DD68C' },
              { label: 'Passive Income',  value: `${fmtMoney(passiveIncome)}/m`, color: '#5B9CF6' },
              { label: 'Reputation',      value: `${user.reputation || 0}/100`,  color: '#B56EFF' },
            ].map(({ label, value, color }) => (
              <div key={label}
                className="rounded-xl p-3"
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
                <p className="text-base font-black nums"
                  style={{ color, textShadow: `0 0 8px ${color}60` }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── LIFESTYLE ASSETS ── */}
      {/* Renders property/vehicles owned by player */}
      {user.lifestyle && (
        <motion.div variants={item}>
          <Card>
            <p className="text-[10px] font-black tracking-widest uppercase mb-3"
              style={{ color: 'var(--col-text-3)' }}>
              Lifestyle Assets
            </p>
            <div className="space-y-2">
              {lifestyle.map(({ label, data }) => {
                if (!data) return null
                const IconComp = LIFESTYLE_ICONS[data.icon] || Star
                
                return (
                  <div key={label}
                    className="flex items-center gap-3 rounded-xl p-2.5"
                    style={{
                      background: 'rgba(245,200,66,0.05)',
                      border: '1px solid rgba(245,200,66,0.12)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'rgba(245,200,66,0.12)',
                        border: '1px solid rgba(245,200,66,0.25)',
                      }}
                    >
                      <IconComp size={18} color="#F5C842" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: 'var(--col-text-1)' }}>{data.name}</p>
                      <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>{label}</p>
                    </div>
                    <span
                      className="text-xs font-black px-2.5 py-1 rounded-full"
                      style={{
                        background: 'rgba(245,200,66,0.15)',
                        border: '1px solid rgba(245,200,66,0.30)',
                        color: '#F5C842',
                        textShadow: '0 0 6px rgba(245,200,66,0.6)',
                      }}
                    >
                      {data.multiplier}x
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── ACHIEVEMENTS ── */}
      {user.achievements?.length > 0 && (
        <motion.div variants={item}>
          <p className="text-[10px] font-black tracking-widest uppercase mb-2"
            style={{ color: 'var(--col-text-3)' }}>
            Achievements
          </p>
          <AchievementGrid achievements={user.achievements} />
        </motion.div>
      )}

      {/* ── PREMIUM BANNER (Monetization hooks) ── */}
      <motion.div variants={item}>
        <motion.div
          whileHover={{ y: -2, boxShadow: '0 16px 48px rgba(245,200,66,0.25)' }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative rounded-2xl overflow-hidden p-4 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #1A1000 0%, #2A1A00 50%, #1A1000 100%)',
            border: '1px solid rgba(245,200,66,0.30)',
            boxShadow: '0 0 24px rgba(245,200,66,0.15), 0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          {/* Subtle background flair */}
          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(245,200,66,0.10) 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />

          <div className="relative flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(245,200,66,0.20), rgba(245,200,66,0.08))',
                border: '1px solid rgba(245,200,66,0.30)',
              }}
            >
              <Crown size={24} color="#F5C842" fill="#F5C842" fillOpacity={0.5} />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-black" style={{ color: '#F5C842', textShadow: '0 0 8px rgba(245,200,66,0.5)' }}>
                Go Premium
              </p>
              <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>
                One-time purchase · Support development
              </p>
            </div>
            <div
              className="flex-shrink-0 px-4 py-2 rounded-xl font-black text-sm"
              style={{
                background: 'linear-gradient(180deg, #FFE680, #F5C842 40%, #C49B20)',
                color: '#1A1200',
                boxShadow: '0 2px 0 #7A5800, 0 4px 12px rgba(245,200,66,0.35)',
              }}
            >
              $2.99
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
