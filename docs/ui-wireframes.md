# UI Wireframes (Text‑Based)

All screens are built with React components. Layout uses a bottom tab bar (5 icons).
Dark theme, high contrast, large touch targets.

---

## Tab 1: Dashboard
**Route**: `/`
```text
┌─────────────────────────────────┐
│ 💰 Net Worth $2,450,120         │
│ ⬆ +12,400 today                 │
│                                 │
│ 📈 Stock Ticker Strip (auto)    │
│ [AAPL +1.2%] [TSLA -0.8%] ...   │
│                                 │
│ ⏱️ Quick Collect                │
│ [💵 Collect $3,420]             │
│ 📊 Passive Income: $540/min     │
│ ▓▓▓▓▓▓░░░░ 68% to next tier     │
│                                 │
│ 🔔 Alerts                       │
│ • Oil price crash!              │
│ • Your listing sold             │
└─────────────────────────────────┘
```

---

## Tab 2: Businesses
**Route**: `/businesses`
```text
┌─────────────────────────────────┐
│ Your Empire                     │
│ ┌──────────────────────────┐    │
│ │ ☕ Coffee Shop Lv.12     │    │
│ │ Revenue: $340/min        │    │
│ │               > Manage   │    │
│ └──────────────────────────┘    │
│                                 │
│ ┌──────────────────────────┐    │
│ │ 🏢 Downtown Office Lv.5  │    │
│ │ Rent: $1,200/min         │    │
│ │               > Manage   │    │
│ └──────────────────────────┘    │
│ [ + Buy New Business ]          │
└─────────────────────────────────┘
```

**Business Detail** (e.g., Coffee Shop): `/business/:id`
```text
┌─────────────────────────────────┐
│ ☕ Coffee Shop (Lv.12)          │
│ 📈 Revenue: $340/min            │
│ 💵 Upgrade: $28,500             │
│ [⬆️ Upgrade]                    │
│                                 │
│ 👥 Staff Training Lv.4          │
│ 📣 Marketing Lv.2               │
│ 📦 Inventory Lv.5               │
│ 🛋️ Renovation: Suburb (1.2x)    │
│                                 │
│ 📊 Profit History (chart)       │
└─────────────────────────────────┘
```

---

## Tab 3: Market
Subtabs: Stocks, Crypto, Player Trade.
**Route**: `/market`

### Stocks Tab
```text
┌─────────────────────────────────┐
│ 🔍 Search symbol...             │
│ ┌─────────┬────────┬────────┐   │
│ │ Symbol  │ Price  │ Chg%   │   │
│ ├─────────┼────────┼────────┤   │
│ │ AAPL    │ 178.23 │ +1.23% │   │
│ │ TSLA    │ 245.10 │ -0.87% │   │
│ └─────────┴────────┴────────┘   │
│ [AAPL Detail] →                 │
│                                 │
│ [+] Add to Watchlist            │
└─────────────────────────────────┘
```

**Stock Detail**: `/market/stocks/:symbol`
```text
┌─────────────────────────────────┐
│ AAPL $178.23 ⬆️ +1.23%           │
│ [📈 Candlestick Chart]          │
│ [BUY] [SELL] [ADD ALERT]        │
└─────────────────────────────────┘
```

### Player Trade Tab
**Route**: `/market/player-trade`
```text
┌─────────────────────────────────┐
│ Player Marketplace              │
│ [Sell Item] [Buy Orders]        │
│ ┌──────────────────────────┐    │
│ │ Steel x100    $12 each   │    │
│ │ Seller: TycoonJoe [Buy]  │    │
│ └──────────────────────────┘    │
│                                 │
│ ┌──────────────────────────┐    │
│ │ Smartphone x5 $450 each  │    │
│ │ Seller: TechGuru [Buy]   │    │
│ └──────────────────────────┘    │
└─────────────────────────────────┘
```

---

## Tab 4: Social
Subtabs: Corporation, Leaderboard, Chat.
**Route**: `/social`

### Corporation
```text
┌─────────────────────────────────┐
│ 🏢 MegaCorp (CEO: You)          │
│ Bank: $1,200,000                │
│ Members: 12/20                  │
│ ┌──────────────────────────┐    │
│ │ Player     Role   Contr. │    │
│ │ TycoonJoe  CFO    +45k   │    │
│ │ ...                      │    │
│ └──────────────────────────┘    │
│ [Invite Player] [Deposit]       │
└─────────────────────────────────┘
```

### Chat (Global)
```text
┌─────────────────────────────────┐
│ 💬 Global Chat                  │
│ TycoonJoe: Selling steel cheap  │
│ TechGuru: Anyone hiring?        │
│ > [Message input box]           │
└─────────────────────────────────┘
```

---

## Tab 5: Profile
**Route**: `/character`
```text
┌─────────────────────────────────┐
│ 👤 Profile                      │
│ Lv.48 Tycoon                    │
│ Reputation: Trusted (85)        │
│                                 │
│ 🏠 House: Luxury Penthouse      │
│ 🚗 Car: Tesla Model S           │
│ ⌚ Watch: Gold Rolex            │
│ [Equip/Shop]                    │
│                                 │
│ 🏆 Achievements                 │
│ • First Million                 │
│ • 100 Trades                    │
└─────────────────────────────────┘
```
