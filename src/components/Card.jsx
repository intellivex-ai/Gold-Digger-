/**
 * Card.jsx
 * 
 * A reusable container panel that looks like a UI panel in a mobile game.
 * Includes a subtle 3D inner bevel effect and custom colored borders.
 * 
 * Variants:
 *  - default: dark blue/grey
 *  - gold/blue/purple: Adds a colored glow border
 *  - dark: pure black version
 */

import { motion } from 'framer-motion'

export default function Card({
  children,
  className = '',
  variant = 'default',
  hoverable = false,  // If true, the card lifts up slightly when you hover over it
  noPadding = false,  // Removes the default padding inside the card
  onClick,            // If provided, the card becomes clickable
}) {
  // Mapping of color themes to their specific border and drop-shadow styles
  const variantStyles = {
    default: '', // Relies entirely on the .card CSS class
    gold:    'border-[rgba(245,200,66,0.30)] shadow-[0_0_24px_rgba(245,200,66,0.15),0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]',
    blue:    'border-[rgba(91,156,246,0.30)] shadow-[0_0_24px_rgba(91,156,246,0.15),0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]',
    purple:  'border-[rgba(181,110,255,0.30)] shadow-[0_0_24px_rgba(181,110,255,0.15),0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]',
    dark:    '!bg-[#0E0F17] border-[rgba(255,255,255,0.05)]',
  }

  return (
    <motion.div
      // If the card is clickable, make it squish slightly when tapped
      whileTap={onClick ? { scale: 0.985 } : undefined}
      // If hoverable, make it lift off the page slightly
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
