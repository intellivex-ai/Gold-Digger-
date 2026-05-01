// supabase/functions/collect-offline/index.ts
// POST – Collects offline earnings for the authenticated user.
//
// Formula (per business):
//   timeDiff = min(now - profile.last_collected_at, 8 hours)
//   earnings += revenue_per_minute * timeDiff_in_minutes * 0.5 (offline multiplier)
//
// Updates profile.cash and profile.last_collected_at.
// Inserts a transaction record.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getAdminClient, getAuthUser } from '../_shared/supabaseAdmin.ts'

const OFFLINE_HOURS_CAP = 8          // max offline accumulation hours
const OFFLINE_MULTIPLIER = 0.5       // 50 % efficiency while offline

serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    // ── Auth ────────────────────────────────────────────────
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const admin = getAdminClient()

    // ── Fetch profile ────────────────────────────────────────
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('id, cash, last_collected_at, xp, level, reputation')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) return errorResponse('Profile not found', 404)

    // ── Fetch owned businesses ───────────────────────────────
    const { data: businesses, error: bizErr } = await admin
      .from('businesses')
      .select('id, revenue_per_minute')
      .eq('owner_id', user.id)

    if (bizErr) return errorResponse('Could not load businesses', 500)

    if (!businesses || businesses.length === 0) {
      return jsonResponse({ earned: 0, message: 'No businesses to collect from' })
    }

    // ── Calculate earnings ───────────────────────────────────
    const now = new Date()
    const lastCollected = new Date(profile.last_collected_at)
    const elapsedMs = now.getTime() - lastCollected.getTime()
    const elapsedMinutes = elapsedMs / 60_000
    const cappedMinutes = Math.min(elapsedMinutes, OFFLINE_HOURS_CAP * 60)

    // Use numeric string accumulation to avoid float drift
    let totalEarned = 0
    for (const biz of businesses) {
      const rpm = parseFloat(biz.revenue_per_minute) || 0
      totalEarned += rpm * cappedMinutes * OFFLINE_MULTIPLIER
    }

    // Round to 2 decimal places
    totalEarned = Math.round(totalEarned * 100) / 100

    if (totalEarned <= 0) {
      return jsonResponse({ earned: 0, message: 'Nothing to collect yet' })
    }

    // Calculate new XP, Level, and Reputation
    const gainedXp = Math.floor(totalEarned)
    const gainedRep = Math.floor(totalEarned / 10000)
    
    let newXp = (profile.xp || 0) + gainedXp
    let newLevel = (profile.level || 1)
    let newReputation = (profile.reputation || 0) + gainedRep
    
    const XP_PER_LEVEL = 100000
    if (newXp >= XP_PER_LEVEL) {
      newLevel += Math.floor(newXp / XP_PER_LEVEL)
      newXp = newXp % XP_PER_LEVEL
    }

    // ── Atomic update: cash, time, xp, level, reputation ─────
    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        cash: parseFloat(profile.cash) + totalEarned,
        last_collected_at: now.toISOString(),
        xp: newXp,
        level: newLevel,
        reputation: newReputation
      })
      .eq('id', user.id)

    if (updateErr) return errorResponse('Failed to update profile', 500)

    // ── Insert transaction record ────────────────────────────
    await admin.from('transactions').insert({
      user_id: user.id,
      type: 'offline_collect',
      amount: totalEarned,
      description: `Offline earnings from ${businesses.length} business(es) over ${Math.round(cappedMinutes)} min`,
    })

    return jsonResponse({
      earned: totalEarned,
      businesses: businesses.length,
      minutes: Math.round(cappedMinutes),
    })

  } catch (err) {
    console.error('[collect-offline]', err)
    return errorResponse('Internal server error', 500)
  }
})
