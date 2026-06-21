import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import { TimelineFeed } from '@/components/coaching/TimelineFeed'
import { fetchTimelineFeedAction } from '@/app/actions/coaching'
import { Zap } from 'lucide-react'

export default async function CoachingPage(): Promise<React.ReactElement> {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  const items = await fetchTimelineFeedAction()

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="font-black text-sm tracking-widest text-white/90 uppercase flex items-center gap-2">
            <Zap size={18} className="text-primary" />
            Cortex Timeline
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <Suspense fallback={<div className="p-8 text-center text-white/50 animate-pulse font-black uppercase tracking-widest text-sm">Decrypting Intel...</div>}>
          <TimelineFeed initialItems={items} />
        </Suspense>
      </main>
    </div>
  )
}
