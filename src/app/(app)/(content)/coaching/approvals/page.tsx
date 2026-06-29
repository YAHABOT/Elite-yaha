import { redirect } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import { CoachingApprovalsClient } from '@/components/coaching/CoachingApprovalsClient'
import { fetchWorkoutOverhaulApprovalAction } from '@/app/actions/coaching'

export default async function ApprovalsPage() {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  const approval = await fetchWorkoutOverhaulApprovalAction()
  
  // Impersonated or real user name
  const realName = user.email === 'armaan1993@gmail.com' ? 'Armaan' : 'Violet'
  const userAlias = (user as { alias?: string }).alias || realName

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <main className="flex-1">
        <CoachingApprovalsClient 
          initialApproval={approval} 
          userAlias={userAlias}
        />
      </main>
    </div>
  )
}
