import { create } from 'zustand'
import { supabase, callEdgeFunction } from '../lib/supabase'
const useSocialStore = create((set, get) => ({
  corporation: null,
  chatMessages: [],          // start empty; fetchChatMessages() loads on mount
  leaderboard: [],           // start empty; fetchLeaderboard() loads on mount
  activeChatChannel: 'corp',
  isLoadingLeaderboard: false,
  isLoadingChat: false,
  onlineUsers: [],
  friends: [],
  pendingRequests: [],

  // ── Friends ────────────────────────────────────────────────
  fetchFriends: async () => {
    const userId = useUserStore.getState().user?.id
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          user:profiles!friendships_user_id_fkey(username),
          friend:profiles!friendships_friend_id_fkey(username)
        `)
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

      if (error) {
        // Fallback for foreign key name issues
        const fb = await supabase
          .from('friendships')
          .select(`*, user:profiles!user_id(username), friend:profiles!friend_id(username)`)
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        if (fb.error) throw fb.error
        data = fb.data
      }

      const friends = []
      const pendingRequests = []

      data.forEach(f => {
        const isMeUser = f.user_id === userId
        const otherId = isMeUser ? f.friend_id : f.user_id
        const otherUsername = isMeUser ? f.friend?.username : f.user?.username

        const record = { id: f.id, otherId, otherUsername, status: f.status, isIncoming: !isMeUser }

        if (f.status === 'accepted') {
          friends.push(record)
        } else if (f.status === 'pending' && !isMeUser) {
          pendingRequests.push(record)
        }
      })

      set({ friends, pendingRequests })
    } catch (e) {
      console.error(e)
    }
  },

  sendFriendRequest: async (targetUserId) => {
    const userId = useUserStore.getState().user?.id
    if (!userId || !targetUserId) return { success: false }
    try {
      const { error } = await supabase.from('friendships').insert({
        user_id: userId,
        friend_id: targetUserId,
        status: 'pending'
      })
      if (error) throw error
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  acceptFriendRequest: async (friendshipId) => {
    try {
      const { error } = await supabase.from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)
      if (error) throw error
      get().fetchFriends()
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  removeFriend: async (friendshipId) => {
    try {
      const { error } = await supabase.from('friendships')
        .delete()
        .eq('id', friendshipId)
      if (error) throw error
      get().fetchFriends()
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  // ── Corporation ────────────────────────────────────────────
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

  subscribeToCorporation: (corporationId) => {
    if (!corporationId) return () => {}
    const channel = supabase
      .channel('corp-realtime-' + corporationId)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'corporations', filter: `id=eq.${corporationId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            set((s) => ({ corporation: { ...s.corporation, ...payload.new } }))
          }
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'corporation_members', filter: `corporation_id=eq.${corporationId}` },
        () => { get().fetchCorporation(corporationId) })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `corporation_id=eq.${corporationId}` },
        () => { get().fetchCorporation(corporationId) })
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  // ── Corp actions via edge function ─────────────────────────
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

  depositToCorporation: async (corporationId, amount) => {
    set((s) => ({
      corporation: s.corporation
        ? { ...s.corporation, bank: (parseFloat(s.corporation.bank) + amount).toFixed(2) }
        : null,
    }))
    try {
      await callEdgeFunction('corporation-action', { action: 'deposit', corporationId, amount })
      return { success: true }
    } catch (e) {
      set((s) => ({
        corporation: s.corporation
          ? { ...s.corporation, bank: (parseFloat(s.corporation.bank) - amount).toFixed(2) }
          : null,
      }))
      return { success: false, message: e.message }
    }
  },

  withdrawFromCorporation: async (corporationId, amount) => {
    try {
      await callEdgeFunction('corporation-action', { action: 'withdraw', corporationId, amount })
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  upgradeCorporation: async (corporationId) => {
    try {
      const data = await callEdgeFunction('corporation-action', { action: 'upgrade', corporationId })
      return { success: true, data }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  // ── Leaderboard ────────────────────────────────────────────
  fetchLeaderboard: async () => {
    set({ isLoadingLeaderboard: true })
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, cash, reputation, corporation_id')
        .order('cash', { ascending: false })
        .limit(50)
      if (error) throw error
      // Map to ranked list with net worth derived from cash
      const ranked = (data || []).map((p, i) => ({
        ...p,
        rank: i + 1,
        netWorth: parseFloat(p.cash || 0),
        level: p.level || Math.floor(Math.random() * 20) + 5,
      }))
      set({ leaderboard: ranked, isLoadingLeaderboard: false })
    } catch {
      set({ leaderboard: [], isLoadingLeaderboard: false })
    }
  },

  subscribeToLeaderboard: () => {
    let timeout;
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
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

  // ── Chat ───────────────────────────────────────────────────
  fetchChatMessages: async (channel = 'corp') => {
    set({ isLoadingChat: true })
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      let query = supabase
        .from('chat_messages')
        .select('*, profile:profiles!chat_messages_sender_id_fkey(username)')
        .eq('channel', channel)
        .gte('created_at', threeDaysAgo)
        .order('created_at', { ascending: true })
        .limit(100)
        
      if (channel === 'dm') {
        const userId = useUserStore.getState().user?.id
        if (userId) {
          query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        }
      }

      const { data, error } = await query
      if (error) {
        // Fallback if the explicit fkey fails
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
      
      set({
        chatMessages: data || [],
        isLoadingChat: false,
      })
    } catch {
      set({
        chatMessages: [],
        isLoadingChat: false,
      })
    }
  },

  subscribeToChat: (channel) => {
    const supabaseChannel = supabase
      .channel('chat-' + channel)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel=eq.${channel}` },
        async (payload) => {
          const { data: sender } = await supabase
            .from('profiles').select('username').eq('id', payload.new.sender_id).single()
          get().addIncomingMessage({ ...payload.new, profile: sender })
        })
      .subscribe()
    return () => supabase.removeChannel(supabaseChannel)
  },

  sendMessage: async (text, channel = 'corp', recipientId = null) => {
    const tempMsg = {
      id: 'temp-' + Date.now(),
      sender_id: 'me',
      message: text,
      channel,
      created_at: new Date().toISOString(),
      profile: { username: 'You' },
    }
    set((s) => ({ chatMessages: [...s.chatMessages, tempMsg] }))
    try {
      await callEdgeFunction('send-chat', { message: text, channel, recipientId })
    } catch {
      set((s) => ({ chatMessages: s.chatMessages.filter((m) => m.id !== tempMsg.id) }))
    }
  },

  addIncomingMessage: (msg) => {
    set((s) => {
      if (s.chatMessages.some(m => m.id === msg.id)) return s
      const tempMsgIndex = s.chatMessages.findIndex(m => String(m.id).startsWith('temp-') && m.message === msg.message && m.sender_id === 'me')
      let newMessages = [...s.chatMessages]
      if (tempMsgIndex >= 0) {
        newMessages[tempMsgIndex] = msg
      } else {
        newMessages.push(msg)
      }
      return { chatMessages: newMessages.slice(-200) }
    })
  },

  setActiveChatChannel: (channel) => {
    set({ activeChatChannel: channel })
    get().fetchChatMessages(channel)
  },
}))

export default useSocialStore
