import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, DollarSign, BarChart2, CheckCircle2, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useUserStore from '../stores/useUserStore'
import Card from '../components/Card'
import ProgressBar from '../components/ProgressBar'

const fmt = (n) => {
  n = parseFloat(n || 0)
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

const STARTUPS = [
  {
    id: 'nexus', name: 'Nexus AI',         sector: 'Technology',  tier: 3,
    min_invest: 50000,  target: 2000000,  roi: 3.2,  months: 18,
    color: '#5B9CF6', funded: 0.62,
  },
  {
    id: 'terra', name: 'Terra Logistics',  sector: 'Supply Chain', tier: 2,
    min_invest: 10000,  target: 500000,   roi: 1.8,  months: 9,
    color: '#3DD68C', funded: 0.81,
  },
  {
    id: 'zenith', name: 'Zenith Energy',  sector: 'CleanTech',    tier: 4,
    min_invest: 200000, target: 8000000,  roi: 5.1,  months: 36,
    color: '#F5C842', funded: 0.29,
  },
  {
    id: 'covert', name: 'Covert Systems', sector: 'Defense',      tier: 2,
    min_invest: 25000,  target: 1000000,  roi: 2.4,  months: 12,
    color: '#B56EFF', funded: 0.55,
  },
  {
    id: 'helix', name: 'Helix Bio',       sector: 'Biotech',      tier: 5,
    min_invest: 500000, target: 20000000, roi: 8.0,  months: 48,
    color: '#FF9F43', funded: 0.14,
  },
]

const TIER_LABEL = ['', 'Seed', 'Series A', 'Series B', 'Series C', 'IPO Track']

function InvestSheet({ startup, onClose, onInvest }) {
  const [amount, setAmount] = useState(String(startup.min_invest))
  const [status, setStatus] = useState(null)
  const balance = useUserStore((s) => parseFloat(s.user?.balance || 0))
  const val = parseFloat(amount) || 0
  const canInvest = val >= startup.min_invest && val <= balance

  const handleInvest = async () => {
    setStatus('loading')
    try {
      await onInvest(startup.id, val)
      setStatus('success')
      setTimeout(onClose, 900)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus(null), 1500)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="w-full rounded-t-3xl p-6 pb-10 space-y-5"
        style={{ background: '#151622', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div>
          <p className="font-black text-lg" style={{ color: 'var(--col-text-1)' }}>{startup.name}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-xs nums" style={{ color: startup.color }}>×{startup.roi} ROI</span>
            <span className="text-xs" style={{ color: 'var(--col-text-3)' }}>{startup.months} months</span>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black tracking-widest uppercase mb-2 block" style={{ color: 'var(--col-text-3)' }}>
            Investment Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-lg font-black nums outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'var(--col-text-1)',
            }}
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--col-text-3)' }}>
            Min {fmt(startup.min_invest)} · Balance {fmt(balance)}
          </p>
        </div>
        {canInvest && (
          <div className="p-3 rounded-xl" style={{ background: `${startup.color}0A`, border: `1px solid ${startup.color}20` }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--col-text-3)' }}>
              Expected return: <span className="font-black" style={{ color: startup.color }}>{fmt(val * startup.roi)}</span> in {startup.months}m
            </p>
          </div>
        )}
        <motion.button
          whileTap={{ y: 2, scale: 0.98 }}
          onClick={handleInvest}
          disabled={!canInvest}
          className="w-full py-3.5 rounded-2xl font-black text-sm"
          style={{
            background: status === 'success' ? '#3DD68C' : 'linear-gradient(180deg, #F5C842 0%, #C49B20 100%)',
            color: '#1A1200',
            opacity: !canInvest ? 0.4 : 1,
            boxShadow: canInvest ? '0 4px 0 #8B6A00, 0 6px 16px rgba(245,200,66,0.25)' : 'none',
          }}
        >
          {status === 'loading' ? 'Investing...' : status === 'success' ? 'Committed' : 'Commit Investment'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

export default function VentureCapital() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [investments, setInvestments] = useState([])

  const handleInvest = async (startupId, amount) => {
    setInvestments(prev => [...prev, { startupId, amount, date: new Date().toISOString() }])
  }

  return (
    <div className="page-scroll">
      <div className="px-4 pt-5 pb-24 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft size={16} style={{ color: 'var(--col-text-1)' }} />
          </motion.button>
          <div>
            <h1 className="font-black text-xl" style={{ color: 'var(--col-text-1)' }}>Venture Capital</h1>
            <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>Fund the next unicorn</p>
          </div>
        </div>

        {/* Active investments */}
        {investments.length > 0 && (
          <Card>
            <p className="text-[10px] font-black tracking-widest uppercase mb-3" style={{ color: 'var(--col-text-3)' }}>
              Your Portfolio
            </p>
            <div className="space-y-2">
              {investments.map((inv, i) => {
                const s = STARTUPS.find(st => st.id === inv.startupId)
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl"
                    style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
                    <CheckCircle2 size={14} style={{ color: s.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-black" style={{ color: 'var(--col-text-1)' }}>{s.name}</p>
                      <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>{fmt(inv.amount)} invested</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={10} style={{ color: 'var(--col-text-3)' }} />
                      <span className="text-xs" style={{ color: 'var(--col-text-3)' }}>{s.months}m</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Startups */}
        <Card>
          <p className="text-[10px] font-black tracking-widest uppercase mb-3" style={{ color: 'var(--col-text-3)' }}>
            Deal Flow
          </p>
          <div className="space-y-3">
            {STARTUPS.map(s => {
              const invested = investments.find(i => i.startupId === s.id)
              return (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl"
                  style={{
                    background: invested ? `${s.color}08` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${invested ? s.color + '25' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm" style={{ color: 'var(--col-text-1)' }}>{s.name}</p>
                        <span
                          className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded"
                          style={{ background: `${s.color}18`, color: s.color }}
                        >
                          {TIER_LABEL[s.tier]}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--col-text-3)' }}>{s.sector}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black tracking-widest" style={{ color: 'var(--col-text-3)' }}>ROI</p>
                      <p className="text-lg font-black nums" style={{ color: s.color }}>×{s.roi}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-[9px] font-black tracking-widest uppercase mb-1">
                      <span style={{ color: 'var(--col-text-3)' }}>Funding</span>
                      <span style={{ color: s.color }}>{Math.round(s.funded * 100)}%</span>
                    </div>
                    <ProgressBar value={s.funded} color={s.color} />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black tracking-widest uppercase" style={{ color: 'var(--col-text-3)' }}>Min. Investment</p>
                      <p className="text-sm font-black nums" style={{ color: 'var(--col-text-1)' }}>{fmt(s.min_invest)}</p>
                    </div>
                    {invested ? (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                        style={{ background: `${s.color}12`, border: `1px solid ${s.color}25` }}>
                        <CheckCircle2 size={12} style={{ color: s.color }} />
                        <span className="text-xs font-black" style={{ color: s.color }}>Invested</span>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ y: 2, scale: 0.97 }}
                        onClick={() => setSelected(s)}
                        className="px-4 py-2 rounded-xl font-black text-xs"
                        style={{
                          background: 'linear-gradient(180deg, #F5C842 0%, #C49B20 100%)',
                          color: '#1A1200',
                          boxShadow: '0 3px 0 #8B6A00',
                        }}
                      >
                        Invest
                      </motion.button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {selected && (
        <InvestSheet
          startup={selected}
          onClose={() => setSelected(null)}
          onInvest={handleInvest}
        />
      )}
    </div>
  )
}
