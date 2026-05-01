/**
 * OrderModal.jsx
 * 
 * An animated bottom-sheet modal used for buying and selling stocks.
 * Supports switching between "Market" (buy now at current price) 
 * and "Limit" (buy later at a specific price) orders.
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import sounds from '../lib/soundManager'

export default function OrderModal({ open, side = 'buy', stock, onClose, onSubmit }) {
  // Form State
  const [quantity,   setQuantity]   = useState('1')
  const [orderType,  setOrderType]  = useState('market') // 'market' | 'limit'
  const [limitPrice, setLimitPrice] = useState(stock?.price ? parseFloat(stock.price).toFixed(2) : '')
  
  // UI State
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // Math Calculations for the UI
  const price = orderType === 'market' ? parseFloat(stock?.price || 0) : parseFloat(limitPrice || 0)
  const total = price * parseFloat(quantity || 0)
  
  // Theming based on Buy vs Sell
  const isBuy = side === 'buy'
  const actionColor = isBuy ? '#3DD68C' : '#FF5A5A'

  /** Validates and submits the order */
  async function handleSubmit() {
    setError('')
    const qty = parseInt(quantity)
    
    // Validations
    if (!qty || qty < 1) { 
      setError('Enter a valid quantity.')
      sounds.error?.()
      return 
    }
    
    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setError('Enter a valid limit price.')
      sounds.error?.()
      return
    }

    setLoading(true)
    try {
      // Execute the order (this calls the parent component's onSubmit prop, which triggers Supabase)
      await onSubmit({ side, quantity: qty, orderType, price })
      
      // Success!
      isBuy ? sounds.buy?.() : sounds.sell?.()
      onClose()
      setQuantity('1') // Reset for next time
    } catch (e) { 
      // Handle network or logic errors (e.g. "Not enough cash")
      setError(e.message || 'Order failed.')
      sounds.error?.() 
    } finally { 
      setLoading(false) 
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Background overlay */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />

          {/* Modal Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[430px] z-[70] px-5 pt-5 rounded-t-[28px] overflow-y-auto overscroll-contain"
            style={{
              background: 'linear-gradient(180deg, #1A1B28 0%, #141520 100%)',
              border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none',
              boxShadow: '0 -8px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)',
              maxHeight: '88dvh',
              /* Safe area for bottom inset (e.g. iPhone home indicator) */
              paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
            }}
          >
            {/* iOS-style drag handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.15)' }} />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2">
                  {isBuy ? <TrendingUp size={18} color="#3DD68C" /> : <TrendingDown size={18} color="#FF5A5A" />}
                  <h3 className="text-xl font-black" style={{ color: 'var(--col-text-1)' }}>
                    {isBuy ? 'Buy' : 'Sell'} {stock?.symbol}
                  </h3>
                </div>
                <p className="text-xs mt-0.5 nums" style={{ color: 'var(--col-text-3)' }}>
                  ${parseFloat(stock?.price || 0).toFixed(2)} · current price
                </p>
              </div>
              <motion.button whileTap={{ scale: 0.85 }} onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <X size={16} style={{ color: 'var(--col-text-2)' }} />
              </motion.button>
            </div>

            {/* Market / Limit Toggle Switch */}
            <div className="flex rounded-xl p-1 mb-5"
              style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {['market', 'limit'].map((t) => (
                <motion.button key={t} whileTap={{ scale: 0.96 }}
                  onClick={() => { setOrderType(t); sounds.tap?.() }}
                  className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all"
                  style={orderType === t ? {
                    background: `${actionColor}15`, border: `1px solid ${actionColor}35`, color: actionColor,
                  } : { color: 'var(--col-text-3)' }}>
                  {t}
                </motion.button>
              ))}
            </div>

            {/* Quantity Input with -/+ buttons */}
            <div className="mb-4">
              <label className="block text-[10px] font-black tracking-widest uppercase mb-2"
                style={{ color: 'var(--col-text-3)' }}>Quantity (shares)</label>
              <div className="flex items-center gap-2">
                {[
                  { label: '−', fn: () => setQuantity((q) => String(Math.max(1, parseInt(q || 1) - 1))) },
                  null, // This represents the input field in the middle
                  { label: '+', fn: () => setQuantity((q) => String(parseInt(q || 1) + 1)) },
                ].map((btn, i) => btn ? (
                  <motion.button key={i} whileTap={{ scale: 0.85 }} onClick={btn.fn}
                    className="w-11 h-11 rounded-xl text-xl font-black flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--col-text-1)' }}>
                    {btn.label}
                  </motion.button>
                ) : (
                  <input key="qty" type="number" min="1" value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="flex-1 h-11 rounded-xl text-center text-base font-black nums outline-none"
                    style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--col-text-1)' }} />
                ))}
              </div>
            </div>

            {/* Limit Price Input (only visible if orderType is 'limit') */}
            {orderType === 'limit' && (
              <div className="mb-4">
                <label className="block text-[10px] font-black tracking-widest uppercase mb-2"
                  style={{ color: 'var(--col-text-3)' }}>Limit Price ($)</label>
                <input type="number" step="0.01" value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)} className="input-dark nums" />
              </div>
            )}

            {/* Estimated Total Calculation */}
            <div className="flex justify-between items-center py-3 my-4 rounded-xl px-3"
              style={{ background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-sm font-bold" style={{ color: 'var(--col-text-3)' }}>Estimated Total</span>
              <span className="text-lg font-black nums" style={{ color: actionColor }}>
                ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-xs font-bold mb-3 px-3 py-2 rounded-lg"
                style={{ color: '#FF5A5A', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
                {error}
              </p>
            )}

            {/* Submit Button */}
            <motion.button whileTap={{ y: 3, scale: 0.98 }} onClick={handleSubmit} disabled={loading}
              className={isBuy ? 'btn-game-blue w-full' : 'btn-game-red w-full'}
              style={{ paddingTop: 14, paddingBottom: 14, fontSize: 15,
                ...(isBuy ? {
                  background: 'linear-gradient(180deg,#5EF0A0 0%,#3DD68C 35%,#1EA85C 100%)',
                  boxShadow: '0 1px 0 rgba(255,255,255,.30) inset,0 -2px 0 rgba(0,0,0,.30) inset,0 3px 0 #0D5E30,0 5px 14px rgba(61,214,140,.35)',
                  color: '#fff',
                } : {}),
              }}>
              {loading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : isBuy ? '⚡ Place Buy Order' : '📉 Place Sell Order'}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
