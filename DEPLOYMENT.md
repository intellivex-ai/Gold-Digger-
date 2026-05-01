# 🏦 Empire Hub – Backend Deployment Guide

Complete step-by-step instructions to deploy the Supabase backend for Empire Hub.

---

## Prerequisites

| Tool | Minimum version | Install |
|------|----------------|---------|
| Node.js | 18+ | nodejs.org |
| Supabase CLI | 1.170+ | `npm i -g supabase` |
| Docker Desktop | any | docker.com (needed for local dev) |

---

## 1 — Create a Supabase Project

1. Go to **https://supabase.com/dashboard** and click **New Project**.
2. Choose a region close to your users.
3. Copy the following from **Project Settings → API**:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep secret)

---

## 2 — Set Environment Variables

Create `.env` in the project root (copy from `.env.example`):

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

> **Never commit `.env` to git.** The service-role key is only set as a Supabase secret (see step 5).

---

## 3 — Link the Supabase CLI

```bash
# Login (opens browser)
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID
```

---

## 4 — Push Database Migrations

The three migration files in `supabase/migrations/` create:
- All 13 tables with correct numeric types
- Row Level Security policies
- Leaderboard + corporation_stats views
- Helper functions and triggers

```bash
supabase db push
```

Verify in the Supabase dashboard **Table Editor** that all tables are present.

---

## 5 — Set Edge Function Secrets

```bash
# Alpaca Markets (real-time stock data)
supabase secrets set ALPACA_API_KEY=your_alpaca_api_key
supabase secrets set ALPACA_SECRET_KEY=your_alpaca_secret_key
```

> **Note:** If you don't have Alpaca keys, the `update-stock-prices` function  
> automatically falls back to simulated price movements — great for development.

Get free Alpaca keys at: **https://alpaca.markets** (Paper Trading account is free)

---

## 6 — Deploy Edge Functions

```bash
# Deploy all functions at once
supabase functions deploy collect-offline
supabase functions deploy upgrade-business
supabase functions deploy stock-trade
supabase functions deploy marketplace-buy
supabase functions deploy corporation-action
supabase functions deploy update-stock-prices
supabase functions deploy process-takeover
supabase functions deploy send-chat
```

Or deploy all in one shot:
```bash
supabase functions deploy
```

---

## 7 — Enable Realtime

In the Supabase Dashboard → **Database → Replication**:

Enable realtime for these tables (they must be in `supabase_realtime` publication):

| Table | Events |
|-------|--------|
| `stocks` | UPDATE |
| `transactions` | INSERT |
| `marketplace_orders` | INSERT, UPDATE |
| `chat_messages` | INSERT |
| `corporations` | UPDATE |
| `corporation_members` | INSERT, DELETE |
| `global_events` | INSERT, UPDATE |

The migration already runs `ALTER PUBLICATION supabase_realtime ADD TABLE ...` for each table.

---

## 8 — Set Up the Cron Job (Stock Price Updates)

In the Supabase Dashboard → **Database → Extensions**, enable **`pg_cron`**.

Then go to **Database → Cron Jobs** and add:

| Field | Value |
|-------|-------|
| Name | `update-stock-prices` |
| Schedule | `*/5 * * * *` |
| Command | `SELECT net.http_post(url:='https://YOUR_PROJECT_ID.supabase.co/functions/v1/update-stock-prices', headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb)` |

Or use the `supabase/config.toml` cron section which configures this automatically for local dev.

---

## 9 — Run the Frontend

```bash
npm install
npm run dev
```

Visit **http://localhost:5173** — the app will connect to your Supabase backend.

---

## Architecture Overview

```
Browser (React + Zustand)
    │
    ├── @supabase/supabase-js
    │       ├── Auth (email/password)
    │       ├── Realtime (WebSocket channels)
    │       └── PostgREST (direct table reads with RLS)
    │
    └── Edge Functions (Deno)
            ├── collect-offline     ← POST: collect business earnings
            ├── upgrade-business    ← POST: level up a business
            ├── stock-trade         ← POST: buy/sell stocks (market + limit)
            ├── marketplace-buy     ← POST: purchase marketplace listing
            ├── corporation-action  ← POST: create/invite/deposit/withdraw/upgrade corp
            ├── update-stock-prices ← CRON: fetch Alpaca prices every 5 min
            ├── process-takeover    ← POST: hostile takeover state machine
            └── send-chat           ← POST: validated chat with rate limiting
```

