import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../stores/useUserStore'

/**
 * useSupabaseAuth
 * 
 * This hook handles checking if the user is logged in when the app opens,
 * and listens for any login/logout events while the app is running.
 * It connects the Supabase backend auth system to our local Zustand state.
 */
export function useSupabaseAuth() {
  const { setSession, isLoading } = useUserStore()

  useEffect(() => {
    // 1. Check if the user is already logged in right now
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    }).catch(() => {
      // If we are offline or something breaks, tell the store to stop waiting
      useUserStore.getState().isLoading && useUserStore.setState({ isLoading: false })
    })

    // 2. Start listening for changes (e.g. user clicks "Log Out" or "Log In")
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // 3. Clean up the listener if this component is ever removed
    return () => subscription.unsubscribe()
  }, []) // Empty array means this setup only happens once

  return { isLoading }
}

/** 
 * Sign in using an email address and a password.
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/** 
 * Create a new account with email, password, and a username.
 */
export async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }, // Save their chosen username in the database
  })
  if (error) throw error
  return data
}

/**
 * Sign in with Google.
 *
 * This function has to be a bit smart because our app can run in two places:
 * 1. A normal web browser (Chrome, Safari)
 * 2. A native mobile app (Android/iOS) using Capacitor
 *
 * Web browsers handle Google Login easily with a redirect.
 * Mobile apps need to use a special native plugin to ask Android/iOS for the Google account.
 */
export async function signInWithGoogle() {
  // Check if we are running inside a native mobile app (Capacitor)
  const isNative =
    typeof window !== 'undefined' &&
    window.Capacitor &&
    window.Capacitor.isNativePlatform &&
    window.Capacitor.isNativePlatform()

  if (isNative) {
    // ── Native Android / iOS Flow ──────────────────────────────────────────
    
    // Load the special Capacitor plugin just for mobile
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')

    // Tell the plugin what permissions we need (email and basic profile info)
    await GoogleAuth.initialize({
      clientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    })

    // Open the native Google Sign-In popup on the phone
    const googleUser = await GoogleAuth.signIn()

    // Google gives us an "ID Token" to prove who the user is
    const idToken = googleUser.authentication?.idToken
    if (!idToken) throw new Error('Google Sign-In did not return an ID token.')

    // Pass that proof to our Supabase database to actually log them in
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) throw error
    return data

  } else {
    // ── Web Browser Flow ───────────────────────────────────────────────────
    
    // Figure out our current website URL so Google knows where to send the user back
    const redirectTo = window.location.origin

    // Tell Supabase to redirect the browser to Google's login page
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
