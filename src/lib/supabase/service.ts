import { createClient } from '@supabase/supabase-js'

/** Service-role client — bypasses RLS. ONLY for server-side admin operations (cron, webhooks). NEVER expose to client. */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role credentials are not configured')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
