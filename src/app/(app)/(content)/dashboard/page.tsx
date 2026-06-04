import { redirect } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import { createServerClient } from '@/lib/supabase/server'
import { getWidgets } from '@/lib/db/dashboard'
import { computeWidgetValueOptimized, computeDailyScore, computeDailyScores, computeDeltaPct, computeDailyPointsFromLogs, type CorrelationRecord } from '@/lib/db/dashboard-data'
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

    // Two log fetches are needed:
    // 1. todayLogs — for field_latest (today only, ordered desc)
    // 2. nDayLogs  — for field_average, field_total, correlator (N-day lookback)
    const logDateStr = dayState?.date ?? new Date().toISOString().split('T')[0]
    const rangeStart = `${logDateStr}T00:00:00.000Z`
    const rangeEnd = `${logDateStr}T23:59:59.999Z`

    // Determine max lookback needed across all widgets
    const maxDays = widgets.reduce((max, w) => Math.max(max, w.days ?? 7), 7)
    const fetchDays = Math.max(maxDays * 2, 30)  // 2x for delta, min 30 for chart
    const nDaysAgoDate = new Date()
    nDaysAgoDate.setDate(nDaysAgoDate.getDate() - fetchDays)
    const nDayStart = nDaysAgoDate.toISOString()

    const [todayLogs, nDayLogs] = await Promise.all([
      supabase
        .from('tracker_logs')
        .select('id, tracker_id, fields, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', rangeStart)
        .lte('logged_at', rangeEnd)
        .order('logged_at', { ascending: false })
        .then(res => res.data || []),
      supabase
        .from('tracker_logs')
        .select('id, tracker_id, fields, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', nDayStart)
        .order('logged_at', { ascending: false })
        .then(res => res.data || []),
    ])

    const dayStartRoutine = routines.find(r => r.type === 'day_start') ?? null
    const dayEndRoutine = routines.find(r => r.type === 'day_end') ?? null

    // Compute all widget values using the pre-fetched log sets
    // Also inject per-day sparkline trend + delta % for average/total widgets
    const widgetValues: WidgetValue[] = widgets.map(w => {
      try {
        const val = computeWidgetValueOptimized(
          w,
          todayLogs as TrackerLog[],
          nDayLogs as TrackerLog[],
          correlationRecords as CorrelationRecord[],
          trackers
        )

        // Add sparkline + delta for field_average and field_total
        if ((w.type === 'field_average' || w.type === 'field_total') && w.tracker_id && w.field_id) {
          const sparkDays = Math.min(w.days ?? 7, 7)
          const agg = w.type === 'field_average' ? 'average' : 'total'
          val.trend = computeDailyPointsFromLogs(
            nDayLogs as TrackerLog[],
            w.tracker_id,
            w.field_id,
            agg,
            sparkDays
          )
          const delta = computeDeltaPct(
            nDayLogs as TrackerLog[],
            w.tracker_id,
            w.field_id,
            agg,
            w.days ?? 7
          )
          if (delta !== null) val.delta = delta
        }

        return val
      } catch (err) {
        console.error(`Error computing widget ${w.label}:`, err)
        return { value: null, label: w.label }
      }
    })

    // Hero score for today + per-day scores for the bar chart (30 days)
    const targets = userProfile?.targets ?? []
    const todayDateStr = new Date().toISOString().split('T')[0]
    const todayActual = (nDayLogs as TrackerLog[]).filter(l => l.logged_at.startsWith(todayDateStr))
    const corrRecords = correlationRecords as import('@/lib/db/dashboard-data').CorrelationRecord[]
    const dailyScore = computeDailyScore(todayActual, targets, corrRecords, trackers)
    const dayScores = computeDailyScores(nDayLogs as TrackerLog[], targets, 30, corrRecords, trackers)

    // Derive display name: alias > email local part > 'there'
    const emailName = user.email?.split('@')[0] ?? 'there'
    const userName = userProfile?.alias ?? emailName

    const correlationOptions = (correlationRecords as Array<{ id: string; name?: string; unit?: string }>)
      .filter(c => c.name)
      .map(c => ({ id: c.id, name: c.name!, unit: c.unit }))

    return (
      <DashboardClient
        widgets={widgets}
        widgetValues={widgetValues}
        trackers={trackers}
        dayStartRoutine={dayStartRoutine}
        dayEndRoutine={dayEndRoutine}
        dayState={dayState}
        userName={userName}
        targets={targets}
        dailyScore={dailyScore}
        dayScores={dayScores}
        correlations={correlationOptions}
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
