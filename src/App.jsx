import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSupabaseAuth } from './hooks/useSupabaseAuth'
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription'
import useUserStore from './stores/useUserStore'
import useMarketStore from './stores/useMarketStore'
import useEconomyStore from './stores/useEconomyStore'
import useCryptoStore from './stores/useCryptoStore'
import { useEffect } from 'react'

// Layout
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'

// Pages — original
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Businesses from './pages/Businesses'
import BusinessDetail from './pages/BusinessDetail'
import Market, { StocksTab } from './pages/Market'
import StockDetail from './pages/StockDetail'
import PlayerTrade from './pages/PlayerTrade'
import Social from './pages/Social'
import Corporation from './pages/Corporation'
import Chat from './pages/Chat'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'

// Pages — new features
import CryptoMarket from './pages/CryptoMarket'
import SkillTree from './pages/SkillTree'
import RealEstate from './pages/RealEstate'
import AuctionHouse from './pages/AuctionHouse'
import BlackMarket from './pages/BlackMarket'
import VentureCapital from './pages/VentureCapital'
import EconomyEvents from './pages/EconomyEvents'

/** Protects routes from unauthenticated access */
function ProtectedRoute({ children }) {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated)
  const isLoading       = useUserStore((s) => s.isLoading)
  if (isLoading) return <LoadingScreen />
  return isAuthenticated ? children : <Navigate to="/auth" replace />
}

/**
 * App-level side-effects — runs once on mount.
 * Realtime subscriptions are owned by individual store hooks,
 * NOT duplicated here.  EconomyEventBanner owns its own channel.
 */
function AppEffects() {
  const fetchStocks     = useMarketStore((s) => s.fetchStocks)
  const startSimulation = useMarketStore((s) => s.startLocalSimulation)
  const fetchEvents     = useEconomyStore((s) => s.fetchEvents)
  const fetchCrypto     = useCryptoStore((s) => s.fetchAssets)
  const simulateCrypto  = useCryptoStore((s) => s.simulatePrices)
  const userId          = useUserStore((s) => s.user?.id)

  useEffect(() => {
    // Stocks – fetch + local sim
    fetchStocks()
    const stopSim = startSimulation()

    // Economy events – fetch only (subscription in EconomyEventBanner)
    fetchEvents()

    // Crypto – fetch + price simulation
    fetchCrypto()
    const stopCrypto = simulateCrypto()

    return () => {
      stopSim()
      stopCrypto()
    }
  }, [])

  // Realtime profile/businesses subscription (profile-aware)
  useRealtimeSubscription(userId)

  return null
}

export default function App() {
  useSupabaseAuth()

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppEffects />
      <div className="min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'inherit' }}>
        <Routes>
          {/* Public */}
          <Route path="/auth" element={<Auth />} />

          {/* Protected – nested under the shell Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />

            {/* Businesses */}
            <Route path="businesses"    element={<Businesses />} />
            <Route path="business/:id" element={<BusinessDetail />} />

            {/* Market */}
            <Route path="market" element={<Market />}>
              <Route index              element={<StocksTab />} />
              <Route path="player-trade" element={<PlayerTrade />} />
            </Route>
            <Route path="market/stocks/:symbol" element={<StockDetail />} />

            {/* Feature pages */}
            <Route path="crypto"          element={<CryptoMarket />} />
            <Route path="auction"         element={<AuctionHouse />} />
            <Route path="real-estate"     element={<RealEstate />} />
            <Route path="venture-capital" element={<VentureCapital />} />
            <Route path="black-market"    element={<BlackMarket />} />
            <Route path="skills"          element={<SkillTree />} />
            <Route path="events"          element={<EconomyEvents />} />

            {/* Social */}
            <Route path="social" element={<Social />}>
              <Route index              element={<Corporation />} />
              <Route path="chat"        element={<Chat />} />
              <Route path="leaderboard" element={<Leaderboard />} />
            </Route>

            {/* Profile */}
            <Route path="character" element={<Profile />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  )
}
