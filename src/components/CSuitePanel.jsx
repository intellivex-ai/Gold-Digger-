import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Star, X, TrendingUp, Zap, Crown, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import sounds from '../lib/soundManager'

const MOCK_MANAGERS = [
  { id: '1', role: 'ceo', name: 'Alex Growth',    rarity: 'common',    salary: 500,   revenue_bonus: 1.05, xp_bonus: 1.0,  special_perk: 'Revenue +5%',          avatar_color: '#3DD68C' },
  { id: '2', role: 'ceo', name: 'Victoria Vance', rarity: 'rare',      salary: 1200,  revenue_bonus: 1.15, xp_bonus: 1.05, special_perk: 'Revenue +15%, XP +5%', avatar_color: '#5B9CF6' },
  { id: '3', role: 'ceo', name: 'Marcus Steel',   rarity: 'epic',      salary: 3000,  revenue_bonus: 1.30, xp_bonus: 1.10, special_perk: 'Revenue +30%',         avatar_color: '#B56EFF' },
  { id: '4', role: 'ceo', name: 'The Legend',     rarity: 'legendary', salary: 10000, revenue_bonus: 1.60, xp_bonus: 1.25, special_perk: 'Revenue +60%',         avatar_color: '#F5C842' },
  { id: '5', role: 'cfo', name: 'Bob Numbers',    rarity: 'common',    salary: 400,   revenue_bonus: 1.02, xp_bonus: 1.0,  special_perk: 'Upgrade cost -5%',      avatar_color: '#8892B0' },
  { id: '6', role: 'cfo', name: 'Diana Quant',    rarity: 'rare',      salary: 1000,  revenue_bonus: 1.08, xp_bonus: 1.0,  special_perk: 'Upgrade cost -15%',     avatar_color: '#5B9CF6' },
  { id: '7', role: 'cmo', name: 'Sam Viral',      rarity: 'common',    salary: 350,   revenue_bonus: 1.03, xp_bonus: 1.10, special_perk: 'XP +10%',              avatar_color: '#FF6B6B' },
  { id: '8', role: 'coo', name: 'Ops Master',     rarity: 'epic',      salary: 2200,  revenue_bonus: 1.20, xp_bonus: 1.05, special_perk: 'All passive +20%',      avatar_color: '#A55EEA' },
]

const RARITY_META = {
  common:    { color: '#8892B0', stars: 1, glow: '' },
  rare:      { color: '#5B9CF6', stars: 2, glow: '0 0 12px rgba(91,156,246,0.4)' },
  epic:      { color: '#B56EFF', stars: 3, glow: '0 0 16px rgba(181,110,255,0.5)' },
  legendary: { color: '#F5C842', stars: 4, glow: '0 0 24px rgba(245,200,66,0.6)' },
}

