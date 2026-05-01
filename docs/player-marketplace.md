# Player Marketplace Rules

## Overview
A player-driven auction house for in-game resources and assets. No NPC intervention; prices set entirely by players.

## Listings
- **Item types**: Raw materials (steel, grain), manufactured goods (smartphones, cars), business deeds (sell an entire business), corporation shares (see Corp doc).
- **Order format**: Fixed-price sell order with quantity. No bidding in v1.
- **Fees**: 5% transaction fee deducted from seller’s proceeds (deflationary sink).

## Trading Logic (Server‑Side)
1. Seller creates a listing: item removed from seller inventory, placed in escrow.
2. Buyer sees listing in marketplace UI, taps “Buy”.
3. Server verifies:
   - Buyer has enough cash.
   - Listing still active.
   - Buyer is not the seller.
4. Transaction executed:
   - Cash moved from buyer’s wallet, fee taken, remainder to seller.
   - Item transferred to buyer.
   - Listing removed or quantity reduced.
5. If listing expires (e.g., 7 days), item returned to seller, no fee.

## Order Matching
- If multiple sellers list the same item, UI shows cheapest first.
- No partial fills: quantity must match exactly. (Future: fractional buys)

## Security & Anti‑Fraud
- Duplicate order prevention: server enforces idempotency keys.
- Price manipulation protection: a player cannot buy their own listing via an alt. (Detect same IP / deviceID, flag for review.)
- Rate limiting: max 10 order creations per minute.

## Edge Cases
- **Business sale**: Selling a business transfers all upgrades and staff. If it has debt, debt transfers (future).
- **Inventory full**: Buyer cannot purchase if their storage capacity is reached (for physical goods).
- **Server restart**: All active listings persist in PostgreSQL, restored on boot.
