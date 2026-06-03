import { evaluateFormula, buildFieldValueMap } from '@/lib/correlator/formula-engine'
import type { Widget, WidgetValue, ExtraFieldValue } from '@/types/widget'
import type { TrackerLog } from '@/types/log'
import type { FormulaNode } from '@/types/correlator'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tracker } from '@/types/tracker'
import type { UserTarget } from '@/lib/db/users'

export type CorrelationRecord = { id: string; formula: FormulaNode; unit: string }

const SPARKLINE_DEFAULT_DAYS = 7

// EX13 FIX: Map tracker types to dashboard colors
const TRACKER_TYPE_TO_COLOR: Record<string, string> = {
  nutrition: '#10b981',
  sleep: '#3b82f6',
  workout: '#f97316',
  mood: '#a855f7',
  water: '#06b6d4',
  custom: '#6B7280', // fallback for custom trackers
}

export function getColorForTrackerType(trackerType: string): string {
  return TRACKER_TYPE_TO_COLOR[trackerType] ?? '#6B7280'
}

function getNDaysAgo(nDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() - nDays)
  return d.toISOString()
}

function getThisWeekStart(): Date {
  const d = new Date()
  const day = d.getDay() // 0=Sun
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function getLastWeekRange(): { start: string; end: string } {
  const thisMonday = getThisWeekStart()
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(lastMonday.getDate() - 7)
  const lastSunday = new Date(thisMonday)
  lastSunday.setMilliseconds(-1)
  return { start: lastMonday.toISOString(), end: lastSunday.toISOString() }
}

function filterByPeriod(logs: TrackerLog[], widget: { days?: number; period?: string }): TrackerLog[] {
  if (widget.period === 'this_week') {
    const start = getThisWeekStart().toISOString()
    return logs.filter(l => l.logged_at >= start)
  }
  if (widget.period === 'last_week') {
    const { start, end } = getLastWeekRange()
    return logs.filter(l => l.logged_at >= start && l.logged_at <= end)
  }
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (widget.days ?? 7))
  return logs.filter(l => l.logged_at >= cutoff.toISOString())
}

async function getSparklineData(
  widget: Widget,
  nDays: number,
  supabase: SupabaseClient,
  userId: string,
): Promise<number[]> {
  if (!widget.tracker_id || !widget.field_id) return []

  const since = getNDaysAgo(nDays)

  const { data } = await supabase
    .from('tracker_logs')
    .select('fields, logged_at')
    .eq('user_id', userId)
    .eq('tracker_id', widget.tracker_id)
    .gte('logged_at', since)
    .order('logged_at', { ascending: true })

  if (!data) return []

  // Extract values and handle potential non-numeric fields gracefully
  const values = data
    .map(row => {
      const raw = (row.fields as Record<string, unknown>)?.[widget.field_id!]
      return typeof raw === 'number' ? raw : null
    })
    .filter((v): v is number => v !== null && Number.isFinite(v))

  return values
}

/**
 * Optimized computation that accepts pre-fetched supabase client and userId
 * to avoid redundant network calls during batch processing.
 */
