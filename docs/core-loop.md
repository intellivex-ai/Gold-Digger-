# Core Loop Diagram (Text)

┌─────────────────────────────────────────────────────────────┐
│                          START                              │
│                    (Push notification /                      │
│                      App icon tap)                           │
└─────────────┬───────────────────────────────────────────────┘
              ▼
    ┌──────────────────┐
    │    LOGIN / LOAD  │
    └────────┬─────────┘
             ▼
    ┌────────────────────────┐
    │  COLLECT OFFLINE CASH  │  ← Coin shower animation
    └────────┬───────────────┘
             ▼
    ┌────────────────────────────────────┐
    │        DASHBOARD OVERVIEW          │
    │  Net Worth, Income, Quick Actions  │
    └──┬─────────┬──────────┬────────────┘
       ▼         ▼          ▼
   ┌──────┐ ┌──────┐  ┌──────────┐
   │Manage│ │Market│  │  Social  │
   │Biz   │ │Stocks │  │Corp/Chat │
   └──┬───┘ └──┬───┘  └────┬─────┘
      │        │            │
      ▼        ▼            ▼
   Upgrade  Buy/Sell    Send message/
   staff     Portfolio  accept contract
      │        │            │
      └────────┴────────────┘
               ▼
    ┌────────────────────────┐
    │   RESULT: UPDATED      │
    │   WEALTH / PROGRESS    │
    └────────────────────────┘
               ▼
    ┌────────────────────────┐
    │   (Loop) Check alerts, │
    │   re‑invest, log off   │
    └────────────────────────┘
               ▼
    ┌────────────────────────┐
    │   IDLE EARNINGS        │  ← Offline time
    │   (Service Worker)     │
    └────────────────────────┘
