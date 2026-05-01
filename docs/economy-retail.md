# Economy Balance: Retail Vertical

## Basic Formula
**Revenue per minute** = BaseRevenue × (Level^1.2) × ManagerBonus × LocationMultiplier

### Base Revenue Table (Coffee Shop)
| Level | Revenue/min | Upgrade Cost |
|-------|-------------|--------------|
| 1     | $2.00       | $1,200       |
| 5     | $5.78       | $8,500       |
| 10    | $12.57      | $38,000      |
| 25    | $52.85      | $520,000     |
| 50    | $145.20     | $4.2M        |

**Manager Bonus**: 1.0 (no manager) → 1.5 (max level manager)
**Location Multiplier**: 1.0 (suburb) → 2.0 (downtown prime)

## Idle Earnings
When player returns, calculate:
`offlineMinutes = min( (now - lastCollectedAt) / 60000, maxOfflineCap)`
`earned = offlineMinutes × revenuePerMinute × offlineEfficiency (0.5 base)`

## Upgrade Paths
- **Staff training** (+5% revenue/level, max 10)
- **Marketing** (+10% customer flow)
- **Inventory expansion** (unlocks new product tiers)
- **Renovation** (raises location multiplier)

## Integration with Multiplayer
- Players can sell surplus inventory on marketplace.
- Competitor stores nearby reduce revenue by 5% per rival (capped at 30%).

## Anti‑Inflation Controls
- Upgrade costs grow exponentially; late‑game requires reinvestment or loans.
- Global events (recession) temporarily lower all retail revenue.