export async function computeWidgetValue(
  widget: Widget, 
  supabase: SupabaseClient, 
  userId: string
): Promise<WidgetValue> {
  const nDays = widget.days ?? SPARKLINE_DEFAULT_DAYS
  const since = getNDaysAgo(nDays)

  switch (widget.type) {
    case 'field_latest': {
      if (!widget.tracker_id || !widget.field_id) {
        return { value: null, label: widget.label }
      }

      // Latest value and Sparkline are fetched in parallel
      const [latestRes, trend] = await Promise.all([
        supabase
          .from('tracker_logs')
          .select('fields')
          .eq('user_id', userId)
          .eq('tracker_id', widget.tracker_id)
          .order('logged_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        getSparklineData(widget, SPARKLINE_DEFAULT_DAYS, supabase, userId)
      ])

      const raw = (latestRes.data?.fields as Record<string, unknown> | null)?.[widget.field_id] ?? null
      const value = raw !== null && (typeof raw === 'number' || typeof raw === 'string') ? raw : null

      return { value, label: widget.label, trend }
    }

    case 'field_average': {
      if (!widget.tracker_id || !widget.field_id) {
        return { value: null, label: widget.label }
      }

      const { data } = await supabase
        .from('tracker_logs')
        .select('fields')
        .eq('user_id', userId)
        .eq('tracker_id', widget.tracker_id)
        .gte('logged_at', since)

      const values = (data ?? [])
        .map(row => {
          const raw = (row.fields as Record<string, unknown>)?.[widget.field_id!]
          return typeof raw === 'number' ? raw : null
        })
        .filter((v): v is number => v !== null && Number.isFinite(v))

      const avg = values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
        : null

      return { value: avg, label: widget.label }
    }

    case 'field_total': {
      if (!widget.tracker_id || !widget.field_id) {
        return { value: null, label: widget.label }
      }

      const { data } = await supabase
        .from('tracker_logs')
        .select('fields')
        .eq('user_id', userId)
        .eq('tracker_id', widget.tracker_id)
        .gte('logged_at', since)

      const values = (data ?? [])
        .map(row => {
          const raw = (row.fields as Record<string, unknown>)?.[widget.field_id!]
          return typeof raw === 'number' ? raw : null
        })
        .filter((v): v is number => v !== null && Number.isFinite(v))

      // EX15 FIX: Return 0 instead of null when no values present
      const total = values.length > 0
        ? values.reduce((a, b) => a + b, 0)
        : 0

      return { value: total, label: widget.label }
    }

    case 'correlator': {
      if (!widget.correlation_id) {
        return { value: null, label: widget.label }
      }

      const [{ data: correlation }, { data: logs }] = await Promise.all([
        supabase
          .from('correlations')
          .select('formula, unit')
          .eq('id', widget.correlation_id)
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('tracker_logs')
          .select('id, tracker_id, user_id, fields, logged_at, source, created_at')
          .eq('user_id', userId)
          .gte('logged_at', since)
      ])

      if (!correlation) return { value: null, label: widget.label }

      const fieldMap = buildFieldValueMap((logs ?? []) as TrackerLog[])
      const result = evaluateFormula(correlation.formula, fieldMap)

      return {
        value: result !== null ? Math.round(result * 10) / 10 : null,
        unit: correlation.unit as string | undefined,
        label: widget.label,
      }
    }
    default:
      return { value: null, label: widget.label }
  }
}


/**
 * Compute a single field's value from pre-filtered tracker logs using the widget's aggregation type.
 * trackerLogs must already be filtered to the relevant tracker_id.
 */
function computeFieldValue(
  fieldId: string,
  trackerLogs: TrackerLog[],
  widgetType: string,
  widgetDays: number
): number | string | null {
  if (widgetType === 'field_latest') {
    const raw = (trackerLogs[0]?.fields as Record<string, unknown>)?.[fieldId] ?? null
    return raw !== null && (typeof raw === 'number' || typeof raw === 'string') ? raw : null
  }

  // For field_average and field_total: filter by days window
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - widgetDays)
  const cutoffStr = cutoff.toISOString()
  const inWindow = trackerLogs.filter(l => l.logged_at >= cutoffStr)

  const values = inWindow
    .map(l => (l.fields as Record<string, unknown>)?.[fieldId])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

  if (values.length === 0) return widgetType === 'field_total' ? 0 : null

  if (widgetType === 'field_average') {
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
  }
  // field_total
  return values.reduce((a, b) => a + b, 0)
}

