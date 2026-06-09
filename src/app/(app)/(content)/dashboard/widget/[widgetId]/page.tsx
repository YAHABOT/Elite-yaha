import { notFound, redirect } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import { getWidgets } from '@/lib/db/dashboard'
import { getTrackersBasic } from '@/lib/db/trackers'
import { getDateRangeStats } from '@/lib/db/daily-stats'
import { getLogs } from '@/lib/db/logs'
import { getUser } from '@/lib/db/users'
import { WidgetDetailClient } from '@/components/dashboard/WidgetDetailClient'
import type { Widget } from '@/types/widget'
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

  // Helper: group a raw log array by calendar date (YYYY-MM-DD from logged_at)
  function groupByDate(logs: TrackerLog[]): Map<string, TrackerLog[]> {
    const map = new Map<string, TrackerLog[]>()
    for (const log of logs) {
      const date = log.logged_at.split('T')[0]
      if (!map.has(date)) map.set(date, [])
      map.get(date)!.push(log)
    }
    return map
  }

  if (widget.type === 'correlator' && widget.correlation_id) {
    // Correlator — still uses daily_stats (formula evaluation lives there)
    const stats = await getDateRangeStats(start, end)
    const statsMap = new Map(stats.map(s => [s.date, s]))
    dailyPoints = allDates.map(date => {
      const stat = statsMap.get(date)
      const corrVal = stat?.results.correlations[widget.correlation_id!]
      return { date, value: corrVal ?? null }
    })

  } else if (
    (widget.type === 'field_total' || widget.type === 'field_average') &&
    widget.tracker_id && widget.field_id
  ) {
    // Aggregate from raw logs — reliable regardless of daily_stats backfill status
    const logs: TrackerLog[] = await getLogs(widget.tracker_id, {
      limit: 2000,
      startDate: start + 'T00:00:00.000Z',
      endDate: end + 'T23:59:59.999Z',
    })
    const byDate = groupByDate(logs)

    dailyPoints = allDates.map(date => {
      const dayLogs = byDate.get(date)
      if (!dayLogs || dayLogs.length === 0) return { date, value: null }

      const nums = dayLogs
        .map(l => l.fields[widget.field_id!])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v))

      if (nums.length === 0) return { date, value: null }

      const sum = nums.reduce((a, b) => a + b, 0)
      const value = widget.type === 'field_average'
        ? Math.round((sum / nums.length) * 10) / 10
        : Math.round(sum * 10) / 10

      return { date, value, count: dayLogs.length }
    })

  } else if (widget.type === 'combined_field' && widget.tracker_id) {
    // Combined — sum across primary field + extra_fields for the same tracker
    const logs: TrackerLog[] = await getLogs(widget.tracker_id, {
      limit: 2000,
      startDate: start + 'T00:00:00.000Z',
      endDate: end + 'T23:59:59.999Z',
    })
    const byDate = groupByDate(logs)

    const fieldIds = [
      widget.field_id,
      ...(widget.extra_fields ?? []).map((ef: { field_id: string }) => ef.field_id),
    ].filter(Boolean) as string[]

    dailyPoints = allDates.map(date => {
      const dayLogs = byDate.get(date)
      if (!dayLogs || dayLogs.length === 0) return { date, value: null }

      let total: number | null = null
      for (const log of dayLogs) {
        for (const fid of fieldIds) {
          const v = log.fields[fid]
          if (typeof v === 'number' && !isNaN(v)) {
            total = (total ?? 0) + v
          }
        }
      }
      return { date, value: total !== null ? Math.round(total * 10) / 10 : null, count: dayLogs.length }
    })

  } else if (widget.tracker_id) {
    // field_latest / tracker_latest
    const logs: TrackerLog[] = await getLogs(widget.tracker_id, {
      limit: 2000,
      startDate: start + 'T00:00:00.000Z',
      endDate: end + 'T23:59:59.999Z',
    })
    const byDate = groupByDate(logs)

    if (widget.type === 'field_latest') {
      dailyPoints = allDates.map(date => {
        const dayLogs = byDate.get(date)
        if (!dayLogs || dayLogs.length === 0) return { date, value: null }
        // getLogs orders desc by logged_at — first entry is latest
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
      // tracker_latest
      dailyPoints = allDates.map(date => {
        const dayLogs = byDate.get(date)
        if (!dayLogs || dayLogs.length === 0) return { date, value: null }
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
