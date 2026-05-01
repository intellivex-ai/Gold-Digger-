import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * CoinShower – physics-based gold coin burst on collect.
 * Coins burst from centre with random trajectories + spin.
 */
export default function CoinShower({ active, onComplete }) {
  const coins = useRef(
    Array.from({ length: 24 }, (_, i) => {
      const angle   = (i / 24) * Math.PI * 2
      const radius  = 80 + Math.random() * 140
      return {
        id:     i,
        x:      Math.cos(angle) * radius * (0.7 + Math.random() * 0.6),
        y:      -(40 + Math.abs(Math.sin(angle)) * radius * 1.2),
        rotate: (Math.random() - 0.5) * 900,
        delay:  Math.random() * 0.25,
        scale:  0.5 + Math.random() * 0.9,
        size:   22 + Math.floor(Math.random() * 14),
      }
    })
  ).current

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {active && (
        <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center">
          {coins.map((coin) => (
            <motion.div
              key={coin.id}
              className="absolute rounded-full flex items-center justify-center font-black select-none"
              style={{
                width:  coin.size,
                height: coin.size,
                background: 'radial-gradient(circle at 33% 30%, #FFF3A0, #F5C842 50%, #C49B20 85%, #8B6A00)',
                boxShadow: '0 2px 10px rgba(245,200,66,0.7), 0 0 4px rgba(245,200,66,0.4)',
                fontSize: coin.size * 0.4,
                color: '#7A5800',
              }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
              animate={{
                x:       coin.x,
                y:       coin.y,
                scale:   coin.scale,
                rotate:  coin.rotate,
                opacity: [1, 1, 1, 0],
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                duration: 1.0 + Math.random() * 0.5,
                delay:    coin.delay,
                ease:     [0.15, 0.85, 0.5, 1],
                opacity:  { times: [0, 0.4, 0.7, 1] },
              }}
            >
              $
            </motion.div>
          ))}

          {/* Central flash burst */}
          <motion.div
            className="absolute rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(245,200,66,0.6) 0%, transparent 70%)' }}
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 200, height: 200, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      )}
    </AnimatePresence>
  )
}
