// supabase/functions/corporation-action/index.ts
// POST – Handles all corporation operations.
//
// Body: { action, ...payload }
//
// Actions:
//   create   { name, tag }
//   invite   { targetUserId }
//   accept   { corporationId }
//   leave    { corporationId }
//   kick     { targetUserId, corporationId }
//   deposit  { corporationId, amount }
//   withdraw { corporationId, amount }
//   upgrade  { corporationId }  – increases member_cap
//   join     { corporationId }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getAdminClient, getAuthUser } from '../_shared/supabaseAdmin.ts'

serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const admin = getAdminClient()
    const body = await req.json().catch(() => null)
    const { action, ...payload } = body ?? {}

    if (!action) return errorResponse('action is required')

    // ══════════════════════════════════════════════════════════
    // CREATE CORPORATION
    // ══════════════════════════════════════════════════════════
    if (action === 'create') {
      const { name, tag } = payload
      if (!name || !tag) return errorResponse('name and tag are required')
      if (tag.length > 4) return errorResponse('tag must be at most 4 characters')

      // Check user is not already in a corp
      const { data: profile } = await admin
        .from('profiles').select('corporation_id').eq('id', user.id).single()
      if (profile?.corporation_id) return errorResponse('You are already in a corporation – leave first')

      // Creation fee: $5000
      const { data: pf } = await admin.from('profiles').select('cash').eq('id', user.id).single()
      if (!pf || parseFloat(pf.cash) < 5000)
        return errorResponse('Creating a corporation costs $5,000')

      // Insert corporation
      const { data: corp, error: corpErr } = await admin
        .from('corporations').insert({ name, tag }).select().single()
      if (corpErr) {
        if (corpErr.code === '23505') return errorResponse('Corporation name or tag already taken')
        return errorResponse('Failed to create corporation', 500)
      }

      // Add founder as CEO
      await admin.from('corporation_members').insert({
        corporation_id: corp.id, user_id: user.id, role: 'ceo',
      })

      // Update profile
      await admin.from('profiles').update({
        corporation_id: corp.id,
        cash: Math.round((parseFloat(pf.cash) - 5000) * 100) / 100,
      }).eq('id', user.id)

      return jsonResponse({ success: true, corporation: corp })
    }

    // ══════════════════════════════════════════════════════════
    // INVITE  (CEO only – creates a pending member record)
    // ══════════════════════════════════════════════════════════
    if (action === 'invite') {
      const { targetUserId, corporationId } = payload
      if (!targetUserId || !corporationId) return errorResponse('targetUserId and corporationId required')

      // Verify caller is CEO
      const { data: callerMember } = await admin
        .from('corporation_members')
        .select('role')
        .eq('corporation_id', corporationId)
        .eq('user_id', user.id)
        .single()
      if (!callerMember || callerMember.role !== 'ceo')
        return errorResponse('Only the CEO can invite members', 403)

      // Check member cap
      const { count } = await admin
        .from('corporation_members')
        .select('*', { count: 'exact', head: true })
        .eq('corporation_id', corporationId)
      const { data: corp } = await admin
        .from('corporations').select('member_cap').eq('id', corporationId).single()
      if ((count ?? 0) >= (corp?.member_cap ?? 5))
        return errorResponse('Corporation is full – upgrade member cap first')

      // Target must not already be in a corp
      const { data: targetProfile } = await admin
        .from('profiles').select('corporation_id').eq('id', targetUserId).single()
      if (targetProfile?.corporation_id)
        return errorResponse('Target player is already in a corporation')

      // Insert as 'member' (they still need to accept)
      const { error } = await admin.from('corporation_members').insert({
        corporation_id: corporationId, user_id: targetUserId, role: 'member',
      })
      if (error) return errorResponse('Failed to invite member', 500)

      return jsonResponse({ success: true, message: 'Invitation sent' })
    }

    // ══════════════════════════════════════════════════════════
    // ACCEPT INVITATION
    // ══════════════════════════════════════════════════════════
    if (action === 'accept') {
      const { corporationId } = payload
      if (!corporationId) return errorResponse('corporationId required')

      // Membership row must already exist (from invite)
      const { data: member } = await admin
        .from('corporation_members')
        .select('*').eq('corporation_id', corporationId).eq('user_id', user.id).single()
      if (!member) return errorResponse('No pending invitation found')

      await admin.from('profiles').update({ corporation_id: corporationId }).eq('id', user.id)
      return jsonResponse({ success: true, message: 'Joined corporation' })
    }

    // ══════════════════════════════════════════════════════════
    // JOIN CORPORATION (Open Join)
    // ══════════════════════════════════════════════════════════
    if (action === 'join') {
      const { corporationId } = payload
      if (!corporationId) return errorResponse('corporationId required')

      // Check if user is already in a corp
      const { data: profile } = await admin
        .from('profiles').select('corporation_id').eq('id', user.id).single()
      if (profile?.corporation_id) return errorResponse('You are already in a corporation')

      // Check member cap
      const { count } = await admin
        .from('corporation_members')
        .select('*', { count: 'exact', head: true })
        .eq('corporation_id', corporationId)
      
      const { data: corp } = await admin
        .from('corporations').select('member_cap').eq('id', corporationId).single()
      
      if (!corp) return errorResponse('Corporation not found', 404)
      if ((count ?? 0) >= corp.member_cap)
        return errorResponse('Corporation is full')

      // Insert member and update profile
      const { error: memberErr } = await admin.from('corporation_members').insert({
        corporation_id: corporationId, user_id: user.id, role: 'member',
      })
      if (memberErr) return errorResponse('Failed to join corporation', 500)

      await admin.from('profiles').update({ corporation_id: corporationId }).eq('id', user.id)
      return jsonResponse({ success: true, message: 'Joined corporation successfully' })
    }

    // ══════════════════════════════════════════════════════════
    // LEAVE CORPORATION
    // ══════════════════════════════════════════════════════════
    if (action === 'leave') {
      const { corporationId } = payload
      if (!corporationId) return errorResponse('corporationId required')

      const { data: member } = await admin
        .from('corporation_members')
        .select('role').eq('corporation_id', corporationId).eq('user_id', user.id).single()
      if (!member) return errorResponse('You are not in this corporation')
      if (member.role === 'ceo') return errorResponse('CEO must transfer ownership before leaving')

      await admin.from('corporation_members').delete()
        .eq('corporation_id', corporationId).eq('user_id', user.id)
      await admin.from('profiles').update({ corporation_id: null }).eq('id', user.id)
      return jsonResponse({ success: true, message: 'Left corporation' })
    }

    // ══════════════════════════════════════════════════════════
    // KICK MEMBER  (CEO only)
    // ══════════════════════════════════════════════════════════
    if (action === 'kick') {
      const { targetUserId, corporationId } = payload
      if (!targetUserId || !corporationId) return errorResponse('targetUserId and corporationId required')

      const { data: callerMember } = await admin
        .from('corporation_members').select('role')
        .eq('corporation_id', corporationId).eq('user_id', user.id).single()
      if (!callerMember || callerMember.role !== 'ceo')
        return errorResponse('Only the CEO can kick members', 403)
      if (targetUserId === user.id) return errorResponse('Cannot kick yourself')

      await admin.from('corporation_members').delete()
        .eq('corporation_id', corporationId).eq('user_id', targetUserId)
      await admin.from('profiles').update({ corporation_id: null }).eq('id', targetUserId)
      return jsonResponse({ success: true, message: 'Member removed' })
    }

    // ══════════════════════════════════════════════════════════
    // DEPOSIT to corp bank
    // ══════════════════════════════════════════════════════════
    if (action === 'deposit') {
      const { corporationId, amount } = payload
      if (!corporationId || !amount || amount <= 0) return errorResponse('corporationId and positive amount required')

      const { data: profile } = await admin.from('profiles').select('cash, corporation_id').eq('id', user.id).single()
      if (profile?.corporation_id !== corporationId) return errorResponse('You are not in this corporation', 403)
      if (parseFloat(profile.cash) < amount) return errorResponse('Insufficient cash')

      const { data: corp } = await admin.from('corporations').select('bank').eq('id', corporationId).single()
      const depositAmount = Math.round(amount * 100) / 100

      await Promise.all([
        admin.from('profiles').update({ cash: Math.round((parseFloat(profile.cash) - depositAmount) * 100) / 100 }).eq('id', user.id),
        admin.from('corporations').update({ bank: Math.round((parseFloat(corp!.bank) + depositAmount) * 100) / 100 }).eq('id', corporationId),
        admin.from('corporation_members').update({ contribution: depositAmount }).eq('corporation_id', corporationId).eq('user_id', user.id),
      ])

      await admin.from('transactions').insert({
        user_id: user.id, type: 'corp_deposit',
        amount: -depositAmount,
        description: `Deposited $${depositAmount} to corporation bank`,
      })

      return jsonResponse({ success: true, deposited: depositAmount })
    }

    // ══════════════════════════════════════════════════════════
    // WITHDRAW from corp bank  (CFO / CEO only)
    // ══════════════════════════════════════════════════════════
    if (action === 'withdraw') {
      const { corporationId, amount } = payload
      if (!corporationId || !amount || amount <= 0) return errorResponse('corporationId and positive amount required')

      const { data: member } = await admin
        .from('corporation_members').select('role')
        .eq('corporation_id', corporationId).eq('user_id', user.id).single()
      if (!member || !['ceo','cfo'].includes(member.role))
        return errorResponse('Only CEO or CFO can withdraw from corp bank', 403)

      const { data: corp } = await admin.from('corporations').select('bank').eq('id', corporationId).single()
      if (!corp || parseFloat(corp.bank) < amount) return errorResponse('Insufficient funds in corp bank')

      const withdrawAmount = Math.round(amount * 100) / 100

      await Promise.all([
        admin.from('profiles').update({
          cash: parseFloat((await admin.from('profiles').select('cash').eq('id', user.id).single()).data!.cash) + withdrawAmount,
        }).eq('id', user.id),
        admin.from('corporations').update({ bank: Math.round((parseFloat(corp.bank) - withdrawAmount) * 100) / 100 }).eq('id', corporationId),
      ])

      await admin.from('transactions').insert({
        user_id: user.id, type: 'corp_withdraw',
        amount: withdrawAmount,
        description: `Withdrew $${withdrawAmount} from corporation bank`,
      })

      return jsonResponse({ success: true, withdrawn: withdrawAmount })
    }

    // ══════════════════════════════════════════════════════════
    // UPGRADE corp (increase member_cap) – costs corp bank funds
    // ══════════════════════════════════════════════════════════
    if (action === 'upgrade') {
      const { corporationId } = payload
      if (!corporationId) return errorResponse('corporationId required')

      const { data: member } = await admin
        .from('corporation_members').select('role')
        .eq('corporation_id', corporationId).eq('user_id', user.id).single()
      if (!member || member.role !== 'ceo') return errorResponse('Only CEO can upgrade corporation', 403)

      const { data: corp } = await admin.from('corporations').select('bank, member_cap').eq('id', corporationId).single()
      if (!corp) return errorResponse('Corporation not found', 404)

      const upgradeCost = corp.member_cap * 10000  // each slot costs 10k × current cap
      if (parseFloat(corp.bank) < upgradeCost) return errorResponse(`Need $${upgradeCost} in corp bank`)

      await admin.from('corporations').update({
        bank: Math.round((parseFloat(corp.bank) - upgradeCost) * 100) / 100,
        member_cap: corp.member_cap + 5,
      }).eq('id', corporationId)

      return jsonResponse({ success: true, new_member_cap: corp.member_cap + 5, cost: upgradeCost })
    }

    return errorResponse(`Unknown action: ${action}`)

  } catch (err) {
    console.error('[corporation-action]', err)
    return errorResponse('Internal server error', 500)
  }
})
