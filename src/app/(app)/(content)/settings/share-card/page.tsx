import { getUser } from '@/lib/db/users'
import { getTrackersBasic } from '@/lib/db/trackers'
import { getCorrelations } from '@/lib/db/correlations'
import { getSafeUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { ShareCardSettings } from '@/components/settings/ShareCardSettings'

export default async function ShareCardSettingsPage(): Promise<React.ReactElement> {
  const authUser = await getSafeUser()
  if (!authUser) redirect('/login')

  const supabase = await createServerClient()
  const [user, trackers, correlations] = await Promise.all([
    getUser(authUser.id, supabase),
    getTrackersBasic(supabase),
    getCorrelations(supabase),
  ])

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <h1 className="font-display-heading text-5xl text-textPrimary">Share Card</h1>
        <div className="border-t border-white/5 pt-3">
          <p className="text-sm font-medium text-textMuted opacity-60">
            Choose what appears on your daily overview image. Drag to reorder.
          </p>
        </div>
      </div>
      <ShareCardSettings
        trackers={trackers}
        correlations={correlations}
        initialConfig={user?.stats?.shareCard}
      />
    </div>
  )
}
