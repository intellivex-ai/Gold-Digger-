import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../stores/useUserStore'

/**
 * Manages Supabase auth state and hydrates the user store.
 * Must be called once near the top of the component tree.
 */
export function useSupabaseAuth() {
  const { setSession, isLoading } = useUserStore()

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    }).catch(() => {
      // No session / offline — store remains in loading=false via loginAsDemo fallback
      useUserStore.getState().isLoading && useUserStore.setState({ isLoading: false })
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [setSession])

  return { isLoading }
}

/** Sign in with email + password */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/** Sign up with email + password */
export async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })
  if (error) throw error
  return data
}

/**
 * Sign in with Google.
 *
 * Platform detection:
 *  - Capacitor (Android/iOS native)  → uses @codetrix-studio/capacitor-google-auth
 *    to get a native ID token, then calls supabase.auth.signInWithIdToken().
 *  - Web browser                     → standard Supabase OAuth redirect.
 *
 * Why two flows?
 *  Capacitor's WebView cannot complete an OAuth redirect the same way a real
 *  browser can, so native apps must use the platform's own Google Sign-In SDK
 *  and exchange the resulting ID token directly with Supabase.
 */
export async function signInWithGoogle() {
  // ── Detect if we are running inside a Capacitor native shell ──────────────
  const isNative =
    typeof window !== 'undefined' &&
    window.Capacitor &&
    window.Capacitor.isNativePlatform &&
    window.Capacitor.isNativePlatform()

  if (isNative) {
    // ── Native Android / iOS path ──────────────────────────────────────────
    // Dynamic import so the plugin is tree-shaken on web builds.
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')

    // Initialize must be called before signIn (safe to call multiple times).
    await GoogleAuth.initialize({
      clientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    })

    const googleUser = await GoogleAuth.signIn()

    // The ID token is the credential Supabase needs.
    const idToken = googleUser.authentication?.idToken
    if (!idToken) throw new Error('Google Sign-In did not return an ID token.')

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) throw error
    return data
  } else {
    // ── Web browser path ───────────────────────────────────────────────────
    const redirectTo = window.location.origin

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
    return data
  }
}
