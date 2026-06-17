import { getSafeUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import { DesktopSidebar } from '@/components/nav/DesktopSidebar'
import { MobileBottomNav } from '@/components/nav/MobileBottomNav'
import { FeedbackModal } from '@/components/feedback/FeedbackModal'
import { getOnboardingState } from '@/lib/db/onboarding'
import { OnboardingRoot } from '@/components/onboarding/OnboardingRoot'
import { ONBOARDING_STEPS } from '@/components/onboarding/steps'

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

  let onboardingState = null
  try {
    onboardingState = await getOnboardingState(user.id)
  } catch {
    // Non-blocking — skip onboarding if DB error
  }

  return (
    // EX11 FIX (v2): Use fixed inset-0 instead of h-dvh. On Android Chrome, overflow:hidden
    // on body only prevents body-element scroll, not window-level scroll triggered by touch
    // chaining. position:fixed + inset:0 pins the shell to exact viewport bounds regardless
    // of body height, making window scroll impossible.
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundColor: '#0b1a28',
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
      <DesktopSidebar user={{ email: user.email ?? null }} />
      <MobileBottomNav />
      {/* No padding here — (content)/layout.tsx adds padding for regular pages.
          Chat pages use flex h-full and manage their own scroll internally. */}
      <main className="md:pl-64 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0 h-full overflow-hidden">
        {children}
      </main>
      <FeedbackModal />
      {onboardingState && (
        <OnboardingRoot initialState={onboardingState} steps={ONBOARDING_STEPS} />
      )}
    </div>
  )
}