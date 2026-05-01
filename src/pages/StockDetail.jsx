import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Star, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'
import useMarketStore from '../stores/useMarketStore'
import CandlestickChart from '../components/CandlestickChart'
import OrderModal from '../components/OrderModal'
import sounds from '../lib/soundManager'

function generateCandlestickData(targetPrice = 150, points = 60) {
  const data = []; const safeTarget = isNaN(targetPrice) || targetPrice <= 0 ? 150 : targetPrice
  let currentPrice = safeTarget
  const baseTime = Math.floor(Date.now() / 1000) - (points * 60)
  for (let i = 0; i < points; i++) {
    const open = currentPrice * (1 + (Math.random() - 0.5) * 0.005)
    const close = open * (1 + (Math.random() - 0.5) * 0.005)
    const high = Math.max(open, close) * (1 + Math.random() * 0.002)
    const low = Math.min(open, close) * (1 - Math.random() * 0.002)
    data.push({ time: baseTime + (i * 60), open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2) })
    currentPrice = close
  }
  return data
}

export default function StockDetail() {
  const { symbol }      = useParams()
  const navigate        = useNavigate()
  const stock           = useMarketStore((s) => s.getStockBySymbol(symbol))
  const watchlist       = useMarketStore((s) => s.watchlist)
  const toggleWatchlist = useMarketStore((s) => s.toggleWatchlist)
  const buyStock        = useMarketStore((s) => s.buyStock)
  const sellStock       = useMarketStore((s) => s.sellStock)

  const [chartData, setChartData]   = useState([])
  const [orderModal, setOrderModal] = useState(null)
  const [toast, setToast]           = useState(null)
  const [liveCandle, setLiveCandle] = useState(null)

  const price       = parseFloat(stock?.price ?? 0)
  const change      = parseFloat(stock?.change_percent ?? stock?.changePercent ?? 0)
  const isPos       = change >= 0
  const inWatchlist = stock ? watchlist.includes(stock.symbol) : false
  const changeColor = isPos ? '#3DD68C' : '#FF5A5A'

  useEffect(() => {
    if (stock && chartData.length === 0) setChartData(generateCandlestickData(parseFloat(stock.price || 150), 90))
  }, [stock, symbol])

  useEffect(() => {
    if (!stock || chartData.length === 0 || isNaN(price)) return
    const last = chartData[chartData.length - 1]
    setLiveCandle({ time: last.time, open: last.open, high: Math.max(last.high, price), low: Math.min(last.low, price), close: price })
  }, [price, chartData])

  function showToast(message, ok = true) {
    setToast({ message, ok }); setTimeout(() => setToast(null), 3000)
  }

  async function handleOrder({ side, quantity, orderType }) {
    const fn = side === 'buy' ? buyStock : sellStock
    const result = await fn(stock.symbol, quantity, orderType)
    if (result.success) { side === 'buy' ? sounds.buy?.() : sounds.sell?.(); showToast(`${side === 'buy' ? 'Bought' : 'Sold'} ${quantity} × ${stock.symbol}`) }
    else { sounds.error?.(); showToast(result.message || 'Order failed', false) }
  }

  if (!stock) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
      <BarChart2 size={36} style={{ color: 'var(--col-text-3)' }} />
      <p className="text-sm font-bold" style={{ color: 'var(--col-text-3)' }}>Stock not found</p>
      <button onClick={() => navigate(-1)} className="btn-game-ghost" style={{ padding: '8px 16px' }}>← Back</button>
    </div>
  )

  return (
    <div className="pb-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-4 mt-3 mb-0 py-2.5 px-4 rounded-xl text-sm font-bold text-center"
            style={{
              background: toast.ok ? 'rgba(61,214,140,0.15)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${toast.ok ? 'rgba(61,214,140,0.30)' : 'rgba(239,68,68,0.25)'}`,
              color: toast.ok ? '#3DD68C' : '#FF5A5A',
            }}>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <button onClick={() => { sounds.tap?.(); navigate(-1) }}
          className="flex items-center gap-1.5 text-sm font-bold mb-4"
          style={{ color: 'var(--col-text-3)' }}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--col-text-1)' }}>
                {stock.symbol}
              </h1>
              <motion.button whileTap={{ scale: 0.80 }}
                onClick={() => { sounds.tap?.(); toggleWatchlist(stock.symbol) }}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: inWatchlist ? 'rgba(245,200,66,0.15)' : 'rgba(255,255,255,0.06)',
                  border: inWatchlist ? '1px solid rgba(245,200,66,0.35)' : '1px solid rgba(255,255,255,0.10)',
                }}>
                <Star size={16} color={inWatchlist ? '#F5C842' : 'var(--col-text-3)'}
                  fill={inWatchlist ? '#F5C842' : 'none'}
                  style={{ filter: inWatchlist ? 'drop-shadow(0 0 4px rgba(245,200,66,0.7))' : 'none' }} />
              </motion.button>
            </div>
            <p className="text-sm" style={{ color: 'var(--col-text-3)' }}>{stock.name}</p>
          </div>

          <div className="text-right">
            <motion.p key={price} initial={{ scale: 1.06 }} animate={{ scale: 1 }}
              className="text-2xl font-black nums" style={{ color: 'var(--col-text-1)' }}>
              ${price.toFixed(2)}
            </motion.p>
            <div className="flex items-center justify-end gap-1 mt-0.5"
              style={{ color: changeColor }}>
              {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span className="text-sm font-bold nums">
                {isPos ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 mb-5">
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.25)' }}>
          <CandlestickChart data={chartData} liveCandle={liveCandle} height={240} />
        </div>
      </div>

      {/* Mini stats */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Open', value: `$${(price * 0.995).toFixed(2)}`, color: 'var(--col-text-1)' },
          { label: 'High', value: `$${(stock.high?.toFixed(2) || (price * 1.012).toFixed(2))}`, color: '#3DD68C' },
          { label: 'Low',  value: `$${(stock.low?.toFixed(2)  || (price * 0.986).toFixed(2))}`, color: '#FF5A5A' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[9px] font-black tracking-widest uppercase mb-1" style={{ color: 'var(--col-text-3)' }}>{label}</p>
            <p className="text-sm font-black nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Buy / Sell */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <motion.button className="btn-game-blue" whileTap={{ y: 2, scale: 0.97 }}
          style={{ paddingTop: 14, paddingBottom: 14, fontSize: 15,
            background: 'linear-gradient(180deg,#5EF0A0 0%,#3DD68C 35%,#1EA85C 100%)',
            boxShadow: '0 1px 0 rgba(255,255,255,.30) inset,0 -2px 0 rgba(0,0,0,.30) inset,0 3px 0 #0D5E30,0 5px 14px rgba(61,214,140,.35)',
            color: '#fff',
          }}
          onClick={() => { sounds.tap?.(); setOrderModal('buy') }}>
          <TrendingUp size={16} /> Buy
        </motion.button>
        <motion.button className="btn-game-red" whileTap={{ y: 2, scale: 0.97 }}
          style={{ paddingTop: 14, paddingBottom: 14, fontSize: 15 }}
          onClick={() => { sounds.tap?.(); setOrderModal('sell') }}>
          <TrendingDown size={16} /> Sell
        </motion.button>
      </div>

      <OrderModal open={!!orderModal} side={orderModal} stock={stock}
        onClose={() => setOrderModal(null)} onSubmit={handleOrder} />
    </div>
  )
}
