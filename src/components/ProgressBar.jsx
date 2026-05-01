/**
 * ProgressBar.jsx
 * 
 * A thick, satisfying progress bar used for XP, health, or upgrade completion.
 * The bar automatically animates when the value changes using framer-motion.
 * 
 * Props:
 * @param {number} value   - A decimal between 0 and 1 (e.g., 0.50 means 50%)
 * @param {string} color   - e.g. 'gold', 'blue', 'green', 'xp'
 * @param {boolean} showLabel - If true, shows "50%" text floating above
 * @param {boolean} chunky - If true, makes the bar slightly taller
 */

import { motion } from 'framer-motion'

export default function ProgressBar({
  value = 0,
  color = 'blue',
  className = '',
  showLabel = false,
  chunky = false,
}) {
  const safeValue = isNaN(value) ? 0 : Number(value);
  const clampedValue = Math.min(1, Math.max(0, safeValue))
  const percent = Math.round(clampedValue * 100)

  // Map the color prop to a CSS class from index.css that defines the gradients
  const fillClass = {
    blue:     'progress-fill-blue',
    gradient: 'progress-fill-gold',
    gold:     'progress-fill-gold',
    amber:    'progress-fill-gold',
    green:    'progress-fill-green',
    xp:       'progress-fill-xp',
  }[color] ?? 'progress-fill-blue'

  return (
    <div className={`relative ${className}`}>
      {/* The background track (dark empty bar) */}
      <div
        className="progress-track overflow-hidden"
        style={{ height: chunky ? 14 : 10 }}
      >
        {/* The active colored fill */}
        <motion.div
          className={fillClass}
          initial={{ width: '0%' }} // Start empty on load
          animate={{ width: `${percent}%` }} // Slide to the current value
          transition={{ duration: 1.0, ease: [0.34, 1.56, 0.64, 1] }} // Springy rubber-band easing
        />
      </div>

      {/* Optional text label that floats on top right */}
      {showLabel && (
        <span className="absolute right-0 -top-5 text-[11px] font-bold"
          style={{ color: 'var(--col-text-2)' }}>
          {percent}%
        </span>
      )}
    </div>
  )
}
