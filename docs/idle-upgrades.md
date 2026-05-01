# Idle Earnings & Manager Upgrades

## Offline Efficiency
Base offline earnings are 50% of online rate.  
Upgradeable via **Manager** and **Technology** tiers.

### Manager System
Each business can hire one **Manager**. Manager level 1‑10.
- **Hire Cost**: cash, scaling with business tier.
- **Manager Bonus** (online): multiplies revenue per minute by (1 + 0.05 × managerLevel).  
  e.g., Lv.5 manager → 1.25x revenue.
- **Offline Efficiency Bonus**: managerLevel × 2% added to offline efficiency.  
  e.g., Lv.5 manager → +10% offline (60% total).
- **Max offline efficiency**: 90% (requires Lv.10 manager + tech upgrades).

### Tech Upgrades (Global, Account‑Wide)
| Upgrade | Max Level | Effect | Cost |
|---------|-----------|--------|------|
| Remote Management | 5 | +4% offline efficiency per level | Gems (cosmetic currency) OR large cash + cooldown |
| Cloud Sync | 3 | +1 hour to MAX_OFFLINE cap (8h → 9h → 10h → 12h) | $1M / $5M / $10M |
| AI Assistant | 1 | Auto‑collect offline earnings when app opens (no button tap) | $500k |

## Diminishing Returns on Offline Earnings
To prevent excessive accumulation without interaction, offline earnings above **8 hours** are further reduced:
- 8‑12 hours: earn 50% of normal offline rate for those extra hours.
- >12 hours: no additional earnings (only the AI Assistant upgrade can extend cap).

## Client UI
- Dashboard shows “Offline Earnings Ready” with glowing collect button.
- Tapping triggers coin shower animation and updates balance.
- If AI Assistant purchased, earnings automatically applied and a subtle toast appears.

## Security
- Server‑side timestamp is the sole authority.
- Maximum offline earnings per session capped at 2x player’s total online net worth (anti‑cheat).
