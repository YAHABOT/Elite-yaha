import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import CoachingDashboard from '@/components/coaching/CoachingDashboard'
import { createServerClient } from '@/lib/supabase/server'

export default async function CoachingPage(): Promise<React.ReactElement> {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  const supabase = await createServerClient()
  
  // Fetch latest readiness data
  const { data: readinessData } = await supabase
    .from('coaching_daily_readiness')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  return (
    <Suspense fallback={<div className="p-8 text-white/50 animate-pulse font-black uppercase tracking-widest text-sm">Loading Coaching...</div>}>
      <CoachingDashboard userId={user.id} readinessData={readinessData} />
    </Suspense>
  )
}
