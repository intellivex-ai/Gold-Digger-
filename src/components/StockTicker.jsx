/**
 * StockTicker.jsx
 * 
 * A classic Wall Street style scrolling ticker tape.
 * Displays the top 10 stocks and their current prices/changes.
 * Uses a CSS animation trick to scroll infinitely without jumping.
 */

import useMarketStore from '../stores/useMarketStore'

export default function StockTicker() {
  // Grab only the first 10 stocks so we don't overwhelm the phone
  const stocks = useMarketStore((s) => s.stocks.slice(0, 10))
  
  // ── Infinite Scroll Trick ──
  // We duplicate the list so that as the first copy scrolls off screen to the left,
  // the second copy follows right behind it. When the first copy is completely gone,
  // the CSS resets it instantly back to 0, making the loop invisible to the user.
  const items  = [...stocks, ...stocks]   

  if (stocks.length === 0) {
    return (
      <div className="py-3 px-4 text-center text-xs font-bold tracking-widest"
        style={{ color: 'var(--col-text-3)' }}>
        Loading market data…
      </div>
    )
  }

  return (
    <div className="overflow-hidden w-full py-2.5 px-1">
      {/* 'ticker-track' is defined in index.css with an infinite linear animation */}
      <div className="ticker-track">
        {items.map((stock, i) => (
          <TickerPill key={`${stock.symbol}-${i}`} stock={stock} />
        ))}
      </div>
    </div>
  )
}

/** 
 * TickerPill
 * 
 * An individual stock item inside the ticker tape (e.g. "AAPL $150.00 ▲ 2.5%")
 */
function TickerPill({ stock }) {
  const price  = parseFloat(stock.price ?? 0)
  
  // Note: Different APIs return 'change_percent' vs 'changePercent', so we check both to be safe
  const change = parseFloat(stock.change_percent ?? stock.changePercent ?? 0)
  
  const isPos  = change >= 0
  const color  = isPos ? '#3DD68C' : '#FF5A5A'

  return (
    <div
      className="flex-shrink-0 flex items-center gap-2.5 mr-3 rounded-xl px-3 py-2"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Symbol (e.g. AAPL) */}
      <span className="text-xs font-black tracking-wide"
        style={{ color: 'var(--col-text-1)' }}>
        {stock.symbol}
      </span>

      {/* Price */}
      <span className="text-xs font-bold nums"
        style={{ color: 'var(--col-text-2)' }}>
        ${price.toFixed(2)}
      </span>

      {/* Change badge (Green/Red pill) */}
      <span
        className="text-[10px] font-black nums px-1.5 py-0.5 rounded-md"
        style={{
          background: `${color}15`,
          color,
          border: `1px solid ${color}30`,
        }}
      >
        {isPos ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
      </span>
    </div>
  )
}
