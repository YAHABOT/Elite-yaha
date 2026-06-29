import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function createServerClient() {
  const cookieStore = await cookies()

  const anonClient = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )

  try {
    // ALWAYS call getUser() to prime the anonClient's internal session token,
    // so that subsequent .from() queries use the valid/refreshed token!
    const { data: { user } } = await anonClient.auth.getUser()
    
    const impersonateId = cookieStore.get('impersonate_id')?.value
    if (impersonateId && user && (user.id === '44ef9aae-79d7-4bc9-8eea-7d8a55964813' || user.id === '4c74333b-18e6-465a-a62a-523a4ad2999b')) {
      // Active verified coach -> return the service role client to bypass RLS
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
    }
  } catch (e) {
    console.error('Impersonation check or token refresh failed in server client:', e)
  }

  return anonClient
}
