import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

/**
 * Google OAuth callback handler (PKCE flow).
 *
 * Why cookies must go on the Response, not via next/headers cookies():
 * - exchangeCodeForSession() reads the PKCE verifier from request cookies,
 *   then calls setAll() with the new session tokens.
 * - We collect those tokens, build the redirect Response, then attach them
 *   directly via response.cookies.set(). If we used cookies() from next/headers
 *   the Set-Cookie header would not be present on the redirect response and the
 *   user would arrive at /chat with no session, triggering an immediate redirect
 *   back to /login.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/chat'

  if (code) {
    // Collect cookies to set — applied to the redirect response below
    const pendingCookies: Array<{ name: string; value: string; options: Partial<ResponseCookie> }> = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              pendingCookies.push({ name, value, options: options ?? {} })
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Guarantee a users row exists — new sign-ups have none until this point.
      // ignoreDuplicates: true makes this a no-op for returning users.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('users')
          .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })
      }

      const response = NextResponse.redirect(`${origin}${next}`)
      // Attach session cookies to the redirect response so the browser stores them
      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      return response
    }

    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
  }

  // Something went wrong — send back to login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
