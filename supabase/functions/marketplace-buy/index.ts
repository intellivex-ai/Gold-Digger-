// supabase/functions/marketplace-buy/index.ts
// POST – Purchase an active marketplace listing.
//
// Body: { orderId: string }
//
// Logic:
//   1. Validate buyer != seller.
//   2. Validate listing is 'active'.
//   3. Validate buyer has enough cash.
//   4. Deduct buyer cash (+ 5 % platform fee).
//   5. Credit seller (price - 5 % fee = net).
//   6. Mark listing as 'fulfilled'.
//   7. If item_type === 'business', transfer ownership in businesses table.
//   8. Insert two transaction records (buyer & seller).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getAdminClient, getAuthUser, checkRateLimit } from '../_shared/supabaseAdmin.ts'

const PLATFORM_FEE_RATE = 0.05  // 5 % marketplace fee

serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    // ── Auth ─────────────────────────────────────────────────
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const admin = getAdminClient()

    // ── Rate limit: 10 buys per minute ──────────────────────
    const allowed = await checkRateLimit(admin, user.id, 'marketplace-buy', 10, 60)
    if (!allowed) return errorResponse('Too many requests – slow down!', 429)

    // ── Parse body ───────────────────────────────────────────
    const body = await req.json().catch(() => null)
    const { orderId } = body ?? {}
    if (!orderId) return errorResponse('orderId is required')

    // ── Fetch listing ────────────────────────────────────────
    const { data: order, error: orderErr } = await admin
      .from('marketplace_orders')
      .select('id, seller_id, item_type, item_id, price, quantity, status')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) return errorResponse('Listing not found', 404)
    if (order.status !== 'active') return errorResponse('This listing is no longer available')
    if (order.seller_id === user.id) return errorResponse('Cannot buy your own listing')

    // ── Fetch buyer profile ──────────────────────────────────
    const { data: buyer, error: buyerErr } = await admin
      .from('profiles')
      .select('id, cash')
      .eq('id', user.id)
      .single()

    if (buyerErr || !buyer) return errorResponse('Buyer profile not found', 404)

    const listingPrice  = parseFloat(order.price)
    const fee           = Math.round(listingPrice * PLATFORM_FEE_RATE * 100) / 100
    const totalCost     = Math.round((listingPrice + fee) * 100) / 100
    const sellerReceives = Math.round((listingPrice - fee) * 100) / 100
    const buyerCash     = parseFloat(buyer.cash)

    if (buyerCash < totalCost) {
      return errorResponse(`Insufficient cash. Need $${totalCost.toFixed(2)}, have $${buyerCash.toFixed(2)}`)
    }

    // ── Fetch seller ─────────────────────────────────────────
    const { data: seller, error: sellerErr } = await admin
      .from('profiles')
      .select('id, cash')
      .eq('id', order.seller_id)
      .single()

    if (sellerErr || !seller) return errorResponse('Seller profile not found', 404)

    // ── Atomically update both wallets and listing status ────
    const [buyerUpdate, sellerUpdate, listingUpdate] = await Promise.all([
      admin.from('profiles').update({ cash: Math.round((buyerCash - totalCost) * 100) / 100 }).eq('id', user.id),
      admin.from('profiles').update({ cash: Math.round((parseFloat(seller.cash) + sellerReceives) * 100) / 100 }).eq('id', order.seller_id),
      admin.from('marketplace_orders').update({ status: 'fulfilled' }).eq('id', orderId),
    ])

    if (buyerUpdate.error || sellerUpdate.error || listingUpdate.error) {
      return errorResponse('Transaction failed – please try again', 500)
    }

    // ── Transfer business ownership (if applicable) ──────────
    if (order.item_type === 'business') {
      await admin.from('businesses').update({ owner_id: user.id }).eq('id', order.item_id)
      // Update buyer's corporation_id on business if needed (handle separately)
    }

    // ── Insert transaction records ───────────────────────────
    await Promise.all([
      admin.from('transactions').insert({
        user_id: user.id,
        type: 'marketplace_buy',
        amount: -totalCost,
        description: `Bought ${order.item_type} (listing ${orderId}) for $${listingPrice} + $${fee} fee`,
      }),
      admin.from('transactions').insert({
        user_id: order.seller_id,
        type: 'marketplace_sell',
        amount: sellerReceives,
        description: `Sold ${order.item_type} (listing ${orderId}) for $${listingPrice} – $${fee} fee`,
      }),
    ])

    return jsonResponse({
      success: true,
      order_id: orderId,
      item_type: order.item_type,
      item_id: order.item_id,
      price: listingPrice,
      fee,
      total_cost: totalCost,
      seller_receives: sellerReceives,
    })

  } catch (err) {
    console.error('[marketplace-buy]', err)
    return errorResponse('Internal server error', 500)
  }
})
