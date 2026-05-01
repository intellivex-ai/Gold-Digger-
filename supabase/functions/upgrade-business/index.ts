// supabase/functions/upgrade-business/index.ts
// POST – Upgrades a business level for the authenticated owner.
//
// Body: { businessId: string }
//
// Logic:
//   1. Validate ownership and cash.
//   2. Deduct upgrade_cost from profile.cash.
//   3. Increment level.
//   4. Recalculate revenue_per_minute (scales with level).
//   5. Recalculate next upgrade_cost (exponential curve).
//   6. Insert a transaction record.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getAdminClient, getAuthUser, checkRateLimit } from '../_shared/supabaseAdmin.ts'

// Revenue per minute base values per business type (at level 1)
const BASE_RPM: Record<string, number> = {
  retail:          5,
  real_estate:     8,
  manufacturing:   6,
  tech:            10,
}

// Upgrade cost base per type
const BASE_UPGRADE_COST: Record<string, number> = {
  retail:          1000,
  real_estate:     2500,
  manufacturing:   2000,
  tech:            3000,
}

/**
 * Revenue scales linearly with level:  rpm = base_rpm * level * 1.5
 * Upgrade cost scales exponentially:   cost = base_cost * 1.6^(level-1)
 */
function calcRevenuePerMinute(type: string, level: number): number {
  const base = BASE_RPM[type] ?? 5
  return Math.round(base * level * 1.5 * 100) / 100
}

function calcUpgradeCost(type: string, level: number): number {
  const base = BASE_UPGRADE_COST[type] ?? 1000
  return Math.round(base * Math.pow(1.6, level - 1) * 100) / 100
}

serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    // ── Auth ─────────────────────────────────────────────────
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const admin = getAdminClient()

    // ── Rate limit: 20 upgrades per minute ──────────────────
    const allowed = await checkRateLimit(admin, user.id, 'upgrade-business', 20, 60)
    if (!allowed) return errorResponse('Too many requests – slow down!', 429)

    // ── Parse body ───────────────────────────────────────────
    const body = await req.json().catch(() => null)
    const { businessId } = body ?? {}
    if (!businessId) return errorResponse('businessId is required')

    // ── Fetch business ───────────────────────────────────────
    const { data: biz, error: bizErr } = await admin
      .from('businesses')
      .select('id, owner_id, type, level, upgrade_cost, revenue_per_minute')
      .eq('id', businessId)
      .single()

    if (bizErr || !biz) return errorResponse('Business not found', 404)
    if (biz.owner_id !== user.id) return errorResponse('Forbidden – not your business', 403)

    // ── Fetch profile (cash) ─────────────────────────────────
    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('id, cash')
      .eq('id', user.id)
      .single()

    if (profErr || !profile) return errorResponse('Profile not found', 404)

    const currentCash = parseFloat(profile.cash)
    const upgradeCost = parseFloat(biz.upgrade_cost)

    if (currentCash < upgradeCost) {
      return errorResponse(`Insufficient cash. Need $${upgradeCost.toFixed(2)}, have $${currentCash.toFixed(2)}`)
    }

    // ── Compute new values ───────────────────────────────────
    const newLevel = biz.level + 1
    const newRpm   = calcRevenuePerMinute(biz.type, newLevel)
    const newCost  = calcUpgradeCost(biz.type, newLevel)
    const newCash  = Math.round((currentCash - upgradeCost) * 100) / 100

    // ── Atomic updates ───────────────────────────────────────
    const [bizUpdate, cashUpdate] = await Promise.all([
      admin.from('businesses').update({
        level: newLevel,
        revenue_per_minute: newRpm,
        upgrade_cost: newCost,
      }).eq('id', businessId),

      admin.from('profiles').update({ cash: newCash }).eq('id', user.id),
    ])

    if (bizUpdate.error) return errorResponse('Failed to upgrade business', 500)
    if (cashUpdate.error) return errorResponse('Failed to deduct cash', 500)

    // ── Transaction record ───────────────────────────────────
    await admin.from('transactions').insert({
      user_id: user.id,
      type: 'business_upgrade',
      amount: -upgradeCost,
      description: `Upgraded ${biz.type} business to level ${newLevel}`,
    })

    return jsonResponse({
      level: newLevel,
      revenue_per_minute: newRpm,
      upgrade_cost: newCost,
      cash: newCash,
      deducted: upgradeCost,
    })

  } catch (err) {
    console.error('[upgrade-business]', err)
    return errorResponse('Internal server error', 500)
  }
})
