/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': '#F7F8FA',
        'surface': '#FFFFFF',
        'border': '#E5E7EB',
        'primary': '#3B82F6',
        'primary-dark': '#2563EB',
        'accent': '#F59E0B',
        'accent-dark': '#D97706',
        'positive': '#10B981',
        'negative': '#EF4444',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        'text-disabled': '#9CA3AF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08)',
        'modal': '0 20px 60px 0 rgba(0,0,0,0.15)',
        'glow-amber': '0 0 20px rgba(245,158,11,0.4)',
        'glow-blue': '0 0 20px rgba(59,130,246,0.3)',
      },
      borderRadius: {
        'xl2': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      maxWidth: {
        'mobile': '430px',
      },
      animation: {
        'ticker': 'ticker 30s linear infinite',
        'shimmer': 'shimmer 1.6s linear infinite',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'coin-fly': 'coin-fly 1s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400% 0' },
          '100%': { backgroundPosition: '400% 0' },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'slide-up': {
          '0%': { transform: 'translateY(16px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
        'coin-fly': {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          '100%': { transform: 'var(--tx, 80px) var(--ty, -120px) scale(0)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
}
