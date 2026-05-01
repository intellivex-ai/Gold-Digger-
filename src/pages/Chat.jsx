/**
 * Chat.jsx
 * 
 * A dual-purpose messaging interface that handles both Corporate group chat
 * and Direct Messaging (DMs). Incorporates real-time presence indicators
 * and friend request management.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, Plus, ArrowLeft } from 'lucide-react'
import useSocialStore from '../stores/useSocialStore'
import useUserStore from '../stores/useUserStore'
import sounds from '../lib/soundManager'
import { supabase } from '../lib/supabase'

const CHANNELS = ['corp', 'dm']

export default function Chat() {
  // ── Global State ──
  const messages             = useSocialStore((s) => s.chatMessages)
  const activeChatChannel    = useSocialStore((s) => s.activeChatChannel)
  const setActiveChatChannel = useSocialStore((s) => s.setActiveChatChannel)
  const sendMessage          = useSocialStore((s) => s.sendMessage)
  const isLoadingChat        = useSocialStore((s) => s.isLoadingChat)
  const onlineUsers          = useSocialStore((s) => s.onlineUsers)
  const friends              = useSocialStore((s) => s.friends)
  const pendingRequests      = useSocialStore((s) => s.pendingRequests)
  const fetchFriends         = useSocialStore((s) => s.fetchFriends)
  const acceptFriendRequest  = useSocialStore((s) => s.acceptFriendRequest)
  const sendFriendRequest    = useSocialStore((s) => s.sendFriendRequest)
  const currentUserId        = useUserStore((s) => s.user?.id)

  // ── Local State ──
  const [input, setInput]                       = useState('')
  const [activeDmUserId, setActiveDmUserId]     = useState(null)
  const [activeDmUsername, setActiveDmUsername] = useState('')
  const [dmUsers, setDmUsers]                   = useState({})
  const [onlineProfiles, setOnlineProfiles]     = useState({})
  
  const bottomRef = useRef(null)

  // Initialize friends list on mount
  useEffect(() => { 
    if (currentUserId) fetchFriends() 
  }, [currentUserId, fetchFriends])

  // ── Message Filtering Logic ──
  // Ensures only messages relevant to the current channel (or specific DM) are shown
  const filtered = messages.filter((m) => {
    if (m.channel !== activeChatChannel) return false
    if (activeChatChannel === 'dm') {
      if (!activeDmUserId) return false
      // In DMs, only show messages where the current user is either sender or recipient
      return m.sender_id === activeDmUserId || m.recipient_id === activeDmUserId
    }
    return true
  })

  // ── Profile Hydration for DMs ──
  // Fetches usernames for IDs that appear in the DM list but aren't cached locally
  useEffect(() => {
    if (activeChatChannel !== 'dm') return
    const missingIds = new Set()
    messages.forEach(m => {
      if (m.channel !== 'dm') return
      const otherId = m.sender_id === currentUserId ? m.recipient_id : m.sender_id
      if (otherId && !dmUsers[otherId] && otherId !== currentUserId) missingIds.add(otherId)
    })
    
    if (missingIds.size > 0) {
      supabase.from('profiles').select('id, username').in('id', Array.from(missingIds)).then(({ data }) => {
        if (data) { 
          const map = { ...dmUsers }
          data.forEach(d => map[d.id] = d.username)
          setDmUsers(map) 
        }
      })
    }
  }, [messages, activeChatChannel, currentUserId, dmUsers])

  // ── Profile Hydration for Online Users ──
  useEffect(() => {
    const missing = onlineUsers.filter(id => !onlineProfiles[id] && id !== currentUserId)
    if (missing.length > 0) {
      supabase.from('profiles').select('id, username').in('id', missing).then(({ data }) => {
        if (data) { 
          const map = { ...onlineProfiles }
          data.forEach(d => map[d.id] = d.username)
          setOnlineProfiles(map) 
        }
      })
    }
  }, [onlineUsers, currentUserId, onlineProfiles])

  // ── Dynamic DM List Generation ──
  // Aggregates raw messages into a deduplicated list of active conversations
  const dmList = []
  if (activeChatChannel === 'dm') {
    const map = new Map()
    messages.forEach(m => {
      if (m.channel !== 'dm') return
      const otherId = m.sender_id === currentUserId ? m.recipient_id : m.sender_id
      if (!otherId || otherId === currentUserId) return
      const existing = map.get(otherId)
      
      // Store the most recent message per conversation
      if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
        map.set(otherId, { 
          otherId, 
          username: dmUsers[otherId] || 'Loading...', 
          lastMessage: m.message, 
          created_at: m.created_at 
        })
      }
    })
    // Sort latest conversations to the top
    dmList.push(...Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
  }

  // Auto-scroll to newest message
  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) 
  }, [filtered.length])

  // Real-time listener binding
  useEffect(() => {
    const unsubscribe = useSocialStore.getState().subscribeToChat(activeChatChannel)
    return () => unsubscribe()
  }, [activeChatChannel])

  function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return
    sounds.send?.()
    sendMessage(input.trim(), activeChatChannel, activeChatChannel === 'dm' ? activeDmUserId : null)
    setInput('')
  }

  function handleChannelChange(ch) {
    sounds.tap?.()
    setActiveChatChannel(ch)
    setActiveDmUserId(null)
  }

  // ── Friend/DM Actions ──
  const handleNewConversation = async () => {
    sounds.tap?.()
    const target = window.prompt('Enter exact username to message:')
    if (!target) return
    if (target.toLowerCase() === useUserStore.getState().user?.username?.toLowerCase()) {
      return alert("Can't message yourself.")
    }
    
    // Lookup user by username
    const { data, error } = await supabase.from('profiles').select('id, username').eq('username', target).single()
    if (error || !data) return alert('User not found')
    
    setDmUsers(prev => ({ ...prev, [data.id]: data.username }))
    setActiveDmUserId(data.id)
    setActiveDmUsername(data.username)
  }

  const handleAddFriend = async (targetId, username) => {
    sounds.tap?.()
    const { success, message } = await sendFriendRequest(targetId)
    if (success) { 
      alert(`Friend request sent to ${username}!`)
      fetchFriends() 
    } else {
      alert(message || 'Failed to send request.')
    }
  }

  const panelStyle = {
    background: 'rgba(0,0,0,0.30)',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Channel Tabs ── */}
      <div className="flex justify-between items-center px-4 pt-3 pb-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex gap-2">
          {CHANNELS.map((ch) => (
            <button key={ch} onClick={() => handleChannelChange(ch)}
              className={`subtab-pill capitalize ${activeChatChannel === ch ? 'active' : ''}`}>
              {ch === 'corp' ? '🏢 Corp' : '💬 Direct'}
            </button>
          ))}
        </div>
        {/* New DM Button */}
        {activeChatChannel === 'dm' && !activeDmUserId && (
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleNewConversation}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(91,156,246,0.15)', border: '1px solid rgba(91,156,246,0.30)' }}>
            <Plus size={17} color="#5B9CF6" />
          </motion.button>
        )}
      </div>

      {/* ── Direct Message Overview (List View) ── */}
      {activeChatChannel === 'dm' && !activeDmUserId ? (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Active Online Users Strip */}
          {onlineUsers.filter(id => id !== currentUserId).length > 0 && (
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase mb-3"
                style={{ color: 'var(--col-text-3)' }}>Online Now</p>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {onlineUsers.filter(id => id !== currentUserId).map(id => {
                  const username = onlineProfiles[id] || '...'
                  const isFriend = friends.some(f => f.otherId === id)
                  return (
                    <div key={id} className="flex flex-col items-center gap-1 min-w-[56px] cursor-pointer"
                      onClick={() => isFriend
                        ? (setActiveDmUserId(id), setActiveDmUsername(username))
                        : window.confirm(`Send friend request to ${username}?`) && handleAddFriend(id, username)
                      }>
                      <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm"
                        style={{ background: 'rgba(91,156,246,0.15)', border: '1px solid rgba(91,156,246,0.30)', color: '#5B9CF6' }}>
                        {username.slice(0, 2).toUpperCase()}
                        {/* Green online indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                          style={{ background: '#3DD68C', borderColor: 'var(--col-bg)' }} />
                      </div>
                      <span className="text-[10px] font-semibold truncate w-full text-center"
                        style={{ color: 'var(--col-text-2)' }}>{username}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Pending Friend Requests */}
          {pendingRequests.length > 0 && (
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: 'var(--col-text-3)' }}>
                Friend Requests
              </p>
              <div className="space-y-2">
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.20)' }}>
                    <span className="text-sm font-bold" style={{ color: '#F5C842' }}>{req.otherUsername}</span>
                    <motion.button whileTap={{ y: 1 }}
                      onClick={() => { sounds.tap?.(); acceptFriendRequest(req.id) }}
                      className="btn-game-gold" style={{ padding: '6px 14px', fontSize: 12 }}>
                      Accept
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Friends and DMs */}
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: 'var(--col-text-3)' }}>
              Friends & Chats
            </p>
            
            {/* Friends without active chats */}
            {friends.filter(f => !dmList.some(dm => dm.otherId === f.otherId)).map(f => (
              <motion.div key={f.id} whileTap={{ scale: 0.98 }}
                onClick={() => { sounds.tap?.(); setActiveDmUserId(f.otherId); setActiveDmUsername(f.otherUsername) }}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer mb-2" style={panelStyle}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--col-text-2)' }}>
                  {f.otherUsername.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate" style={{ color: 'var(--col-text-1)' }}>{f.otherUsername}</p>
                  <p className="text-xs" style={{ color: 'var(--col-text-3)' }}>Friend</p>
                </div>
              </motion.div>
            ))}

            {/* Empty State */}
            {dmList.length === 0 && friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <MessageCircle size={32} style={{ color: 'var(--col-text-3)', marginBottom: 12 }} />
                <p className="text-sm font-bold" style={{ color: 'var(--col-text-2)' }}>No conversations</p>
                <p className="text-xs mt-1" style={{ color: 'var(--col-text-3)' }}>Add friends to connect</p>
              </div>
            ) : 
            /* Active Conversations */
            dmList.map(dm => (
              <motion.div key={dm.otherId} whileTap={{ scale: 0.98 }}
                onClick={() => { sounds.tap?.(); setActiveDmUserId(dm.otherId); setActiveDmUsername(dm.username) }}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer mb-2" style={panelStyle}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #5B9CF6, #B56EFF)', color: '#fff' }}>
                  {dm.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate" style={{ color: 'var(--col-text-1)' }}>{dm.username}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--col-text-3)' }}>{dm.lastMessage}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        // ── Active Chat Window (Corp or specific DM) ──
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* DM Header Back Button */}
          {activeChatChannel === 'dm' && activeDmUserId && (
            <div className="px-4 py-3 flex justify-between items-center"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.20)' }}>
              <span className="text-sm font-black" style={{ color: 'var(--col-text-1)' }}>
                💬 {activeDmUsername}
              </span>
              <motion.button whileTap={{ scale: 0.85 }}
                onClick={() => { sounds.tap?.(); setActiveDmUserId(null) }}
                className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl min-h-[40px]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--col-text-2)' }}>
                <ArrowLeft size={13} /> Back
              </motion.button>
            </div>
          )}

          {/* Message List — overscroll-contain prevents page pull-to-refresh from firing while scrolling messages */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-2">
            {isLoadingChat && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`h-10 rounded-2xl animate-shimmer ${i % 2 === 0 ? 'w-2/3' : 'w-1/2 ml-auto'}`}
                style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
            {!isLoadingChat && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle size={32} style={{ color: 'var(--col-text-3)', marginBottom: 12 }} />
                <p className="text-sm font-bold" style={{ color: 'var(--col-text-2)' }}>No messages yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--col-text-3)' }}>Be the first to say something!</p>
              </div>
            )}
            {!isLoadingChat && filtered.map((msg) => (
              <GameChatBubble key={msg.id} message={msg} currentUserId={currentUserId} />
            ))}
            {/* Invisible div for auto-scrolling to bottom */}
            <div ref={bottomRef} />
          </div>

          {/* Message Input Bar — pb-safe handles iOS home indicator */}
          <form onSubmit={handleSend} className="px-3 pt-3 pb-3 flex items-center gap-2 flex-shrink-0"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(0,0,0,0.30)',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 rounded-2xl outline-none"
              style={{
                fontSize: 16, // Prevents iOS auto-zoom when focused
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'var(--col-text-1)',
              }} />
            <motion.button type="submit" whileTap={{ scale: 0.85, y: 1 }}
              disabled={!input.trim()}
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: input.trim()
                  ? 'linear-gradient(180deg,#7AB4FF 0%,#5B9CF6 35%,#2D6CD4 100%)'
                  : 'rgba(255,255,255,0.05)',
                boxShadow: input.trim() ? '0 3px 0 #1A4A9E, 0 4px 12px rgba(91,156,246,0.35)' : 'none',
                border: '1px solid rgba(255,255,255,0.10)',
              }}>
              <Send size={17} color={input.trim() ? '#fff' : 'var(--col-text-3)'} />
            </motion.button>
          </form>
        </div>
      )}
    </div>
  )
}

/**
 * Renders an individual chat message with appropriate alignment based on authorship
 */
function GameChatBubble({ message, currentUserId }) {
  const isMine = message.sender_id === currentUserId
  // Gracefully handle username extraction depending on how the join was populated
  const username = message.profile?.username || message.sender?.username || message.username || ''
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMine && (
        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0"
          style={{ background: 'rgba(91,156,246,0.15)', border: '1px solid rgba(91,156,246,0.25)', color: '#5B9CF6' }}>
          {username.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className={`max-w-[78%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!isMine && username && (
          <span className="text-[10px] font-black px-1" style={{ color: 'var(--col-text-3)' }}>{username}</span>
        )}
        <div className={isMine ? 'bubble-sent' : 'bubble-recv'}>
          {message.message}
        </div>
        <span className="text-[9px] px-1" style={{ color: 'var(--col-text-3)' }}>{time}</span>
      </div>
    </div>
  )
}
