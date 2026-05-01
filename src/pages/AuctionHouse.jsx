import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Tag, Gavel, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useAuctionStore from '../stores/useAuctionStore'
import useUserStore from '../stores/useUserStore'
import Card from '../components/Card'

const fmt = (n) => {
  n = parseFloat(n || 0)
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function useCountdown(endAt) {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, new Date(endAt) - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endAt])
  const s = Math.floor(left / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

function AuctionCard({ listing, onBid, onBuyout }) {
  const countdown = useCountdown(listing.ends_at)
  const urgent = (new Date(listing.ends_at) - Date.now()) < 5 * 60000
  const currentBid = parseFloat(listing.current_bid || listing.start_price || 0)

  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm truncate" style={{ color: 'var(--col-text-1)' }}>{listing.item_name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--col-text-3)' }}>{listing.item_type}</p>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{
            background: urgent ? 'rgba(255,107,107,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${urgent ? 'rgba(255,107,107,0.25)' : 'rgba(255,255,255,0.07)'}`,
          }}
        >
          <Clock size={10} style={{ color: urgent ? '#FF6B6B' : 'var(--col-text-3)' }} />
          <span className="text-[10px] font-black nums" style={{ color: urgent ? '#FF6B6B' : 'var(--col-text-3)' }}>
            {countdown}
          </span>
        </div>
      </div>

      <div className="flex items-end gap-2 mb-3">
        <div>
          <p className="text-[9px] font-black tracking-widest uppercase mb-0.5" style={{ color: 'var(--col-text-3)' }}>Current Bid</p>
          <p className="text-xl font-black nums" style={{ color: '#F5C842' }}>{fmt(currentBid)}</p>
        </div>
        {listing.buyout_price && (
          <div className="ml-auto text-right">
            <p className="text-[9px] font-black tracking-widest uppercase mb-0.5" style={{ color: 'var(--col-text-3)' }}>Buyout</p>
            <p className="text-sm font-black nums" style={{ color: 'var(--col-text-2)' }}>{fmt(listing.buyout_price)}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <motion.button
          whileTap={{ y: 2, scale: 0.97 }}
          onClick={() => onBid(listing)}
          className="flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5"
          style={{
            background: 'linear-gradient(180deg, #F5C842 0%, #C49B20 100%)',
            color: '#1A1200',
            boxShadow: '0 3px 0 #8B6A00',
          }}
        >
          <Gavel size={13} /> Place Bid
        </motion.button>
        {listing.buyout_price && (
          <motion.button
            whileTap={{ y: 2, scale: 0.97 }}
            onClick={() => onBuyout(listing)}
            className="py-2.5 px-4 rounded-xl font-black text-xs flex items-center gap-1.5"
            style={{
              background: 'rgba(91,156,246,0.12)',
              border: '1px solid rgba(91,156,246,0.25)',
              color: '#5B9CF6',
            }}
          >
            <ArrowUpRight size={13} /> Buy Now
          </motion.button>
        )}
      </div>
    </div>
  )
}

export default function AuctionHouse() {
  const navigate = useNavigate()
  const { listings, fetchListings, placeBid, buyout, isLoading } = useAuctionStore()

  useEffect(() => { fetchListings?.() }, [])

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
            <h1 className="font-black text-xl" style={{ color: 'var(--col-text-1)' }}>Auction House</h1>
            <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>Live competitive bidding</p>
          </div>
          <div
            className="ml-auto px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: 'var(--col-text-3)' }}>
              {listings.length} Live
            </span>
          </div>
        </div>

        {/* Listings */}
        <Card>
          <p className="text-[10px] font-black tracking-widest uppercase mb-3" style={{ color: 'var(--col-text-3)' }}>
            Active Auctions
          </p>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl animate-shimmer" style={{ background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-2">
              <Tag size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--col-text-3)' }}>No active auctions</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Check back soon</p>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map(l => (
                <AuctionCard
                  key={l.id}
                  listing={l}
                  onBid={placeBid}
                  onBuyout={buyout}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
