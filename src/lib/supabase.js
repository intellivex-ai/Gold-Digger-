/**
 * supabase.js
 * 
 * This file sets up our connection to the Supabase database.
 * Think of this as the "bridge" between our frontend app and our backend server.
 */

import { createClient } from '@supabase/supabase-js'

// We grab our secure connection URLs from the environment variables (like a secret config file)
// If they aren't found, we use a placeholder to prevent the app from immediately crashing.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Create the actual Supabase client that we'll use throughout the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true, // Automatically keep the user logged in
    persistSession: true,   // Remember the user after they close the browser
    detectSessionInUrl: true, // Help with login redirects (like Google Login)
  },
  realtime: {
    // Limit how fast we receive live updates to prevent overwhelming the app
    params: { eventsPerSecond: 10 },
  },
})

/**
 * Convenience Helper: callEdgeFunction
 * 
 * Some of our game logic is too important to run on the user's phone/browser
 * (like upgrading a business or collecting money, because users could cheat).
 * 
 * We send a request to a secure "Edge Function" on Supabase to do the math for us.
 * 
 * @param {string} name - The name of the function to run on the server
 * @param {object} payload - The data we want to send to the server
 * @returns The data the server sends back
 */
export async function callEdgeFunction(name, payload) {
  // Call the function and wait for the response
  const { data, error } = await supabase.functions.invoke(name, { body: payload })
  
  // If something went wrong, try to extract a helpful error message
  if (error) {
    let customMsg = null
    if (error.context && typeof error.context.json === 'function') {
      try {
        const errData = await error.context.json()
        if (errData && errData.error) customMsg = errData.error
      } catch (e) {
        // If we can't parse the error, just ignore it and use the default one
      }
    }
    // Throw the error so the component that called this can show a message to the user
    if (customMsg) throw new Error(customMsg)
    throw error
  }
  
  return data
}

export default supabase
