import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useCryptoStore from '../stores/useCryptoStore'
import useUserStore from '../stores/useUserStore'
import ProgressBar from '../components/ProgressBar'
import Card from '../components/Card'

const fmt = (n, dec = 2) => {
  n = parseFloat(n || 0)
  if (n >= 1e9) return `$${(n / 1e9).toFixed(dec)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(dec)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(dec)}K`
  return `$${n.toFixed(dec)}`
}
const pct = (n) => `${n >= 0 ? '+' : ''}${parseFloat(n || 0).toFixed(2)}%`

function TradeSheet({ asset, onClose }) {
  const [mode, setMode]       = useState('buy')
  const [amount, setAmount]   = useState('')
  const [status, setStatus]   = useState(null)
  const { buyAsset, sellAsset } = useCryptoStore()
  const balance = useUserStore((s) => parseFloat(s.user?.balance || 0))

  const price   = parseFloat(asset?.current_price || 0)
  const units   = parseFloat(amount) || 0
  const total   = units * price
  const canBuy  = mode === 'buy' && total > 0 && total <= balance
  const holding = parseFloat(asset?.holding || 0)
  const canSell = mode === 'sell' && units > 0 && units <= holding

  const handleSubmit = async () => {
    setStatus('loading')
    try {
      if (mode === 'buy')  await buyAsset(asset.id, units)
      else                 await sellAsset(asset.id, units)
      setStatus('success')
      setTimeout(onClose, 900)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus(null), 1500)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="w-full rounded-t-3xl p-6 pb-10 space-y-5"
        style={{ background: '#151622', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: 'rgba(255,255,255,0.15)' }} />

        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-lg" style={{ color: 'var(--col-text-1)' }}>{asset.name}</p>
            <p className="text-sm nums" style={{ color: 'var(--col-text-3)' }}>{fmt(asset.current_price)}</p>
          </div>
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {['buy', 'sell'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-5 py-2 text-xs font-black uppercase tracking-widest transition-all"
                style={{
                  background: mode === m
                    ? m === 'buy' ? 'rgba(61,214,140,0.18)' : 'rgba(255,107,107,0.18)'
                    : 'transparent',
                  color: mode === m
                    ? m === 'buy' ? '#3DD68C' : '#FF6B6B'
                    : 'var(--col-text-3)',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black tracking-widest uppercase mb-2 block" style={{ color: 'var(--col-text-3)' }}>
            Amount ({asset.symbol})
          </label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl px-4 py-3 text-lg font-black nums outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'var(--col-text-1)',
            }}
          />
        </div>

        <div className="flex justify-between text-xs font-semibold" style={{ color: 'var(--col-text-3)' }}>
          <span>Total: <span className="nums font-black" style={{ color: 'var(--col-text-1)' }}>{fmt(total)}</span></span>
          <span>{mode === 'buy' ? `Balance: ${fmt(balance)}` : `Holding: ${holding.toFixed(4)} ${asset.symbol}`}</span>
        </div>

        <motion.button
          whileTap={{ y: 2, scale: 0.98 }}
          onClick={handleSubmit}
          disabled={mode === 'buy' ? !canBuy : !canSell}
          className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wide"
          style={{
            background: status === 'success'
              ? '#3DD68C'
              : status === 'error'
              ? '#FF6B6B'
              : mode === 'buy'
              ? 'linear-gradient(180deg, #3DD68C 0%, #22A06B 100%)'
              : 'linear-gradient(180deg, #FF6B6B 0%, #C0392B 100%)',
            color: '#fff',
            opacity: (mode === 'buy' ? !canBuy : !canSell) ? 0.4 : 1,
            boxShadow: mode === 'buy'
              ? '0 4px 0 #166C46, 0 6px 16px rgba(61,214,140,0.25)'
              : '0 4px 0 #8B2020, 0 6px 16px rgba(255,107,107,0.25)',
          }}
        >
          {status === 'loading' ? 'Processing...' : status === 'success' ? 'Done' : `${mode === 'buy' ? 'Buy' : 'Sell'} ${asset.symbol}`}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

function AssetRow({ asset, onTrade }) {
  const change = parseFloat(asset.price_change_24h || 0)
  const up = change >= 0

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={() => onTrade(asset)}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--col-text-1)' }}
      >
        {asset.symbol?.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm" style={{ color: 'var(--col-text-1)' }}>{asset.name}</p>
        <p className="text-xs font-semibold" style={{ color: 'var(--col-text-3)' }}>{asset.symbol}</p>
      </div>
      <div className="text-right">
        <p className="font-black nums text-sm" style={{ color: 'var(--col-text-1)' }}>{fmt(asset.current_price)}</p>
        <p className="text-xs font-bold nums flex items-center gap-0.5 justify-end"
          style={{ color: up ? '#3DD68C' : '#FF6B6B' }}>
          {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {pct(change)}
        </p>
      </div>
    </motion.div>
  )
}

export default function CryptoMarket() {
  const navigate   = useNavigate()
  const { assets, portfolio, fetchAssets, isLoading } = useCryptoStore()
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchAssets() }, [])

  const totalValue = portfolio.reduce((sum, h) => {
    const asset = assets.find(a => a.id === h.asset_id)
    return sum + (parseFloat(h.quantity || 0) * parseFloat(asset?.current_price || 0))
  }, 0)

  return (
    <div className="page-scroll">
      <div className="px-4 pt-5 pb-24 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft size={16} style={{ color: 'var(--col-text-1)' }} />
          </motion.button>
          <div>
            <h1 className="font-black text-xl" style={{ color: 'var(--col-text-1)' }}>Crypto Market</h1>
            <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>Live asset prices</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={fetchAssets}
            className="ml-auto w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <RefreshCw size={14} style={{ color: 'var(--col-text-3)' }} />
          </motion.button>
        </div>

        {/* Portfolio value */}
        {totalValue > 0 && (
          <Card>
            <p className="text-[10px] font-black tracking-widest uppercase mb-1" style={{ color: 'var(--col-text-3)' }}>
              Portfolio Value
            </p>
            <p className="text-3xl font-black nums" style={{ color: 'var(--col-gold)' }}>{fmt(totalValue)}</p>
          </Card>
        )}

        {/* Asset list */}
        <Card>
          <p className="text-[10px] font-black tracking-widest uppercase mb-3" style={{ color: 'var(--col-text-3)' }}>
            Assets
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-2xl animate-shimmer" style={{ background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map(a => <AssetRow key={a.id} asset={a} onTrade={setSelected} />)}
            </div>
          )}
        </Card>
      </div>

      {/* Trade sheet */}
      {selected && <TradeSheet asset={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
