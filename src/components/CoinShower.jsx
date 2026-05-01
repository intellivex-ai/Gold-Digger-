/**
 * CoinShower.jsx
 * 
 * A physics-based visual effect that triggers when the user collects a large amount of money.
 * It spawns 24 "coins" from the center of the screen that burst outwards using math to simulate gravity and velocity.
 */

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function CoinShower({ active, onComplete }) {
  // We use a ref to generate the coin trajectory math ONLY ONCE per burst.
  // This prevents the coins from jittering if the component re-renders mid-animation.
  const coins = useRef(
    Array.from({ length: 24 }, (_, i) => {
      // Spread the 24 coins evenly in a 360-degree circle
      const angle   = (i / 24) * Math.PI * 2
      
      // Determine how far the coin will travel
      const radius  = 80 + Math.random() * 140
      
      return {
        id:     i,
        // Calculate X and Y destination using basic trigonometry
        // We multiply Y by a negative number so they shoot upwards then fall
        x:      Math.cos(angle) * radius * (0.7 + Math.random() * 0.6),
        y:      -(40 + Math.abs(Math.sin(angle)) * radius * 1.2),
        rotate: (Math.random() - 0.5) * 900,  // Spin wildly
        delay:  Math.random() * 0.25,         // Stagger the launch times slightly
        scale:  0.5 + Math.random() * 0.9,    // Some coins are bigger/closer
        size:   22 + Math.floor(Math.random() * 14),
      }
    })
  ).current

  return (
    // AnimatePresence waits for the exit animations to finish before firing onComplete
    <AnimatePresence onExitComplete={onComplete}>
      {active && (
        <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center">
          
          {/* ── Render individual coins ── */}
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
              // Start small and invisible at the center
              initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
              
              // Shoot to the calculated X/Y coordinates
              animate={{
                x:       coin.x,
                y:       coin.y,
                scale:   coin.scale,
                rotate:  coin.rotate,
                opacity: [1, 1, 1, 0], // Stay visible for most of the trip, fade out at the very end
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                duration: 1.0 + Math.random() * 0.5,
                delay:    coin.delay,
                ease:     [0.15, 0.85, 0.5, 1], // Custom easing curve to simulate "pop" and slow down
                opacity:  { times: [0, 0.4, 0.7, 1] },
              }}
            >
              $
            </motion.div>
          ))}

          {/* ── Central flash burst ── */}
          {/* This makes it look like an explosion happened at the origin */}
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
