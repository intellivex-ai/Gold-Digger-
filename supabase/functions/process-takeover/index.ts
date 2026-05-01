// supabase/functions/process-takeover/index.ts
// POST – Hostile business takeover system.
//
// Actions:
//   initiate  { businessId, bidAmount }  – Attacker bids to take over a business.
//   defend    { takeoverId }             – Target pays to cancel the attempt.
//   execute   { takeoverId }             – (Called by cron or attacker after timer) transfers ownership.
//
// Rules:
//   - Bid must be >= 150 % of upgrade_cost to initiate.
//   - 10 % of bid is taken as non-refundable fee upfront.
//   - Target has 24 hours to pay the bid amount to defend.
//   - After defense timer expires, attacker can execute the transfer.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getAdminClient, getAuthUser } from '../_shared/supabaseAdmin.ts'

const INITIATION_FEE_RATE = 0.10   // 10 % of bid – non-refundable
const MIN_BID_MULTIPLIER  = 1.5    // bid must be >= 150 % of upgrade_cost

serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const admin = getAdminClient()
    const body = await req.json().catch(() => null)
    const { action, ...payload } = body ?? {}

    // ══════════════════════════════════════════════════════════
    // INITIATE TAKEOVER
    // ══════════════════════════════════════════════════════════
    if (action === 'initiate') {
      const { businessId, bidAmount } = payload
      if (!businessId || !bidAmount) return errorResponse('businessId and bidAmount required')

      const { data: biz } = await admin
        .from('businesses')
        .select('id, owner_id, upgrade_cost, name')
        .eq('id', businessId)
        .single()

      if (!biz) return errorResponse('Business not found', 404)
      if (biz.owner_id === user.id) return errorResponse('Cannot take over your own business')

      const minBid = parseFloat(biz.upgrade_cost) * MIN_BID_MULTIPLIER
      if (bidAmount < minBid) return errorResponse(`Bid must be at least $${minBid.toFixed(2)}`)

      const { data: profile } = await admin.from('profiles').select('cash').eq('id', user.id).single()
      if (!profile) return errorResponse('Profile not found', 404)

      const fee = Math.round(bidAmount * INITIATION_FEE_RATE * 100) / 100
      const totalRequired = Math.round((bidAmount + fee) * 100) / 100

      if (parseFloat(profile.cash) < totalRequired)
        return errorResponse(`Need $${totalRequired.toFixed(2)} (bid + 10% fee)`)

      // Check no pending takeover on this business
      const { data: existing } = await admin
        .from('takeover_attempts')
        .select('id')
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .maybeSingle()
      if (existing) return errorResponse('This business already has a pending takeover attempt')

      // Deduct initiation fee (non-refundable) + escrow bid
      const newCash = Math.round((parseFloat(profile.cash) - totalRequired) * 100) / 100
      await admin.from('profiles').update({ cash: newCash }).eq('id', user.id)

      const defenseExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const { data: attempt, error: insertErr } = await admin
        .from('takeover_attempts')
        .insert({
          attacker_id: user.id,
          target_id: biz.owner_id,
          business_id: businessId,
          bid_amount: bidAmount,
          defense_expires: defenseExpires,
        })
        .select()
        .single()

      if (insertErr) return errorResponse('Failed to create takeover attempt', 500)

      await admin.from('transactions').insert({
        user_id: user.id,
        type: 'hostile_takeover',
        amount: -totalRequired,
        description: `Initiated takeover of "${biz.name}" with $${bidAmount} bid (+ $${fee} fee)`,
      })

      return jsonResponse({
        success: true,
        takeover_id: attempt.id,
        bid: bidAmount,
        fee,
        defense_expires: defenseExpires,
      })
    }

    // ══════════════════════════════════════════════════════════
    // DEFEND
    // ══════════════════════════════════════════════════════════
    if (action === 'defend') {
      const { takeoverId } = payload
      if (!takeoverId) return errorResponse('takeoverId required')

      const { data: attempt } = await admin
        .from('takeover_attempts')
        .select('*')
        .eq('id', takeoverId)
        .eq('status', 'pending')
        .single()

      if (!attempt) return errorResponse('Takeover attempt not found or already resolved', 404)
      if (attempt.target_id !== user.id) return errorResponse('Only the target can defend', 403)
      if (new Date(attempt.defense_expires) < new Date()) return errorResponse('Defense window has expired')

      const { data: targetProfile } = await admin.from('profiles').select('cash').eq('id', user.id).single()
      const defenseCost = parseFloat(attempt.bid_amount)

      if (parseFloat(targetProfile!.cash) < defenseCost)
        return errorResponse(`Need $${defenseCost.toFixed(2)} to defend`)

      const newCash = Math.round((parseFloat(targetProfile!.cash) - defenseCost) * 100) / 100

      await admin.from('profiles').update({ cash: newCash }).eq('id', user.id)
      await admin.from('takeover_attempts').update({ status: 'defended' }).eq('id', takeoverId)

      // Refund attacker their bid (they still lose the fee)
      const { data: attackerProfile } = await admin.from('profiles').select('cash').eq('id', attempt.attacker_id).single()
      await admin.from('profiles').update({
        cash: Math.round((parseFloat(attackerProfile!.cash) + defenseCost) * 100) / 100,
      }).eq('id', attempt.attacker_id)

      await admin.from('transactions').insert({
        user_id: user.id,
        type: 'hostile_takeover',
        amount: -defenseCost,
        description: `Successfully defended business takeover attempt`,
      })

      return jsonResponse({ success: true, message: 'Business defended successfully', cost: defenseCost })
    }

    // ══════════════════════════════════════════════════════════
    // EXECUTE (transfer ownership after timer expires)
    // ══════════════════════════════════════════════════════════
    if (action === 'execute') {
      const { takeoverId } = payload
      if (!takeoverId) return errorResponse('takeoverId required')

      const { data: attempt } = await admin
        .from('takeover_attempts')
        .select('*')
        .eq('id', takeoverId)
        .eq('status', 'pending')
        .single()

      if (!attempt) return errorResponse('Takeover attempt not found or already resolved', 404)
      if (attempt.attacker_id !== user.id) return errorResponse('Only the attacker can execute', 403)
      if (new Date(attempt.defense_expires) > new Date())
        return errorResponse(`Defense window still active until ${attempt.defense_expires}`)

      // Transfer business ownership
      await admin.from('businesses').update({ owner_id: user.id }).eq('id', attempt.business_id)
      await admin.from('takeover_attempts').update({ status: 'completed' }).eq('id', takeoverId)

      await admin.from('transactions').insert({
        user_id: user.id,
        type: 'hostile_takeover',
        amount: 0,
        description: `Successfully completed hostile takeover of business ${attempt.business_id}`,
      })

      return jsonResponse({ success: true, message: 'Takeover completed – business transferred to you' })
    }

    return errorResponse(`Unknown action: ${action}`)

  } catch (err) {
    console.error('[process-takeover]', err)
    return errorResponse('Internal server error', 500)
  }
})
