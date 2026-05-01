import useMarketStore from '../stores/useMarketStore'

export default function StockTicker() {
  const stocks = useMarketStore((s) => s.stocks.slice(0, 10))
  const items  = [...stocks, ...stocks]   // duplicate for seamless loop

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
      <div className="ticker-track">
        {items.map((stock, i) => (
          <TickerPill key={`${stock.symbol}-${i}`} stock={stock} />
        ))}
      </div>
    </div>
  )
}

function TickerPill({ stock }) {
  const price  = parseFloat(stock.price ?? 0)
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
      {/* Symbol */}
      <span className="text-xs font-black tracking-wide"
        style={{ color: 'var(--col-text-1)' }}>
        {stock.symbol}
      </span>

      {/* Price */}
      <span className="text-xs font-bold nums"
        style={{ color: 'var(--col-text-2)' }}>
        ${price.toFixed(2)}
      </span>

      {/* Change badge */}
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
