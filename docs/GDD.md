# Empire Hub – Living Game Design Document

## Vision
A real‑time, multiplayer business simulator wrapped in a sleek financial app.  
No character movement, no joysticks – purely UI‑driven gameplay across mobile, web, and desktop.

## Unique Selling Points
- Real‑time stock market using live data (Alpaca paper trading)
- Player‑driven economy (marketplace, contracts, hostile takeovers)
- Idle progression with offline earnings
- Deep multiplayer: corporations, leaderboards, global events
- App‑like UI inspired by Robinhood / Bloomberg

## Core Pillars
1. **Build** – Invest in retail, real estate, manufacturing, and tech startups.
2. **Trade** – Real‑time stocks, crypto, commodities, and player‑to‑player goods.
3. **Connect** – Join corporations, negotiate contracts, chat, and compete.
4. **Progress** – Earn passively, upgrade managers, unlock new tiers of assets.

## Platform & Tech
- Frontend: React (Vite) + React Router v6 + Zustand + Framer Motion
- Backend & Database: Supabase (Auth, PostgreSQL, Edge Functions)
- Real‑time: Supabase Realtime + Colyseus (server logic)
- Stock API: Alpaca Markets (paper) + Alpha Vantage (fundamentals)
- Mobile Wrapper: Capacitor

## Monetization (Fair‑to‑Play)
- Rewarded ads for 2x profit boost (opt‑in)
- One‑time IAP to remove all ads
- Cosmetic IAPs (profile badges, themes) – never pay‑to‑win
