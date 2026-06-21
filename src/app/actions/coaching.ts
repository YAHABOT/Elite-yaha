'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getSafeUser } from '@/lib/supabase/auth'

export type TimelineType = 'morning_briefing' | 'evening_briefing' | 'weekly_audit' | 'medical_report'
export type ReadinessColor = 'GREEN' | 'YELLOW' | 'RED'

export type TimelineItem = {
  id: string
  type: TimelineType
  title: string
  date: Date
  timestamp: string // HH:mm format
  tags: string[]
  preview: string
  content: string
  // Morning briefing enriched fields for card preview
  readinessScore?: number | null
  readinessColor?: ReadinessColor | null
  sessionType?: string | null
}

/** Derives a human-readable session type label from the pre_workout_fueling text. */
function deriveSessionType(fueling: string | null | undefined): string {
  if (!fueling) return 'Training Day'
  const fl = fueling.toLowerCase()
  if (fl.includes('rest day') || fl.trimStart().startsWith('n/a')) return 'Rest Day'
  if (fl.includes('long run') || fl.includes('zone 2')) return 'Long Run'
  if (fl.includes('group class') || fl.includes('hyrox')) return 'HYROX Group Class'
  if (fl.includes('interval') || fl.includes('threshold')) return 'Interval Run'
  if (fl.includes('open gym') || fl.includes('strength')) return 'Open Gym'
  return 'Training Day'
}

