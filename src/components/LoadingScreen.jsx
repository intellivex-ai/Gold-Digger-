/**
 * LoadingScreen.jsx
 * 
 * The main splash screen shown when the app first loads or when a critical module
 * is being fetched. Uses a combination of Framer Motion springs and CSS 
 * particle animations to provide a premium feel before the user enters the game.
 */

import { motion } from 'framer-motion'
import logoSrc from '../assets/logo.svg'

export default function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        // A complex radial gradient that mixes Gold and Blue subtle lighting 
        // to match the game's color palette.
        background: `
          radial-gradient(ellipse 60% 50% at 50% 0%, rgba(245,200,66,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 80% 80%, rgba(91,156,246,0.10) 0%, transparent 60%),
          #08090D`,
      }}
    >
      {/* ── Ambient Particles ── */}
      {/* We map over an empty array of 6 items to generate 6 floating dots in the background */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 3 + (i % 3),
            height: 3 + (i % 3),
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 20}%`,
            background: i % 2 === 0 ? 'rgba(245,200,66,0.6)' : 'rgba(91,156,246,0.6)',
          }}
          // The particles float up and down slightly and pulse their opacity
          animate={{ y: [-8, 8, -8], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        />
      ))}

      {/* ── Game Logo Container ── */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 15 }}
        className="relative mb-6"
      >
        {/* Pulsing glow halo behind the logo */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-4 rounded-[40px] blur-2xl pointer-events-none"
          style={{ background: 'rgba(245,200,66,0.38)' }}
        />

        {/* Spinning 3D logo box */}
        <motion.div
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
          className="relative w-28 h-28 rounded-3xl overflow-hidden"
          style={{
            boxShadow: '0 6px 0 #7A5800, 0 10px 32px rgba(245,200,66,0.55)',
            border: '2px solid rgba(245,200,66,0.50)',
          }}
        >
          <img src={logoSrc} alt="Gold Digger" className="w-full h-full object-cover" />
        </motion.div>
      </motion.div>

      {/* ── Brand Title ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-10"
      >
        <h1
          className="text-4xl font-black tracking-tight"
          style={{
            color: '#F5C842',
            textShadow: '0 0 24px rgba(245,200,66,0.7), 0 0 48px rgba(245,200,66,0.3)',
          }}
        >
          Gold Digger
        </h1>
        <p className="text-sm font-bold tracking-[0.2em] uppercase mt-2"
          style={{ color: 'var(--col-text-3)' }}>
          Build · Trade · Dominate
        </p>
      </motion.div>

      {/* ── Loading Progress Bar ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-56"
      >
        <div className="progress-track mb-2" style={{ height: 8 }}>
          {/* Note: This is a "fake" progress bar visually. It just sweeps to 100% over 2 seconds. 
              The actual app data loading happens concurrently. */}
          <motion.div
            className="progress-fill-gold"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.0, ease: 'easeInOut', delay: 0.6 }}
          />
        </div>
        <p className="text-center text-[10px] font-black tracking-[0.25em] uppercase"
          style={{ color: 'var(--col-text-3)' }}>
          Loading Empire...
        </p>
      </motion.div>
    </div>
  )
}
