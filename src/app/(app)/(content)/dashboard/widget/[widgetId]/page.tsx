import { notFound, redirect } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import { getWidgets } from '@/lib/db/dashboard'
import { getTrackersBasic } from '@/lib/db/trackers'
import { getLogs } from '@/lib/db/logs'
import { getUser } from '@/lib/db/users'
import { getCorrelation } from '@/lib/db/correlations'
import { evaluateFormula, buildFieldValueMap } from '@/lib/correlator/formula-engine'
import { WidgetDetailClient } from '@/components/dashboard/WidgetDetailClient'
import type { Widget } from '@/types/widget'
import type { TrackerLog } from '@/types/log'
import type { FormulaNode } from '@/types/correlator'

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

/** Extract every unique trackerId referenced in a formula tree. */
function extractTrackerIds(node: FormulaNode): string[] {
  if (node.type === 'field') return node.trackerId ? [node.trackerId] : []
  if (node.type === 'constant') return []
  if (node.type === 'op') return [
    ...extractTrackerIds(node.left),
    ...extractTrackerIds(node.right),
  ]
  return []
}

/** Group logs by their calendar date (YYYY-MM-DD from UTC logged_at). */
function groupByDate(logs: TrackerLog[]): Map<string, TrackerLog[]> {
  const map = new Map<string, TrackerLog[]>()
  for (const log of logs) {
    const date = log.logged_at.split('T')[0]
    if (!map.has(date)) map.set(date, [])
    map.get(date)!.push(log)
  }
  return map
}

const LOG_LIMIT = 2000

export default async function WidgetDetailPage({ params }: Props) {
  const { widgetId } = await params

  const user = await getSafeUser()
  if (!user) redirect('/login')

  const [widgets, trackers, userData] = await Promise.all([
    getWidgets(),
    getTrackersBasic(),
    getUser(),
  ])

  const widget: Widget | undefined = widgets.find(w => w.id === widgetId)
  if (!widget) notFound()

  const tracker = widget.tracker_id
    ? trackers.find(t => t.id === widget.tracker_id)
    : undefined

  const userTargets = userData?.targets ?? []
  const matchingTarget = userTargets.find(t =>
    t.trackerId === widget.tracker_id && t.fieldId === widget.field_id
  )
  const targetValue = matchingTarget ? matchingTarget.value : null

  const fieldDef = tracker?.schema?.find(f => f.fieldId === widget.field_id)
  const unit = fieldDef?.unit ?? ''
  const fieldType = fieldDef?.type ?? 'number'

  const trackerName = tracker?.name ?? widget.label
  const trackerColor = widget.color ?? tracker?.color ?? '#6B7280'

  const { start, end } = buildDateRange(365)
  const allDates = buildDateList(start, end)
  const startISO = start + 'T00:00:00.000Z'
  const endISO = end + 'T23:59:59.999Z'

  let dailyPoints: DailyPoint[] = []

  // ── Correlator — evaluate formula from raw logs per day ──────────────────────
  if (widget.type === 'correlator' && widget.correlation_id) {
    const correlation = await getCorrelation(widget.correlation_id)
    const formula = correlation.formula as FormulaNode

    // Find every tracker the formula needs
    const trackerIds = [...new Set(extractTrackerIds(formula))]

    // Fetch logs for all involved trackers in parallel
    const allLogs: TrackerLog[] = (
      await Promise.all(
        trackerIds.map(tid =>
          getLogs(tid, { limit: LOG_LIMIT, startDate: startISO, endDate: endISO })
        )
      )
    ).flat()

    // Group combined logs by date
    const byDate = groupByDate(allLogs)

    dailyPoints = allDates.map(date => {
      const dayLogs = byDate.get(date)
      if (!dayLogs || dayLogs.length === 0) return { date, value: null }

      const fieldValueMap = buildFieldValueMap(dayLogs)
      const result = evaluateFormula(formula, fieldValueMap)
      return {
        date,
        value: result !== null ? Math.round(result * 10) / 10 : null,
      }
    })

  // ── field_total / field_average ───────────────────────────────────────────────
  } else if (
    (widget.type === 'field_total' || widget.type === 'field_average') &&
    widget.tracker_id && widget.field_id
  ) {
    const logs = await getLogs(widget.tracker_id, {
      limit: LOG_LIMIT,
      startDate: startISO,
      endDate: endISO,
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

  // ── combined_field ────────────────────────────────────────────────────────────
  } else if (widget.type === 'combined_field' && widget.tracker_id) {
    const logs = await getLogs(widget.tracker_id, {
      limit: LOG_LIMIT,
      startDate: startISO,
      endDate: endISO,
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
      return {
        date,
        value: total !== null ? Math.round(total * 10) / 10 : null,
        count: dayLogs.length,
      }
    })

  // ── field_latest / tracker_latest ─────────────────────────────────────────────
  } else if (widget.tracker_id) {
    const logs = await getLogs(widget.tracker_id, {
      limit: LOG_LIMIT,
      startDate: startISO,
      endDate: endISO,
    })
    const byDate = groupByDate(logs)

    if (widget.type === 'field_latest') {
      dailyPoints = allDates.map(date => {
        const dayLogs = byDate.get(date)
        if (!dayLogs || dayLogs.length === 0) return { date, value: null }
        const latestLog = dayLogs[0] // getLogs orders desc by logged_at
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