function extractPreview(markdown: string | null | undefined): string {
  if (!markdown) return 'No content available.'
  const clean = markdown
    .replace(/[#*_]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
  return clean.substring(0, 150) + (clean.length > 150 ? '...' : '')
}

function getAthleteName(uuid: string): string {
  if (uuid === '44ef9aae-79d7-4bc9-8eea-7d8a55964813') return 'Armaan'
  if (uuid === '4c74333b-18e6-465a-a62a-523a4ad2999b') return 'Violet'
  return uuid
}

// ---------------------------------------------------------------------------
// MORNING BRIEFING DETAIL — full structured data type
// ---------------------------------------------------------------------------
export type MorningBriefingDetail = {
  id: string
  date: Date
  athleteName: string

  // ── Top stats ──────────────────────────────────────────────────────────────
  readinessScore: number | null
  readinessColor: ReadinessColor | null
  sleepScore: number | null
  energyScore: number | null
  hrv: number | null
  rhr: number | null
  sleepDuration: string | null    // "7h 23m"
  stepsYesterday: number | null
  activeCals: number | null
  lastKnownWeight: number | null  // kg

  // ── Yesterday's nutrition ─────────────────────────────────────────────────
  nutritionCals: number | null
  nutritionProtein: number | null
  nutritionFat: number | null
  nutritionCarbs: number | null

  // ── Supplements ───────────────────────────────────────────────────────────
  supplements: string[]

  // ── 15 derived metrics (Advanced Recovery Metrics) ────────────────────────
  digestiveBurdenIndex: number | null
  digestiveRecoveryClearance: number | null
  autonomicBalanceIndex: number | null
  activeRecoveryEfficiency: number | null
  activeRecoveryCatalystIndex: number | null
  sleepEfficiency: number | null
  asiHrv: number | null
  asiRecovery: number | null
  asiRhr: number | null
  htrHrv: number | null
  htrRecovery: number | null
  sleepExtensionResponse: number | null
  sicknessRecoveryDeficit: number | null
  sorenessToStrainRatio: number | null
  trainingStrainTolerance: number | null

  // ── Written briefing sections ──────────────────────────────────────────────
  accountabilityComplianceCheck: string | null
  previousDayNutritionAnalysis: string | null
  readinessReasoning: string | null
  preWorkoutFueling: string | null
  eliteTechniqueFocus: string | null
  pacingStrategy: string | null
  workoutTrackingPrompt: string | null
  workoutTrackingPromptPm: string | null

  sessionType: string
}

// ---------------------------------------------------------------------------
// FEED — unified timeline list
// ---------------------------------------------------------------------------
export async function fetchTimelineFeedAction(): Promise<TimelineItem[]> {
  const user = await getSafeUser()
  if (!user) return []

  const supabase = await createServerClient()
  const athleteName = getAthleteName(user.id)
  const items: TimelineItem[] = []

  // 1. Morning Briefings — from coaching_daily_readiness (athlete-scoped)
  const { data: briefs } = await supabase
    .from('coaching_daily_readiness')
    .select('id, date, recovery_score, recovery_color, readiness_reasoning, pre_workout_fueling')
    .eq('user_id', athleteName)
    .not('readiness_reasoning', 'is', null)
    .neq('readiness_reasoning', '')
    .order('date', { ascending: false })
    .limit(20)

  if (briefs) {
    briefs.forEach(b => {
      const [year, month, day] = b.date.split('-').map(Number)
      const d = new Date(year, month - 1, day, 8, 0, 0)
      const sessionType = deriveSessionType(b.pre_workout_fueling)
      items.push({
        id: b.id,
        type: 'morning_briefing',
        title: 'MORNING BRIEFING',
        date: d,
        timestamp: '08:00',
        tags: ['Readiness', sessionType],
        preview: extractPreview(b.readiness_reasoning),
        content: '',
        readinessScore: b.recovery_score ?? null,
        readinessColor: (b.recovery_color as ReadinessColor) ?? null,
        sessionType,
      })
    })
  }

  // 2. Evening Briefings — from coaching_daily_readiness (athlete-scoped)
  const { data: readiness } = await supabase
    .from('coaching_daily_readiness')
    .select('id, date, post_workout_verdict, strain_score')
    .eq('user_id', athleteName)
    .not('post_workout_verdict', 'is', null)
    .neq('post_workout_verdict', '')
    .order('date', { ascending: false })
    .limit(20)

  if (readiness) {
    readiness.forEach(r => {
      const [year, month, day] = r.date.split('-').map(Number)
      const d = new Date(year, month - 1, day, 20, 0, 0)
      items.push({
        id: r.id,
        type: 'evening_briefing',
        title: 'EVENING BRIEFING',
        date: d,
        timestamp: '20:00',
        tags: ['Workout Verdict', 'Recovery', `Strain: ${r.strain_score || 'N/A'}`],
        preview: extractPreview(r.post_workout_verdict),
        content: r.post_workout_verdict || '',
      })
    })
  }

  // 3. Weekly Audits (athlete-scoped)
  const { data: audits } = await supabase
    .from('coaching_weekly_audits')
    .select('*')
    .eq('user_id', athleteName)
    .order('week_end_date', { ascending: false })
    .limit(10)

  if (audits) {
    audits.forEach(a => {
      const [year, month, day] = a.week_end_date.split('-').map(Number)
      const d = new Date(year, month - 1, day, 18, 0, 0)
      items.push({
        id: a.id,
        type: 'weekly_audit',
        title: 'WEEKLY AUDIT',
        date: d,
        timestamp: '18:00',
        tags: ['Performance', 'Metrics'],
        preview: extractPreview(a.audit_markdown),
        content: a.audit_markdown || '',
      })
    })
  }

  // 4. Medical Reports (athlete-scoped)
  const { data: medical } = await supabase
    .from('coaching_medical_reports')
    .select('*')
    .eq('user_id', athleteName)
    .order('date', { ascending: false })
    .limit(10)

  if (medical) {
    medical.forEach(m => {
      const [year, month, day] = m.date.split('-').map(Number)
      const d = new Date(year, month - 1, day, 12, 0, 0)
      items.push({
        id: m.id,
        type: 'medical_report',
        title: m.title?.toUpperCase() || 'MEDICAL REPORT',
        date: d,
        timestamp: '12:00',
        tags: ['Clinical', m.report_type || 'Report'],
        preview: m.summary || extractPreview(m.notes),
        content: `### Summary\n${m.summary}\n\n### Doctor Recommendations\n${m.doctor_recommendations}\n\n### Notes\n${m.notes}`,
      })
    })
  }

  // Sort unified items: newest first
  items.sort((a, b) => b.date.getTime() - a.date.getTime())

  return items
}

// ---------------------------------------------------------------------------
// MORNING BRIEFING DETAIL — rich structured fetch
// ---------------------------------------------------------------------------
export async function fetchMorningBriefingDetailAction(id: string): Promise<MorningBriefingDetail | null> {
  const user = await getSafeUser()
  if (!user) return null

  const supabase = await createServerClient()
  const athleteName = getAthleteName(user.id)

  // Primary: coaching_daily_readiness — athlete-scoped for security
  const { data: r } = await supabase
    .from('coaching_daily_readiness')
    .select('*')
    .eq('id', id)
    .eq('user_id', athleteName) // CRITICAL: athlete isolation
    .single()

  if (!r) return null

  const [year, month, day] = r.date.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 8, 0, 0))

  // Safe timezone-independent calculation for yesterday's date string
  const currentDate = new Date(Date.UTC(year, month - 1, day))
  currentDate.setUTCDate(currentDate.getUTCDate() - 1)
  const prevDateStr = currentDate.toISOString().split('T')[0]

  const startDate = `${prevDateStr}T00:00:00.000Z`
  const endDate = `${r.date}T23:59:59.999Z`

  const { data: rawLogs } = await supabase
    .from('tracker_logs')
    .select('tracker_id, fields, logged_at')
    .eq('user_id', user.id)
    .gte('logged_at', startDate)
    .lte('logged_at', endDate)

  const logs = rawLogs || []

  // Split into today and yesterday logs based on date
  const todayLogs = logs.filter(l => l.logged_at.startsWith(r.date))
  const yesterdayLogs = logs.filter(l => l.logged_at.startsWith(prevDateStr))

  // Determine tracker IDs based on athlete
  const sleepTrackerId = athleteName === 'Armaan' 
    ? '35c69757-5d4f-41bb-b947-0511cd82e330' 
    : 'efeb7017-6668-4e53-aaef-4a60e954e44a'
    
  const foodTrackerId = athleteName === 'Armaan' 
    ? 'af889eb3-0761-4f97-8fbb-d62278ec2d76' 
    : '009625d3-ecc8-48ed-a64a-0c25e2493dac'
    
  const activityTrackerId = athleteName === 'Armaan' 
    ? 'f2bd77d9-7501-46c3-a5f4-882f3d82bae2' 
    : 'e8b5c984-9b6b-4fe3-8a50-15dc8fd18c94'

  // ── 1. Sleep data (Today) ──
  const sleepLog = todayLogs.find(l => l.tracker_id === sleepTrackerId)
  let sleepScore: number | null = null
  let energyScore: number | null = null
  let hrv: number | null = null
  let rhr: number | null = null
  let sleepDurationMin: number | null = null

  if (sleepLog) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const f = sleepLog.fields as Record<string, any> || {}
    if (athleteName === 'Armaan') {
      sleepScore = f.fld_1774521516412_y8r6 != null ? Number(f.fld_1774521516412_y8r6) : null
      energyScore = f.fld_1774521533816_0boq != null ? Number(f.fld_1774521533816_0boq) : null
      hrv = f.fld_1778945903377_mmz2 != null ? Number(f.fld_1778945903377_mmz2) : null
      rhr = f.fld_1774521588336_xlkb != null ? Number(f.fld_1774521588336_xlkb) : null
      sleepDurationMin = f.fld_1774522628410_1mno != null ? Number(f.fld_1774522628410_1mno) : null
    } else {
      sleepScore = f.fld_001 != null ? Number(f.fld_001) : null
      energyScore = null
      hrv = f.fld_1779654669234_snzx != null ? Number(f.fld_1779654669234_snzx) : null
      rhr = f.fld_003 != null ? Number(f.fld_003) : null
      sleepDurationMin = f.fld_002 != null ? Number(f.fld_002) : null
    }
  }

  // Helper: format sleep duration from minutes (or seconds) to "Xh Ym"
  function formatSleep(mins: number | null): string | null {
    if (mins == null || isNaN(mins) || mins <= 0) return null
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  }

  // ── 2. Nutrition data (Yesterday) ──
  const yesterdayFoodLogs = yesterdayLogs.filter(l => l.tracker_id === foodTrackerId)
  let nutritionCals: number | null = null
  let nutritionProtein: number | null = null
  let nutritionFat: number | null = null
  let nutritionCarbs: number | null = null

  const nutrition = { cals: 0, protein: 0, fat: 0, carbs: 0, count: 0 }
  for (const log of yesterdayFoodLogs) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const f = log.fields as Record<string, any> || {}
    if (athleteName === 'Armaan') {
      const c = Number(f.fld_1774452630176_lryh || 0)
      const p = Number(f.fld_1774452699543_7vxs || 0)
      const cb = Number(f.fld_1774452735170_c698 || 0)
      const ft = Number(f.fld_1774452741950_h2p7 || 0)
      if (c || p || cb || ft) {
        nutrition.cals += c
        nutrition.protein += p
        nutrition.carbs += cb
        nutrition.fat += ft
        nutrition.count++
      }
    } else {
      const c = Number(f.fld_002 || 0)
      const p = Number(f.fld_003 || 0)
      const cb = Number(f.fld_004 || 0)
      const ft = Number(f.fld_005 || 0)
      if (c || p || cb || ft) {
        nutrition.cals += c
        nutrition.protein += p
        nutrition.carbs += cb
        nutrition.fat += ft
        nutrition.count++
      }
    }
  }

  if (nutrition.count > 0) {
    nutritionCals = Math.round(nutrition.cals)
    nutritionProtein = Math.round(nutrition.protein)
    nutritionFat = Math.round(nutrition.fat)
    nutritionCarbs = Math.round(nutrition.carbs)
  }

  // ── 3. Overview data (Yesterday) ──
  const yesterdayActivityLog = yesterdayLogs.find(l => l.tracker_id === activityTrackerId)
  let stepsYesterday: number | null = null
  let activeCals: number | null = null

  if (yesterdayActivityLog) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const f = yesterdayActivityLog.fields as Record<string, any> || {}
    if (athleteName === 'Armaan') {
      stepsYesterday = f.fld_1774521241168_6mo1 ? Number(f.fld_1774521241168_6mo1) : null
      activeCals = f.fld_1774521475669_391w ? Number(f.fld_1774521475669_391w) : null
    } else {
      stepsYesterday = f.fld_1775834347892_0w5f ? Number(f.fld_1775834347892_0w5f) : null
      activeCals = f.fld_1775834353749_mztv ? Number(f.fld_1775834353749_mztv) : null
    }
  }

  // ── 4. Last Known Weight (on or before date) ──
  let lastKnownWeight: number | null = null
  if (athleteName === 'Armaan') {
    const { data: weightLogs } = await supabase
      .from('tracker_logs')
      .select('fields')
      .eq('tracker_id', 'f2bd77d9-7501-46c3-a5f4-882f3d82bae2')
      .lte('logged_at', `${r.date}T23:59:59.999Z`)
      .order('logged_at', { ascending: false })
      .limit(1)
    
    if (weightLogs && weightLogs.length > 0) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const fields = weightLogs[0].fields as Record<string, any>
      const w = fields?.fld_1774521227352_bis6
      if (w != null) {
        lastKnownWeight = Number(w)
      }
    }
  }

  // ── 5. Supplements (Today) ──
  const supplements: string[] = []
  if (athleteName === 'Armaan') {
    const todaySuppLog = todayLogs.find(l => l.tracker_id === 'f0edd06f-62e4-4da9-8866-29fd9582398b')
    if (todaySuppLog) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const f = todaySuppLog.fields as Record<string, any> || {}
      if (f.fld_creatine_g != null && Number(f.fld_creatine_g) > 0) {
        supplements.push(`Creatine: ${f.fld_creatine_g}g`)
      }
      if (f.fld_magnesium_g != null && Number(f.fld_magnesium_g) > 0) {
        supplements.push(`Magnesium: ${f.fld_magnesium_g}g`)
      }
    }
  }

  return {
    id: r.id,
    date,
    athleteName,

    readinessScore: r.recovery_score ?? null,
    readinessColor: (r.recovery_color as ReadinessColor) ?? null,
    sleepScore,
    energyScore,
    hrv,
    rhr,
    sleepDuration: formatSleep(sleepDurationMin),
    stepsYesterday,
    activeCals,
    lastKnownWeight,

    nutritionCals,
    nutritionProtein,
    nutritionFat,
    nutritionCarbs,

    supplements,

    // 15 derived metrics
    digestiveBurdenIndex: r.digestive_burden_index ?? null,
    digestiveRecoveryClearance: r.digestive_recovery_clearance ?? null,
    autonomicBalanceIndex: r.autonomic_balance_index ?? null,
    activeRecoveryEfficiency: r.active_recovery_efficiency ?? null,
    activeRecoveryCatalystIndex: r.active_recovery_catalyst_index ?? null,
    sleepEfficiency: r.sleep_efficiency ?? null,
    asiHrv: r.asi_hrv ?? null,
    asiRecovery: r.asi_recovery ?? null,
    asiRhr: r.asi_rhr ?? null,
    htrHrv: r.htr_hrv ?? null,
    htrRecovery: r.htr_recovery ?? null,
    sleepExtensionResponse: r.sleep_extension_response ?? null,
    sicknessRecoveryDeficit: r.sickness_recovery_deficit ?? null,
    sorenessToStrainRatio: r.soreness_to_strain_ratio ?? null,
    trainingStrainTolerance: r.training_strain_tolerance ?? null,

    // Written sections
    accountabilityComplianceCheck: r.accountability_compliance_check ?? null,
    previousDayNutritionAnalysis: r.previous_day_nutrition_analysis ?? null,
    readinessReasoning: r.readiness_reasoning ?? null,
    preWorkoutFueling: r.pre_workout_fueling ?? null,
    eliteTechniqueFocus: r.elite_technique_focus ?? null,
    pacingStrategy: r.pacing_strategy ?? null,
    workoutTrackingPrompt: r.workout_tracking_prompt ?? null,
    workoutTrackingPromptPm: r.workout_tracking_prompt_pm ?? null,

    sessionType: deriveSessionType(r.pre_workout_fueling),
  }
}

