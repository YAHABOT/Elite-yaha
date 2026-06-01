import { getSafeUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { DesktopSidebar } from '@/components/nav/DesktopSidebar'
import { MobileBottomNav } from '@/components/nav/MobileBottomNav'
import { RefreshGuard } from '@/components/nav/RefreshGuard'
import { createServerClient } from '@/lib/supabase/server'

// Fetch only the confirmOnRefresh preference — NOT awaited in the layout so it
// never blocks page rendering. The Promise is passed to RefreshGuard which
// resolves it via React use() inside a Suspense boundary.
async function getConfirmOnRefresh(userId: string): Promise<boolean> {
  try {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('users')
      .select('stats')
      .eq('id', userId)
      .maybeSingle()
    return (data?.stats as { confirmOnRefresh?: boolean } | null)?.confirmOnRefresh ?? false
  } catch {
    return false
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<React.ReactElement> {
  // Auth check — cached via React cache() so page.tsx calls are free (same request).
  const user = await getSafeUser()

  if (!user) {
    redirect('/login')
  }

  // Start the fetch but do NOT await — pass the Promise to RefreshGuard.
  // This removes ~150ms of sequential DB work that was blocking every page render.
  const confirmOnRefreshPromise = getConfirmOnRefresh(user.id)

  return (
    // EX11 FIX (v2): Use fixed inset-0 instead of h-dvh. On Android Chrome, overflow:hidden
    // on body only prevents body-element scroll, not window-level scroll triggered by touch
    // chaining. position:fixed + inset:0 pins the shell to exact viewport bounds regardless
    // of body height, making window scroll impossible.
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundColor: '#050c1a',
        backgroundImage: `
          radial-gradient(120% 60% at 80% -10%, rgba(0,212,255,0.09), transparent 60%),
          radial-gradient(60% 40% at 10% 95%, rgba(168,85,247,0.06), transparent 55%),
          linear-gradient(rgba(0,212,255,0.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.022) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 44px 44px, 44px 44px',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* RefreshGuard returns null — Suspense fallback is also null, zero visual impact */}
      <Suspense fallback={null}>
        <RefreshGuard confirmOnRefreshPromise={confirmOnRefreshPromise} />
      </Suspense>
      <DesktopSidebar user={{ email: user.email ?? null }} />
      <MobileBottomNav />
      {/* No padding here — (content)/layout.tsx adds padding for regular pages.
          Chat pages use flex h-full and manage their own scroll internally. */}
      <main className="md:pl-64 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0 h-full overflow-hidden">
        {children}
      </main>
    </div>
  )
}
