import { redirect } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import { createServerClient } from '@/lib/supabase/server'
import { getWidgets } from '@/lib/db/dashboard'
import { computeWidgetValueOptimized, type CorrelationRecord } from '@/lib/db/dashboard-data'
import { getTrackersBasic } from '@/lib/db/trackers'
import { getRoutines } from '@/lib/db/routines'
import { getActiveDayState } from '@/lib/db/day-state'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import type { WidgetValue } from '@/types/widget'
import type { TrackerLog } from '@/types/log'

export default async function DashboardPage(): Promise<React.ReactElement> {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  const supabase = await createServerClient()

  try {
    // Fetch day state first to get the user's active logging date.
    // BUG-V32-2 FIX: Use dayState.date (set by client's local date) rather than
    // server UTC midnight — avoids missing logs for users in UTC+ timezones.
    const dayState = await getActiveDayState(supabase)

    // Use the active session date if present; otherwise fall back to UTC today.
    const logDateStr = dayState?.date ?? new Date().toISOString().split('T')[0]
    const rangeStart = `${logDateStr}T00:00:00.000Z`
    const rangeEnd = `${logDateStr}T23:59:59.999Z`

    const [widgets, trackers, routines, correlationRecords, allLogs] = await Promise.all([
      getWidgets(supabase),
      getTrackersBasic(supabase),
      getRoutines(supabase),
      supabase.from('correlations').select('*').eq('user_id', user.id).then(res => res.data || []),
      supabase
        .from('tracker_logs')
        .select('id, tracker_id, fields, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', rangeStart)
        .lte('logged_at', rangeEnd)
        .order('logged_at', { ascending: false })
        .then(res => res.data || []),
    ])

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

    return (
      <DashboardClient
        widgets={widgets}
        widgetValues={widgetValues}
        trackers={trackers}
        dayStartRoutine={dayStartRoutine}
        dayEndRoutine={dayEndRoutine}
        dayState={dayState}
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
