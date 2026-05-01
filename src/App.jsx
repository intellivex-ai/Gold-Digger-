/**
 * App.jsx
 * 
 * This is the main shell of the application. It handles routing (which page to show)
 * and starts up global features like fetching data and listening for real-time updates.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSupabaseAuth } from './hooks/useSupabaseAuth'
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription'
import useUserStore from './stores/useUserStore'
import useMarketStore from './stores/useMarketStore'
import useEconomyStore from './stores/useEconomyStore'
import useCryptoStore from './stores/useCryptoStore'
import { useEffect } from 'react'

// Layout components
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'

// Original Pages
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

// New Feature Pages
import CryptoMarket from './pages/CryptoMarket'
import SkillTree from './pages/SkillTree'
import RealEstate from './pages/RealEstate'
import AuctionHouse from './pages/AuctionHouse'
import BlackMarket from './pages/BlackMarket'
import VentureCapital from './pages/VentureCapital'
import EconomyEvents from './pages/EconomyEvents'

/**
 * ProtectedRoute Wrapper
 * 
 * This component wraps pages that should only be seen by logged-in users.
 * If the user isn't logged in, it redirects them to the "/auth" page.
 */
function ProtectedRoute({ children }) {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated)
  const isLoading       = useUserStore((s) => s.isLoading)
  
  // Show a loading screen while we figure out if they are logged in
  if (isLoading) return <LoadingScreen />
  
  // If logged in, show the requested page. Otherwise, send to login screen.
  return isAuthenticated ? children : <Navigate to="/auth" replace />
}

/**
 * AppEffects
 * 
 * This hidden component is responsible for loading the initial data
 * when the app first opens. It runs once when mounted.
 */
function AppEffects() {
  // Grab functions from our stores to fetch data
  const fetchStocks     = useMarketStore((s) => s.fetchStocks)
  const startSimulation = useMarketStore((s) => s.startLocalSimulation)
  const fetchEvents     = useEconomyStore((s) => s.fetchEvents)
  const fetchCrypto     = useCryptoStore((s) => s.fetchAssets)
  const simulateCrypto  = useCryptoStore((s) => s.simulatePrices)
  const userId          = useUserStore((s) => s.user?.id)

  // Use an effect to run these tasks right when the app starts
  useEffect(() => {
    // 1. Fetch real stock prices, then start the visual "fake" price jitter
    fetchStocks()
    const stopSim = startSimulation()

    // 2. Fetch global economy events
    fetchEvents()

    // 3. Fetch crypto assets and start their price simulation
    fetchCrypto()
    const stopCrypto = simulateCrypto()

    // Clean up our running simulations when the app is closed
    return () => {
      stopSim()
      stopCrypto()
    }
  }, []) // Empty array means "only run this once"

  // 4. Start listening to Supabase for real-time changes to this specific user
  useRealtimeSubscription(userId)

  // This component doesn't draw anything on the screen
  return null
}

/**
 * Main App Component
 * 
 * Sets up the router and all the different URLs in our game.
 */
export default function App() {
  // Check the user's login status right away
  useSupabaseAuth()

  return (
    // BrowserRouter keeps track of the URL in the address bar
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppEffects />
      
      {/* Background container that fills the screen */}
      <div className="min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'inherit' }}>
        <Routes>
          {/* Public Route - anyone can see this */}
          <Route path="/auth" element={<Auth />} />

          {/* 
            Protected Routes 
            These are nested under the "Layout" component, which gives them
            the standard top header and bottom navigation bar.
          */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* "index" means this is the default page when visiting "/" */}
            <Route index element={<Dashboard />} />

            {/* Business Features */}
            <Route path="businesses"    element={<Businesses />} />
            <Route path="business/:id" element={<BusinessDetail />} />

            {/* Stock Market Features */}
            <Route path="market" element={<Market />}>
              <Route index              element={<StocksTab />} />
              <Route path="player-trade" element={<PlayerTrade />} />
            </Route>
            <Route path="market/stocks/:symbol" element={<StockDetail />} />

            {/* Additional Markets & Features */}
            <Route path="crypto"          element={<CryptoMarket />} />
            <Route path="auction"         element={<AuctionHouse />} />
            <Route path="real-estate"     element={<RealEstate />} />
            <Route path="venture-capital" element={<VentureCapital />} />
            <Route path="black-market"    element={<BlackMarket />} />
            <Route path="skills"          element={<SkillTree />} />
            <Route path="events"          element={<EconomyEvents />} />

            {/* Social Features (Corporation, Chat, Leaderboard) */}
            <Route path="social" element={<Social />}>
              <Route index              element={<Corporation />} />
              <Route path="chat"        element={<Chat />} />
              <Route path="leaderboard" element={<Leaderboard />} />
            </Route>

            {/* Player Profile */}
            <Route path="character" element={<Profile />} />

            {/* Catch-all: If user types a random URL, send them back to Dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  )
}
