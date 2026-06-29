import { evaluateFormula, buildFieldValueMap, buildFieldValueMapWithCorrelators, buildCrossTrackerMap } from '@/lib/correlator/formula-engine'
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
  live_workout: '#f43f5e',
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

/**
 * Returns how many sparkline bars to show for a widget's period.
 * this_week → days elapsed Mon→today (1–7)
 * last_week → always 7
 * else       → min(days, 7)
 */
export function getSparklineDays(widget: { days?: number; period?: string }): number {
  if (widget.period === 'this_week') {
    const day = new Date().getDay() // 0=Sun
    return day === 0 ? 7 : day     // Mon=1, Tue=2, … Sun=7
  }
  if (widget.period === 'last_week') return 7
  return Math.min(widget.days ?? 7, 7)
}

/**
 * Returns the start date for the sparkline (oldest bar = index 0).
 * For this_week/last_week, aligns bars to calendar days Mon→today or Mon→Sun.
 */
export function getSparklineStartDate(widget: { days?: number; period?: string }): Date {
  const days = getSparklineDays(widget)
  if (widget.period === 'this_week') {
    return getThisWeekStart()
  }
  if (widget.period === 'last_week') {
    return new Date(getLastWeekRange().start)
  }
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  d.setHours(0, 0, 0, 0)
  return d
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

      // Fetch the tracker so we know its type and schema field info
      const { data: trackerData } = await supabase
        .from('trackers')
        .select('type, schema')
        .eq('id', widget.tracker_id)
        .maybeSingle()

      const trackerType = trackerData?.type as string | undefined
      const schemaField = (trackerData?.schema as { fieldId: string; label?: string; unit?: string }[])?.find(s => s.fieldId === widget.field_id)
      const fieldUnit = schemaField?.unit as string | undefined
      const fieldLabel = schemaField?.label ?? widget.label

      const { data } = await supabase
        .from('tracker_logs')
        .select('fields, logged_at')
        .eq('user_id', userId)
        .eq('tracker_id', widget.tracker_id)
        .gte('logged_at', since)

      // Group logs by local day string (YYYY-MM-DD)
      const logsByDay: Record<string, number[]> = {}
      for (const row of (data ?? [])) {
        const raw = (row.fields as Record<string, unknown>)?.[widget.field_id!]
        if (typeof raw === 'number' && Number.isFinite(raw) && row.logged_at) {
          const dayStr = row.logged_at.substring(0, 10)
          if (!logsByDay[dayStr]) logsByDay[dayStr] = []
          logsByDay[dayStr].push(raw)
        }
      }

      const sumDaily = shouldSumDaily(fieldLabel, fieldUnit, trackerType)

      const dailyValues = Object.values(logsByDay).map(dayVals => {
        if (sumDaily) {
          return dayVals.reduce((a, b) => a + b, 0)
        } else {
          return dayVals.reduce((a, b) => a + b, 0) / dayVals.length
        }
      })

      const avg = dailyValues.length > 0
        ? Math.round((dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length) * 10) / 10
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


export function shouldSumDaily(fieldLabel: string, unit?: string, trackerType?: string): boolean {
  if (trackerType === 'nutrition' || trackerType === 'water') {
    return true
  }

  const labelLower = fieldLabel.toLowerCase()
  const unitLower = unit?.toLowerCase()

  // Explicit average-based fields
  if (
    labelLower.includes('weight') ||
    labelLower.includes('hrv') ||
    labelLower.includes('rhr') ||
    labelLower.includes('heart rate') ||
    labelLower.includes('sleep quality') ||
    labelLower.includes('sleep efficiency') ||
    labelLower.includes('mood') ||
    labelLower.includes('rating') ||
    labelLower.includes('score') ||
    labelLower.includes('temperature') ||
    labelLower.includes('blood pressure')
  ) {
    return false
  }

  // Explicit sum-based units/labels
  if (
    unitLower === 'g' ||
    unitLower === 'mg' ||
    unitLower === 'kcal' ||
    unitLower === 'ml' ||
    unitLower === 'oz' ||
    unitLower === 'steps' ||
    labelLower === 'calories' ||
    labelLower === 'protein' ||
    labelLower === 'carbs' ||
    labelLower === 'fat' ||
    labelLower === 'water' ||
    labelLower.includes('active calories')
  ) {
    return true
  }

  return false
}

/**
 * Compute a single field's value from pre-filtered tracker logs using the widget's aggregation type.
 * trackerLogs must already be filtered to the relevant tracker_id.
 */
function computeFieldValue(
  fieldId: string,
  trackerLogs: TrackerLog[],
  widgetType: string,
  widgetDays: number,
  tracker?: Tracker
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

  if (widgetType === 'field_average') {
    const schemaField = tracker?.schema.find(s => s.fieldId === fieldId)
    const fieldUnit = schemaField?.unit
    const fieldLabel = schemaField?.label ?? ''
    const trackerType = tracker?.type

    const logsByDay: Record<string, number[]> = {}
    for (const log of inWindow) {
      const raw = (log.fields as Record<string, unknown>)?.[fieldId]
      if (typeof raw === 'number' && Number.isFinite(raw) && log.logged_at) {
        const dayStr = log.logged_at.substring(0, 10)
        if (!logsByDay[dayStr]) logsByDay[dayStr] = []
        logsByDay[dayStr].push(raw)
      }
    }

    const sumDaily = shouldSumDaily(fieldLabel, fieldUnit, trackerType)

    const dailyValues = Object.values(logsByDay).map(dayVals => {
      if (sumDaily) {
        return dayVals.reduce((a, b) => a + b, 0)
      } else {
        return dayVals.reduce((a, b) => a + b, 0) / dayVals.length
      }
    })

    return dailyValues.length > 0
      ? Math.round((dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length) * 10) / 10
      : null
  }

  // field_total
  const values = inWindow
    .map(l => (l.fields as Record<string, unknown>)?.[fieldId])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

  if (values.length === 0) return 0
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
          value: computeFieldValue(ef.field_id, todayWidgetLogs, widget.type, widget.days ?? 7, widgetTracker),
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

      const avgTracker = trackers.find(t => t.id === widget.tracker_id)
      const avgSchemaField = avgTracker?.schema.find(s => s.fieldId === widget.field_id)
      const avgUnit = typeof avgSchemaField?.unit === 'string' ? avgSchemaField.unit : undefined
      const avgFieldType = avgSchemaField?.type
      const fieldLabel = avgSchemaField?.label ?? widget.label
      const trackerType = avgTracker?.type

      // Group logs by local day string (YYYY-MM-DD)
      const logsByDay: Record<string, number[]> = {}
      for (const log of widgetLogs) {
        const raw = (log.fields as Record<string, unknown>)?.[widget.field_id!]
        if (typeof raw === 'number' && Number.isFinite(raw) && log.logged_at) {
          const dayStr = log.logged_at.substring(0, 10)
          if (!logsByDay[dayStr]) logsByDay[dayStr] = []
          logsByDay[dayStr].push(raw)
        }
      }

      const sumDaily = shouldSumDaily(fieldLabel, avgUnit, trackerType)

      const dailyValues = Object.values(logsByDay).map(dayVals => {
        if (sumDaily) {
          return dayVals.reduce((a, b) => a + b, 0)
        } else {
          return dayVals.reduce((a, b) => a + b, 0) / dayVals.length
        }
      })

      const avg = dailyValues.length > 0
        ? Math.round((dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length) * 10) / 10
        : null

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
          value: computeFieldValue(ef.field_id, widgetLogs, widget.type, 36500, avgTracker),
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
          value: computeFieldValue(ef.field_id, widgetLogs, widget.type, 36500, totalTracker),
        }
      })

      return { value: total, label: widget.label, unit: totalUnit, fieldType: totalFieldType, extraValues: extraValues.length > 0 ? extraValues : undefined }
    }

    case 'correlator': {
      if (!widget.correlation_id) return { value: null, label: widget.label }
      const correlation = correlations.find(c => c.id === widget.correlation_id)
      if (!correlation) return { value: null, label: widget.label }

      // Always compute sparkline per-day so bars exactly reflect daily formula results
      const sparkDays = getSparklineDays(widget)
      const sparkStart = getSparklineStartDate(widget)
      const correlatorTrend: (number | null)[] = []
      let cumulativeValue = 0
      let dayCount = 0
      let hasDayValue = false

      for (let i = 0; i < sparkDays; i++) {
        const d = new Date(sparkStart)
        d.setDate(sparkStart.getDate() + i)
        const dayStr = d.toISOString().split('T')[0]
        const dayLogs = nDayLogs.filter(l => l.logged_at.startsWith(dayStr))
        const dayCrossTrackerMap = buildCrossTrackerMap(dayLogs, trackers)
        const dayFieldMap = buildFieldValueMapWithCorrelators(dayLogs, correlations, undefined, dayCrossTrackerMap)
        const dayResult = evaluateFormula(correlation.formula, dayFieldMap, undefined, dayCrossTrackerMap)
        const isValid = dayResult !== null && Number.isFinite(dayResult)
        if (isValid) {
          cumulativeValue += dayResult as number
          dayCount++
          hasDayValue = true
        }
        // null for days with no data — keeps the sparkline from dropping to 0
        correlatorTrend.push(isValid ? (dayResult as number) : null)
      }

      // Trim trailing nulls — don't show empty days at the end (e.g. today before data is logged).
      // Count how many are trimmed so the Sparkline can shift day labels back by the same amount.
      let trimmedNulls = 0
      while (correlatorTrend.length > 0 && correlatorTrend[correlatorTrend.length - 1] === null) {
        correlatorTrend.pop()
        trimmedNulls++
      }

      // For period-based widgets (this_week / last_week): VALUE = sum or avg of per-day bars.
      // aggregation='sum' (default): Training Load, Calorie Balance — values accumulate across days.
      // aggregation='avg': Zone 2 %, Sleep Efficiency — daily rates should be averaged, not summed.
      // For N-day widgets: fall back to full-period field map (preserves existing behaviour).
      let result: number | null
      if (widget.period === 'this_week' || widget.period === 'last_week') {
        if (!hasDayValue) {
          result = null
        } else if (widget.aggregation === 'avg') {
          result = dayCount > 0 ? cumulativeValue / dayCount : null
        } else {
          result = cumulativeValue
        }
      } else {
        const correlatorLogs = filterByPeriod(nDayLogs, widget)
        const fullCrossTrackerMap = buildCrossTrackerMap(correlatorLogs, trackers)
        const fieldMap = buildFieldValueMapWithCorrelators(correlatorLogs, correlations, undefined, fullCrossTrackerMap)
        result = evaluateFormula(correlation.formula, fieldMap, undefined, fullCrossTrackerMap)
      }

      return {
        value: result !== null ? Math.round(result * 10) / 10 : null,
        unit: correlation.unit,
        label: widget.label,
        trend: correlatorTrend.some(v => v !== null) ? correlatorTrend : undefined,
        trendDayOffset: trimmedNulls > 0 ? trimmedNulls : undefined,
      }
    }

    case 'combined_field': {
      if (!widget.field_id?.startsWith('combined:')) return { value: null, label: widget.label }
      const parts = widget.field_id.split(':')
      const trackerType = parts[1]
      const normalizedLabel = parts.slice(2).join(':')

      const matchingTrackers = trackers.filter(t => t.type === trackerType)
      if (matchingTrackers.length === 0) return { value: null, label: widget.label }

      const matchingFieldIds = new Set<string>()
      let combinedUnit: string | undefined
      let combinedFieldType: string | undefined
      for (const tracker of matchingTrackers) {
        for (const field of tracker.schema) {
          if (field.label.toLowerCase().trim() === normalizedLabel) {
            matchingFieldIds.add(field.fieldId)
            combinedUnit = combinedUnit ?? (typeof field.unit === 'string' ? field.unit : undefined)
            combinedFieldType = combinedFieldType ?? field.type
          }
        }
      }
      if (matchingFieldIds.size === 0) return { value: null, label: widget.label }

      const filteredLogs = filterByPeriod(nDayLogs, widget)
      const matchingTrackerIds = new Set(matchingTrackers.map(t => t.id))

      let combinedTotal = 0
      let combinedCount = 0
      for (const log of filteredLogs) {
        if (!matchingTrackerIds.has(log.tracker_id)) continue
        for (const [fieldId, val] of Object.entries(log.fields)) {
          if (!matchingFieldIds.has(fieldId)) continue
          const numVal = typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val) : NaN
          if (isNaN(numVal)) continue
          combinedTotal += numVal
          combinedCount++
        }
      }

      const combinedValue = combinedCount > 0 ? combinedTotal : null

      // Compute sparkline: per-day totals for last SPARKLINE_DEFAULT_DAYS days
      const sparkDays = Math.min(widget.days ?? SPARKLINE_DEFAULT_DAYS, SPARKLINE_DEFAULT_DAYS)
      const combinedTrend: number[] = []
      for (let i = sparkDays - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayStr = d.toISOString().split('T')[0]
        let dayTotal = 0
        for (const log of nDayLogs) {
          if (!log.logged_at.startsWith(dayStr)) continue
          if (!matchingTrackerIds.has(log.tracker_id)) continue
          for (const [fieldId, val] of Object.entries(log.fields)) {
            if (!matchingFieldIds.has(fieldId)) continue
            const numVal = typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val as string) : NaN
            if (!isNaN(numVal)) dayTotal += numVal
          }
        }
        combinedTrend.push(dayTotal)
      }

      return {
        value: combinedValue,
        unit: combinedUnit,
        label: widget.label,
        fieldType: combinedFieldType,
        trend: combinedTrend.some(v => v > 0) ? combinedTrend : undefined,
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
 *
 * @param startDate - When provided, generates bars from startDate forward (for this_week/last_week).
 *                    When omitted, counts back nDays from today (legacy/N-day mode).
 */
export function computeDailyPointsFromLogs(
  logs: TrackerLog[],
  trackerId: string,
  fieldId: string,
  aggregation: 'average' | 'total',
  nDays: number,
  startDate?: Date,
  trackers: Tracker[] = []
): number[] {
  const result: number[] = []
  const tracker = trackers.find(t => t.id === trackerId)
  const schemaField = tracker?.schema.find(s => s.fieldId === fieldId)
  const fieldUnit = schemaField?.unit
  const fieldLabel = schemaField?.label ?? ''
  const trackerType = tracker?.type

  for (let i = 0; i < nDays; i++) {
    let d: Date
    if (startDate) {
      d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
    } else {
      d = new Date()
      d.setDate(d.getDate() - (nDays - 1 - i))
    }
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
      const sumDaily = shouldSumDaily(fieldLabel, fieldUnit, trackerType)
      if (sumDaily) {
        result.push(values.reduce((a, b) => a + b, 0))
      } else {
        result.push(Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10)
      }
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
  days: number,
  trackers: Tracker[] = []
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

  const tracker = trackers.find(t => t.id === trackerId)
  const schemaField = tracker?.schema.find(s => s.fieldId === fieldId)
  const fieldUnit = schemaField?.unit
  const fieldLabel = schemaField?.label ?? ''
  const trackerType = tracker?.type

  function computeVal(logs: TrackerLog[]): number | null {
    if (logs.length === 0) return null

    if (aggregation === 'average') {
      // Group by day
      const logsByDay: Record<string, number[]> = {}
      for (const log of logs) {
        const raw = (log.fields as Record<string, unknown>)?.[fieldId]
        if (typeof raw === 'number' && Number.isFinite(raw) && log.logged_at) {
          const dayStr = log.logged_at.substring(0, 10)
          if (!logsByDay[dayStr]) logsByDay[dayStr] = []
          logsByDay[dayStr].push(raw)
        }
      }

      const sumDaily = shouldSumDaily(fieldLabel, fieldUnit, trackerType)

      const dailyValues = Object.values(logsByDay).map(dayVals => {
        if (sumDaily) {
          return dayVals.reduce((a, b) => a + b, 0)
        } else {
          return dayVals.reduce((a, b) => a + b, 0) / dayVals.length
        }
      })

      return dailyValues.length > 0
        ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length
        : null
    }

    // total
    const values = logs
      .map(l => (l.fields as Record<string, unknown>)?.[fieldId])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

    if (values.length === 0) return null
    return values.reduce((a, b) => a + b, 0)
  }

  const current = computeVal(currentLogs)
  const previous = computeVal(prevLogs)
  if (current === null || previous === null || previous === 0) return null
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

function computeTargetActual(
  target: UserTarget,
  dayLogs: TrackerLog[],
  correlations: CorrelationRecord[],
  trackers: Tracker[] = [],
): number {
  if (target.trackerId === '__correlations__') {
    const corr = correlations.find(c => c.id === target.fieldId)
    if (!corr) return 0
    const result = evaluateFormula(corr.formula, buildFieldValueMapWithCorrelators(dayLogs, correlations))
    return result !== null && Number.isFinite(result) ? result : 0
  }
  // Combined cross-tracker target: fieldId = "combined:{type}:{normalizedLabel}"
  if (target.trackerId === '__combined__') {
    const parts = target.fieldId.split(':')
    if (parts.length < 3) return 0
    const [, trackerType, normalizedLabel] = parts
    const matchingTrackers = trackers.filter(t => t.type === trackerType)
    let total = 0
    for (const t of matchingTrackers) {
      const field = t.schema.find(f => f.label.toLowerCase().trim() === normalizedLabel)
      if (!field) continue
      const tLogs = dayLogs.filter(l => l.tracker_id === t.id)
      for (const log of tLogs) {
        const raw = (log.fields as Record<string, unknown>)?.[field.fieldId]
        const num = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
        if (Number.isFinite(num)) total += num
      }
    }
    return total
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
  correlations: CorrelationRecord[] = [],
  trackers: Tracker[] = [],
): number | null {
  const numericTargets = targets.filter(
    t => ['number', 'rating', 'duration'].includes(t.fieldType) && t.value > 0
  )
  if (numericTargets.length === 0) return null

  const pcts = numericTargets.map(target => {
    const actual = computeTargetActual(target, dayLogs, correlations, trackers)
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
  correlations: CorrelationRecord[] = [],
  trackers: Tracker[] = [],
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
        const actual = computeTargetActual(target, dayLogs, correlations, trackers)
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
