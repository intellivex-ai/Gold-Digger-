# Feature Spec: Real‑Time Stock Market

## Overview
A fully functional, real‑time stock trading terminal embedded in the game.  
All players share the same price feed from Alpaca Markets (paper trading).

## Screens & Routes
- `/market/stocks` – Watchlist, search, top movers
- `/market/stocks/:symbol` – Detail: chart, fundamentals, buy/sell panel
- `/market/portfolio` – Holdings, P&L, transaction history

## Data Sources
- **Realtime prices**: Alpaca WebSocket (IEX or SIP), connected via Supabase Edge Functions/Node.js → broadcast to all clients via Supabase Realtime
- **Fundamentals**: Alpha Vantage (company overview, income statement)
- **News**: Alpha Vantage News API (optional)

## Trading Mechanics
- Players use in‑game cash (not real money).
- Order types:
  - **Market**: Execute at current price
  - **Limit**: Queue order until price reaches target
  - (Optional) **Options**: Calls/Puts using simplified Black‑Scholes model (future)
- Trade validation (server‑side):
  1. Check player has enough cash
  2. Deduct cash, add shares to player’s portfolio
  3. Log transaction in `transactions` table
- Portfolio updates pushed to client immediately.

## UI Components
- `StockTickerStrip` – Horizontal scrolling marquee on dashboard
- `CandlestickChart` – lightweight‑charts with real‑time candles
- `WatchlistTable` – Sortable, customisable
- `OrderModal` – Quantity slider, market/limit toggle, confirm button
- `PortfolioSummary` – Pie chart of holdings, total P&L

## Edge Cases & Rules
- **Market closed?** – Prices frozen, UI shows “Market Closed” badge.
- **Insufficient cash** – Toast error, button disabled.
- **Duplicate orders** – Debounce buys, disable button while request pending.
- **Data stale** – If WebSocket disconnects, show last known price with warning icon.

## Multiplayer Aspect
- Leaderboards: “Top Trader Today” ranked by % return
- Corp portfolio: Corporation can own shares; dividends go to corp bank.
