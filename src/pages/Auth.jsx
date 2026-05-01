/**
 * Auth.jsx
 * 
 * The main authentication screen for Gold Digger. Handles email/password 
 * sign in, sign up, and Google OAuth via Supabase.
 * 
 * Features a dynamic background and custom game-styled input components.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { signIn, signUp, signInWithGoogle } from '../hooks/useSupabaseAuth'
import sounds from '../lib/soundManager'
import logoSrc from '../assets/logo.svg'

export default function Auth() {
  const [tab, setTab]                = useState('login')
  const [email, setEmail]            = useState('')
  const [password, setPassword]      = useState('')
  const [username, setUsername]      = useState('')
  const [showPw, setShowPw]          = useState(false)
  const [loading, setLoading]        = useState(false)
  const [googleLoading, setGLoading] = useState(false)
  const [error, setError]            = useState('')

  // ── Email/Password Authentication ──
  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (tab === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password, username)
      }
      sounds.success?.()
    } catch (err) {
      setError(err.message || 'Authentication failed.')
      sounds.error?.()
    } finally { 
      setLoading(false) 
    }
  }

  // ── Google OAuth Integration ──
  async function handleGoogleSignIn() {
    setError(''); setGLoading(true)
    try { 
      await signInWithGoogle() 
    } catch (err) { 
      setError(err.message || 'Google Sign-In failed.')
      sounds.error?.()
      setGLoading(false) 
    }
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-5 py-10"
      style={{
        // Dynamic radial gradients create the "Premium Fintech" aesthetic
        background: `
          radial-gradient(ellipse 60% 50% at 50% 0%, rgba(91,156,246,0.15) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 80% 80%, rgba(181,110,255,0.10) 0%, transparent 70%),
          #0A0B0F`,
      }}
    >
      {/* ── LOGO & BRANDING ── */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="relative mb-4">
          {/* Pulsing background glow behind the logo */}
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-3 rounded-[28px] blur-xl pointer-events-none"
            style={{ background: 'rgba(245,200,66,0.4)' }}
          />
          <motion.div
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="relative w-20 h-20 rounded-3xl overflow-hidden"
            style={{
              boxShadow: '0 6px 0 #7A5800, 0 10px 28px rgba(245,200,66,0.5)',
              border: '2px solid rgba(245,200,66,0.45)',
            }}
          >
            <img src={logoSrc} alt="Gold Digger" className="w-full h-full object-cover" />
          </motion.div>
        </div>
        <h1
          className="text-4xl font-black tracking-tight"
          style={{
            color: '#F5C842',
            textShadow: '0 0 20px rgba(245,200,66,0.6), 0 0 40px rgba(245,200,66,0.3)',
          }}
        >
          Gold Digger
        </h1>
        <p className="text-sm font-semibold mt-1 tracking-wide" style={{ color: 'var(--col-text-3)' }}>
          BUILD YOUR EMPIRE
        </p>
      </motion.div>

      {/* ── AUTHENTICATION CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="w-full max-w-sm"
      >
        <div className="card !p-6">
          {/* ── Mode Selection Tabs ── */}
          <div
            className="flex rounded-xl p-1 mb-6"
            style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {['login', 'signup'].map((t) => (
              <motion.button
                key={t}
                onClick={() => { setTab(t); setError(''); sounds.tap?.() }}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                style={tab === t ? {
                  background: 'linear-gradient(180deg, rgba(245,200,66,0.20), rgba(245,200,66,0.08))',
                  border: '1px solid rgba(245,200,66,0.30)',
                  color: '#F5C842',
                  textShadow: '0 0 8px rgba(245,200,66,0.5)',
                  boxShadow: '0 0 12px rgba(245,200,66,0.15)',
                } : { color: 'var(--col-text-3)' }}
                whileTap={{ scale: 0.96 }}
              >
                {t === 'login' ? 'Sign In' : 'Sign Up'}
              </motion.button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Username Input (Signup Only) */}
            <AnimatePresence>
              {tab === 'signup' && (
                <motion.div
                  key="username"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <GameInput icon={<User size={15} />} placeholder="Choose a username" value={username}
                    onChange={setUsername} type="text" required />
                </motion.div>
              )}
            </AnimatePresence>

            <GameInput icon={<Mail size={15} />} placeholder="Email address" value={email}
              onChange={setEmail} type="email" required />

            <div className="relative">
              <GameInput icon={<Lock size={15} />} placeholder="Password" value={password}
                onChange={setPassword} type={showPw ? 'text' : 'password'} required />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--col-text-3)' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Error Feedback */}
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-xs font-bold px-3 py-2 rounded-lg"
                style={{ color: '#FF5A5A', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}>
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="btn-game-gold w-full"
              style={{ paddingTop: 14, paddingBottom: 14, fontSize: 15 }}
              whileTap={{ y: 3, scale: 0.98 }}
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-[#1A1200]/50 border-t-[#1A1200] rounded-full animate-spin" />
                : tab === 'login' ? '⚡ Sign In' : '🚀 Create Account'
              }
            </motion.button>
          </form>

          {/* ── Visual Divider ── */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--col-text-3)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* ── Google OAuth Button ── */}
          <motion.button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            whileTap={{ y: 2, scale: 0.97 }}
            whileHover={{ y: -1 }}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl font-bold text-sm disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--col-text-1)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {googleLoading
              ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              : <GoogleLogo />
            }
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </motion.button>

          <p className="text-center text-[10px] mt-4 leading-relaxed" style={{ color: 'var(--col-text-3)' }}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

/**
 * Reusable input component styled for the game UI
 */
function GameInput({ icon, placeholder, value, onChange, type, required }) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 z-10" style={{ color: 'var(--col-text-3)' }}>{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="input-dark pl-9"
      />
    </div>
  )
}

/**
 * SVG asset for Google OAuth
 */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
