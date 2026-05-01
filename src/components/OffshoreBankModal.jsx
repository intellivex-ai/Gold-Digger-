/**
 * OffshoreBankModal.jsx
 * 
 * An interactive modal that allows players to hide their cash from hostile PVP takeovers.
 * The tradeoff is that offshore storage incurs a daily percentage fee.
 * Includes math for calculating safe limits and deposit/withdraw state logic.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, X, ArrowDownToLine, ArrowUpFromLine, Lock, DollarSign, AlertTriangle } from 'lucide-react'
import useUserStore from '../stores/useUserStore'
import { supabase } from '../lib/supabase'
import sounds from '../lib/soundManager'

// Global configuration variable
const DAILY_FEE_RATE = 0.005  // 0.5% per day

export default function OffshoreBankModal({ onClose }) {
  const user = useUserStore(s => s.user)
  const updateCash = useUserStore(s => s.updateCash)
  
  const [tab, setTab] = useState('deposit') // 'deposit' or 'withdraw'
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  // ── Financial Data Parsing ──
  // Extract and default to 0 to prevent NaN errors in the UI
  const offshoreBalance = parseFloat(user?.offshore_balance || 0)
  const cashBalance = parseFloat(user?.cash || 0)
  
  // Predict the daily drain based on current balance
  const dailyFee = offshoreBalance * DAILY_FEE_RATE

  const handleAction = async () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    sounds.tap()
    setLoading(true)

    const isDeposit = tab === 'deposit'

    // ── Input Validation ──
    if (isDeposit && val > cashBalance) {
      setResult({ success: false, message: 'Insufficient cash.' })
      setLoading(false); return
    }
    if (!isDeposit && val > offshoreBalance) {
      setResult({ success: false, message: 'Insufficient offshore funds.' })
      setLoading(false); return
    }

    // Determine new state values locally
    const newCash = isDeposit ? cashBalance - val : cashBalance + val
    const newOffshore = isDeposit ? offshoreBalance + val : offshoreBalance - val

    // ── Database Update ──
    try {
      await supabase.from('profiles')
        .update({ cash: newCash, offshore_balance: newOffshore })
        .eq('id', user.id)
    } catch { /* Suppress errors in demo mode */ }

    // ── Local Store Update ──
    updateCash(isDeposit ? -val : val)
    
    // Manual state override to reflect the new offshore balance immediately
    useUserStore.setState(s => ({
      user: { ...s.user, offshore_balance: newOffshore, cash: newCash }
    }))

    setResult({ success: true, isDeposit, val })
    setLoading(false)
    setAmount('')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()} // Prevent clicking inner modal from closing it
        className="w-full rounded-t-3xl p-6 pb-10"
        style={{
          background: 'linear-gradient(180deg, #0A1020 0%, #0E0F18 100%)',
          border: '1px solid rgba(91,156,246,0.2)',
          boxShadow: '0 -8px 40px rgba(91,156,246,0.12)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(91,156,246,0.15)', border: '1px solid rgba(91,156,246,0.3)' }}>
              <Shield size={20} style={{ color: '#5B9CF6' }} />
            </div>
            <div>
              <h3 className="text-xl font-black" style={{ color: 'var(--col-text-1)' }}>Offshore Banking</h3>
              <p className="text-xs" style={{ color: 'rgba(91,156,246,0.8)' }}>Hidden from hostile raids</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={16} style={{ color: 'var(--col-text-2)' }} />
          </button>
        </div>

        {/* ── Balance Summary Cards ── */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Main Wallet */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(61,214,140,0.08)', border: '1px solid rgba(61,214,140,0.2)' }}>
            <div className="text-[10px] font-black mb-1" style={{ color: 'var(--col-text-3)' }}>CASH BALANCE</div>
            <div className="text-lg font-black" style={{ color: '#3DD68C' }}>${cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          
          {/* Offshore Vault */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(91,156,246,0.08)', border: '1px solid rgba(91,156,246,0.2)' }}>
            <div className="text-[10px] font-black mb-1 flex items-center gap-1" style={{ color: 'var(--col-text-3)' }}>
              <Lock size={9} /> OFFSHORE
            </div>
            <div className="text-lg font-black" style={{ color: '#5B9CF6' }}>${offshoreBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            {offshoreBalance > 0 && (
              <div className="text-[10px] mt-1" style={{ color: 'rgba(255,159,67,0.8)' }}>
                Fee: ${dailyFee.toFixed(2)}/day
              </div>
            )}
          </div>
        </div>

        {/* ── Rules / Warning Banner ── */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl mb-5"
          style={{ background: 'rgba(255,159,67,0.08)', border: '1px solid rgba(255,159,67,0.2)' }}>
          <AlertTriangle size={13} style={{ color: '#FF9F43', marginTop: 1, flexShrink: 0 }} />
          <p className="text-xs" style={{ color: 'rgba(255,159,67,0.9)' }}>
            Offshore funds are hidden from hostile takeovers and espionage. Daily maintenance fee: <strong>0.5%</strong> of stored balance.
          </p>
        </div>

        {/* ── Mode Selection Tabs ── */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl mb-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {['deposit', 'withdraw'].map(t => (
            <button key={t} onClick={() => { setTab(t); setResult(null) }}
              className="py-2 rounded-lg text-sm font-black capitalize transition-all"
              style={{
                background: tab === t ? 'rgba(91,156,246,0.2)' : 'transparent',
                color: tab === t ? '#5B9CF6' : 'var(--col-text-3)',
                border: tab === t ? '1px solid rgba(91,156,246,0.4)' : '1px solid transparent',
              }}>
              {t === 'deposit' ? '⬇️ Deposit' : '⬆️ Withdraw'}
            </button>
          ))}
        </div>

        {/* ── Amount Input Form ── */}
        <div className="relative mb-5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg" style={{ color: 'var(--col-text-3)' }}>$</span>
          <input
            type="number" value={amount} onChange={e => { setAmount(e.target.value); setResult(null) }}
            placeholder="0"
            className="w-full pl-8 pr-4 py-3 rounded-xl font-bold text-xl"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(91,156,246,0.25)', color: 'var(--col-text-1)', outline: 'none' }}
          />
        </div>

        {/* ── Quick Action Percentages ── */}
        <div className="flex gap-2 mb-5">
          {[10, 25, 50, 100].map(pct => {
            // Determine max based on selected mode
            const max = tab === 'deposit' ? cashBalance : offshoreBalance
            const val = Math.floor(max * pct / 100)
            return (
              <button key={pct} onClick={() => setAmount(String(val))}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--col-text-2)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {pct}%
              </button>
            )
          })}
        </div>

        {/* ── Result Feedback ── */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-3 rounded-xl text-sm font-bold"
              style={{
                background: result.success ? 'rgba(61,214,140,0.12)' : 'rgba(255,107,107,0.12)',
                color: result.success ? '#3DD68C' : '#FF6B6B',
              }}>
              {result.success
                ? result.isDeposit
                  ? `🔒 $${result.val.toLocaleString()} safely stored offshore.`
                  : `✅ $${result.val.toLocaleString()} returned to your cash balance.`
                : `❌ ${result.message}`}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Final Action Button ── */}
        <motion.button
          whileTap={{ scale: 0.96, y: 2 }}
          onClick={handleAction}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-black text-base"
          style={{
            // Blue for deposit, Green for withdraw
            background: tab === 'deposit'
              ? 'linear-gradient(180deg, #5B9CF6 0%, #3A7BD5 100%)'
              : 'linear-gradient(180deg, #3DD68C 0%, #28A868 100%)',
            boxShadow: tab === 'deposit'
              ? '0 6px 0 #1E4FAA, 0 8px 24px rgba(91,156,246,0.4)'
              : '0 6px 0 #1A7A4A, 0 8px 24px rgba(61,214,140,0.4)',
            color: '#fff',
          }}
        >
          {loading ? 'Processing...' : tab === 'deposit' ? '🔒 DEPOSIT OFFSHORE' : '🔓 WITHDRAW FUNDS'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
