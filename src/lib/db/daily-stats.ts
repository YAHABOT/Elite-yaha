import { createServerClient } from '@/lib/supabase/server'
import { getSafeUser } from '@/lib/supabase/auth'
import type { SupabaseClient } from '@supabase/supabase-js'
import { evaluateFormula, buildFieldValueMap } from '@/lib/correlator/formula-engine'
import type { Correlation } from '@/types/correlator'
import type { TrackerLog } from '@/types/log'

// ── Types ────────────────────────────────────────────────────────────────────

export type DailyFieldStat = {
  sum: number
  avg: number
  count: number
}

/** Per-tracker field aggregates for one day: { [fieldId]: { sum, avg, count } } */
export type DailyTrackerStats = Record<string, DailyFieldStat>

/** Full results blob stored in daily_stats.results */
export type DailyStatsResults = {
  trackers: Record<string, DailyTrackerStats>       // trackerId → fieldId → stat
  correlations: Record<string, number | null>        // correlationId → computed value
}

export type DailyStats = {
  id: string
  user_id: string
  date: string  // 'YYYY-MM-DD'
  results: DailyStatsResults
  created_at: string
  updated_at: string
}

// ── Core recompute ────────────────────────────────────────────────────────────

/**
 * Recompute and upsert daily_stats for a given user+date.
 * Called after every log create/update/delete to keep daily_stats fresh.
 *
 * Uses the already-open supabase client + resolved userId from the caller
 * to avoid extra auth round-trips.
 */
export async function recomputeDayStats(
  date: string,
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  // 1. Fetch all logs for this user on this date
  const dayStart = `${date}T00:00:00.000Z`
  const nextDay = new Date(date)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const dayEnd = `${nextDay.toISOString().split('T')[0]}T00:00:00.000Z`

  const { data: rawLogs } = await supabase
    .from('tracker_logs')
    .select('id, tracker_id, user_id, fields, logged_at, source, created_at')
    .eq('user_id', userId)
    .gte('logged_at', dayStart)
    .lt('logged_at', dayEnd)

  const logs: TrackerLog[] = (rawLogs ?? []) as TrackerLog[]

  // 2. Per-tracker, per-field aggregates (numeric values only)
  const aggs: Record<string, Record<string, { sum: number; count: number }>> = {}

  for (const log of logs) {
    const tid = log.tracker_id
    if (!aggs[tid]) aggs[tid] = {}

    for (const [fieldId, value] of Object.entries(log.fields)) {
      if (typeof value !== 'number' || isNaN(value)) continue
      if (!aggs[tid][fieldId]) aggs[tid][fieldId] = { sum: 0, count: 0 }
      aggs[tid][fieldId].sum += value
      aggs[tid][fieldId].count += 1
    }
  }

  const trackerResults: Record<string, DailyTrackerStats> = {}
  for (const [tid, fields] of Object.entries(aggs)) {
    trackerResults[tid] = {}
    for (const [fieldId, { sum, count }] of Object.entries(fields)) {
      trackerResults[tid][fieldId] = {
        sum: round2(sum),
        avg: count > 0 ? round2(sum / count) : 0,
        count,
      }
    }
  }

  // 3. Evaluate each correlation formula against today's summed field values
  const correlationResults: Record<string, number | null> = {}

  const { data: corrRows } = await supabase
    .from('correlations')
    .select('id, formula')
    .eq('user_id', userId)

  if (corrRows && corrRows.length > 0) {
    const fieldValueMap = buildFieldValueMap(logs)
    for (const row of corrRows) {
      try {
        const value = evaluateFormula(row.formula as Correlation['formula'], fieldValueMap)
        correlationResults[row.id as string] = value !== null ? round2(value) : null
      } catch {
        correlationResults[row.id as string] = null
      }
    }
  }

  // 4. Upsert — UNIQUE(user_id, date) guarantees one row per day
  const results: DailyStatsResults = {
    trackers: trackerResults,
    correlations: correlationResults,
  }

  await supabase
    .from('daily_stats')
    .upsert({ user_id: userId, date, results }, { onConflict: 'user_id,date' })
}

// ── Read helpers ──────────────────────────────────────────────────────────────

/** Fetch daily_stats for a single date. Returns null if no data for that day. */
export async function getDayStats(date: string): Promise<DailyStats | null> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { data } = await supabase
    .from('daily_stats')
    .select('id, user_id, date, results, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle()

  return (data as DailyStats | null) ?? null
}

/** Fetch daily_stats for a date range (inclusive). Ordered oldest → newest. */
export async function getDateRangeStats(
  startDate: string,
  endDate: string
): Promise<DailyStats[]> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('daily_stats')
    .select('id, user_id, date, results, created_at, updated_at')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) throw new Error(`Failed to fetch daily stats: ${error.message}`)
  return (data ?? []) as DailyStats[]
}

// ── Utility ───────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
