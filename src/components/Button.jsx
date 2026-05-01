/**
 * Button.jsx
 * 
 * A reusable, 3D-beveled button component that feels like a native mobile game button.
 * It uses 'framer-motion' to provide satisfying "squish" physics when tapped.
 * 
 * Variants:
 *  - primary: standard blue action button
 *  - accent / gold: important Call-To-Action (e.g. buying something)
 *  - ghost: transparent, for secondary actions
 *  - danger: red, for destructive actions
 *  - positive: green, for claiming rewards
 */

import { motion } from 'framer-motion'

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
  // Map our custom variants to the CSS classes defined in index.css
  const variantClass = {
    primary:   'btn-game-blue',
    secondary: 'btn-game-ghost', // Alias for ghost
    accent:    'btn-game-gold',
    ghost:     'btn-game-ghost',
    danger:    'btn-game-red',
    // Positive uses a special inline gradient since it's only used occasionally
    positive:  'btn-game-blue !bg-none ![background:linear-gradient(180deg,#5EF0A0_0%,#3DD68C_35%,#1EA85C_100%)] ![box-shadow:0_1px_0_rgba(255,255,255,0.30)_inset,0_-2px_0_rgba(0,0,0,0.30)_inset,0_3px_0_#0D5E30,0_5px_14px_rgba(61,214,140,0.35)]',
  }

  // Define sizing logic
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
      // Physics: Squish in when tapped, expand slightly when hovered (desktop)
      whileTap={!disabled && !loading ? { y: 2, scale: 0.97 } : undefined}
      whileHover={!disabled && !loading ? { y: -1, scale: 1.01 } : undefined}
      transition={{ type: 'spring', stiffness: 600, damping: 20 }}
      onClick={onClick}
      disabled={disabled || loading} // Prevent clicks if loading or explicitly disabled
      className={`
        ${variantClass[variant] ?? variantClass.primary}
        ${sizeClass[size] ?? sizeClass.md}
        ${fullWidth ? 'w-full' : ''}
        disabled:opacity-40 disabled:cursor-not-allowed disabled:!transform-none
        select-none
        ${className}
      `}
    >
      {/* If loading, show a spinning ring. Otherwise, show the text/icon */}
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </motion.button>
  )
}
