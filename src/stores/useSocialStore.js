/**
 * useSocialStore.js
 * 
 * This file manages all the multi-player aspects of the game.
 * It handles adding friends, joining/managing Corporations (guilds),
 * the global leaderboard, and sending/receiving chat messages.
 */

import { create } from 'zustand'
import { supabase, callEdgeFunction } from '../lib/supabase'
import useUserStore from './useUserStore'

const useSocialStore = create((set, get) => ({
  // ── State (What we are remembering) ──────────────────────────────────────────
  corporation: null,         // The corporation the user is currently in
  chatMessages: [],          // History of messages in the current chat room
  leaderboard: [],           // Top 50 richest players
  activeChatChannel: 'corp', // Which chat room is currently open (e.g. 'corp', 'global', 'dm')
  isLoadingLeaderboard: false,
  isLoadingChat: false,
  onlineUsers: [],           // List of user IDs currently playing the game
  friends: [],               // The user's accepted friends
  pendingRequests: [],       // People who want to be the user's friend

  // ── Friends System ───────────────────────────────────────────────────────────

  /** 
   * Grabs the user's friends list and pending friend requests.
   */
  fetchFriends: async () => {
    const userId = useUserStore.getState().user?.id
    if (!userId) return

    try {
      let { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          user:profiles!friendships_user_id_fkey(username),
          friend:profiles!friendships_friend_id_fkey(username)
        `)
        // Look for friendships where we are EITHER the sender OR the receiver
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

      // If the specific key name fails, try a fallback search
      if (error) {
        const fb = await supabase
          .from('friendships')
          .select(`*, user:profiles!user_id(username), friend:profiles!friend_id(username)`)
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        if (fb.error) throw fb.error
        data = fb.data
      }

      const friends = []
      const pendingRequests = []

      // Sort the relationships into "Friends" and "Pending Requests"
      data.forEach(f => {
        const isMeUser = f.user_id === userId // Did WE send the request?
        const otherId = isMeUser ? f.friend_id : f.user_id
        const otherUsername = isMeUser ? f.friend?.username : f.user?.username

        const record = { id: f.id, otherId, otherUsername, status: f.status, isIncoming: !isMeUser }

        if (f.status === 'accepted') {
          friends.push(record)
        } else if (f.status === 'pending' && !isMeUser) {
          // If it's pending and we didn't send it, it means someone wants to be OUR friend
          pendingRequests.push(record)
        }
      })

      set({ friends, pendingRequests })
    } catch (e) {
      console.error(e)
    }
  },

  /** Sends a friend request to another player */
  sendFriendRequest: async (targetUserId) => {
    const userId = useUserStore.getState().user?.id
    if (!userId || !targetUserId) return { success: false }
    
    try {
      const { error } = await supabase.from('friendships').insert({
        user_id: userId,
        friend_id: targetUserId,
        status: 'pending' // They have to accept it before it becomes active
      })
      if (error) throw error
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  /** Accept someone's friend request */
  acceptFriendRequest: async (friendshipId) => {
    try {
      const { error } = await supabase.from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)
      if (error) throw error
      
      // Refresh the lists
      get().fetchFriends()
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  /** Unfriend someone */
  removeFriend: async (friendshipId) => {
    try {
      const { error } = await supabase.from('friendships')
        .delete()
        .eq('id', friendshipId)
      if (error) throw error
      
      // Refresh the lists
      get().fetchFriends()
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  // ── Corporation (Guilds) ─────────────────────────────────────────────────────

  /** Gets the details of a specific corporation, including all its members */
  fetchCorporation: async (corporationId) => {
    if (!corporationId) { set({ corporation: null }); return }
    
    try {
      const { data, error } = await supabase
        .from('corporations')
        .select('*, members:corporation_members(*, profile:profiles(*))')
        .eq('id', corporationId)
        .single()
      if (error) throw error
      set({ corporation: data })
    } catch {
      set({ corporation: null })
    }
  },

  /** Keeps the corporation data (like bank balance and member list) updated live */
  subscribeToCorporation: (corporationId) => {
    if (!corporationId) return () => {}
    
    const channel = supabase
      .channel('corp-realtime-' + corporationId)
      
      // Listen for changes to the Corp itself (e.g. bank balance changes)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'corporations', filter: `id=eq.${corporationId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            set((s) => ({ corporation: { ...s.corporation, ...payload.new } }))
          }
        })
        
      // Listen if someone joins or leaves the corp
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'corporation_members', filter: `corporation_id=eq.${corporationId}` },
        () => { get().fetchCorporation(corporationId) })
        
      // Listen if a member's profile updates (e.g. they level up)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `corporation_id=eq.${corporationId}` },
        () => { get().fetchCorporation(corporationId) })
        
      .subscribe()
      
    return () => supabase.removeChannel(channel)
  },

  // The following use Edge Functions so users can't cheat money or hack memberships

  createCorporation: async (name, tag) => {
    try {
      const data = await callEdgeFunction('corporation-action', { action: 'create', name, tag })
      set({ corporation: data.corporation })
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  inviteMember: async (corporationId, targetUserId) => {
    try {
      const data = await callEdgeFunction('corporation-action', { action: 'invite', corporationId, targetUserId })
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  leaveCorporation: async (corporationId) => {
    try {
      await callEdgeFunction('corporation-action', { action: 'leave', corporationId })
      set({ corporation: null })
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  joinCorporation: async (corporationId) => {
    try {
      const data = await callEdgeFunction('corporation-action', { action: 'join', corporationId })
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  /** Grabs a list of the top corporations so users can choose one to join */
  fetchAvailableCorporations: async () => {
    try {
      const { data, error } = await supabase
        .from('corporations')
        .select('*, members:corporation_members(count)')
        .order('bank', { ascending: false })
      if (error) throw error
      return data || []
    } catch {
      return []
    }
  },

  /** Donate personal cash into the corporation's shared bank */
  depositToCorporation: async (corporationId, amount) => {
    // Update the screen instantly (optimistic UI)
    set((s) => ({
      corporation: s.corporation
        ? { ...s.corporation, bank: (parseFloat(s.corporation.bank) + amount).toFixed(2) }
        : null,
    }))
    try {
      await callEdgeFunction('corporation-action', { action: 'deposit', corporationId, amount })
      return { success: true }
    } catch (e) {
      // If it fails on the server, revert the screen back
      set((s) => ({
        corporation: s.corporation
          ? { ...s.corporation, bank: (parseFloat(s.corporation.bank) - amount).toFixed(2) }
          : null,
      }))
      return { success: false, message: e.message }
    }
  },

  /** CEO only: Take money out of the corp bank */
  withdrawFromCorporation: async (corporationId, amount) => {
    try {
      await callEdgeFunction('corporation-action', { action: 'withdraw', corporationId, amount })
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  /** Upgrade the corp level using bank funds */
  upgradeCorporation: async (corporationId) => {
    try {
      const data = await callEdgeFunction('corporation-action', { action: 'upgrade', corporationId })
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  // ── Leaderboard ──────────────────────────────────────────────────────────────
  
  /** Gets the top 50 richest players */
  fetchLeaderboard: async () => {
    set({ isLoadingLeaderboard: true })
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, cash, reputation, corporation_id')
        .order('cash', { ascending: false }) // Biggest numbers first
        .limit(50)
      if (error) throw error
      
      // Calculate rank and standardize data
      const ranked = (data || []).map((p, i) => ({
        ...p,
        rank: i + 1,
        netWorth: parseFloat(p.cash || 0),
        level: p.level || 1,
      }))
      set({ leaderboard: ranked, isLoadingLeaderboard: false })
    } catch {
      set({ leaderboard: [], isLoadingLeaderboard: false })
    }
  },

  /** If anyone's cash changes, we wait 2 seconds then update the leaderboard */
  subscribeToLeaderboard: () => {
    let timeout;
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          // "Debounce" it: If 10 people get money at once, we only fetch once after 2 seconds
          clearTimeout(timeout);
          timeout = setTimeout(() => get().fetchLeaderboard(), 2000);
        }
      )
      .subscribe();
      
    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  },

  // ── Chat System ──────────────────────────────────────────────────────────────

  /** Gets the last 100 messages for a specific chat room */
  fetchChatMessages: async (channel = 'corp') => {
    set({ isLoadingChat: true })
    try {
      // We only care about messages from the last 3 days
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      
      let query = supabase
        .from('chat_messages')
        .select('*, profile:profiles!chat_messages_sender_id_fkey(username)')
        .eq('channel', channel)
        .gte('created_at', threeDaysAgo)
        .order('created_at', { ascending: true }) // Oldest to newest
        .limit(100)
        
      // If it's a Direct Message, we only want messages sent TO us or BY us
      if (channel === 'dm') {
        const userId = useUserStore.getState().user?.id
        if (userId) {
          query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        }
      }

      const { data, error } = await query
      
      if (error) {
        // Fallback query if database keys are weird
        query = supabase
          .from('chat_messages')
          .select('*, profile:profiles(username)')
          .eq('channel', channel)
          .gte('created_at', threeDaysAgo)
          .order('created_at', { ascending: true })
          .limit(100)
        if (channel === 'dm') {
          const userId = useUserStore.getState().user?.id
          if (userId) query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        }
        const fallback = await query
        if (fallback.error) throw fallback.error
        set({ chatMessages: fallback.data || [], isLoadingChat: false })
        return
      }
      
      set({ chatMessages: data || [], isLoadingChat: false })
    } catch {
      set({ chatMessages: [], isLoadingChat: false })
    }
  },

  /** Listens for new chat messages coming from other players */
  subscribeToChat: (channel) => {
    const supabaseChannel = supabase
      .channel('chat-' + channel)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel=eq.${channel}` },
        async (payload) => {
          // When we get a message, grab the sender's username so we can display it
          const { data: sender } = await supabase
            .from('profiles').select('username').eq('id', payload.new.sender_id).single()
            
          get().addIncomingMessage({ ...payload.new, profile: sender })
        })
      .subscribe()
    return () => supabase.removeChannel(supabaseChannel)
  },

  /** Sends a message to the server */
  sendMessage: async (text, channel = 'corp', recipientId = null) => {
    // 1. Show the message on our screen IMMEDIATELY so it feels lightning fast
    const tempMsg = {
      id: 'temp-' + Date.now(),
      sender_id: 'me',
      message: text,
      channel,
      created_at: new Date().toISOString(),
      profile: { username: 'You' },
    }
    set((s) => ({ chatMessages: [...s.chatMessages, tempMsg] }))
    
    // 2. Actually send it to the server
    try {
      await callEdgeFunction('send-chat', { message: text, channel, recipientId })
    } catch {
      // If it fails, remove our fake temporary message so the user knows it didn't send
      set((s) => ({ chatMessages: s.chatMessages.filter((m) => m.id !== tempMsg.id) }))
    }
  },

  /** Helper to add a message to the list smoothly */
  addIncomingMessage: (msg) => {
    set((s) => {
      // Ignore duplicates
      if (s.chatMessages.some(m => m.id === msg.id)) return s
      
      // If this is a real message from the server that matches our "fake temporary" message, swap it out
      const tempMsgIndex = s.chatMessages.findIndex(m => String(m.id).startsWith('temp-') && m.message === msg.message && m.sender_id === 'me')
      
      let newMessages = [...s.chatMessages]
      if (tempMsgIndex >= 0) {
        newMessages[tempMsgIndex] = msg // Replace fake with real
      } else {
        newMessages.push(msg) // Add entirely new message
      }
      
      // Keep chat history trimmed to 200 items so phone doesn't freeze
      return { chatMessages: newMessages.slice(-200) }
    })
  },

  /** Switch between chat tabs (Corp vs Global) */
  setActiveChatChannel: (channel) => {
    set({ activeChatChannel: channel })
    get().fetchChatMessages(channel)
  },
}))

export default useSocialStore
