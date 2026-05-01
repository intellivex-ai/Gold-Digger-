# Global Event Framework

## Concept
Server‑wide events that temporarily alter the game’s economy for all players, creating coordinated challenges and opportunities.

## Trigger System
Events are triggered by:
1. **Scheduled** – e.g., every Friday 18:00 UTC a “Market Crash” may occur.
2. **Threshold‑based** – if total player cash surpasses $10 billion, trigger “Inflation Crisis”.
3. **Manual (admin)** – for live ops testing.

## Event Lifecycle
1. **Warning Phase** (30 min before) – notification: “Rumors of an oil shortage…”
2. **Active Phase** (2‑24 hours) – modifiers applied.
3. **Recovery Phase** (1 hour) – modifiers gradually fade back to normal.

## Example Event Templates

### 1. Oil Crash
- **Modifiers**: All manufacturing businesses produce 70% less. Fuel costs raise shipping expenses by 50%.
- **Opportunity**: Oil stocks crash 30% (temporary), high risk/reward.
- **Player Alert**: “⛽ Oil Crisis! Manufacturing slowed, energy stocks volatile.”

### 2. Tech Boom
- **Modifiers**: Tech startup valuations double, IPO returns +200%.
- **Opportunity**: Tech businesses earn 2x revenue for 4 hours.
- **Alert**: “💻 Tech Boom! Startup investments soar.”

### 3. Housing Bubble Burst
- **Modifiers**: Real estate values drop 25%, rental income halved.
- **Opportunity**: Buying properties at discount, prices recover after 48h.
- **Alert**: “🏠 Housing Market Crash! Buy low?”

### 4. Global Recession
- **Modifiers**: All businesses earn 40% less, stock market down 15%.
- **Safe Haven**: Gold commodities rise 20%.
- **Alert**: “📉 Recession! Consumers tighten belts.”

## Notification Types
- **Push notification** (if opted in) – 30 min warning.
- **In‑game banner** on dashboard during all phases.
- **Sound effect** (optional) on start.

## Economic Balancing Rules
- Events never reduce a single player’s cash directly; only income streams.
- No event forces loss of assets.
- Recovery always restores normal values, no permanent damage.

## Admin Panel (Future)
- Create custom events with modifier sliders.
- Schedule one‑off or recurring events.
- View participation metrics.
