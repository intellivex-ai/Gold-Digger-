# Monetization Design Doc

## Principles
- **Fair‑to‑play**: No pay‑to‑win; all progress can be earned without spending.
- **Rewarded ads only**: Opt‑in, never forced interstitial or video on app open.
- **Single premium IAP**: Remove all ads forever.
- **Cosmetics only**: No competitive advantage.

---

## Ad Implementation (Rewarded)
Using `@capacitor-community/admob` (Capacitor plugin) or web SDK.

### Ad Placements
| Trigger | Reward | Cooldown |
|---------|--------|----------|
| Dashboard “2x Boost” button | Double passive income for 1 hour | 4 hours |
| Business upgrade screen “Free Cash” button | Instant cash ($500 * player level) | 6 hours |
| Stock market “Stock Tip” button | Reveal a “hot stock” (random +5% chance of big mover) | 8 hours |
| Offline earnings collection screen “Double It!” | Double the offline earnings just collected | Once per day |

### Ad Unit Configuration
- Type: Rewarded Video (30 sec max).
- Fallback: If ad not filled, still grant reward (player never punished).
- Track `ad_watch_count` per user daily for analytics.

---

## In‑App Purchases (IAP)

### Product #1: Remove Ads (One‑time, $4.99)
- Removes all rewarded ad buttons and any future ads.
- Unlocks a permanent 10% revenue bonus as a thank‑you.
- Immediately grants 500 premium gems (see below).

### Product #2: Premium Gems (Consumable, optional)
- **Gems currency**: Used for cosmetic items only.
- Packs:
  - Sack of Gems (100 gems) – $0.99
  - Chest of Gems (600 gems) – $4.99
  - Vault of Gems (1500 gems) – $9.99
- Gems are NOT usable for business upgrades, cash, or stocks. Strictly for:
  - Avatar frames, profile badges, custom username colors, corporate logo customization, exclusive watch skins.

### Product #3: Starter Pack (One‑time, $1.99)
- 50,000 in‑game cash (enough for 1‑2 early upgrades).
- Unique “Founder” badge on profile.
- Available only for first 24 hours after account creation.

---

## No Pay‑to‑Win Guarantees
- Cash packs never sold.
- Stock market is equal for all; no premium data feed.
- Upgrades cannot be sped up with premium currency.
- Corporation perks are purely cosmetic.

---

## Analytics Events
- `ad_impression`, `ad_reward_granted`
- `purchase_initiated`, `purchase_completed`
- `premium_feature_used` (if any)
- ARPU, ARPPU tracked via Firebase Analytics.
