import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ShoppingCart, Package, X } from 'lucide-react'
import useMarketStore from '../stores/useMarketStore'
import useUserStore from '../stores/useUserStore'
import sounds from '../lib/soundManager'

const fmtMoney = (n) => {
  n = parseFloat(n || 0)
  if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}k`
  return `$${n.toFixed(2)}`
}

export default function PlayerTrade() {
  const orders      = useMarketStore((s) => s.marketplaceOrders)
  const createOrder = useMarketStore((s) => s.createMarketplaceOrder)
  const buyItem     = useMarketStore((s) => s.buyMarketplaceItem)
  const fetchOrders = useMarketStore((s) => s.fetchMarketplace)
  const portfolio   = useMarketStore((s) => s.portfolio)
  const fetchPortfolio = useMarketStore((s) => s.fetchPortfolio)
  const user        = useUserStore((s) => s.user)

  React.useEffect(() => {
    fetchOrders()
    if (user?.id) fetchPortfolio(user.id)
  }, [fetchOrders, fetchPortfolio, user?.id])

  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ itemName: '', quantity: '', priceEach: '' })
  const [loading, setLoading]   = useState(false)
  const [toast, setToast]       = useState(null)

  const selectedItem = portfolio.find(p => p.symbol === form.itemName)
  const maxQty = selectedItem ? selectedItem.quantity : 0

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  async function handleCreate(e) {
    e.preventDefault(); setLoading(true)
    const result = await createOrder({
      item_type:  'stock',
      item_id:    form.itemName,
      quantity:   parseInt(form.quantity),
      price:      parseFloat(form.priceEach),
      seller_id:  user?.id,
    })
    setLoading(false)
    if (result.success) {
      sounds.success?.()
      setShowForm(false)
      setForm({ itemName: '', quantity: '', priceEach: '' })
      showToast('Listing posted!')
    } else {
      sounds.error?.()
      showToast(result.message || 'Failed to post listing', 'error')
    }
  }

  async function handleBuy(order) {
    sounds.tap?.()
    const result = await buyItem(order.id)
    if (result.success) { sounds.success?.(); showToast(`Purchased ${order.item_id || order.itemName}`) }
    else { sounds.error?.(); showToast(result.message || 'Purchase failed', 'error') }
  }

  return (
    <div className="px-4 pt-4 pb-6">
      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            className="mb-3 py-2.5 px-4 rounded-xl text-sm font-bold text-center"
            style={{
              background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(61,214,140,0.15)',
              border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(61,214,140,0.3)'}`,
              color: toast.type === 'error' ? '#FF5A5A' : '#3DD68C',
              boxShadow: `0 0 16px ${toast.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(61,214,140,0.2)'}`,
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Post listing button ── */}
      <div className="mb-4">
        <motion.button
          className={showForm ? 'btn-game-ghost' : 'btn-game-gold'}
          style={{ paddingTop: 12, paddingBottom: 12, width: '100%', fontSize: 14 }}
          whileTap={{ y: showForm ? 1 : 3, scale: 0.98 }}
          onClick={() => { sounds.tap?.(); setShowForm(!showForm) }}
        >
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Post a Listing</>}
        </motion.button>
      </div>

      {/* ── Create form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="card">
              <h3 className="text-sm font-black mb-4" style={{ color: 'var(--col-text-1)' }}>
                New Sell Order
              </h3>
              <form onSubmit={handleCreate} className="space-y-3">
                {portfolio.length === 0 ? (
                  <div className="p-3 rounded-xl text-sm font-semibold text-center"
                    style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', color: '#FF5A5A' }}>
                    You don't own any items to sell yet.
                  </div>
                ) : (
                  <>
                    <select
                      value={form.itemName}
                      onChange={(e) => setForm({ ...form, itemName: e.target.value, quantity: '' })}
                      required className="input-dark"
                    >
                      <option value="" disabled>Select an item to sell...</option>
                      {portfolio.map(p => (
                        <option key={p.symbol} value={p.symbol}>
                          {p.symbol} (Owns: {p.quantity})
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" placeholder={`Qty (Max: ${maxQty})`}
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        required min="1" max={maxQty || 1} className="input-dark" />
                      <input type="number" step="0.01" placeholder="Price each ($)"
                        value={form.priceEach}
                        onChange={(e) => setForm({ ...form, priceEach: e.target.value })}
                        required min="0.01" className="input-dark" />
                    </div>
                    <motion.button type="submit" className="btn-game-gold w-full"
                      style={{ paddingTop: 12, paddingBottom: 12 }}
                      whileTap={{ y: 3, scale: 0.98 }}>
                      {loading
                        ? <span className="w-4 h-4 border-2 border-[#1A1200]/50 border-t-[#1A1200] rounded-full animate-spin" />
                        : 'Post Listing'}
                    </motion.button>
                  </>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Open Orders ── */}
      <p className="text-[10px] font-black tracking-widest uppercase mb-3"
        style={{ color: 'var(--col-text-3)' }}>
        Open Orders ({orders.length})
      </p>

      <div className="space-y-2">
        {orders.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-3xl mb-2">⚔️</p>
            <p className="text-sm font-bold" style={{ color: 'var(--col-text-3)' }}>No open orders</p>
            <p className="text-xs mt-1" style={{ color: 'var(--col-text-3)', opacity: 0.6 }}>
              Be the first to post a listing!
            </p>
          </div>
        )}
        {orders.map((order, i) => {
          const qty    = order.quantity || 0
          const price  = order.price || order.priceEach || 0
          const total  = qty * price
          const name   = order.item_id || order.itemName || order.item_name || 'Item'
          const seller = order.seller?.username || order.seller || 'Unknown'

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{
                  background: 'rgba(0,0,0,0.30)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(91,156,246,0.10)',
                    border: '1px solid rgba(91,156,246,0.20)',
                  }}
                >
                  <Package size={18} color="#5B9CF6" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate" style={{ color: 'var(--col-text-1)' }}>{name}</p>
                  <p className="text-xs nums" style={{ color: 'var(--col-text-3)' }}>
                    x{qty} · ${parseFloat(price).toFixed(2)}/ea
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--col-text-3)', opacity: 0.7 }}>
                    by {seller}
                  </p>
                </div>

                <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                  <p className="text-sm font-black nums" style={{ color: '#F5C842', textShadow: '0 0 8px rgba(245,200,66,0.4)' }}>
                    {fmtMoney(total)}
                  </p>
                  <motion.button
                    className="btn-game-blue"
                    style={{ paddingTop: 6, paddingBottom: 6, paddingLeft: 12, paddingRight: 12, fontSize: 12 }}
                    whileTap={{ y: 2, scale: 0.97 }}
                    onClick={() => handleBuy(order)}
                  >
                    <ShoppingCart size={12} /> Buy
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
