import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getSafeUser } from '@/lib/supabase/auth'
import { getTrackersBasic } from '@/lib/db/trackers'
import { createServerClient } from '@/lib/supabase/server'
import { CreateTargetForm } from '@/components/settings/CreateTargetForm'

export default async function NewTargetPage(): Promise<React.ReactElement> {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  const supabase = await createServerClient()
  const [trackers, correlationsRes] = await Promise.all([
    getTrackersBasic(supabase),
    supabase
      .from('correlations')
      .select('id, name, unit')
      .eq('user_id', user.id)
      .order('name', { ascending: true }),
  ])

  const correlations = (correlationsRes.data ?? []) as { id: string; name: string; unit: string | null }[]

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings/targets"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-textMuted transition-all hover:border-white/20 hover:text-textPrimary"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display-heading text-lg text-textPrimary">New Target</h1>
          <p className="font-ui text-textMuted/50 mt-0.5" style={{ fontSize: '9px', letterSpacing: '0.10em' }}>
            PICK A FIELD · SET YOUR DAILY GOAL
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-[28px] border border-white/5 bg-white/[0.02] p-6 backdrop-blur-3xl">
        <CreateTargetForm trackers={trackers} correlations={correlations} />
      </div>
    </div>
  )
}
