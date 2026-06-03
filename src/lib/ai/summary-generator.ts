import { GoogleGenerativeAI } from '@google/generative-ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SummaryType, SummaryContent, LinkedField } from '@/types/summary'
import type { UserTarget } from '@/lib/db/users'
import { evaluateFormula, buildFieldValueMap } from '@/lib/correlator/formula-engine'
import type { FormulaNode } from '@/types/correlator'
import {
  getSummaryConfigByUserId,
  getPreviousSummary,
  upsertSummary,
} from '@/lib/db/summaries'
import { getDailyScoresForPeriod } from '@/lib/db/scores'
import type { DailyScoreRecord } from '@/lib/db/scores'

const GEMINI_MODEL = 'gemini-3.1-flash-lite'

function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  return new GoogleGenerativeAI(apiKey)
}

/** Returns YYYY-MM-DD */
function dateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Format seconds → "Xh Ym" */
function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

type TrackerLog = {
  tracker_id: string
  fields: Record<string, unknown>
  logged_at: string
}

/** Aggregate linked field data from logs for the prompt */
function aggregateLinkedFields(
  linkedFields: LinkedField[],
  logs: TrackerLog[],
  targets: UserTarget[]
): string {
  const lines: string[] = []

  for (const lf of linkedFields) {
    const relevantLogs = logs.filter(l => l.tracker_id === lf.trackerId)

    // Aggregate by day first so avg = per-day average, not per-entry average.
    // A nutrition tracker with 4 meals/day would otherwise report avg ~700 kcal
    // instead of avg ~2,800 kcal/day.
    const dailyTotals = new Map<string, number>()
    let entryCount = 0
    for (const log of relevantLogs) {
      const val = log.fields[lf.fieldId]
      if (typeof val !== 'number') continue
      const day = log.logged_at.split('T')[0]
      dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + val)
      entryCount++
    }

    if (entryCount === 0) {
      lines.push(`- ${lf.trackerName} · ${lf.fieldLabel}: no data logged`)
      continue
    }

    const dailySums = Array.from(dailyTotals.values())
    const sum = dailySums.reduce((a, b) => a + b, 0)
    const avg = sum / dailySums.length  // average of daily totals
    const daysLogged = dailySums.length

    const isDuration = lf.fieldType === 'duration'
    const fmt = (n: number) => isDuration ? fmtDuration(n) : `${Math.round(n * 10) / 10}${lf.unit ? ' ' + lf.unit : ''}`

    // Find target if set — annotate met/missed so the AI doesn't misread the direction
    const target = targets.find(t => t.fieldId === lf.fieldId || (t.trackerName === lf.trackerName && t.fieldLabel === lf.fieldLabel))
    const targetStr = target
      ? (() => {
          const tFmt = isDuration ? fmtDuration(target.value) : `${target.value}${lf.unit ? ' ' + lf.unit : ''}`
          const hit = (target.direction ?? 'above') === 'below' ? avg <= target.value : avg >= target.value
          return ` · Target: ${tFmt} — ${hit ? '✓ MET' : '✗ MISSED'}`
        })()
      : ''

    lines.push(`- ${lf.trackerName} · ${lf.fieldLabel}: avg/day ${fmt(avg)} · total ${fmt(sum)} · ${daysLogged} days logged${targetStr}`)
  }

  return lines.join('\n')
}

/** Builds the per-day target compliance section for the AI prompt */
function buildDailyBreakdown(dailyScores: DailyScoreRecord[]): string {
  if (dailyScores.length === 0) return ''

  const lines = dailyScores.map(ds => {
    const hitList = ds.achievements.filter(a => a.hit).map(a => a.fieldLabel)
    const missList = ds.achievements.filter(a => !a.hit).map(a => {
      const gap = ds.achievements.find(x => x.fieldLabel === a.fieldLabel)
      return gap ? `${a.fieldLabel} (${gap.pct}%)` : a.fieldLabel
    })
    const hitStr = hitList.length > 0 ? `hit: ${hitList.join(', ')}` : 'no targets hit'
    const missStr = missList.length > 0 ? ` · missed: ${missList.join(', ')}` : ''
    return `- ${ds.date}: score ${ds.score}/100 (${ds.targets_hit}/${ds.targets_count} targets) — ${hitStr}${missStr}`
  })

  return lines.join('\n')
}

