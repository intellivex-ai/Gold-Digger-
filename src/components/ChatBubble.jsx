/**
 * ChatBubble.jsx
 * 
 * An individual message component for the global chat and direct messages.
 * Includes a deterministic color generator so users always have the same avatar color
 * based on their username.
 */

import useUserStore from '../stores/useUserStore'

/**
 * Converts an ISO date string into a friendly "Time Ago" format.
 * E.g., "just now", "5m ago", "2h ago"
 */
function timeAgo(isoString) {
  const diff    = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1)  return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)   return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ── Deterministic Avatar Colors ──
// These pairs create nice-looking gradients that match the game's theme.
const AVATAR_COLORS = [
  ['#5B9CF6','#B56EFF'],   // blue → purple
  ['#3DD68C','#5B9CF6'],   // green → blue
  ['#F5C842','#FF7A30'],   // gold → orange
  ['#B56EFF','#FF5A5A'],   // purple → red
  ['#FF7A30','#F5C842'],   // orange → gold
  ['#3DD68C','#B56EFF'],   // green → purple
]

/**
 * Hashes a string (like a username) to always return the same index.
 * This guarantees a user's avatar color is persistent without needing to store it in the database.
 */
function getGradient(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function ChatBubble({ message }) {
  // Determine if this message was sent by the current user
  const currentUserId = useUserStore((s) => s.user?.id)
  const isMine   = message.sender_id === currentUserId || message.sender_id === 'me'
  
  // Safely extract the username
  const username = message.profile?.username || message.sender?.username || 'Player'
  const initials = username.slice(0, 2).toUpperCase()
  
  // Get the deterministic colors for this user
  const [c1, c2] = getGradient(username)

  return (
    <div className={`flex gap-2 mb-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end`}>
      
      {/* ── Avatar (Only show for other users) ── */}
      {!isMine && (
        <div
          className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white"
          style={{
            background: `linear-gradient(135deg, ${c1}, ${c2})`,
            boxShadow: `0 0 8px ${c1}60`,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
      )}

      {/* ── Message Content ── */}
      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
        
        {/* Username label (above the bubble, only for others) */}
        {!isMine && (
          <span className="text-[10px] font-black ml-1" style={{ color: c1 }}>
            {username}
          </span>
        )}

        {/* The Text Bubble */}
        <div
          className={isMine ? 'bubble-sent' : 'bubble-recv'}
          style={isMine ? {} : {}}
        >
          <p className="text-sm leading-relaxed">{message.message}</p>
        </div>

        {/* Timestamp */}
        <span className="text-[9px] mx-1" style={{ color: 'var(--col-text-3)' }}>
          {timeAgo(message.created_at)}
        </span>
      </div>
    </div>
  )
}
