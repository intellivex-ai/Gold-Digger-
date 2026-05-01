import { motion } from 'framer-motion'

/**
 * ProgressBar — chunky game-style XP/resource bar with animated shimmer fill.
 *
 * @param {number} value   - 0 to 1
 * @param {'gold'|'blue'|'green'|'xp'} color
 * @param {boolean} showLabel
 * @param {boolean} chunky  - taller 14px game bar
 */
export default function ProgressBar({
  value = 0,
  color = 'blue',
  className = '',
  showLabel = false,
  chunky = false,
}) {
  const clampedValue = Math.min(1, Math.max(0, value))
  const percent = Math.round(clampedValue * 100)

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
      <div
        className="progress-track overflow-hidden"
        style={{ height: chunky ? 14 : 10 }}
      >
        <motion.div
          className={fillClass}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.0, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </div>
      {showLabel && (
        <span className="absolute right-0 -top-5 text-[11px] font-bold"
          style={{ color: 'var(--col-text-2)' }}>
          {percent}%
        </span>
      )}
    </div>
  )
}
