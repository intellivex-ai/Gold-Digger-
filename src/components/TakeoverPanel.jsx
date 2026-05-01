/**
 * TakeoverPanel.jsx
 * 
 * Contains components related to the PvP "Hostile Takeover" mechanic.
 * 
 * 1. TakeoverInitiateModal: A modal where an attacker places a bid on someone else's business.
 * 2. DefendBanner: A persistent warning banner that shows up if YOU are being attacked.
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Shield, DollarSign, AlertTriangle, X, TrendingDown } from 'lucide-react'
import useBusinessStore from '../stores/useBusinessStore'
import useUserStore from '../stores/useUserStore'
import sounds from '../lib/soundManager'

/**
 * The Modal that pops up when you decide to attack another player's business.
 */
export function TakeoverInitiateModal({ open, business, onClose }) {
  // Bids must start at 2x the base upgrade cost of the business
  const [bidAmount, setBidAmount] = useState(parseFloat(business?.upgrade_cost || 10000) * 2)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  
  const { initiateTakeover } = useBusinessStore()
  const updateCash = useUserStore(s => s.updateCash)
  const user = useUserStore(s => s.user)

  const handleTakeover = async () => {
    if (!business) return
    
    // Check if player has enough money to back their bid
    if (parseFloat(user?.cash || 0) < bidAmount) {
      setResult({ success: false, message: 'Insufficient funds.' })
      return
    }
    
    sounds.tap()
    setLoading(true)
    
    // Call the store to create the takeover record
    const res = await initiateTakeover(business.id, bidAmount)
    
    setLoading(false)
    if (res.success) {
      // Deduct cash from the attacker immediately. 
      // It is held in escrow until the takeover resolves.
      updateCash(-bidAmount)
      setResult({ success: true })
    } else {
      setResult({ success: false, message: res.message })
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
            onClick={onClose}
          />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()} // Prevent clicking modal from closing it
        className="relative z-10 w-full max-w-[430px] rounded-t-3xl p-6 pb-10 overflow-y-auto overscroll-contain"
        style={{
          background: 'linear-gradient(180deg, #1C0A0A 0%, #0E0F18 100%)', // Ominous red gradient
          border: '1px solid rgba(255,107,107,0.25)',
          boxShadow: '0 -8px 40px rgba(255,107,107,0.15)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)' }}>
              <Swords size={20} style={{ color: '#FF6B6B' }} />
            </div>
            <div>
              <h3 className="text-xl font-black" style={{ color: '#FF6B6B' }}>Hostile Takeover</h3>
              <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>24-hour defense window</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <X size={16} style={{ color: 'var(--col-text-2)' }} />
          </button>
        </div>

        {/* ── Target Info ── */}
        <div className="p-3 rounded-2xl mb-4" style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)' }}>
          <div className="text-sm font-bold" style={{ color: 'var(--col-text-1)' }}>🎯 Target: {business?.name}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--col-text-3)' }}>
            Level {business?.level} · ${parseFloat(business?.revenue_per_minute || 0).toFixed(2)}/min
          </div>
        </div>

        {/* ── Rule Explainer ── */}
        <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(255,159,67,0.08)', border: '1px solid rgba(255,159,67,0.2)' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} style={{ color: '#FF9F43', marginTop: 1, flexShrink: 0 }} />
            <p className="text-xs" style={{ color: 'rgba(255,159,67,0.9)' }}>
              The target owner has 24 hours to counter-bid or pay defense fee. If they fail, you take ownership.
            </p>
          </div>
        </div>

        {/* ── Bidding Controls ── */}
        <div className="mb-5">
          <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--col-text-3)' }}>Bid Amount</label>
          <input type="number" value={bidAmount} onChange={e => setBidAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-xl font-bold text-xl"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,107,107,0.3)', color: 'var(--col-text-1)', outline: 'none' }} />
          
          {/* Quick multiplier buttons (e.g. 1x, 2x the base cost) */}
          <div className="flex gap-2 mt-2">
            {[1, 1.5, 2, 3].map(m => (
              <button key={m} onClick={() => setBidAmount(parseFloat(business?.upgrade_cost || 10000) * m)}
                className="flex-1 py-1 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(255,107,107,0.1)', color: '#FF9F43', border: '1px solid rgba(255,107,107,0.2)' }}>
                {m}x
              </button>
            ))}
          </div>
        </div>

        {/* ── Status Message ── */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-3 rounded-xl text-sm font-bold"
              style={{
                background: result.success ? 'rgba(61,214,140,0.12)' : 'rgba(255,107,107,0.12)',
                color: result.success ? '#3DD68C' : '#FF6B6B',
              }}>
              {result.success ? '⚔️ Takeover initiated! Target has 24h to respond.' : `❌ ${result.message}`}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Submit Button ── */}
        <motion.button
          whileTap={{ scale: 0.96, y: 2 }}
          onClick={handleTakeover}
          disabled={loading || result?.success}
          className="w-full py-4 rounded-2xl font-black text-base"
          style={{
            background: 'linear-gradient(180deg, #FF6B6B 0%, #C0392B 100%)',
            boxShadow: '0 6px 0 #8B2020, 0 8px 24px rgba(255,107,107,0.4)',
            color: '#fff',
            opacity: (loading || result?.success) ? 0.6 : 1,
          }}
        >
          {loading ? 'Initiating...' : result?.success ? '⚔️ Takeover Initiated' : `⚔️ INITIATE TAKEOVER · $${bidAmount.toLocaleString()}`}
        </motion.button>
      </motion.div>
      </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

/**
 * A red warning banner that appears at the top of the Businesses page
 * if one of your businesses is currently being attacked by another player.
 */
export function DefendBanner({ takeovers, onDefend }) {
  if (!takeovers?.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-3 p-3 rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(255,107,107,0.2), rgba(255,107,107,0.08))',
        border: '1px solid rgba(255,107,107,0.4)',
        boxShadow: '0 0 20px rgba(255,107,107,0.2)',
      }}
    >
      {takeovers.map(t => (
        <div key={t.id} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} style={{ color: '#FF6B6B' }} />
            <div>
              <div className="text-sm font-black" style={{ color: '#FF6B6B' }}>⚠️ UNDER ATTACK!</div>
              <div className="text-xs" style={{ color: 'var(--col-text-3)' }}>
                Bid: ${parseFloat(t.bid_amount || 0).toLocaleString()} · expires soon
              </div>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onDefend(t)}
            className="px-3 py-1.5 rounded-xl text-xs font-black"
            style={{ background: '#FF6B6B', color: '#fff' }}
          >
            DEFEND
          </motion.button>
        </div>
      ))}
    </motion.div>
  )
}
