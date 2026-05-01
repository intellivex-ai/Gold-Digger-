# Test Plan & Critical Paths

## Testing Levels
1. **Unit Tests** – Individual game logic functions.
2. **Integration Tests** – API endpoints, Colyseus room handlers.
3. **End‑to‑End (E2E)** – Simulate complete user flows.
4. **Manual Exploratory** – Edge cases, UI glitches.

## Critical Paths (Must Test)
### Economy
1. Offline earnings: collect after 1 min, 1 hour, 8 hours, 12 hours (cap).
2. Stock buy/sell: verify cash deduction/addition, portfolio update, order validation.
3. Business upgrade: cost deducted, revenue increases exactly by formula.
4. Marketplace: list item, buy from another account, fees applied, item transferred.
5. Hostile takeover: full cycle (initiate, defend, neglect, cooldown).
6. Corporation: create, deposit, profit share calculation accuracy, dissolve.

### Multiplayer Sync
7. Two clients connected simultaneously: action performed on one reflects on other within 500ms.
8. Offline earnings claim on two devices: second attempt blocked.
9. Chat messages appear instantly for all in correct channel.
10. Player trade: order appears in real‑time for other players.

### Monetization
11. Rewarded ad: watch completes, reward granted; ad fails → reward still granted.
12. IAP “Remove Ads”: purchase success, ads vanish, premium flag set.
13. Starter pack: only purchasable once, items delivered.

### Platform
14. Capacitor: deep links open correct screen, push notifications appear.
15. App background/foreground: earnings calculated correctly, no crash.
16. Network interruption: WebSocket reconnects, state resyncs.

## Automation Tools
- **Jest** for unit/integration (Node.js backend).
- **Cypress** for E2E (React UI flows).
- **Colyseus test client** to simulate multiple players.
- **Postman/Newman** for REST API smoke tests.

## Bug Severity Matrix
| Severity | Definition | Examples |
|----------|------------|----------|
| Critical | Blocks core loop or economy broken | Offline earnings not granted, cash duplication exploit |
| High | Major feature unusable | Stock buy button non‑functional, marketplace orders stuck |
| Medium | Significant inconvenience | Incorrect chart rendering, chat delay >5 sec |
| Low | Cosmetic / minor UI | Wrong icon, text overflow |

## Regression Suite
Before every release, run:
- Full offline earnings calculation test (multiple businesses).
- Stock trade with live mock data.
- Player‑to‑player trade flow.
- IAP sandbox purchase.