---

## Edge Function API Reference

### `POST /functions/v1/collect-offline`
Collects offline business earnings (capped at 8 hours, 50% multiplier).
```json
// Request body: {} (user inferred from JWT)
// Response
{ "earned": 1250.50, "businesses": 3, "minutes": 480 }
```

### `POST /functions/v1/upgrade-business`
```json
// Request
{ "businessId": "uuid" }
// Response
{ "level": 3, "revenue_per_minute": 22.50, "upgrade_cost": 4096.00, "cash": 45320.00 }
```

### `POST /functions/v1/stock-trade`
```json
// Market buy
{ "symbol": "AAPL", "quantity": 10, "side": "buy", "orderType": "market" }
// Limit sell
{ "symbol": "TSLA", "quantity": 5, "side": "sell", "orderType": "limit", "limitPrice": 230.00 }
```

### `POST /functions/v1/marketplace-buy`
```json
{ "orderId": "uuid" }
```

### `POST /functions/v1/corporation-action`
```json
{ "action": "create", "name": "Apex Capital", "tag": "APEX" }
{ "action": "deposit", "corporationId": "uuid", "amount": 5000 }
{ "action": "invite", "corporationId": "uuid", "targetUserId": "uuid" }
{ "action": "withdraw", "corporationId": "uuid", "amount": 2000 }
```

### `POST /functions/v1/process-takeover`
```json
{ "action": "initiate", "businessId": "uuid", "bidAmount": 15000 }
{ "action": "defend", "takeoverId": "uuid" }
{ "action": "execute", "takeoverId": "uuid" }
```

### `POST /functions/v1/send-chat`
```json
{ "message": "Hello!", "channel": "global" }
{ "message": "Corp meeting at 9pm", "channel": "corp" }
{ "message": "GG!", "channel": "dm", "recipientId": "uuid" }
```

---

## Economy Balancing

| Parameter | Value | Notes |
|-----------|-------|-------|
| Starting cash | $10,000 | Per new user |
| Offline cap | 8 hours | Beyond this, earnings stop |
| Offline multiplier | 50% | Online earns 2× faster |
| Stock platform fee | 0.1% | Per trade |
| Marketplace fee | 5% | Charged to buyer; seller nets 95% |
| Corp creation cost | $5,000 | Deducted from founder's cash |
| Takeover initiation fee | 10% of bid | Non-refundable |
| Min takeover bid | 150% of upgrade_cost | Prevents low-ball attacks |
| Defense window | 24 hours | Target can pay bid to cancel |
| Revenue growth | `base_rpm × level × 1.5` | Linear with level |
| Upgrade cost growth | `base_cost × 1.6^(level-1)` | Exponential curve |

---

## Rate Limits (per user)

| Action | Limit |
|--------|-------|
| Stock trades | 30 / minute |
| Business upgrades | 20 / minute |
| Marketplace buys | 10 / minute |
| Chat messages | 10 / 10 seconds |

---

## Local Development (without Supabase cloud)

```bash
# Start local Supabase stack (requires Docker)
supabase start

# Apply migrations locally
supabase db reset

# Serve edge functions locally
supabase functions serve --env-file .env.local

# Run frontend
npm run dev
```

Local URLs:
- Studio: http://localhost:54323
- API: http://localhost:54321
- Functions: http://localhost:54321/functions/v1/

---

## Troubleshooting

**"relation does not exist"** — Run `supabase db push` to apply migrations.

**Functions return 401** — Make sure `VITE_SUPABASE_ANON_KEY` in `.env` is correct.

**No stock price updates** — Check that the cron job is running. You can manually trigger it:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/update-stock-prices \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Realtime not working** — Verify that the tables are added to the `supabase_realtime` publication in the dashboard.

**Corp actions return "already in a corporation"** — The profile's `corporation_id` is stale. Check the `profiles` table directly.
