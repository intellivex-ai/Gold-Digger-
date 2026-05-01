import { motion } from 'framer-motion'

/**
 * Card — Game-grade panel with 3D bevel depth.
 *
 * @param {'default'|'gold'|'blue'|'purple'|'dark'} variant
 * @param {boolean} hoverable
 * @param {boolean} noPadding
 */
export default function Card({
  children,
  className = '',
  variant = 'default',
  hoverable = false,
  noPadding = false,
  onClick,
}) {
  const variantStyles = {
    default: '', // uses .card from CSS
    gold:    'border-[rgba(245,200,66,0.30)] shadow-[0_0_24px_rgba(245,200,66,0.15),0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]',
    blue:    'border-[rgba(91,156,246,0.30)] shadow-[0_0_24px_rgba(91,156,246,0.15),0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]',
    purple:  'border-[rgba(181,110,255,0.30)] shadow-[0_0_24px_rgba(181,110,255,0.15),0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]',
    dark:    '!bg-[#0E0F17] border-[rgba(255,255,255,0.05)]',
  }

  return (
    <motion.div
      whileTap={onClick ? { scale: 0.985 } : undefined}
      whileHover={
        hoverable
          ? { y: -2, boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }
          : undefined
      }
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={onClick}
      className={`
        card
        ${noPadding ? '!p-0' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${variantStyles[variant] ?? ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}
