import { redirect } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import { createServerClient } from '@/lib/supabase/server'
import { getWidgets } from '@/lib/db/dashboard'
import { computeWidgetValueOptimized, type CorrelationRecord } from '@/lib/db/dashboard-data'
import { getTrackersBasic } from '@/lib/db/trackers'
import { getRoutines } from '@/lib/db/routines'
import { getActiveDayState } from '@/lib/db/day-state'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { getUser } from '@/lib/db/users'
import type { WidgetValue } from '@/types/widget'
import type { TrackerLog } from '@/types/log'

export default async function DashboardPage(): Promise<React.ReactElement> {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  const supabase = await createServerClient()

  try {
    // Run dayState + all date-independent queries in parallel.
    // Previously dayState was awaited alone (waterfall), adding ~150ms before the
    // 5-query batch could even start. Now all 5 fire together; only allLogs (which
    // needs the date from dayState) follows as a second parallel batch.
    const [dayState, widgets, trackers, routines, correlationRecords, userProfile] = await Promise.all([
      // BUG-V32-2 FIX: Use dayState.date (set by client's local date) rather than
      // server UTC midnight — avoids missing logs for users in UTC+ timezones.
      getActiveDayState(supabase),
      getWidgets(supabase),
      getTrackersBasic(supabase),
      getRoutines(supabase),
      supabase.from('correlations').select('*').eq('user_id', user.id).then(res => res.data || []),
      getUser(user.id, supabase),
    ])

    // allLogs must follow dayState (date filter depends on active session date).
    const logDateStr = dayState?.date ?? new Date().toISOString().split('T')[0]
    const rangeStart = `${logDateStr}T00:00:00.000Z`
    const rangeEnd = `${logDateStr}T23:59:59.999Z`

    const allLogs = await supabase
      .from('tracker_logs')
      .select('id, tracker_id, fields, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', rangeStart)
      .lte('logged_at', rangeEnd)
      .order('logged_at', { ascending: false })
      .then(res => res.data || [])

    const dayStartRoutine = routines.find(r => r.type === 'day_start') ?? null
    const dayEndRoutine = routines.find(r => r.type === 'day_end') ?? null

    // Compute all widget values using the pre-fetched data
    const widgetValues: WidgetValue[] = widgets.map(w => {
      try {
        return computeWidgetValueOptimized(w, allLogs as TrackerLog[], correlationRecords as CorrelationRecord[])
      } catch (err) {
        console.error(`Error computing widget ${w.label}:`, err)
        return { value: null, label: w.label }
      }
    })

    // Derive display name: alias > email local part > 'there'
    const emailName = user.email?.split('@')[0] ?? 'there'
    const userName = userProfile?.alias ?? emailName

    return (
      <DashboardClient
        widgets={widgets}
        widgetValues={widgetValues}
        trackers={trackers}
        dayStartRoutine={dayStartRoutine}
        dayEndRoutine={dayEndRoutine}
        dayState={dayState}
        userName={userName}
      />
    )
  } catch {
    const message = 'Failed to load dashboard. Please refresh the page.'
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-sm text-red-400">{message}</p>
      </div>
    )
  }
}
