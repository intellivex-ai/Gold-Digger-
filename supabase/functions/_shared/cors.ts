// supabase/functions/_shared/cors.ts
// Shared CORS headers for all Empire Hub edge functions.
// Import this in every function that handles browser requests.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Return a preflight OK response */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}

/** Wrap any JSON payload with cors headers */
export function jsonResponse(
  data: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Standard error response */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status)
}
