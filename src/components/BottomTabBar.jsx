/**
 * BottomTabBar.jsx
 * 
 * The main navigation bar pinned to the bottom of the screen (mobile app style).
 * It uses 'framer-motion' to create a smooth, floating pill background 
 * that slides between tabs when you tap them.
 */

import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Briefcase, TrendingUp, Users, User } from 'lucide-react'
import sounds from '../lib/soundManager'

// Defines our main routes and icons
const TABS = [
  { to: '/',           icon: Home,        label: 'Home',   exact: true },
  { to: '/businesses', icon: Briefcase,   label: 'Empire' },
  { to: '/market',     icon: TrendingUp,  label: 'Market' },
  { to: '/social',     icon: Users,       label: 'Social' },
  { to: '/character',  icon: User,        label: 'Profile' },
]

export default function BottomTabBar() {
  return (
    <nav
      style={{
        background: 'linear-gradient(180deg, #13141F 0%, #0D0E18 100%)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.04) inset, 0 -12px 32px rgba(0,0,0,0.5)',
      }}
      className="flex items-center justify-around pb-safe min-h-[72px] pt-2 flex-shrink-0 relative"
    >
      {/* Subtle top accent line for a premium glass feel */}
      <div
        className="absolute top-0 left-12 right-12 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(245,200,66,0.18), transparent)' }}
      />

      {TABS.map(({ to, icon: Icon, label, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact} // Ensures the Home route ('/') only highlights when exactly on Home
          onClick={() => sounds.tap()} // Play a gentle tap sound
          // Minimum 44px tap target per Apple HIG / Google Material guidelines
          // flex-1 ensures equal distribution instead of fixed w-16
          className="relative flex flex-col items-center justify-center gap-1 flex-1 py-2 min-h-[52px] select-none outline-none"
          style={{ textDecoration: 'none' }}
        >
          {({ isActive }) => (
            <>
              {/* 
                The Active Pill Indicator
                Wrapped in an absolute flex container so Framer Motion's layoutId
                doesn't overwrite Tailwind's transform classes (like -translate-x-1/2)
              */}
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <motion.div
                    layoutId="tab-active-pill"
                    className="w-14 h-[46px] rounded-xl"
                    style={{
                      background: 'rgba(245,200,66,0.10)',
                      border: '1px solid rgba(245,200,66,0.18)',
                      boxShadow: '0 0 14px rgba(245,200,66,0.18)',
                    }}
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                  />
                </div>
              )}

              {/* The Icon & Text (Squishes slightly when tapped) */}
              <motion.div
                whileTap={{ scale: 0.78, y: 1 }}
                transition={{ type: 'spring', stiffness: 700, damping: 22 }}
                className="flex flex-col items-center gap-0.5"
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.7}
                  style={{
                    color: isActive ? '#F5C842' : 'rgba(255,255,255,0.38)',
                    filter: isActive ? 'drop-shadow(0 0 5px rgba(245,200,66,0.65))' : 'none',
                    transition: 'color 0.18s, filter 0.18s',
                    position: 'relative',
                    zIndex: 1,
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: isActive ? 800 : 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: isActive ? '#F5C842' : 'rgba(255,255,255,0.32)',
                    textShadow: isActive ? '0 0 8px rgba(245,200,66,0.5)' : 'none',
                    transition: 'all 0.18s',
                  }}
                >
                  {label}
                </span>
              </motion.div>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
