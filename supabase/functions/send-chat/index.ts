// supabase/functions/send-chat/index.ts
// POST – Sends a validated chat message.
// RLS handles read access; this function adds:
//   - Auth verification
//   - Channel membership checks (corp channel)
//   - Basic message sanitisation (length, no spam)
//   - Rate limiting (10 messages per 10 seconds)
//
// Body: { message: string, channel: 'global'|'corp'|'dm', recipientId?: string }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getAdminClient, getAuthUser, checkRateLimit } from '../_shared/supabaseAdmin.ts'

// Very simple profanity blocklist (extend as needed)
const BLOCKED_WORDS = ['spam', 'scam', 'hack']  // keep this minimal in production

function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase()
  return BLOCKED_WORDS.some((word) => lower.includes(word))
}

serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const admin = getAdminClient()

    // ── Rate limit: 10 messages per 10 seconds ───────────────
    const allowed = await checkRateLimit(admin, user.id, 'send-chat', 10, 10)
    if (!allowed) return errorResponse('Slow down! Message rate limit exceeded', 429)

    const body = await req.json().catch(() => null)
    const { message, channel, recipientId } = body ?? {}

    if (!message || !channel) return errorResponse('message and channel are required')
    if (!['global', 'corp', 'dm'].includes(channel)) return errorResponse('Invalid channel')
    if (message.trim().length === 0) return errorResponse('Message cannot be empty')
    if (message.length > 1000) return errorResponse('Message too long (max 1000 chars)')

    // ── Profanity / spam check ───────────────────────────────
    if (containsProfanity(message)) return errorResponse('Message contains blocked content', 400)

    // ── Corp channel: verify membership ─────────────────────
    let corporationId: string | null = null

    if (channel === 'corp') {
      const { data: profile } = await admin
        .from('profiles').select('corporation_id').eq('id', user.id).single()
      if (!profile?.corporation_id)
        return errorResponse('You are not in a corporation')
      corporationId = profile.corporation_id
    }

    // ── DM: verify recipient exists ──────────────────────────
    if (channel === 'dm') {
      if (!recipientId) return errorResponse('recipientId required for DMs')
      if (recipientId === user.id) return errorResponse('Cannot DM yourself')
      const { data: recipient } = await admin
        .from('profiles').select('id').eq('id', recipientId).maybeSingle()
      if (!recipient) return errorResponse('Recipient not found', 404)
    }

    // ── Insert message ───────────────────────────────────────
    const { data: msg, error: insertErr } = await admin
      .from('chat_messages')
      .insert({
        sender_id: user.id,
        channel,
        message: message.trim(),
        recipient_id: channel === 'dm' ? recipientId : null,
        corporation_id: corporationId,
      })
      .select('id, created_at')
      .single()

    if (insertErr) return errorResponse('Failed to send message', 500)

    return jsonResponse({ success: true, message_id: msg.id, created_at: msg.created_at })

  } catch (err) {
    console.error('[send-chat]', err)
    return errorResponse('Internal server error', 500)
  }
})
