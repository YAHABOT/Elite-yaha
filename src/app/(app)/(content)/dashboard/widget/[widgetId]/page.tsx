import { notFound, redirect } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import { getWidgets } from '@/lib/db/dashboard'
import { getTrackersBasic } from '@/lib/db/trackers'
import { getDateRangeStats } from '@/lib/db/daily-stats'
import { getLogs } from '@/lib/db/logs'
import { getUser } from '@/lib/db/users'
import { WidgetDetailClient } from '@/components/dashboard/WidgetDetailClient'
import type { Widget } from '@/types/widget'
import type { DailyStats } from '@/lib/db/daily-stats'
import type { TrackerLog } from '@/types/log'

export type DailyPoint = {
  date: string              // 'YYYY-MM-DD'
  value: number | null
  count?: number            // entry count for aggregate widgets
  logs?: {
    id: string
    logged_at: string
    fields: Record<string, unknown>
  }[]
}

type Props = {
  params: Promise<{ widgetId: string }>
}

function buildDateRange(days: number): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

/** Build an array of consecutive date strings from start to end (inclusive). */
function buildDateList(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T12:00:00Z')
  const endDate = new Date(end + 'T12:00:00Z')
  while (cur <= endDate) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

export default async function WidgetDetailPage({ params }: Props) {
  const { widgetId } = await params

  const user = await getSafeUser()
  if (!user) redirect('/login')

  // Parallel fetch — widgets, trackers, user targets
  const [widgets, trackers, userData] = await Promise.all([
    getWidgets(),
    getTrackersBasic(),
    getUser(),
  ])

  const widget: Widget | undefined = widgets.find(w => w.id === widgetId)
  if (!widget) notFound()

  // Find tracker for this widget
  const tracker = widget.tracker_id
    ? trackers.find(t => t.id === widget.tracker_id)
    : undefined

  // Find target matching this widget's field
  const userTargets = userData?.targets ?? []
  const matchingTarget = userTargets.find(t =>
    t.trackerId === widget.tracker_id && t.fieldId === widget.field_id
  )
  const targetValue = matchingTarget ? matchingTarget.value : null

  // Derive display metadata from tracker schema
  const fieldDef = tracker?.schema?.find(f => f.fieldId === widget.field_id)
  const unit = fieldDef?.unit ?? ''
  const fieldType = fieldDef?.type ?? 'number'

  const trackerName = tracker?.name ?? widget.label
  const trackerColor = widget.color ?? tracker?.color ?? '#6B7280'

  // Build 365-day date range
  const { start, end } = buildDateRange(365)
  const allDates = buildDateList(start, end)

  // Branch on widget type to build DailyPoint[]
  let dailyPoints: DailyPoint[] = []

  const isAggregate = ['field_average', 'field_total', 'correlator', 'combined_field'].includes(widget.type)
  const isLatest = ['field_latest', 'tracker_latest'].includes(widget.type)

  if (isAggregate) {
    const stats: DailyStats[] = await getDateRangeStats(start, end)
    const statsMap = new Map<string, DailyStats>(stats.map(s => [s.date, s]))

    dailyPoints = allDates.map(date => {
      const stat = statsMap.get(date)
      if (!stat) return { date, value: null }

      if (widget.type === 'field_average' && widget.tracker_id && widget.field_id) {
        const fieldStat = stat.results.trackers[widget.tracker_id]?.[widget.field_id]
        return {
          date,
          value: fieldStat ? fieldStat.avg : null,
          count: fieldStat?.count ?? 0,
        }
      }

      if (widget.type === 'field_total' && widget.tracker_id && widget.field_id) {
        const fieldStat = stat.results.trackers[widget.tracker_id]?.[widget.field_id]
        return {
          date,
          value: fieldStat ? fieldStat.sum : null,
          count: fieldStat?.count ?? 0,
        }
      }

      if (widget.type === 'correlator' && widget.correlation_id) {
        const corrVal = stat.results.correlations[widget.correlation_id]
        return {
          date,
          value: corrVal ?? null,
        }
      }

      if (widget.type === 'combined_field') {
        // Sum across all tracker_ids × field_id combinations stored in extra_fields
        // extra_fields contains {field_id, label} entries — each paired with the widget's tracker_id
        // For combined_field, accumulate sum across all tracker fields present in results
        let total: number | null = null
        if (widget.tracker_id && widget.field_id) {
          const fieldStat = stat.results.trackers[widget.tracker_id]?.[widget.field_id]
          if (fieldStat) {
            total = (total ?? 0) + fieldStat.sum
          }
        }
        for (const ef of widget.extra_fields ?? []) {
          const fieldStat = stat.results.trackers[widget.tracker_id ?? '']?.[ef.field_id]
          if (fieldStat) {
            total = (total ?? 0) + fieldStat.sum
          }
        }
        return { date, value: total }
      }

      return { date, value: null }
    })
  } else if (isLatest && widget.tracker_id) {
    // Fetch up to 500 logs for this tracker
    const logs: TrackerLog[] = await getLogs(widget.tracker_id, {
      limit: 500,
      startDate: start + 'T00:00:00.000Z',
      endDate: end + 'T23:59:59.999Z',
    })

    // Group logs by calendar date (use logged_at date)
    const logsByDate = new Map<string, TrackerLog[]>()
    for (const log of logs) {
      const date = log.logged_at.split('T')[0]
      if (!logsByDate.has(date)) logsByDate.set(date, [])
      logsByDate.get(date)!.push(log)
    }

    if (widget.type === 'field_latest') {
      dailyPoints = allDates.map(date => {
        const dayLogs = logsByDate.get(date)
        if (!dayLogs || dayLogs.length === 0) {
          return { date, value: null }
        }
        // Most recent log first (getLogs orders desc by logged_at)
        const latestLog = dayLogs[0]
        const rawVal = widget.field_id ? latestLog.fields[widget.field_id] : null
        const value = typeof rawVal === 'number' ? rawVal : null
        return {
          date,
          value,
          count: dayLogs.length,
          logs: dayLogs.map(l => ({
            id: l.id,
            logged_at: l.logged_at,
            fields: l.fields as Record<string, unknown>,
          })),
        }
      })
    } else {
      // tracker_latest — all logs per day
      dailyPoints = allDates.map(date => {
        const dayLogs = logsByDate.get(date)
        if (!dayLogs || dayLogs.length === 0) {
          return { date, value: null }
        }
        return {
          date,
          value: dayLogs.length,
          count: dayLogs.length,
          logs: dayLogs.map(l => ({
            id: l.id,
            logged_at: l.logged_at,
            fields: l.fields as Record<string, unknown>,
          })),
        }
      })
    }
  } else {
    // Fallback — all null points
    dailyPoints = allDates.map(date => ({ date, value: null }))
  }

  return (
    <WidgetDetailClient
      widget={widget}
      dailyPoints={dailyPoints}
      trackerName={trackerName}
      trackerColor={trackerColor}
      unit={unit}
      fieldType={fieldType}
      target={targetValue}
    />
  )
}
