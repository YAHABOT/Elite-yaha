import { redirect } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import { fetchMacrocycleAction, fetchPrescribedWorkoutsAction } from '@/app/actions/coaching'
import { ValenciaPrepClient } from '@/components/coaching/ValenciaPrepClient'

export const metadata = {
  title: 'Valencia Oct 2026 | Campaigns',
  description: 'Roadmap, Periodization Macrocycle, and Workout Calendar for Hyrox Valencia Prep.',
}

export default async function ValenciaPrepPage() {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  // Fetch macrocycle phases and calendar workouts concurrently
  const [phases, workouts] = await Promise.all([
    fetchMacrocycleAction(),
    fetchPrescribedWorkoutsAction(),
  ])

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <main className="flex-1">
        <ValenciaPrepClient phases={phases} workouts={workouts} />
      </main>
    </div>
  )
}
