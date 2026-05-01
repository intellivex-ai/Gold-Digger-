import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, TrendingUp, ArrowUpCircle, Coffee, Building2, Monitor, Factory, Store, Users, Swords } from 'lucide-react'
import useBusinessStore from '../stores/useBusinessStore'
import ProgressBar from '../components/ProgressBar'
import SparklineChart from '../components/SparklineChart'
import sounds from '../lib/soundManager'
import CSuitePanel from '../components/CSuitePanel'
import { TakeoverInitiateModal } from '../components/TakeoverPanel'

function generateSyntheticHistory(baseValue) {
  return Array.from({ length: 24 }).map(() => ({
    value: parseFloat(baseValue || 0) * (0.8 + Math.random() * 0.4)
  }))
}
const BIZ_ICONS = { coffee: Coffee, building: Building2, monitor: Monitor, factory: Factory, store: Store }

const fmtMoney = (n) => {
  n = parseFloat(n || 0)
  if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}k`
  return `$${n.toLocaleString()}`
}

export default function BusinessDetail() {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const business        = useBusinessStore((s) => s.getById(id))
  const upgradeBusiness = useBusinessStore((s) => s.upgradeBusiness)
  const [upgrading, setUpgrading] = useState(false)
  const [toast, setToast]         = useState(null)
  const [showCSuite, setShowCSuite]     = useState(false)
  const [showTakeover, setShowTakeover] = useState(false)

  if (!business) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <p className="text-2xl">🏗️</p>
      <p className="text-sm font-bold" style={{ color: 'var(--col-text-3)' }}>Business not found</p>
      <button onClick={() => navigate(-1)} className="btn-game-ghost" style={{ padding: '8px 16px' }}>
        ← Back
      </button>
    </div>
  )

  async function handleUpgrade() {
    setUpgrading(true)
    const result = await upgradeBusiness(id)
    if (result.success) { sounds.levelUp?.(); setToast({ text: '⬆️ Business Upgraded!', ok: true }) }
    else { sounds.error?.(); setToast({ text: result.message || 'Upgrade failed', ok: false }) }
    setTimeout(() => setToast(null), 2500)
    setUpgrading(false)
  }

  const Icon          = BIZ_ICONS[business.icon || business.type] || Store
  const color         = business.color || '#5B9CF6'
  const revPerMin     = parseFloat(business.revenue_per_minute || business.revenuePerMin || 0)
  const upgradeCost   = parseFloat(business.upgrade_cost || business.upgradeCost || 0)
  const profitHistory = business.profitHistory || generateSyntheticHistory(revPerMin)
  const isPositive    = (profitHistory.slice(-1)[0]?.value || 0) >= (profitHistory.slice(-2)[0]?.value || 0)

  const stats = [
    { key: 'manager_level', label: 'Manager Level', level: business.manager_level || 0, max: 10, color: 'blue' },
    { key: 'staff_morale',  label: 'Staff Morale',  level: business.staff_morale  || 50, max: 100, color: 'green' },
  ]

  return (
    <div className="pb-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mx-4 mt-3 mb-0 py-2.5 px-4 rounded-xl text-sm font-bold text-center"
            style={{
              background: toast.ok ? 'rgba(61,214,140,0.15)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${toast.ok ? 'rgba(61,214,140,0.30)' : 'rgba(239,68,68,0.25)'}`,
              color: toast.ok ? '#3DD68C' : '#FF5A5A',
            }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero header */}
      <div
        className="relative px-4 pt-5 pb-8"
        style={{
          background: `linear-gradient(180deg, ${color}18 0%, transparent 100%)`,
          borderBottom: `1px solid ${color}18`,
        }}
      >
        {/* Glow orb */}
        <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`, transform: 'translate(20%,-20%)' }} />

        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-bold mb-5 relative z-10"
          style={{ color: 'var(--col-text-3)' }}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-start gap-4 relative z-10 mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `${color}18`,
              border: `2px solid ${color}35`,
              boxShadow: `0 0 20px ${color}25`,
            }}
          >
            <Icon size={28} style={{ color, filter: `drop-shadow(0 0 6px ${color}80)` }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="text-xl font-black" style={{ color: 'var(--col-text-1)' }}>{business.name}</h1>
              <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full"
                style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}>
                LV.{business.level}
              </span>
            </div>
            <p className="text-xs mb-1" style={{ color: 'var(--col-text-3)' }}>
              {business.category || business.type}
            </p>
            <p className="text-xl font-black nums"
              style={{ color: '#3DD68C', textShadow: '0 0 10px rgba(61,214,140,0.5)' }}>
              {fmtMoney(revPerMin)}/min
            </p>
          </div>
        </div>

        {/* Upgrade CTA */}
        <motion.button
          className="btn-game-gold w-full"
          style={{ paddingTop: 14, paddingBottom: 14, fontSize: 15 }}
          whileTap={{ y: 3, scale: 0.98 }}
          onClick={handleUpgrade}
          disabled={upgrading}
        >
          {upgrading
            ? <span className="w-5 h-5 border-2 border-[#1A1200]/50 border-t-[#1A1200] rounded-full animate-spin" />
            : <><ArrowUpCircle size={18} /> Upgrade · {fmtMoney(upgradeCost)}</>}
        </motion.button>

        {/* C-Suite & Takeover */}
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ y: 2, scale: 0.97 }}
            onClick={() => setShowCSuite(true)}
            className="py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(180deg, #B56EFF 0%, #8B3FCC 100%)',
              boxShadow: '0 4px 0 #5C2A8A',
              color: '#fff',
            }}
          >
            <Users size={16} /> C-Suite
          </motion.button>
          {business?.level >= 5 && (
            <motion.button
              whileTap={{ y: 2, scale: 0.97 }}
              onClick={() => setShowTakeover(true)}
              className="py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(180deg, #FF6B6B 0%, #C0392B 100%)',
                boxShadow: '0 4px 0 #8B2020',
                color: '#fff',
              }}
            >
              <Swords size={16} /> Takeover
            </motion.button>
          )}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Stats */}
        <div className="card">
          <p className="text-[10px] font-black tracking-widest uppercase mb-4"
            style={{ color: 'var(--col-text-3)' }}>Business Stats</p>
          <div className="space-y-4">
            {stats.map((stat) => (
              <div key={stat.key}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-bold" style={{ color: 'var(--col-text-1)' }}>{stat.label}</span>
                  <span className="text-xs font-bold nums" style={{ color: 'var(--col-text-3)' }}>
                    {stat.key === 'staff_morale' ? `${stat.level}%` : `Lv.${stat.level}/${stat.max}`}
                  </span>
                </div>
                <ProgressBar value={stat.level / stat.max} color={stat.color} chunky />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} color={isPositive ? '#3DD68C' : '#FF5A5A'} />
            <p className="text-[10px] font-black tracking-widest uppercase"
              style={{ color: 'var(--col-text-3)' }}>Profit History (24h)</p>
          </div>
          <SparklineChart data={profitHistory} positive={isPositive} height={100} />
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCSuite && <CSuitePanel businessId={id} onClose={() => setShowCSuite(false)} />}
        {showTakeover && <TakeoverInitiateModal business={business} onClose={() => setShowTakeover(false)} />}
      </AnimatePresence>
    </div>
  )
}