function buildSummaryPrompt(params: {
  type: SummaryType
  periodStart: string
  periodEnd: string
  instructions: string
  linkedFields: LinkedField[]
  logs: TrackerLog[]
  targets: UserTarget[]
  dailyScores: DailyScoreRecord[]
  prevContent?: SummaryContent | null
}): string {
  const { type, periodStart, periodEnd, instructions, linkedFields, logs, targets, dailyScores, prevContent } = params
  const periodLabel = type === 'weekly' ? 'week' : 'month'
  const dataSection = aggregateLinkedFields(linkedFields, logs, targets)
  const dailySection = buildDailyBreakdown(dailyScores)
  const prevSection = prevContent
    ? `\nPREVIOUS ${periodLabel.toUpperCase()} METRICS (for delta comparison):\n${prevContent.metrics.map(m => `- ${m.label}: ${m.value}${m.unit ? ' ' + m.unit : ''}`).join('\n')}`
    : ''

  return `You are a personal health coach AI. Generate a structured ${periodLabel} health summary.

PERIOD: ${periodStart} to ${periodEnd}

USER INSTRUCTIONS:
${instructions || 'Summarise the key health metrics for this period. Highlight wins and areas for improvement. End with one coaching note.'}

LINKED DATA FOR THIS PERIOD:
${dataSection || 'No linked data available.'}
${dailySection ? `\nDAILY SCORE & TARGET COMPLIANCE:\n${dailySection}` : ''}
${prevSection}

Respond ONLY with valid JSON (no markdown fences). Use exactly this structure:
{
  "coachSummary": "3-5 sentence narrative summary written directly to the user",
  "score": 82,
  "metrics": [
    {"label": "Sleep Avg", "value": "7h 16m", "unit": null, "delta": "+12m"},
    {"label": "Avg Protein", "value": "171", "unit": "g/day", "delta": null}
  ],
  "highlights": [
    "Protein under target on Tuesday and Thursday",
    "Longest sleep streak: 4 nights above 7h"
  ]
}

Rules:
- score: 0-100 integer (omit if insufficient data); base it on average of daily scores if provided
- metrics: include one entry per linked field with a meaningful aggregate (avg, total, or count)
- delta: compare to previous period values if available, otherwise null
- highlights: 2-5 notable items — personal bests, target misses, streaks, specific days that stood out
- Mention specific targets missed (by name and day) in highlights when data is available
- Keep coachSummary warm, direct, and under 80 words
- If a field has no data, omit it from metrics
- CRITICAL: each linked field line shows "✓ MET" or "✗ MISSED" — use ONLY these annotations to judge target compliance. Do NOT re-derive compliance from the numbers yourself. If a field shows "✓ MET", it was met — do not contradict this in the narrative.
`
}

