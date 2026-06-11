import { createServerClient } from '@/lib/supabase/server'
import { getWidgets } from '@/lib/db/dashboard'
import {
  computeWidgetValueOptimized,
  computeDailyScore,
  computeDailyScores,
  computeDeltaPct,
  computeDailyPointsFromLogs,
  getSparklineDays,
  getSparklineStartDate,
  type CorrelationRecord,
} from '@/lib/db/dashboard-data'
import { getTrackersBasic } from '@/lib/db/trackers'
import { getRoutines } from '@/lib/db/routines'
import { getActiveDayState } from '@/lib/db/day-state'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { getUser } from '@/lib/db/users'
import type { WidgetValue } from '@/types/widget'
import type { TrackerLog } from '@/types/log'

interface DashboardContentProps {
  userId: string
  userEmail: string
}

export async function DashboardContent({
  userId,
  userEmail,
}: DashboardContentProps): Promise<React.ReactElement> {
  const supabase = await createServerClient()

  try {
    const [dayState, widgets, trackers, routines, correlationRecords, userProfile] =
      await Promise.all([
        getActiveDayState(supabase),
        getWidgets(supabase),
        getTrackersBasic(supabase),
        getRoutines(supabase),
        supabase
          .from('correlations')
          .select('*')
          .eq('user_id', userId)
          .then(res => res.data || []),
        getUser(userId, supabase),
      ])

    const logDateStr = dayState?.date ?? new Date().toISOString().split('T')[0]
    const rangeStart = `${logDateStr}T00:00:00.000Z`
    const rangeEnd = `${logDateStr}T23:59:59.999Z`

    const maxDays = widgets.reduce((max, w) => Math.max(max, w.days ?? 7), 7)
    const fetchDays = Math.max(maxDays + 7, 14)
    const nDaysAgoDate = new Date()
    nDaysAgoDate.setDate(nDaysAgoDate.getDate() - fetchDays)
    const nDayStart = nDaysAgoDate.toISOString()

    const [todayLogs, nDayLogs] = await Promise.all([
      supabase
        .from('tracker_logs')
        .select('id, tracker_id, fields, logged_at')
        .eq('user_id', userId)
        .gte('logged_at', rangeStart)
        .lte('logged_at', rangeEnd)
        .order('logged_at', { ascending: false })
        .then(res => res.data || []),
      supabase
        .from('tracker_logs')
        .select('id, tracker_id, fields, logged_at')
        .eq('user_id', userId)
        .gte('logged_at', nDayStart)
        .order('logged_at', { ascending: false })
        .limit(500)
        .then(res => res.data || []),
    ])

    const dayStartRoutine = routines.find(r => r.type === 'day_start') ?? null
    const dayEndRoutine = routines.find(r => r.type === 'day_end') ?? null

    const widgetValues: WidgetValue[] = widgets.map(w => {
      try {
        const val = computeWidgetValueOptimized(
          w,
          todayLogs as TrackerLog[],
          nDayLogs as TrackerLog[],
          correlationRecords as CorrelationRecord[],
          trackers
        )

        if ((w.type === 'field_average' || w.type === 'field_total') && w.tracker_id && w.field_id) {
          const sparkDays = getSparklineDays(w)
          const sparkStart = getSparklineStartDate(w)
          const agg = w.type === 'field_average' ? 'average' : 'total'
          const isExcludable = w.period !== 'last_week' && !(w.days === 1 && !w.period)
          const todayStr = new Date().toISOString().split('T')[0]

          // Check if today has any data for this specific field
          const hasTodayFieldData = !isExcludable || (nDayLogs as TrackerLog[]).some(l =>
            l.tracker_id === w.tracker_id &&
            l.logged_at.startsWith(todayStr) &&
            typeof (l.fields as Record<string, unknown>)?.[w.field_id!] === 'number' &&
            Number.isFinite((l.fields as Record<string, unknown>)?.[w.field_id!] as number)
          )
          const todayIsEmpty = isExcludable && !hasTodayFieldData

          // When today has no data:
          //   N-day  → shift sparkline window 1 day back (yesterday-(N-1) → yesterday), set offset=1
          //   this_week → drop today from sparkline (sparkDays - 1), no label offset needed
          let adjSparkDays = sparkDays
          let adjSparkStart = sparkStart
          let trendDayOffset = 0
          if (todayIsEmpty) {
            if (w.period === 'this_week') {
              adjSparkDays = Math.max(sparkDays - 1, 1)
            } else if (!w.period) {
              adjSparkStart = new Date(sparkStart)
              adjSparkStart.setDate(sparkStart.getDate() - 1)
              trendDayOffset = 1
            }
          }

          val.trend = computeDailyPointsFromLogs(
            nDayLogs as TrackerLog[],
            w.tracker_id,
            w.field_id,
            agg,
            adjSparkDays,
            adjSparkStart
          )
          if (trendDayOffset) val.trendDayOffset = trendDayOffset
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

    const targets = userProfile?.targets ?? []
    const todayDateStr = new Date().toISOString().split('T')[0]
    const todayActual = (nDayLogs as TrackerLog[]).filter(l =>
      l.logged_at.startsWith(todayDateStr)
    )
    const corrRecords = correlationRecords as CorrelationRecord[]
    const dailyScore = computeDailyScore(todayActual, targets, corrRecords, trackers)
    const dayScores = computeDailyScores(nDayLogs as TrackerLog[], targets, 30, corrRecords, trackers)

    const emailName = userEmail.split('@')[0] ?? 'there'
    const userName = userProfile?.alias ?? emailName

    const correlationOptions = (
      correlationRecords as Array<{ id: string; name?: string; unit?: string }>
    )
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
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-sm text-red-400">Failed to load dashboard. Please refresh the page.</p>
      </div>
    )
  }
}
