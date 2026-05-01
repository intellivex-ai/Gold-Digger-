// supabase/functions/stock-trade/index.ts
// POST – Buy or sell stocks (market or limit orders).
//
// Body:
//   { symbol, quantity, side: 'buy'|'sell', orderType: 'market'|'limit', limitPrice?: number }
//
// Market orders:
//   - Buy:  deduct cash, upsert portfolio with updated avg_price via VWAP formula.
//   - Sell: check holdings, credit cash, decrease portfolio quantity.
//
// Limit orders:
//   - Insert a row into limit_orders; cron will process when price matches.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getAdminClient, getAuthUser, checkRateLimit } from '../_shared/supabaseAdmin.ts'

const PLATFORM_FEE_RATE = 0.001  // 0.1 % platform fee on each trade

serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    // ── Auth ─────────────────────────────────────────────────
    const user = await getAuthUser(req)
    if (!user) return errorResponse('Unauthorized', 401)

    const admin = getAdminClient()

    // ── Rate limit: 30 trades per minute ────────────────────
    const allowed = await checkRateLimit(admin, user.id, 'stock-trade', 30, 60)
    if (!allowed) return errorResponse('Too many requests – slow down!', 429)

    // ── Parse body ───────────────────────────────────────────
    const body = await req.json().catch(() => null)
    const { symbol, quantity, side, orderType = 'market', limitPrice } = body ?? {}

    if (!symbol || !quantity || !side) return errorResponse('symbol, quantity, and side are required')
    if (!['buy', 'sell'].includes(side)) return errorResponse('side must be "buy" or "sell"')
    if (!['market', 'limit'].includes(orderType)) return errorResponse('orderType must be "market" or "limit"')
    if (quantity <= 0 || !Number.isInteger(quantity)) return errorResponse('quantity must be a positive integer')

    // ── Fetch stock ──────────────────────────────────────────
    const { data: stock, error: stockErr } = await admin
      .from('stocks')
      .select('symbol, price')
      .eq('symbol', symbol.toUpperCase())
      .single()

    if (stockErr || !stock) return errorResponse(`Stock ${symbol} not found`, 404)

    // ── Limit order: store and return early ──────────────────
    if (orderType === 'limit') {
      if (!limitPrice || limitPrice <= 0) return errorResponse('limitPrice is required for limit orders')
      await admin.from('limit_orders').insert({
        user_id: user.id,
        symbol: stock.symbol,
        quantity,
        limit_price: limitPrice,
        side,
      })
      return jsonResponse({ status: 'limit_order_created', symbol: stock.symbol, quantity, limitPrice, side })
    }

    // ══════════════════════════════════════════════════════════
    // MARKET ORDER processing
    // ══════════════════════════════════════════════════════════
    const currentPrice = parseFloat(stock.price)
    const fee = Math.round(currentPrice * quantity * PLATFORM_FEE_RATE * 100) / 100
    const grossAmount = Math.round(currentPrice * quantity * 100) / 100
    const totalCost   = Math.round((grossAmount + fee) * 100) / 100  // for buys
    const netProceeds = Math.round((grossAmount - fee) * 100) / 100  // for sells

    // ── Fetch profile ────────────────────────────────────────
    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('id, cash')
      .eq('id', user.id)
      .single()

    if (profErr || !profile) return errorResponse('Profile not found', 404)
    const currentCash = parseFloat(profile.cash)

    // ── Fetch existing portfolio position ────────────────────
    const { data: position } = await admin
      .from('portfolios')
      .select('quantity, avg_price')
      .eq('user_id', user.id)
      .eq('symbol', stock.symbol)
      .maybeSingle()

    // ══ BUY ══════════════════════════════════════════════════
    if (side === 'buy') {
      if (currentCash < totalCost) {
        return errorResponse(`Insufficient cash. Need $${totalCost.toFixed(2)}, have $${currentCash.toFixed(2)}`)
      }

      // VWAP average price calculation
      const existingQty   = position?.quantity ?? 0
      const existingAvg   = parseFloat(position?.avg_price ?? '0')
      const newTotalQty   = existingQty + quantity
      const newAvgPrice   = Math.round(
        ((existingQty * existingAvg) + (quantity * currentPrice)) / newTotalQty * 100
      ) / 100

      const newCash = Math.round((currentCash - totalCost) * 100) / 100

      // Upsert portfolio
      const { error: portErr } = await admin.from('portfolios').upsert({
        user_id: user.id,
        symbol: stock.symbol,
        quantity: newTotalQty,
        avg_price: newAvgPrice,
      }, { onConflict: 'user_id,symbol' })

      if (portErr) return errorResponse('Failed to update portfolio', 500)

      const { error: cashErr } = await admin
        .from('profiles').update({ cash: newCash }).eq('id', user.id)

      if (cashErr) return errorResponse('Failed to deduct cash', 500)

      await admin.from('transactions').insert({
        user_id: user.id,
        type: 'stock_buy',
        amount: -totalCost,
        description: `Bought ${quantity}x ${stock.symbol} @ $${currentPrice} (fee: $${fee})`,
      })

      return jsonResponse({
        side: 'buy',
        symbol: stock.symbol,
        quantity,
        price: currentPrice,
        fee,
        total: totalCost,
        new_cash: newCash,
        new_quantity: newTotalQty,
        avg_price: newAvgPrice,
      })
    }

    // ══ SELL ═════════════════════════════════════════════════
    if (!position || position.quantity < quantity) {
      return errorResponse(`Insufficient shares. Have ${position?.quantity ?? 0}, want to sell ${quantity}`)
    }

    const newQty  = position.quantity - quantity
    const newCash = Math.round((currentCash + netProceeds) * 100) / 100

    if (newQty === 0) {
      await admin.from('portfolios').delete().eq('user_id', user.id).eq('symbol', stock.symbol)
    } else {
      await admin.from('portfolios').update({ quantity: newQty }).eq('user_id', user.id).eq('symbol', stock.symbol)
    }

    await admin.from('profiles').update({ cash: newCash }).eq('id', user.id)

    await admin.from('transactions').insert({
      user_id: user.id,
      type: 'stock_sell',
      amount: netProceeds,
      description: `Sold ${quantity}x ${stock.symbol} @ $${currentPrice} (fee: $${fee})`,
    })

    const costBasis   = parseFloat(position.avg_price) * quantity
    const profitLoss  = Math.round((netProceeds - costBasis) * 100) / 100

    return jsonResponse({
      side: 'sell',
      symbol: stock.symbol,
      quantity,
      price: currentPrice,
      fee,
      proceeds: netProceeds,
      profit_loss: profitLoss,
      new_cash: newCash,
      new_quantity: newQty,
    })

  } catch (err) {
    console.error('[stock-trade]', err)
    return errorResponse('Internal server error', 500)
  }
})