function ManagerCard({ manager, hired, onHire, onFire }) {
  const meta = RARITY_META[manager.rarity] || RARITY_META.common
  const isHired = !!hired

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden p-4"
      style={{
        background: isHired
          ? `linear-gradient(135deg, ${manager.avatar_color}18, rgba(13,14,22,0.95))`
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isHired ? manager.avatar_color + '50' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: isHired ? meta.glow : 'none',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${manager.avatar_color}, ${manager.avatar_color}88)` }}
        >
          {manager.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black truncate" style={{ color: 'var(--col-text-1)' }}>{manager.name}</span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase flex-shrink-0"
              style={{ background: `${meta.color}25`, color: meta.color }}>
              {manager.rarity}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {Array.from({ length: meta.stars }).map((_, i) => (
              <Star key={i} size={10} fill={meta.color} style={{ color: meta.color }} />
            ))}
          </div>
          <div className="text-xs font-semibold uppercase mt-0.5" style={{ color: 'var(--col-text-3)' }}>
            {manager.role}
          </div>
        </div>
      </div>

      <div className="text-xs mb-3 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--col-text-2)' }}>
        ✨ {manager.special_perk}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs" style={{ color: 'var(--col-text-3)' }}>
          Salary: <span className="font-black" style={{ color: '#FF9F43' }}>${manager.salary}/hr</span>
        </div>
        {!isHired ? (
          <motion.button whileTap={{ scale: 0.95, y: 1 }} onClick={() => onHire(manager)}
            className="px-4 py-1.5 rounded-xl text-xs font-black"
            style={{
              background: `linear-gradient(180deg, ${meta.color} 0%, ${meta.color}99 100%)`,
              boxShadow: `0 3px 0 ${meta.color}55`,
              color: manager.rarity === 'legendary' ? '#0E0F18' : '#fff',
            }}>
            HIRE
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => onFire(manager.id)}
            className="px-4 py-1.5 rounded-xl text-xs font-black"
            style={{ background: 'rgba(255,107,107,0.2)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.3)' }}>
            FIRE
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

export default function CSuitePanel({ businessId, onClose }) {
  const [managers, setManagers] = useState(MOCK_MANAGERS)
  const [hired, setHired] = useState({})  // role -> manager
  const [tab, setTab] = useState('ceo')
  const [toast, setToast] = useState(null)

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2000) }

  const handleHire = (manager) => {
    if (hired[manager.role]) {
      showToast(`Fire your current ${manager.role.toUpperCase()} first!`, false); return
    }
    sounds.tap()
    setHired(h => ({ ...h, [manager.role]: manager }))
    showToast(`✅ ${manager.name} hired as ${manager.role.toUpperCase()}!`)
  }

  const handleFire = (managerId) => {
    sounds.tap()
    setHired(h => {
      const copy = { ...h }
      Object.keys(copy).forEach(role => { if (copy[role]?.id === managerId) delete copy[role] })
      return copy
    })
    showToast('Manager fired.')
  }

  const roles = ['ceo', 'cfo', 'cmo', 'coo', 'cto']
  const filtered = managers.filter(m => m.role === tab)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full rounded-t-3xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #151620 0%, #0E0F18 100%)', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black" style={{ color: 'var(--col-text-1)' }}>C-Suite Management</h2>
              <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>Hire elite executives to supercharge your business</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <X size={16} style={{ color: 'var(--col-text-2)' }} />
            </button>
          </div>

          {/* Current C-Suite */}
          {Object.keys(hired).length > 0 && (
            <div className="mb-4 p-3 rounded-2xl" style={{ background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)' }}>
              <div className="text-[10px] font-black tracking-widest mb-2" style={{ color: '#F5C842' }}>YOUR C-SUITE</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(hired).map(([role, mgr]) => (
                  <div key={role} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                    style={{ background: `${mgr.avatar_color}22`, border: `1px solid ${mgr.avatar_color}44` }}>
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black"
                      style={{ background: mgr.avatar_color, color: '#fff' }}>
                      {mgr.name[0]}
                    </div>
                    <span className="text-xs font-bold" style={{ color: 'var(--col-text-2)' }}>{mgr.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {roles.map(r => (
              <button key={r} onClick={() => setTab(r)}
                className="px-3 py-1.5 rounded-xl text-xs font-black uppercase flex-shrink-0"
                style={{
                  background: tab === r ? 'rgba(245,200,66,0.2)' : 'rgba(255,255,255,0.05)',
                  color: tab === r ? '#F5C842' : 'var(--col-text-3)',
                  border: tab === r ? '1px solid rgba(245,200,66,0.4)' : '1px solid transparent',
                }}>
                {r} {hired[r] ? '✓' : ''}
              </button>
            ))}
          </div>

          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '50vh' }}>
            {filtered.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--col-text-3)' }}>No {tab.toUpperCase()} managers available</div>
            ) : (
              filtered.map(m => (
                <ManagerCard key={m.id} manager={m} hired={hired[m.role]?.id === m.id ? m : null}
                  onHire={handleHire} onFire={handleFire} />
              ))
            )}
          </div>

          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-3 p-3 rounded-xl text-sm font-bold text-center"
                style={{
                  background: toast.ok ? 'rgba(61,214,140,0.15)' : 'rgba(255,107,107,0.15)',
                  color: toast.ok ? '#3DD68C' : '#FF6B6B',
                }}>
                {toast.msg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