export function computeWidgetValueOptimized(
  widget: Widget,
  todayLogs: TrackerLog[],  // today only — for field_latest
  nDayLogs: TrackerLog[],   // N days back — for field_average, field_total, correlator
  correlations: CorrelationRecord[],
  trackers: Tracker[] = []
): WidgetValue {
  switch (widget.type) {
    case 'field_latest': {
      if (!widget.tracker_id || !widget.field_id) return { value: null, label: widget.label }

      // Today's logs for sparkline (ordered desc)
      const todayWidgetLogs = todayLogs.filter(l => l.tracker_id === widget.tracker_id)

      // For the displayed value: fall back to nDayLogs if nothing logged today
      // Deduplicate by id so today's logs aren't counted twice (nDayLogs includes today)
      const seenIds = new Set<string>()
      const allWidgetLogs = [...todayLogs, ...nDayLogs]
        .filter(l => l.tracker_id === widget.tracker_id)
        .filter(l => { if (seenIds.has(l.id)) return false; seenIds.add(l.id); return true })

      // Most recent log that actually has this field set
      const latestLog = allWidgetLogs.find(l => {
        const v = (l.fields as Record<string, unknown>)?.[widget.field_id!]
        return v !== null && v !== undefined
      })
      const raw = (latestLog?.fields as Record<string, unknown> | null)?.[widget.field_id] ?? null
      const value = raw !== null && (typeof raw === 'number' || typeof raw === 'string') ? raw : null

      // Trend (Sparkline) - today's logs in chronological order
      const trend = [...todayWidgetLogs]
        .reverse()
        .map(l => (l.fields as Record<string, unknown>)?.[widget.field_id!])
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

      const widgetTracker = trackers.find(t => t.id === widget.tracker_id)
      const schemaField = widgetTracker?.schema.find(s => s.fieldId === widget.field_id)
      const fieldUnit = typeof schemaField?.unit === 'string' ? schemaField.unit : undefined
      const fieldType = schemaField?.type

      const extraValues: ExtraFieldValue[] = (widget.extra_fields ?? []).map(ef => {
        const schemaField = widgetTracker?.schema.find(s => s.fieldId === ef.field_id)
        const unit = typeof schemaField?.unit === 'string' ? schemaField.unit
          : typeof ef.unit === 'string' ? ef.unit
          : undefined
        return {
          field_id: ef.field_id,
          label: ef.label,
          unit,
          fieldType: schemaField?.type,
          value: computeFieldValue(ef.field_id, todayWidgetLogs, widget.type, widget.days ?? 7),
        }
      })

      return { value, label: widget.label, trend, unit: fieldUnit, fieldType, extraValues: extraValues.length > 0 ? extraValues : undefined }
    }

    case 'field_average': {
      if (!widget.tracker_id || !widget.field_id) return { value: null, label: widget.label }

      const allAvgLogs = nDayLogs.filter(l => l.tracker_id === widget.tracker_id)
      const widgetLogs = (!widget.period && widget.days === 1)
        ? todayLogs.filter(l => l.tracker_id === widget.tracker_id)
        : filterByPeriod(allAvgLogs, widget)

      const values = widgetLogs
        .map(l => (l.fields as Record<string, unknown>)?.[widget.field_id!])
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

      const avg = values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
        : null
      const avgTracker = trackers.find(t => t.id === widget.tracker_id)
      const avgSchemaField = avgTracker?.schema.find(s => s.fieldId === widget.field_id)
      const avgUnit = typeof avgSchemaField?.unit === 'string' ? avgSchemaField.unit : undefined
      const avgFieldType = avgSchemaField?.type

      const extraValues: ExtraFieldValue[] = (widget.extra_fields ?? []).map(ef => {
        const schemaField = avgTracker?.schema.find(s => s.fieldId === ef.field_id)
        const unit = typeof schemaField?.unit === 'string' ? schemaField.unit
          : typeof ef.unit === 'string' ? ef.unit
          : undefined
        return {
          field_id: ef.field_id,
          label: ef.label,
          unit,
          fieldType: schemaField?.type,
          value: computeFieldValue(ef.field_id, widgetLogs, widget.type, 36500),
        }
      })

      return { value: avg, label: widget.label, unit: avgUnit, fieldType: avgFieldType, extraValues: extraValues.length > 0 ? extraValues : undefined }
    }

    case 'field_total': {
      if (!widget.tracker_id || !widget.field_id) return { value: null, label: widget.label }

      const allTotalLogs = nDayLogs.filter(l => l.tracker_id === widget.tracker_id)
      const widgetLogs = (!widget.period && widget.days === 1)
        ? todayLogs.filter(l => l.tracker_id === widget.tracker_id)
        : filterByPeriod(allTotalLogs, widget)

      const values = widgetLogs
        .map(l => (l.fields as Record<string, unknown>)?.[widget.field_id!])
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

      const total = values.length > 0
        ? values.reduce((a, b) => a + b, 0)
        : 0
      const totalTracker = trackers.find(t => t.id === widget.tracker_id)
      const totalSchemaField = totalTracker?.schema.find(s => s.fieldId === widget.field_id)
      const totalUnit = typeof totalSchemaField?.unit === 'string' ? totalSchemaField.unit : undefined
      const totalFieldType = totalSchemaField?.type

      const extraValues: ExtraFieldValue[] = (widget.extra_fields ?? []).map(ef => {
        const schemaField = totalTracker?.schema.find(s => s.fieldId === ef.field_id)
        const unit = typeof schemaField?.unit === 'string' ? schemaField.unit
          : typeof ef.unit === 'string' ? ef.unit
          : undefined
        return {
          field_id: ef.field_id,
          label: ef.label,
          unit,
          fieldType: schemaField?.type,
          value: computeFieldValue(ef.field_id, widgetLogs, widget.type, 36500),
        }
      })

      return { value: total, label: widget.label, unit: totalUnit, fieldType: totalFieldType, extraValues: extraValues.length > 0 ? extraValues : undefined }
    }

    case 'correlator': {
      if (!widget.correlation_id) return { value: null, label: widget.label }
      const correlation = correlations.find(c => c.id === widget.correlation_id)
      if (!correlation) return { value: null, label: widget.label }

      // Use nDayLogs for correlator (filter by widget's days window)
      const widgetDaysAgo = new Date()
      widgetDaysAgo.setDate(widgetDaysAgo.getDate() - (widget.days ?? 7))
      const widgetDaysAgoStr = widgetDaysAgo.toISOString()
      const correlatorLogs = nDayLogs.filter(l => l.logged_at >= widgetDaysAgoStr)

      const fieldMap = buildFieldValueMap(correlatorLogs)
      const result = evaluateFormula(correlation.formula, fieldMap)

      return {
        value: result !== null ? Math.round(result * 10) / 10 : null,
        unit: correlation.unit,
        label: widget.label,
      }
    }

    case 'tracker_latest': {
      if (!widget.tracker_id) return { value: null, label: widget.label }
      const latestLog = [...todayLogs, ...nDayLogs].find(l => l.tracker_id === widget.tracker_id)
      if (!latestLog) return { value: null, label: widget.label }
      const tracker = trackers.find(t => t.id === widget.tracker_id)
      const schema = tracker?.schema ?? []
      const fields = latestLog.fields as Record<string, unknown>
      const extraValues: ExtraFieldValue[] = Object.entries(fields)
        .map(([fieldId, val]) => {
          const schemaDef = schema.find(s => s.fieldId === fieldId)
          return {
            field_id: fieldId,
            label: schemaDef?.label ?? fieldId,
            unit: schemaDef?.unit,
            value: (typeof val === 'number' || typeof val === 'string') ? val : null,
          }
        })
        .filter(ev => ev.value !== null)
      return { value: null, label: widget.label, loggedAt: latestLog.logged_at, extraValues }
    }

    default:
      return { value: null, label: widget.label }
  }
}

