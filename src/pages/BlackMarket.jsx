import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, AlertTriangle, Shield, TrendingUp, BarChart2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useBlackMarketStore from '../stores/useBlackMarketStore'
import useUserStore from '../stores/useUserStore'
import Card from '../components/Card'
import ProgressBar from '../components/ProgressBar'

const fmt = (n) => {
  n = parseFloat(n || 0)
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

const RISK_COLOR = ['#3DD68C', '#F5C842', '#FF9F43', '#FF6B6B', '#B56EFF']
const RISK_LABEL = ['Safe', 'Low', 'Medium', 'High', 'Extreme']

function ResultModal({ result, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        className="w-full max-w-sm p-8 rounded-3xl text-center space-y-4"
        style={{ background: '#151622', border: '1px solid rgba(255,255,255,0.10)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{
            background: result.success ? 'rgba(61,214,140,0.15)' : 'rgba(255,107,107,0.15)',
          }}
        >
          {result.success
            ? <TrendingUp size={28} style={{ color: '#3DD68C' }} />
            : <AlertTriangle size={28} style={{ color: '#FF6B6B' }} />
          }
        </div>
        <div>
          <p className="font-black text-lg" style={{ color: result.success ? '#3DD68C' : '#FF6B6B' }}>
            {result.success ? 'Operation Successful' : 'Busted'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--col-text-3)' }}>{result.message}</p>
        </div>
        {result.payout > 0 && (
          <p className="text-2xl font-black nums" style={{ color: '#F5C842' }}>+{fmt(result.payout)}</p>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-black text-sm"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--col-text-1)' }}
        >
          Close
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

export default function BlackMarket() {
  const navigate = useNavigate()
  const { items, fetchItems, runOperation, isLoading } = useBlackMarketStore()
  const balance  = useUserStore((s) => parseFloat(s.user?.balance || 0))
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(null)

  useEffect(() => { fetchItems?.() }, [])

  const handleRun = async (item) => {
    if (running) return
    setRunning(item.id)
    try {
      const res = await runOperation(item.id)
      setResult(res)
    } catch (e) {
      setResult({ success: false, message: e.message || 'Operation failed', payout: 0 })
    } finally {
      setRunning(null)
    }
  }

  const riskIdx = (r) => Math.min(4, Math.floor(parseFloat(r || 0) * 5))

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
            <h1 className="font-black text-xl" style={{ color: 'var(--col-text-1)' }}>Black Market</h1>
            <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>High-risk underground operations</p>
          </div>
        </div>

        {/* Warning */}
        <div
          className="flex gap-3 p-3 rounded-2xl"
          style={{ background: 'rgba(255,159,67,0.08)', border: '1px solid rgba(255,159,67,0.18)' }}
        >
          <AlertTriangle size={16} style={{ color: '#FF9F43', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs font-semibold" style={{ color: '#FF9F43' }}>
            These operations carry real risk. Getting caught results in fines or asset seizure.
          </p>
        </div>

        {/* Operations */}
        <Card>
          <p className="text-[10px] font-black tracking-widest uppercase mb-3" style={{ color: 'var(--col-text-3)' }}>
            Operations
          </p>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl animate-shimmer" style={{ background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => {
                const ri = riskIdx(item.risk_level)
                const rc = RISK_COLOR[ri]
                const isRunning = running === item.id
                const canRun = balance >= parseFloat(item.cost || 0) && !running

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${rc}18`, border: `1px solid ${rc}28` }}
                      >
                        <BarChart2 size={15} style={{ color: rc }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-sm" style={{ color: 'var(--col-text-1)' }}>{item.name}</p>
                          <span
                            className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded"
                            style={{ background: `${rc}18`, color: rc }}
                          >
                            {RISK_LABEL[ri]}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--col-text-3)' }}>{item.description}</p>
                      </div>
                    </div>

                    {/* Risk bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-[9px] font-black tracking-widest uppercase mb-1">
                        <span style={{ color: 'var(--col-text-3)' }}>Risk</span>
                        <span style={{ color: rc }}>{Math.round(parseFloat(item.risk_level || 0) * 100)}%</span>
                      </div>
                      <ProgressBar value={parseFloat(item.risk_level || 0)} color={rc} />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black tracking-widest uppercase" style={{ color: 'var(--col-text-3)' }}>Potential</p>
                        <p className="text-base font-black nums" style={{ color: '#F5C842' }}>{fmt(item.max_payout)}</p>
                      </div>
                      <motion.button
                        whileTap={{ y: 2, scale: 0.97 }}
                        onClick={() => handleRun(item)}
                        disabled={!canRun}
                        className="px-5 py-2.5 rounded-xl font-black text-xs"
                        style={{
                          background: canRun
                            ? `linear-gradient(180deg, ${rc} 0%, ${rc}CC 100%)`
                            : 'rgba(255,255,255,0.06)',
                          color: canRun ? '#fff' : 'var(--col-text-3)',
                          opacity: !canRun && !isRunning ? 0.5 : 1,
                        }}
                      >
                        {isRunning ? 'Running...' : `Run · ${fmt(item.cost)}`}
                      </motion.button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {result && <ResultModal result={result} onClose={() => setResult(null)} />}
    </div>
  )
}
