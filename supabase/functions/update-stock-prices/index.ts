// supabase/functions/update-stock-prices/index.ts
// CRON – Runs every 5 minutes via Supabase Cron Jobs.
// Fetches real-time quotes from Alpaca Markets API and updates the stocks table.
// Realtime will automatically push changes to subscribed clients.
//
// Schedule (set in Supabase dashboard or supabase/config.toml):
//   */5 * * * *
//
// Secrets required:
//   ALPACA_API_KEY
//   ALPACA_SECRET_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'

const ALPACA_BASE_URL = 'https://data.alpaca.markets/v2'

interface AlpacaBar {
  t: string   // timestamp
  o: number   // open
  h: number   // high
  l: number   // low
  c: number   // close (current price)
  v: number   // volume
}

interface AlpacaBarsResponse {
  bars: Record<string, AlpacaBar[]>
}

// Fallback: simulate small price movements if Alpaca is unavailable
function simulatePriceChange(currentPrice: number): { price: number; changePercent: number } {
  // Random walk: ±2% per tick
  const changePercent = (Math.random() - 0.48) * 2  // slight upward bias
  const newPrice = Math.max(1, currentPrice * (1 + changePercent / 100))
  return {
    price: Math.round(newPrice * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
  }
}

serve(async (req: Request) => {
  // Allow both GET (cron scheduler) and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const admin  = getAdminClient()
    const apiKey = Deno.env.get('ALPACA_API_KEY')
    const secret = Deno.env.get('ALPACA_SECRET_KEY')

    // ── Fetch all tracked symbols ─────────────────────────────
    const { data: stocks, error: stocksErr } = await admin
      .from('stocks')
      .select('symbol, price, change_percent')

    if (stocksErr || !stocks?.length) {
      return errorResponse('No stocks in database', 500)
    }

    const symbols = stocks.map((s) => s.symbol)
    const updates: { symbol: string; price: number; change_percent: number; volume: number }[] = []

    // ── Try Alpaca ────────────────────────────────────────────
    if (apiKey && secret) {
      try {
        const symbolsParam = symbols.join(',')
        const url = `${ALPACA_BASE_URL}/stocks/bars/latest?symbols=${symbolsParam}&feed=iex`

        const alpacaRes = await fetch(url, {
          headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': secret,
          },
        })

        if (alpacaRes.ok) {
          const alpacaData: AlpacaBarsResponse = await alpacaRes.json()

          for (const stock of stocks) {
            const bars = alpacaData.bars?.[stock.symbol]
            if (bars && bars.length > 0) {
              const latest = bars[bars.length - 1]
              const newPrice = Math.round(latest.c * 100) / 100
              const oldPrice = parseFloat(stock.price)
              const changePercent = oldPrice > 0
                ? Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100
                : 0

              updates.push({
                symbol: stock.symbol,
                price: newPrice,
                change_percent: changePercent,
                volume: latest.v ?? 0,
              })
            } else {
              // Symbol not in response – simulate movement
              const sim = simulatePriceChange(parseFloat(stock.price))
              updates.push({ symbol: stock.symbol, ...sim, volume: 0 })
            }
          }
        } else {
          throw new Error(`Alpaca API returned ${alpacaRes.status}`)
        }
      } catch (alpacaErr) {
        console.warn('[update-stock-prices] Alpaca unavailable, using simulation:', alpacaErr)
        // Fall through to simulation
        for (const stock of stocks) {
          const sim = simulatePriceChange(parseFloat(stock.price))
          updates.push({ symbol: stock.symbol, ...sim, volume: 0 })
        }
      }
    } else {
      // No API keys configured – simulate price movement for development
      console.log('[update-stock-prices] No Alpaca keys found – simulating price changes')
      for (const stock of stocks) {
        const sim = simulatePriceChange(parseFloat(stock.price))
        updates.push({ symbol: stock.symbol, ...sim, volume: 0 })
      }
    }

    // ── Batch update stocks table ─────────────────────────────
    const now = new Date().toISOString()
    const upsertPayload = updates.map((u) => ({
      symbol: u.symbol,
      price: u.price,
      change_percent: u.change_percent,
      volume: u.volume,
      updated_at: now,
    }))

    const { error: upsertErr } = await admin
      .from('stocks')
      .upsert(upsertPayload, { onConflict: 'symbol' })

    if (upsertErr) {
      console.error('[update-stock-prices] DB upsert failed:', upsertErr)
      return errorResponse('Failed to update stocks', 500)
    }

    // ── Process pending limit orders ──────────────────────────
    await processLimitOrders(admin, updates)

    return jsonResponse({
      updated: updates.length,
      symbols: updates.map((u) => u.symbol),
      timestamp: now,
    })

  } catch (err) {
    console.error('[update-stock-prices]', err)
    return errorResponse('Internal server error', 500)
  }
})