/**
 * Groups logs by calendar date and computes one value per day for a given field.
 * Returns array oldest→newest, length = nDays.
 */
export function computeDailyPointsFromLogs(
  logs: TrackerLog[],
  trackerId: string,
  fieldId: string,
  aggregation: 'average' | 'total',
  nDays: number
): number[] {
  const result: number[] = []
  for (let i = nDays - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayLogs = logs.filter(
      l => l.tracker_id === trackerId && l.logged_at.startsWith(dateStr)
    )
    const values = dayLogs
      .map(l => (l.fields as Record<string, unknown>)?.[fieldId])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    if (values.length === 0) {
      result.push(0)
    } else if (aggregation === 'average') {
      result.push(Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10)
    } else {
      result.push(values.reduce((a, b) => a + b, 0))
    }
  }
  return result
}

/**
 * Computes % change between current and previous period for a tracker field.
 * Returns null if either period has no data or previous is 0.
 */
export function computeDeltaPct(
  nDayLogs: TrackerLog[],
  trackerId: string,
  fieldId: string,
  aggregation: 'average' | 'total',
  days: number
): number | null {
  const now = new Date()
  const periodStart = new Date(now); periodStart.setDate(now.getDate() - days)
  const prevStart = new Date(now); prevStart.setDate(now.getDate() - days * 2)

  const currentLogs = nDayLogs.filter(
    l => l.tracker_id === trackerId && l.logged_at >= periodStart.toISOString()
  )
  const prevLogs = nDayLogs.filter(
    l => l.tracker_id === trackerId &&
    l.logged_at >= prevStart.toISOString() &&
    l.logged_at < periodStart.toISOString()
  )

  function computeVal(logs: TrackerLog[]): number | null {
    const values = logs
      .map(l => (l.fields as Record<string, unknown>)?.[fieldId])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    if (values.length === 0) return null
    if (aggregation === 'average') return values.reduce((a, b) => a + b, 0) / values.length
    return values.reduce((a, b) => a + b, 0)
  }

  const current = computeVal(currentLogs)
  const previous = computeVal(prevLogs)
  if (current === null || previous === null || previous === 0) return null
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

function computeTargetActual(target: UserTarget, dayLogs: TrackerLog[], correlations: CorrelationRecord[]): number {
  if (target.trackerId === '__correlations__') {
    const corr = correlations.find(c => c.id === target.fieldId)
    if (!corr) return 0
    const result = evaluateFormula(corr.formula, buildFieldValueMap(dayLogs))
    return result !== null && Number.isFinite(result) ? result : 0
  }
  const trackerLogs = dayLogs.filter(l => l.tracker_id === target.trackerId)
  const values = trackerLogs
    .map(l => (l.fields as Record<string, unknown>)?.[target.fieldId])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  return values.reduce((a, b) => a + b, 0)
}

/**
 * Computes today's score (0–100) from targets + a single day's logs.
 * Returns null if no numeric targets exist.
 */
export function computeDailyScore(
  dayLogs: TrackerLog[],
  targets: UserTarget[],
  correlations: CorrelationRecord[] = []
): number | null {
  const numericTargets = targets.filter(
    t => ['number', 'rating', 'duration'].includes(t.fieldType) && t.value > 0
  )
  if (numericTargets.length === 0) return null

  const pcts = numericTargets.map(target => {
    const actual = computeTargetActual(target, dayLogs, correlations)
    if (target.direction === 'below') {
      return actual <= target.value ? 100 : Math.max(0, (target.value / actual) * 100)
    }
    return Math.min(actual / target.value, 1) * 100
  })

  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
}

export type DayScore = {
  date: string        // YYYY-MM-DD
  label: string       // 'MON', 'TUE', ..., 'TODAY'
  score: number       // 0–100 (or log count if no targets)
  logCount: number    // always computed, used as fallback
  hasTargets: boolean
}

/**
 * Computes per-day scores for last N days.
 * Returns array oldest→newest with date + label.
 */
export function computeDailyScores(
  allLogs: TrackerLog[],
  targets: UserTarget[],
  nDays: number,
  correlations: CorrelationRecord[] = []
): DayScore[] {
  const numericTargets = targets.filter(
    t => ['number', 'rating', 'duration'].includes(t.fieldType) && t.value > 0
  )
  const hasTargets = numericTargets.length > 0
  const result: DayScore[] = []

  for (let i = nDays - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayLogs = allLogs.filter(l => l.logged_at.startsWith(dateStr))
    const logCount = dayLogs.length

    let score = 0
    if (hasTargets) {
      const pcts = numericTargets.map(target => {
        const actual = computeTargetActual(target, dayLogs, correlations)
        if (target.direction === 'below') {
          return actual <= target.value ? 100 : Math.max(0, (target.value / actual) * 100)
        }
        return Math.min(actual / target.value, 1) * 100
      })
      score = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    } else {
      score = logCount
    }

    const label = i === 0
      ? 'TODAY'
      : d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()

    result.push({ date: dateStr, label, score, logCount, hasTargets })
  }

  return result
}
