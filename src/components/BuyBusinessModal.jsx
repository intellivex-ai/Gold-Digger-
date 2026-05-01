import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Building2, Store, Factory, Monitor, Coffee } from 'lucide-react'
import useBusinessStore from '../stores/useBusinessStore'
import useUserStore from '../stores/useUserStore'
import sounds from '../lib/soundManager'

const TYPES = [
  { id: 'retail',        label: 'Retail',        icon: Store,     color: '#5B9CF6' },
  { id: 'real_estate',   label: 'Real Estate',   icon: Building2, color: '#3DD68C' },
  { id: 'manufacturing', label: 'Manufacturing', icon: Factory,   color: '#F5C842' },
  { id: 'tech',          label: 'Tech',          icon: Monitor,   color: '#B56EFF' },
]

export default function BuyBusinessModal({ open, onClose }) {
  const [name, setName]     = useState('')
  const [type, setType]     = useState('retail')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const createBusiness = useBusinessStore((s) => s.createBusiness)
  const user           = useUserStore((s) => s.user)

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Business name is required'); sounds.error?.(); return }
    setLoading(true); setError(''); sounds.tap?.()

    const res = await createBusiness({
      owner_id:           user.id,
      name:               name.trim(),
      type,
      level:              1,
      revenue_per_minute: 10,
      upgrade_cost:       1000,
    })
    setLoading(false)

    if (res.success) { sounds.buy?.(); setName(''); setType('retail'); onClose() }
    else { sounds.error?.(); setError(res.message || 'Failed to create business') }
  }

  const selected = TYPES.find(t => t.id === type)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-[430px] rounded-t-[28px] px-5 pt-5 pb-8"
          style={{
            background: 'linear-gradient(180deg, #1A1B28 0%, #141520 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderBottom: 'none',
            boxShadow: '0 -8px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {/* Handle */}
          <div className="w-10 h-1 rounded-full mx-auto mb-5"
            style={{ background: 'rgba(255,255,255,0.15)' }} />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-black" style={{ color: 'var(--col-text-1)' }}>
                Buy New Business
              </h2>
              <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>
                Starting cost: $1,000
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => { sounds.tap?.(); onClose() }}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              <X size={16} style={{ color: 'var(--col-text-2)' }} />
            </motion.button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#FF5A5A',
                }}
              >
                {error}
              </motion.div>
            )}

            {/* Name */}
            <div>
              <label className="block text-[10px] font-black tracking-widest uppercase mb-2"
                style={{ color: 'var(--col-text-3)' }}>
                Business Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apex Industries"
                className="input-dark"
                maxLength={30}
              />
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-[10px] font-black tracking-widest uppercase mb-3"
                style={{ color: 'var(--col-text-3)' }}>
                Industry Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => {
                  const isSelected = type === t.id
                  const Icon = t.icon
                  return (
                    <motion.button
                      key={t.id}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { sounds.tap?.(); setType(t.id) }}
                      className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all"
                      style={isSelected ? {
                        background: `${t.color}15`,
                        border: `1px solid ${t.color}40`,
                        boxShadow: `0 0 12px ${t.color}20`,
                      } : {
                        background: 'rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      <Icon
                        size={22}
                        style={{ color: isSelected ? t.color : 'var(--col-text-3)',
                          filter: isSelected ? `drop-shadow(0 0 4px ${t.color}80)` : 'none' }}
                      />
                      <span
                        className="text-xs font-bold"
                        style={{ color: isSelected ? t.color : 'var(--col-text-3)' }}
                      >
                        {t.label}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              className="btn-game-gold w-full"
              style={{ paddingTop: 14, paddingBottom: 14, fontSize: 15 }}
              whileTap={{ y: 3, scale: 0.98 }}
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-[#1A1200]/50 border-t-[#1A1200] rounded-full animate-spin" />
                : `🏢 Launch ${selected?.label || 'Business'}`}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
