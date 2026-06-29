import { getSafeUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import { fetchBaselineQuestionnaireAction } from '@/app/actions/coaching'
import { IntakeFormClient } from './IntakeFormClient'

export default async function IntakePage() {
  const user = await getSafeUser()
  if (!user) {
    redirect('/login')
  }

  // Helper to get athlete name
  function getAthleteName(uuid: string): string {
    if (uuid === '44ef9aae-79d7-4bc9-8eea-7d8a55964813') return 'Armaan'
    if (uuid === '4c74333b-18e6-465a-a62a-523a4ad2999b') return 'Violet'
    if (uuid === 'e169b44a-2c1d-4a64-9ef5-ae3217f22341') return 'Roohan'
    return uuid
  }

  const athleteName = getAthleteName(user.id)
  const initialData = await fetchBaselineQuestionnaireAction(athleteName)

  return (
    <div className="flex flex-col min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 safe-top shrink-0">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="font-black text-sm tracking-widest text-white/90 uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            Intake Questionnaire
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 md:py-8">
        <IntakeFormClient initialData={initialData} />
      </main>
    </div>
  )
}
