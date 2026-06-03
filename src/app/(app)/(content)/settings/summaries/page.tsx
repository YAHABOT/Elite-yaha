import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getSafeUser } from '@/lib/supabase/auth'
import { createServerClient } from '@/lib/supabase/server'
import { getTrackersBasic } from '@/lib/db/trackers'
import { getCorrelations } from '@/lib/db/correlations'
import { getSummaryConfigs } from '@/lib/db/summaries'
import { SummaryConfigCard } from '@/components/settings/SummaryConfigCard'

export default async function SummariesSettingsPage(): Promise<React.ReactElement> {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  const supabase = await createServerClient()
  const [trackers, correlations, configs] = await Promise.all([
    getTrackersBasic(supabase),
    getCorrelations(supabase).catch(() => []),
    getSummaryConfigs(supabase).catch(() => []),
  ])

  const weeklyConfig = configs.find(c => c.type === 'weekly') ?? null
  const monthlyConfig = configs.find(c => c.type === 'monthly') ?? null
  const correlationOptions = correlations.map(c => ({ id: c.id, name: c.name, unit: c.unit ?? undefined }))

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-textMuted transition-all hover:border-white/20 hover:text-textPrimary"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display-heading text-lg text-textPrimary">AI Summaries</h1>
          <p className="font-ui text-textMuted/50 mt-0.5" style={{ fontSize: '9px', letterSpacing: '0.10em' }}>
            WEEKLY & MONTHLY HEALTH REPORTS
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <SummaryConfigCard
          type="weekly"
          initial={weeklyConfig}
          trackers={trackers}
          correlations={correlationOptions}
        />
        <SummaryConfigCard
          type="monthly"
          initial={monthlyConfig}
          trackers={trackers}
          correlations={correlationOptions}
        />
      </div>

      <p className="font-ui text-textMuted/30 text-center" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>
        Summaries are generated automatically on schedule or after your evening routine. You can also regenerate manually above.
      </p>
    </div>
  )
}
