// supabase/functions/_shared/supabaseAdmin.ts
// Factory that creates a Supabase admin client (service-role key)
// which bypasses RLS – safe to use only inside edge functions.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function getAdminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Extract the authenticated user from the incoming Authorization header.
 * Returns null if the token is missing or invalid.
 */
export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return null

  // Use anon client to verify the user JWT
  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const client = createClient(url, anonKey)
  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user) return null
  return user
}

/**
 * Simple per-user rate limiter backed by the rate_limits table.
 * Returns true if the request is allowed, false if rate-limited.
 * windowSeconds: how long the window lasts (default 60s)
 * maxCalls: maximum allowed calls in that window (default 10)
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  userId: string,
  action: string,
  maxCalls = 10,
  windowSeconds = 60,
): Promise<boolean> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowSeconds * 1000)

  const { data, error } = await admin
    .from('rate_limits')
    .select('call_count, window_start')
    .eq('user_id', userId)
    .eq('action', action)
    .maybeSingle()

  if (error) return true // fail open on DB error

  if (!data || new Date(data.window_start) < windowStart) {
    // reset window
    await admin.from('rate_limits').upsert({
      user_id: userId,
      action,
      call_count: 1,
      window_start: now.toISOString(),
    }, { onConflict: 'user_id,action' })
    return true
  }

  if (data.call_count >= maxCalls) return false

  await admin
    .from('rate_limits')
    .update({ call_count: data.call_count + 1 })
    .eq('user_id', userId)
    .eq('action', action)

  return true
}
