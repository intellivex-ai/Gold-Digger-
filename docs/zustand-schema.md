# Zustand Store Schema (Global State)

Stores are split by domain. Each store is created with Zustand and can be connected to the Socket.IO listener.

## useUserStore
{
id: number,
username: string,
cash: number,
netWorth: number,
reputation: number,
avatar: string,
joinedAt: Date,
isPremium: boolean,
corporationId: number | null,
setUser: (data) => void,
updateCash: (amount) => void,
addReputation: (delta) => void,
}

## useBusinessStore
{
businesses: Business[], // owned businesses
selectedBusinessId: number | null,
setBusinesses: (list) => void,
updateBusiness: (id, data) => void,
}
// Business shape:
{
id, type, name, level, revenuePerHour, upgradeCost,
staffMorale, location, manager, status
}

## useMarketStore
{
stocks: { symbol, price, changePercent }[],
watchlist: string[],
portfolio: { symbol, quantity, avgPrice }[],
orders: { id, symbol, type, quantity, price, status }[],
setStocks: (data) => void,
updateStockPrice: (symbol, price) => void,
addToWatchlist: (symbol) => void,
buyStock: (order) => void,
}

## useSocialStore
{
corporation: Corporation | null,
chatMessages: Message[],
leaderboard: LeaderEntry[],
setCorporation: (corp) => void,
addMessage: (msg) => void,
setLeaderboard: (entries) => void,
}

All stores are plain objects, no immutability library required. Server pushes state patches via Socket.IO that call the appropriate setter.
