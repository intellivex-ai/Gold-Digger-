/**
 * Layout.jsx
 * 
 * This is the main "shell" of the app. It holds the Bottom Navigation Bar,
 * the Economy Event banner (if any are active), and provides smooth,
 * sliding animations when switching between pages.
 */

import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import BottomTabBar from './BottomTabBar'
import EconomyEventBanner from './EconomyEventBanner'

// Defines how pages slide in and out
// Using a smaller x value (20px) that feels proportionate on narrow mobile screens
const pageVariants = {
  initial: { opacity: 0, x: 20 },  // Starts slightly to the right
  animate: { opacity: 1, x: 0 },   // Slides into center
  exit: { opacity: 0, x: -20 },    // Slides off to the left
}

export default function Layout() {
  const location = useLocation() // Lets us know when the URL changes so we can trigger animations

  return (
    <div className="phone-shell flex flex-col relative overflow-hidden">
      {/* Global Economy Event ticker at top (e.g. "Tech Boom Active!") */}
      <EconomyEventBanner />

      {/* 
        We put the Tab Bar *before* the page in the HTML structure.
        Why? So modals inside the page can easily cover it up.
        CSS 'order-last' ensures it visually stays at the bottom.
      */}
      <AnimatePresence mode="wait">
        {/* pb-[88px] clears the 72px tab bar + 16px buffer; env(safe-area-inset-bottom) handled by pb-safe on tab bar */}
        <motion.div
          key={location.pathname} // A new key forces React to treat new pages as separate elements
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.20, ease: 'easeInOut' }}
          className="flex-1 page-scroll pb-[88px]"
        >
          {/* <Outlet /> is where the current child page (like Home or Market) actually renders */}
          <Outlet />
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 z-50">
        <BottomTabBar />
      </div>
    </div>
  )
}
