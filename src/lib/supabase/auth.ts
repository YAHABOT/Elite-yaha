import { cache } from 'react'
import { createServerClient } from './server'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

/**
 * Cached version of the authenticated user fetch.
 * Use this in layouts and pages to avoid redundant Auth server roundtrips.
 */
export const getSafeUser = cache(async () => {
  const cookieStore = await cookies()
  
  // Standard Anon Client to check real session
  const anonClient = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      }
    }
  )

  const { data: { user }, error } = await anonClient.auth.getUser()
  if (error || !user) return null

  // Impersonation check
  const impersonateId = cookieStore.get('impersonate_id')?.value
  if (impersonateId && (user.id === '44ef9aae-79d7-4bc9-8eea-7d8a55964813' || user.id === '4c74333b-18e6-465a-a62a-523a4ad2999b')) {
    // Verified coach impersonating a client
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: clientUser } = await serviceClient
      .from('users')
      .select('alias')
      .eq('id', impersonateId)
      .maybeSingle()

    const alias = clientUser?.alias || 'Client'

    return {
      id: impersonateId,
      email: `${alias.toLowerCase().replace(/\s+/g, '')}@impersonated.yaha`,
      isImpersonated: true,
      alias,
      realUser: user
    } as unknown as typeof user
  }

  return user
})

/**
 * Optimized Supabase query client that reuses the auth state.
 */
export async function getAuthenticatedClient() {
  const supabase = await createServerClient()
  return supabase
}
