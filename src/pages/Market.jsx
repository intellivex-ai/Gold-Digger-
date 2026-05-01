/**
 * Market.jsx
 * 
 * Provides the overarching layout for the economy section, containing nested
 * routing for the global Stock Market and the Player-to-Player trade hub.
 * Includes the default `StocksTab` implementation showing a searchable directory of assets.
 */

import { useEffect } from 'react'
import { useNavigate, Outlet, NavLink } from 'react-router-dom'
import { Search, Star, TrendingUp, TrendingDown, Zap } from 'lucide-react'
import useMarketStore from '../stores/useMarketStore'
import { motion } from 'framer-motion'
import sounds from '../lib/soundManager'
import { MarketSkeleton } from '../components/SkeletonLoader'

/* ── Market Shell (Layout Wrapper) ─────────────────────────────── */
// Hosts the top-level navigation tabs and an <Outlet /> for rendering child routes
export default function Market() {
  return (
    <div className="flex flex-col h-full">
      {/* ── Global Header ── */}
      <div
        className="px-4 pt-5 pb-3 flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(10,11,15,0.95) 0%, rgba(10,11,15,0.0) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h1 className="text-2xl font-black tracking-tight mb-3" style={{ color: 'var(--col-text-1)' }}>
          Market
        </h1>
        {/* Navigation Tabs */}
        <div className="flex gap-2">
          <SubTab to="/market" end label="📈 Stocks" />
          <SubTab to="/market/player-trade" label="⚔️ Player Trade" />
        </div>
      </div>

      {/* Render selected child route (Stocks vs Player Trade) */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}

/**
 * Reusable routing tab with tap sounds and active state styling
 */
function SubTab({ to, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={() => sounds.tap?.()}
      className={({ isActive }) => `subtab-pill ${isActive ? 'active' : ''}`}
    >
      {label}
    </NavLink>
  )
}

/* ── Stocks Directory View ─────────────────────────────────────────────── */
// The default child route for `/market`. Displays a searchable, sortable list
// of all active global stocks, showing real-time price and daily change.
export function StocksTab() {
  const navigate        = useNavigate()
  
  // Market Store Bindings
  const stocks          = useMarketStore((s) => s.getFilteredStocks())
  const isLoading       = useMarketStore((s) => s.isLoading)
  const watchlist       = useMarketStore((s) => s.watchlist)
  const searchQuery     = useMarketStore((s) => s.searchQuery)
  const setSearchQuery  = useMarketStore((s) => s.setSearchQuery)
  const toggleWatchlist = useMarketStore((s) => s.toggleWatchlist)
  const fetchStocks     = useMarketStore((s) => s.fetchStocks)

  // Hydrate global stocks catalog on mount
  useEffect(() => { 
    if (stocks.length === 0) fetchStocks() 
  }, [fetchStocks, stocks.length])

  if (isLoading && stocks.length === 0) return <MarketSkeleton />

  return (
    <div className="px-4 pt-4 pb-4">
      {/* ── Search Bar ── */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--col-text-3)' }} />
        <input
          type="text"
          placeholder="Search symbol or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-dark pl-9"
        />
      </div>

      {/* ── Data Grid Headers ── */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 mb-3">
        {['Symbol', 'Price', 'Chg%', ''].map((h, i) => (
          <span key={h || i}
            className="text-[10px] font-black tracking-widest uppercase"
            style={{ 
              color: 'var(--col-text-3)', 
              textAlign: i === 3 ? 'center' : i > 0 ? 'right' : 'left', 
              width: i === 1 ? 72 : i === 2 ? 56 : i === 3 ? 28 : 'auto' 
            }}>
            {h}
          </span>
        ))}
      </div>

      {/* ── Stock List ── */}
      {stocks.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-3xl mb-2">📉</p>
          <p className="text-sm font-bold" style={{ color: 'var(--col-text-3)' }}>No stocks found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {stocks.map((stock, i) => {
            const price       = parseFloat(stock.price ?? 0)
            const change      = parseFloat(stock.change_percent ?? stock.changePercent ?? 0)
            const isPos       = change >= 0
            const inWatchlist = watchlist.includes(stock.symbol)

            return (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.35) }} // Staggered entry animation
                onClick={() => { sounds.tap?.(); navigate(`/market/stocks/${stock.symbol}`) }}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-3 py-3 rounded-xl cursor-pointer transition-all"
                style={{ background: 'rgba(0,0,0,0)' }}
                // Hover highlight effect
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
              >
                {/* Asset Identity */}
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--col-text-1)' }}>{stock.symbol}</p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--col-text-3)' }}>{stock.name}</p>
                </div>

                {/* Current Price */}
                <div className="text-right" style={{ width: 72 }}>
                  <p className="text-sm font-bold nums" style={{ color: 'var(--col-text-1)' }}>
                    ${price.toFixed(2)}
                  </p>
                </div>

                {/* Daily Change Badge */}
                <div
                  className="flex items-center justify-center gap-0.5 rounded-lg px-2 py-1"
                  style={{
                    width: 56,
                    background: isPos ? 'rgba(61,214,140,0.12)' : 'rgba(255,90,90,0.12)',
                    border: `1px solid ${isPos ? 'rgba(61,214,140,0.25)' : 'rgba(255,90,90,0.25)'}`,
                  }}
                >
                  {isPos
                    ? <TrendingUp size={9} color="#3DD68C" />
                    : <TrendingDown size={9} color="#FF5A5A" />}
                  <span className="text-[10px] font-black nums" style={{ color: isPos ? '#3DD68C' : '#FF5A5A' }}>
                    {isPos ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>

                {/* Quick Action: Add to Watchlist */}
                <motion.button
                  whileTap={{ scale: 0.80 }}
                  onClick={(e) => { 
                    e.stopPropagation() // Prevent row click navigation
                    sounds.tap?.()
                    toggleWatchlist(stock.symbol) 
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                  style={{ background: inWatchlist ? 'rgba(245,200,66,0.15)' : 'transparent' }}
                >
                  <Star
                    size={14}
                    color={inWatchlist ? '#F5C842' : 'var(--col-text-3)'}
                    fill={inWatchlist ? '#F5C842' : 'none'}
                    style={{ filter: inWatchlist ? 'drop-shadow(0 0 4px rgba(245,200,66,0.6))' : 'none' }}
                  />
                </motion.button>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
