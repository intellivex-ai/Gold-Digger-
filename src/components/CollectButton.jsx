/**
 * CollectButton.jsx
 * 
 * The massive, glowing "Collect" button used on the dashboard to claim offline earnings.
 * It features complex animations (pulsing, glowing) when earnings are available,
 * and turns grey when there's nothing to collect.
 */

import { Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import sounds from '../lib/soundManager'

export default function CollectButton({ amount = 0, loading = false, onClick }) {
  // We only show the active state if there's actual money to collect and we aren't loading
  const hasEarnings = amount > 0 && !loading

  // Number Formatting: 
  // e.g. 1500000 -> "$1.50M"
  // e.g. 1500    -> "$1.5k"
  // e.g. 900     -> "$900"
  const formatted = amount >= 1e6
    ? `$${(amount / 1e6).toFixed(2)}M`
    : amount >= 1000
    ? `$${(amount / 1000).toFixed(1)}k`
    : `$${Math.floor(amount).toLocaleString()}`

  function handleClick() {
    if (hasEarnings) sounds.collect?.()
    onClick?.()
  }

  return (
    <div className="relative">
      {/* ── Background Glow Effects ── */}
      <AnimatePresence>
        {hasEarnings && (
          <motion.div
            className="absolute inset-0 rounded-[18px] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              boxShadow: '0 0 40px rgba(245,200,66,0.35), 0 0 80px rgba(245,200,66,0.15)',
              // Custom CSS keyframe animation defined in index.css
              animation: 'glow-pulse-gold 2s ease-in-out infinite', 
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Expanding Pulse Ring ── */}
      {/* This mimics the "sonar" ring effect common in mobile game CTAs */}
      {hasEarnings && (
        <motion.span
          className="absolute inset-0 rounded-[18px] pointer-events-none"
          animate={{ scale: [1, 1.04, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: 'rgba(245,200,66,0.15)' }}
        />
      )}

      {/* ── Main Button ── */}
      <motion.button
        whileTap={hasEarnings ? { y: 4, scale: 0.98 } : undefined}
        whileHover={hasEarnings ? { y: -1, scale: 1.01 } : undefined}
        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
        onClick={handleClick}
        disabled={loading || amount === 0}
        className="btn-collect w-full flex items-center justify-center gap-3"
        style={{ minHeight: 64 }}
      >
        {loading ? (
          // Loading Spinner State
          <span className="w-6 h-6 border-3 border-[#1A1200]/60 border-t-[#1A1200] rounded-full animate-spin" />
        ) : hasEarnings ? (
          // Active state (Ready to Collect)
          <>
            {/* Floating Coin Icon */}
            <div className="relative flex-shrink-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 35% 30%, #fff8d0, #c49b20)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.6)',
                  animation: 'float 2s ease-in-out infinite',
                }}
              >
                <Zap size={18} fill="#7A5800" color="#7A5800" />
              </div>
            </div>

            {/* Text & Amount */}
            <div className="flex flex-col items-start">
              <span
                className="text-[10px] font-black tracking-widest uppercase"
                style={{ color: '#7A5800', letterSpacing: '0.12em' }}
              >
                Collect
              </span>
              <span
                className="text-2xl font-black nums leading-tight"
                style={{
                  color: '#1A1200',
                  textShadow: '0 1px 0 rgba(255,255,255,0.3)',
                  letterSpacing: '-0.02em',
                }}
              >
                {formatted}
              </span>
            </div>
          </>
        ) : (
          // Empty state (Nothing to Collect)
          <span
            className="text-base font-bold tracking-wide"
            style={{ color: 'var(--col-text-3)', letterSpacing: '0.04em' }}
          >
            Nothing to Collect Yet
          </span>
        )}
      </motion.button>
    </div>
  )
}
