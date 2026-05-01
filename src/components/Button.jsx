import { motion } from 'framer-motion'

/**
 * Button — 3D beveled game-grade button.
 *
 * @param {'primary'|'secondary'|'accent'|'ghost'|'danger'|'positive'} variant
 *   primary  → blue 3D beveled
 *   accent   → gold 3D beveled (most important CTA)
 *   ghost    → semi-transparent
 *   danger   → red 3D beveled
 *   positive → green 3D beveled
 *   secondary→ ghost alias
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
}) {
  // Map variant → CSS class
  const variantClass = {
    primary:   'btn-game-blue',
    secondary: 'btn-game-ghost',
    accent:    'btn-game-gold',
    ghost:     'btn-game-ghost',
    danger:    'btn-game-red',
    positive:  'btn-game-blue !bg-none ![background:linear-gradient(180deg,#5EF0A0_0%,#3DD68C_35%,#1EA85C_100%)] ![box-shadow:0_1px_0_rgba(255,255,255,0.30)_inset,0_-2px_0_rgba(0,0,0,0.30)_inset,0_3px_0_#0D5E30,0_5px_14px_rgba(61,214,140,0.35)]',
  }

  // Map size → padding/text
  const sizeClass = {
    xs: 'text-xs !px-2.5 !py-1.5 !rounded-lg',
    sm: 'text-xs !px-3.5 !py-2 !rounded-xl',
    md: 'text-sm !px-5 !py-2.5 !rounded-xl',
    lg: 'text-base !px-7 !py-3 !rounded-2xl',
    xl: 'text-lg !px-9 !py-4 !rounded-2xl',
  }

  return (
    <motion.button
      type={type}
      whileTap={!disabled && !loading ? { y: 2, scale: 0.97 } : undefined}
      whileHover={!disabled && !loading ? { y: -1, scale: 1.01 } : undefined}
      transition={{ type: 'spring', stiffness: 600, damping: 20 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variantClass[variant] ?? variantClass.primary}
        ${sizeClass[size] ?? sizeClass.md}
        ${fullWidth ? 'w-full' : ''}
        disabled:opacity-40 disabled:cursor-not-allowed disabled:!transform-none
        select-none
        ${className}
      `}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </motion.button>
  )
}
