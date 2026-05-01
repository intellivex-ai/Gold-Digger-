import { NavLink, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import sounds from '../lib/soundManager'
import useSocialStore from '../stores/useSocialStore'

export default function Social() {
  const fetchLeaderboard  = useSocialStore((s) => s.fetchLeaderboard)
  const fetchChatMessages = useSocialStore((s) => s.fetchChatMessages)

  useEffect(() => {
    fetchLeaderboard()
    fetchChatMessages('corp')
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 pt-5 pb-3 flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(10,11,15,0.95) 0%, rgba(10,11,15,0.0) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h1 className="text-2xl font-black tracking-tight mb-3" style={{ color: 'var(--col-text-1)' }}>
          Social
        </h1>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <SubTab to="/social"             label="🏢 Corporation" end />
          <SubTab to="/social/chat"        label="💬 Chat" />
          <SubTab to="/social/leaderboard" label="🏆 Leaderboard" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}

function SubTab({ to, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={() => sounds.tap?.()}
      className={({ isActive }) => `subtab-pill whitespace-nowrap ${isActive ? 'active' : ''}`}
    >
      {label}
    </NavLink>
  )
}