export async function generateSummaryForUser(
  userId: string,
  type: SummaryType,
  periodStart: Date,
  periodEnd: Date,
  supabase: SupabaseClient
): Promise<void> {
  const config = await getSummaryConfigByUserId(userId, type, supabase)
  if (!config?.enabled) return

  const periodStartStr = dateStr(periodStart)
  const periodEndStr = dateStr(periodEnd)

  // Fetch logs for the period
  const { data: rawLogs } = await supabase
    .from('tracker_logs')
    .select('tracker_id, fields, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', `${periodStartStr}T00:00:00.000Z`)
    .lte('logged_at', `${periodEndStr}T23:59:59.999Z`)
    .order('logged_at', { ascending: true })

  const logs = (rawLogs ?? []) as TrackerLog[]

  // Compute correlation values per day and inject as synthetic logs so aggregateLinkedFields
  // can find them — correlations are formulas, not stored in tracker_logs directly
  // Fall back to trackerId check for linked fields saved before isCorrelation property existed
  const corrLinkedFields = config.linked_fields.filter(lf => lf.isCorrelation || lf.trackerId === '__correlations__')
  if (corrLinkedFields.length > 0 && logs.length > 0) {
    const { data: corrRows } = await supabase
      .from('correlations')
      .select('id, formula')
      .eq('user_id', userId)
      .in('id', corrLinkedFields.map(lf => lf.fieldId))

    if (corrRows && corrRows.length > 0) {
      // Group logs by calendar date
      const logsByDay = new Map<string, TrackerLog[]>()
      for (const log of logs) {
        const day = log.logged_at.split('T')[0]
        const bucket = logsByDay.get(day) ?? []
        bucket.push(log)
        logsByDay.set(day, bucket)
      }
      // For each day evaluate each formula and push a synthetic log entry
      for (const [day, dayLogs] of logsByDay) {
        const fieldMap = buildFieldValueMap(dayLogs as Parameters<typeof buildFieldValueMap>[0])
        for (const corr of corrRows) {
          const result = evaluateFormula(corr.formula as FormulaNode, fieldMap)
          if (result !== null) {
            logs.push({
              tracker_id: '__correlations__',
              fields: { [corr.id]: result },
              logged_at: `${day}T12:00:00.000Z`,
            })
          }
        }
      }
    }
  }

  // Fetch user targets
  const { data: userRow } = await supabase
    .from('users')
    .select('targets')
    .eq('id', userId)
    .maybeSingle()
  const targets: UserTarget[] = (userRow?.targets ?? []) as UserTarget[]

  // Fetch previous period for delta + daily scores for target compliance breakdown
  const [prevSummary, dailyScores] = await Promise.all([
    getPreviousSummary(userId, type, periodStartStr, supabase),
    getDailyScoresForPeriod(userId, periodStartStr, periodEndStr, supabase),
  ])

  const prompt = buildSummaryPrompt({
    type,
    periodStart: periodStartStr,
    periodEnd: periodEndStr,
    instructions: config.instructions,
    linkedFields: config.linked_fields,
    logs,
    targets,
    dailyScores,
    prevContent: prevSummary?.content ?? null,
  })

  // DEBUG — visible in dev server terminal. Remove once summary accuracy is confirmed.
  console.log('[SummaryGenerator DEBUG]', {
    period: `${periodStartStr} → ${periodEndStr}`,
    linkedFields: config.linked_fields.map(lf => `${lf.trackerName}.${lf.fieldLabel} (trackerId=${lf.trackerId}, fieldId=${lf.fieldId}, isCorrelation=${lf.isCorrelation})`),
    totalLogs: logs.length,
    syntheticCorrelationLogs: logs.filter(l => l.tracker_id === '__correlations__').length,
    dailyScoreRows: dailyScores.length,
    dataSection: aggregateLinkedFields(config.linked_fields, logs, targets),
    dailyBreakdown: buildDailyBreakdown(dailyScores),
  })

  const genAI = getGenAI()
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  let content: SummaryContent
  try {
    // Strip any accidental markdown fences
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    content = JSON.parse(clean) as SummaryContent
  } catch {
    console.error('[SummaryGenerator] JSON parse failed:', text.substring(0, 200))
    content = {
      coachSummary: text.substring(0, 500),
      metrics: [],
      highlights: [],
    }
  }

  await upsertSummary(userId, type, periodStartStr, periodEndStr, content, supabase)
  console.log(`[SummaryGenerator] Generated ${type} summary for user ${userId} (${periodStartStr} → ${periodEndStr})`)
}

/** Compute the period dates for a given type based on "today" */
export function getPeriodDates(type: SummaryType, today: Date): { start: Date; end: Date } {
  if (type === 'weekly') {
    // Previous Monday → previous Sunday
    const dayOfWeek = today.getUTCDay() // 0=Sun, 1=Mon ... 6=Sat
    const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 + 7
    const lastMonday = new Date(today)
    lastMonday.setUTCDate(today.getUTCDate() - daysToLastMonday)
    const lastSunday = new Date(lastMonday)
    lastSunday.setUTCDate(lastMonday.getUTCDate() + 6)
    return { start: lastMonday, end: lastSunday }
  } else {
    // Previous full calendar month
    const firstOfThisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    const firstOfLastMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
    const lastOfLastMonth = new Date(firstOfThisMonth)
    lastOfLastMonth.setUTCDate(lastOfLastMonth.getUTCDate() - 1)
    return { start: firstOfLastMonth, end: lastOfLastMonth }
  }
}