/** Check if any pending limit orders can be filled at the new prices */
async function processLimitOrders(
  admin: ReturnType<typeof getAdminClient>,
  priceUpdates: { symbol: string; price: number }[],
) {
  const priceMap = new Map(priceUpdates.map((u) => [u.symbol, u.price]))

  const { data: orders } = await admin
    .from('limit_orders')
    .select('*')
    .eq('status', 'pending')
    .lt('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())

  if (!orders?.length) return

  for (const order of orders) {
    const currentPrice = priceMap.get(order.symbol)
    if (!currentPrice) continue

    const shouldFill =
      (order.side === 'buy' && currentPrice <= parseFloat(order.limit_price)) ||
      (order.side === 'sell' && currentPrice >= parseFloat(order.limit_price))

    if (!shouldFill) continue

    // Expired?
    if (new Date(order.expires_at) < new Date()) {
      await admin.from('limit_orders').update({ status: 'expired' }).eq('id', order.id)
      continue
    }

    // Execute the limit order via the same logic as market order
    // (Simplified: direct DB ops since we're already service-role)
    const { data: profile } = await admin.from('profiles').select('cash').eq('id', order.user_id).single()
    if (!profile) continue

    const cash = parseFloat(profile.cash)
    const cost = currentPrice * order.quantity

    if (order.side === 'buy') {
      if (cash < cost) {
        await admin.from('limit_orders').update({ status: 'cancelled' }).eq('id', order.id)
        continue
      }
      const { data: pos } = await admin
        .from('portfolios').select('quantity, avg_price')
        .eq('user_id', order.user_id).eq('symbol', order.symbol).maybeSingle()
      const newQty = (pos?.quantity ?? 0) + order.quantity
      const newAvg = Math.round(
        (((pos?.quantity ?? 0) * parseFloat(pos?.avg_price ?? '0')) + (order.quantity * currentPrice)) / newQty * 100
      ) / 100
      await admin.from('portfolios').upsert({ user_id: order.user_id, symbol: order.symbol, quantity: newQty, avg_price: newAvg }, { onConflict: 'user_id,symbol' })
      await admin.from('profiles').update({ cash: Math.round((cash - cost) * 100) / 100 }).eq('id', order.user_id)
    } else {
      const { data: pos } = await admin
        .from('portfolios').select('quantity')
        .eq('user_id', order.user_id).eq('symbol', order.symbol).maybeSingle()
      if (!pos || pos.quantity < order.quantity) {
        await admin.from('limit_orders').update({ status: 'cancelled' }).eq('id', order.id)
        continue
      }
      const newQty = pos.quantity - order.quantity
      if (newQty === 0) {
        await admin.from('portfolios').delete().eq('user_id', order.user_id).eq('symbol', order.symbol)
      } else {
        await admin.from('portfolios').update({ quantity: newQty }).eq('user_id', order.user_id).eq('symbol', order.symbol)
      }
      await admin.from('profiles').update({ cash: Math.round((cash + cost) * 100) / 100 }).eq('id', order.user_id)
    }

    await admin.from('limit_orders').update({ status: 'filled' }).eq('id', order.id)
    await admin.from('transactions').insert({
      user_id: order.user_id,
      type: order.side === 'buy' ? 'stock_buy' : 'stock_sell',
      amount: order.side === 'buy' ? -cost : cost,
      description: `Limit order filled: ${order.side.toUpperCase()} ${order.quantity}x ${order.symbol} @ $${currentPrice}`,
    })
  }
}
