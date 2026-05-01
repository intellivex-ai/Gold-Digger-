# Hostile Takeover Mechanics

## Overview
Players can attempt to forcibly purchase a rival’s business, bypassing the normal marketplace.  
High‑risk, high‑reward, reputation‑damaging.

## Eligibility
- Target business must be **level 10+**.
- Target player must have **Reputation ≤ 30** (no attacking “Paragons”).
- Attacker must not be in the same corporation.
- Attacker must have cash exceeding 150% of business’s **market value**.

## Takeover Process
1. **Initiation**: Attacker selects business, pays a non‑refundable **hostile intent fee** = 5% of business value.
2. **Defense Phase** (24‑48 hours):
   - Target receives notification: “⚠️ Hostile takeover attempt on [Business Name]!”
   - Target can:
     - **Pay defense fee** = 10% of business value (one‑time) → cancels takeover (attacker loses intent fee).
     - **Counter‑bid**: Offer to buy out the attacker’s option by paying 25% above market value. If attacker accepts, business stays, target pays.
     - **Neglect**: do nothing → takeover executes.
3. **Execution**: After timer, if not defended:
   - Business transfers to attacker.
   - Attacker pays **130% of market value** (the intent fee is credited toward this).
   - Target receives 100% of market value (forced sale) – they lose the business but get compensated.
   - Attacker loses **15 reputation**, target gains +5 (sympathy).
   - Both players get a 7‑day cooldown for takeovers (attacker cannot initiate, target cannot be targeted again).

## Cooldowns & Limits
- Attacker can only attempt 1 takeover per 7 days.
- Target cannot be targeted again for 14 days after a successful or defended takeover.
- Maximum 3 pending takeover attempts per server (to prevent spam).

## UI & Notifications
- Dedicated screen: `/takeover/:businessId` with risk/reward breakdown.
- All corp members see a corp‑wide alert if a member is targeted.
- Leaderboard impact: successful hostile takeovers are tracked and displayed on a “Corporate Raider” leaderboard.

## Fairness & Anti‑Griefing
- Low‑level players (< character level 20) are immune.
- If target hasn’t logged in for 7+ days, takeover disabled (inactive protection).
- Admin tools to revert malicious takeovers if exploits found.
