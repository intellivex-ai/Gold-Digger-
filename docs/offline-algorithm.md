# Offline Progression Algorithm & Edge Cases

## Formula
When a player returns (app foregrounded, page loaded), the server calculates:
`timeDiff = min(now - lastCollectedTimestamp, MAX_OFFLINE_MINUTES * 60000)`
// MAX_OFFLINE_MINUTES = 480 (8 hours) – soft cap

`earnings = 0`
`for each business owned by player:`
  `rpm = baseRevenuePerMinute × levelFactor × managerBonus × locationMultiplier`
  `earnings += rpm * timeDiff * OFFLINE_EFFICIENCY`

// OFFLINE_EFFICIENCY = 0.5 (base), can be improved with upgrades up to 0.8

## Implementation Steps (Server)
1. On client connect / action `collect_offline`, server loads `last_collected_at` from DB.
2. Computes earnings using formula.
3. Inserts a `transaction` record: type = `offline_collect`.
4. Updates player’s cash, sets `last_collected_at = now`.
5. Sends `offline:earnings` event to client with amount and minutes away.
6. Client shows coin shower animation, updates Zustand store.

## Edge Cases
- **Time manipulation**: Player sets clock forward. Mitigation: server time only (`NOW()`), never trust client clock.
- **Multiple devices**: Same account open on two devices. Last device to collect wins; other gets no earnings because `last_collected_at` already updated. (Show “already collected” message on second client.)
- **Server downtime**: If server was down for 2 hours, player still receives up to 8 hours of earnings (capped), no loss.
- **New business during offline**: Business added after player went offline should not retroactively earn for the whole period. Implementation: Each business has its own `last_collected_at`? No, simpler: global timestamp, all businesses earn the same periods. If a business is bought mid‑session, set its `last_collected_at` = purchase time, but offline formula uses `min(business_created_at, global_last_collected_at)`.
- **Data type**: Use `DECIMAL(16,2)` in DB to avoid floating point errors.
- **First login**: `last_collected_at` is `created_at`, so first collect yields nothing.

## Client‑Side (Service Worker)
- Not used for actual earnings calculation (security risk).  
- Service Worker is only for:
  - Caching assets for offline access.
  - Background sync of pending actions (future).
  - Push notification: “You’ve earned $25,000 offline! Tap to collect.”
