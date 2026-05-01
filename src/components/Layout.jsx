import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import BottomTabBar from './BottomTabBar'
import EconomyEventBanner from './EconomyEventBanner'

const pageVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
}

export default function Layout() {
  const location = useLocation()

  return (
    <div className="phone-shell flex flex-col relative overflow-hidden">
      {/* Global Economy Event ticker at top */}
      <EconomyEventBanner />

      {/* Put tab bar before page in DOM so page (and its modals) paint over it, but flex order keeps it at bottom visually */}
      <div className="order-last">
        <BottomTabBar />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className="flex-1 page-scroll"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
