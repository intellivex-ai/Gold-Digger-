import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown, TrendingUp, Trophy, Medal, Flame } from 'lucide-react'
import useSocialStore from '../stores/useSocialStore'
import useUserStore from '../stores/useUserStore'
import { LeaderboardSkeleton } from '../components/SkeletonLoader'

const fmtWorth = (n) => {
  if (!n) return '$0'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`
  return `$${n}`
}

// Top-3 podium config
const PODIUM = [
  { pos: 1, height: 80, color: '#C0C0C0', icon: '🥈', label: '2ND', glow: 'rgba(192,192,192,0.3)' },
  { pos: 0, height: 110, color: '#F5C842', icon: '👑', label: '1ST', glow: 'rgba(245,200,66,0.5)' },
  { pos: 2, height: 60, color: '#CD7F32', icon: '🥉', label: '3RD', glow: 'rgba(205,127,50,0.3)' },
]

export default function Leaderboard() {
  const leaderboard          = useSocialStore((s) => s.leaderboard)
  const fetchLeaderboard     = useSocialStore((s) => s.fetchLeaderboard)
  const isLoadingLeaderboard = useSocialStore((s) => s.isLoadingLeaderboard)
  const currentUserId        = useUserStore((s) => s.user?.id)

  useEffect(() => {
    fetchLeaderboard()
    const unsubscribe = useSocialStore.getState().subscribeToLeaderboard()
    return () => unsubscribe()
  }, [])

  if (isLoadingLeaderboard && leaderboard.length === 0) return <LeaderboardSkeleton />

  return (
    <div className="px-4 pt-4 pb-8">

      {/* ── TOP 3 PODIUM ── */}
      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-6 pt-2">
          {PODIUM.map(({ pos, height, color, icon, label, glow }) => {
            const player = leaderboard[pos]
            if (!player) return <div key={pos} className="w-24" />
            const isTop = pos === 0

            return (
              <motion.div
                key={player.id || pos}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pos === 0 ? 0 : pos === 1 ? 0.1 : 0.2, type: 'spring', stiffness: 250 }}
                className="flex flex-col items-center w-24"
              >
                {/* Rank icon */}
                <span style={{ fontSize: 20 }} className="mb-1">{icon}</span>

                {/* Avatar */}
                <motion.div
                  animate={isTop ? { boxShadow: [`0 0 16px ${glow}`, `0 0 32px ${glow}`, `0 0 16px ${glow}`] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm mb-1"
                  style={{
                    background: `linear-gradient(135deg, ${color}30, ${color}15)`,
                    border: `2px solid ${color}60`,
                    color: color,
                    textShadow: `0 0 8px ${glow}`,
                    fontSize: isTop ? 13 : 11,
                  }}
                >
                  {player.username?.slice(0, 2).toUpperCase()}
                </motion.div>

                <p className="text-[10px] font-black truncate w-full text-center"
                  style={{ color: 'var(--col-text-1)' }}>
                  {player.username}
                </p>
                <p className="text-[10px] font-black nums" style={{ color }}>
                  {fmtWorth(player.netWorth)}
                </p>

                {/* Podium block */}
                <div
                  className="w-full mt-2 rounded-t-xl flex items-end justify-center pb-1"
                  style={{
                    height: height,
                    background: `linear-gradient(180deg, ${color}20 0%, ${color}08 100%)`,
                    border: `1px solid ${color}30`,
                    borderBottom: 'none',
                    boxShadow: `0 -4px 16px ${glow}`,
                  }}
                >
                  <span className="text-[9px] font-black tracking-widest" style={{ color }}>{label}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span className="text-[10px] font-black tracking-widest uppercase"
          style={{ color: 'var(--col-text-3)' }}>
          Full Rankings
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* ── FULL LIST ── */}
      <div className="space-y-1.5">
        {leaderboard.map((player, i) => {
          const isMe = player.id === currentUserId
          const rankColor = player.rank === 1 ? '#F5C842' : player.rank === 2 ? '#C0C0C0' : player.rank === 3 ? '#CD7F32' : 'var(--col-text-3)'

          return (
            <motion.div
              key={player.rank || i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{
                background: isMe
                  ? 'rgba(91,156,246,0.10)'
                  : 'rgba(255,255,255,0.02)',
                border: isMe
                  ? '1px solid rgba(91,156,246,0.25)'
                  : '1px solid rgba(255,255,255,0.05)',
                boxShadow: isMe ? '0 0 12px rgba(91,156,246,0.15)' : 'none',
              }}
            >
              {/* Rank */}
              <div className="w-7 flex items-center justify-center flex-shrink-0">
                {player.rank === 1
                  ? <Crown size={16} color="#F5C842" fill="#F5C842" style={{ filter: 'drop-shadow(0 0 4px rgba(245,200,66,0.7))' }} />
                  : player.rank === 2
                  ? <Trophy size={16} color="#C0C0C0" />
                  : player.rank === 3
                  ? <Medal size={16} color="#CD7F32" />
                  : <span className="text-xs font-black nums" style={{ color: 'var(--col-text-3)' }}>
                      #{player.rank}
                    </span>
                }
              </div>

              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{
                  background: isMe
                    ? 'linear-gradient(135deg, #5B9CF6, #B56EFF)'
                    : 'rgba(255,255,255,0.06)',
                  color: isMe ? '#fff' : 'var(--col-text-2)',
                  border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {player.username?.slice(0, 2).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-black truncate"
                    style={{ color: isMe ? '#5B9CF6' : 'var(--col-text-1)' }}>
                    {player.username}
                    {isMe && <span className="text-[9px] ml-1 font-black" style={{ color: '#5B9CF6' }}>(YOU)</span>}
                  </p>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--col-text-3)' }}>
                  Lv.{player.level || '?'}
                  {player.corporationName && ` · ${player.corporationName}`}
                </p>
              </div>

              {/* Net worth */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black nums"
                  style={{ color: rankColor, textShadow: player.rank <= 3 ? `0 0 8px ${rankColor}60` : 'none' }}>
                  {fmtWorth(player.netWorth)}
                </p>
                <div className="flex items-center justify-end gap-0.5">
                  <TrendingUp size={9} color="#3DD68C" />
                  <span className="text-[9px] font-bold" style={{ color: '#3DD68C' }}>Live</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