// ---------------------------------------------------------------------------
// GENERIC REPORT — used by evening briefing / weekly audit / medical report
// ---------------------------------------------------------------------------
export async function fetchTimelineReportAction(type: TimelineType, id: string) {
  const user = await getSafeUser()
  if (!user) return null

  const supabase = await createServerClient()
  const athleteName = getAthleteName(user.id)

  if (type === 'morning_briefing') {
    // Route handled by fetchMorningBriefingDetailAction — shouldn't reach here
    return null
  }

  if (type === 'evening_briefing') {
    const { data } = await supabase
      .from('coaching_daily_readiness')
      .select('*')
      .eq('id', id)
      .eq('user_id', athleteName)
      .single()
    if (!data) return null
    const [year, month, day] = data.date.split('-').map(Number)
    return {
      title: 'Evening Briefing',
      markdown: data.post_workout_verdict,
      date: new Date(year, month - 1, day, 20, 0, 0),
    }
  }

  if (type === 'weekly_audit') {
    const { data } = await supabase
      .from('coaching_weekly_audits')
      .select('*')
      .eq('id', id)
      .eq('user_id', athleteName)
      .single()
    if (!data) return null
    const [year, month, day] = data.week_end_date.split('-').map(Number)
    return {
      title: 'Weekly Audit',
      markdown: data.audit_markdown,
      date: new Date(year, month - 1, day, 18, 0, 0),
    }
  }

  if (type === 'medical_report') {
    const { data } = await supabase
      .from('coaching_medical_reports')
      .select('*')
      .eq('id', id)
      .eq('user_id', athleteName)
      .single()
    if (!data) return null
    const [year, month, day] = data.date.split('-').map(Number)
    return {
      title: data.title || 'Medical Report',
      markdown: `### Summary\n${data.summary}\n\n### Recommendations\n${data.doctor_recommendations}\n\n### Notes\n${data.notes}`,
      date: new Date(year, month - 1, day, 12, 0, 0),
    }
  }

  return null
}
