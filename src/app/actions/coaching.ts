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
  // Evening briefing enriched fields for card preview
  strainScore?: number | null
  preCarbsCompliant?: boolean | null
  preProteinCompliant?: boolean | null
  postCarbsCompliant?: boolean | null
  postProteinCompliant?: boolean | null
}

/** Derives a human-readable session type label from the pre_workout_fueling text. */
function deriveSessionType(fueling: string | null | undefined): string {
  if (!fueling) return 'Training Day'
  const fl = manualLower(fueling)
  if (fl.includes('rest day') || fl.trim().startsWith('n/a')) return 'Rest Day'
  if (fl.includes('group class') || fl.includes('hyrox class') || fl.includes('regybox')) return 'HYROX Group Class'
  if (fl.includes('open gym') || fl.includes('strength')) return 'Open Gym'
  if (fl.includes('interval') || fl.includes('threshold')) return 'Interval Run'
  if (fl.includes('long run') || fl.includes('zone 2')) return 'Long Run'
  return 'Training Day'
}

function manualLower(str: string): string {
  return str.toLowerCase()
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
  if (uuid === 'e169b44a-2c1d-4a64-9ef5-ae3217f22341') return 'Roohan'
  return uuid
}

function parseTimeToMin(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') {
    if (val > 300) {
      return Math.round(val / 60)
    }
    return Math.round(val)
  }
  const str = String(val).trim().toLowerCase()
  if (!str) return 0
  
  if (str.includes(':')) {
    const parts = str.split(':').map(Number)
    if (parts.length === 2) {
      const [m, s] = parts
      return m + (s >= 30 ? 1 : 0)
    } else if (parts.length === 3) {
      const [h, m, s] = parts
      return h * 60 + m + (s >= 30 ? 1 : 0)
    }
  }
  
  const parsed = Number(str)
  if (!isNaN(parsed)) {
    if (parsed > 300) {
      return Math.round(parsed / 60)
    }
    return Math.round(parsed)
  }
  
  return 0
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
  totalCalsYesterday: number | null
  distanceActiveYesterday: number | null
  lastKnownWeight: number | null  // kg


  nutritionCals: number | null
  nutritionProtein: number | null
  nutritionFat: number | null
  nutritionCarbs: number | null

  // ── Carb Compliance ───────────────────────────────────────────────────────
  targetCarbsPre: number | null
  actualCarbsPre: number | null
  preCarbsCompliant: string | boolean | null
  targetCarbsPost: number | null
  actualCarbsPost: number | null
  postCarbsCompliant: string | boolean | null


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
  workoutTrackingPrompt1: string | null
  workoutTrackingPrompt2: string | null
  workoutTrackingPrompt3: string | null

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
    .select('id, date, post_workout_verdict, strain_score, pre_carbs_compliant, pre_protein_compliant, post_carbs_compliant, post_protein_compliant')
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
        strainScore: r.strain_score != null ? Number(r.strain_score) : null,
        preCarbsCompliant: r.pre_carbs_compliant ?? null,
        preProteinCompliant: r.pre_protein_compliant ?? null,
        postCarbsCompliant: r.post_carbs_compliant ?? null,
        postProteinCompliant: r.post_protein_compliant ?? null,
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

  // Fetch user trackers dynamically from trackers table
  const { data: userTrackers } = await supabase
    .from('trackers')
    .select('id, type, name')
    .eq('user_id', user.id)

  const foodTracker = userTrackers?.find(t => t.type === 'nutrition')
  const foodTrackerId = foodTracker?.id || (athleteName === 'Armaan' 
    ? 'af889eb3-0761-4f97-8fbb-d62278ec2d76' 
    : '009625d3-ecc8-48ed-a64a-0c25e2493dac')
    
  const sleepTracker = userTrackers?.find(t => t.type === 'sleep')
  const sleepTrackerId = sleepTracker?.id || (athleteName === 'Armaan' 
    ? '35c69757-5d4f-41bb-b947-0511cd82e330' 
    : 'efeb7017-6668-4e53-aaef-4a60e954e44a')

  const activityTracker = userTrackers?.find(t => t.name === 'Overview' || t.name === 'Daily Activity' || t.type === 'custom')
  const activityTrackerId = activityTracker?.id || (athleteName === 'Armaan' 
    ? 'f2bd77d9-7501-46c3-a5f4-882f3d82bae2' 
    : 'e8b5c984-9b6b-4fe3-8a50-15dc8fd18c94')

  const workoutTrackerIds = userTrackers?.filter(t => t.type === 'workout' || t.type === 'live_workout').map(t => t.id) || []
  if (workoutTrackerIds.length === 0) {
    if (athleteName === 'Armaan') {
      workoutTrackerIds.push('a8424250-333c-4c7f-9f81-164afe01ed76', '88c9ddde-0f8c-4cf1-b827-180f1de41512', 'd3b22449-ecf1-4325-b5ed-0e26abc93c78', 'd655b418-4010-4a13-a073-849272db332f')
    } else {
      workoutTrackerIds.push('d56f0546-9b38-4d00-84e4-8afd1474a394', '0ce9a8c0-de10-4ed1-9a33-a5a7b0c3ad85', '8059508d-431e-48ed-90b2-b1bcdc5cffdc', 'c2debce9-c98d-4a9c-9c62-83e1e70fef3c')
    }
  }

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
      sleepDurationMin = f.fld_1774522628410_1mno != null ? Math.round(Number(f.fld_1774522628410_1mno) / 60) : null
    } else {
      sleepScore = f.fld_001 != null ? Number(f.fld_001) : null
      energyScore = null
      hrv = f.fld_1779654669234_snzx != null ? Number(f.fld_1779654669234_snzx) : null
      rhr = f.fld_003 != null ? Number(f.fld_003) : null
      sleepDurationMin = f.fld_002 != null ? Math.round(Number(f.fld_002) / 60) : null
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
  let totalCalsYesterday: number | null = null
  let distanceActiveYesterday: number | null = null

  if (yesterdayActivityLog) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const f = yesterdayActivityLog.fields as Record<string, any> || {}
    if (athleteName === 'Armaan') {
      stepsYesterday = f.fld_1774521241168_6mo1 ? Number(f.fld_1774521241168_6mo1) : null
      activeCals = f.fld_1774521475669_391w ? Number(f.fld_1774521475669_391w) : null
      totalCalsYesterday = f.fld_1774521276691_em6c ? Number(f.fld_1774521276691_em6c) : null
      distanceActiveYesterday = f.fld_1774521256192_x766 ? Number(f.fld_1774521256192_x766) : null
    } else {
      stepsYesterday = f.fld_1775834347892_0w5f ? Number(f.fld_1775834347892_0w5f) : null
      totalCalsYesterday = f.fld_1775834353749_mztv ? Number(f.fld_1775834353749_mztv) : null
      activeCals = null
      distanceActiveYesterday = null
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
  } else {
    // For Violetta, fetch from baseline questionnaires
    const { data: quest } = await supabase
      .from('coaching_baseline_questionnaires')
      .select('weight_kg')
      .eq('user_id', 'Violet')
      .maybeSingle()
    if (quest && quest.weight_kg != null) {
      lastKnownWeight = Number(quest.weight_kg)
    }
  }

  // ── 5. Supplements (Yesterday) ──
  const supplements: string[] = []
  if (athleteName === 'Armaan') {
    const yestSuppLogs = yesterdayLogs.filter(l => l.tracker_id === 'f0edd06f-62e4-4da9-8866-29fd9582398b')
    let totalCreatine = 0
    let totalMagnesium = 0
    let totalElectrolytes = 0
    let totalBetaAlanine = 0
    for (const log of yestSuppLogs) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const f = log.fields as Record<string, any> || {}
      if (f.fld_creatine_g != null) totalCreatine += Number(f.fld_creatine_g)
      if (f.fld_magnesium_g != null) totalMagnesium += Number(f.fld_magnesium_g)
      if (f.fld_1782374944462_zm44 != null) totalElectrolytes += Number(f.fld_1782374944462_zm44)
      if (f.fld_1782374945918_kiyr != null) totalBetaAlanine += Number(f.fld_1782374945918_kiyr)
    }
    if (totalCreatine > 0) supplements.push(`Creatine: ${totalCreatine}g`)
    if (totalMagnesium > 0) supplements.push(`Magnesium: ${totalMagnesium}g`)
    if (totalElectrolytes > 0) supplements.push(`Electrolyte Powder: ${totalElectrolytes}g`)
    if (totalBetaAlanine > 0) supplements.push(`Beta-Alanine: ${totalBetaAlanine}g`)
  } else {
    // For Violetta, scan yesterday's food logs for supplements
    for (const log of yesterdayFoodLogs) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const f = log.fields as Record<string, any> || {}
      const mealType = f.fld_1776321412781_bfi3?.toString() || ''
      const itemName = f.fld_001?.toString() || ''
      if (
        mealType.toLowerCase() === 'supplement' ||
        itemName.toLowerCase().includes('creatine') ||
        itemName.toLowerCase().includes('magnesium') ||
        itemName.toLowerCase().includes('supplement')
      ) {
        supplements.push(itemName)
      }
    }
  }

  // ── 6. Today's carbs and protein consumed (Pre & Post workout) dynamically calculated ──
  const todayFoodLogs = todayLogs.filter(l => l.tracker_id === foodTrackerId)
  
  // Try to find if there are workout logs for today (from trackers of type 'workout')
  const todayWorkoutLogs = todayLogs.filter(l => workoutTrackerIds.includes(l.tracker_id))
  const firstWorkoutTime = todayWorkoutLogs.length > 0
    ? todayWorkoutLogs.reduce((min, log) => log.logged_at < min ? log.logged_at : min, todayWorkoutLogs[0].logged_at)
    : null

  let calculatedCarbsPre = 0
  let calculatedCarbsPost = 0

  for (const log of todayFoodLogs) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const f = log.fields as Record<string, any> || {}
    let carbs = 0
    let mealType = ''
    let mealNotes = ''

    if (athleteName === 'Armaan') {
      carbs = Number(f.fld_1774452735170_c698 || 0)
      mealType = f.fld_1774452609139_yxub?.toString() || ''
      mealNotes = f.fld_1776932076369_9p5v?.toString() || ''
    } else {
      carbs = Number(f.fld_004 || 0)
      mealType = f.fld_1776321412781_bfi3?.toString() || ''
      mealNotes = f.fld_001?.toString() || ''
    }

    const typeLower = mealType.toLowerCase()
    const notesLower = mealNotes.toLowerCase()

    // 1. Explicit tags
    if (typeLower.includes('pre-workout') || typeLower.includes('pre workout') || notesLower.includes('pre-workout') || notesLower.includes('pre workout')) {
      calculatedCarbsPre += carbs
    } else if (typeLower.includes('post-workout') || typeLower.includes('post workout') || notesLower.includes('post-workout') || notesLower.includes('post workout')) {
      calculatedCarbsPost += carbs
    }
    // 2. Timestamp Match (if workout has been logged)
    else if (firstWorkoutTime) {
      if (log.logged_at < firstWorkoutTime) {
        calculatedCarbsPre += carbs
      } else {
        calculatedCarbsPost += carbs
      }
    }
    // 3. Fallback: keywords or time-of-day
    else {
      const preKws = ["toast", "breakfast", "oat", "porridge", "pancake", "cereal", "c-bread", "banana", "juice", "fruit", "egg scramble"]
      if (preKws.some(kw => typeLower.includes(kw) || notesLower.includes(kw))) {
        calculatedCarbsPre += carbs
      } else {
        // If logged before 1:00 PM local (UTC+1, so 12:00 UTC), classify as pre-workout
        const loggedDate = new Date(log.logged_at)
        const loggedHour = loggedDate.getUTCHours()
        const localHour = (loggedHour + 1) % 24
        if (localHour < 13) {
          calculatedCarbsPre += carbs
        } else {
          calculatedCarbsPost += carbs
        }
      }
    }
  }

  // Round calculated values
  calculatedCarbsPre = Math.round(calculatedCarbsPre)
  calculatedCarbsPost = Math.round(calculatedCarbsPost)

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
    totalCalsYesterday,
    distanceActiveYesterday,
    lastKnownWeight,

    nutritionCals,
    nutritionProtein,
    nutritionFat,
    nutritionCarbs,

    targetCarbsPre: r.target_carbs_pre != null ? Number(r.target_carbs_pre) : (athleteName === 'Armaan' ? 62 : 41),
    actualCarbsPre: r.actual_carbs_pre != null ? Number(r.actual_carbs_pre) : calculatedCarbsPre,
    preCarbsCompliant: r.pre_carbs_compliant !== null ? r.pre_carbs_compliant : (calculatedCarbsPre >= (r.target_carbs_pre != null ? Number(r.target_carbs_pre) : (athleteName === 'Armaan' ? 62 : 41))),
    targetCarbsPost: r.target_carbs_post != null ? Number(r.target_carbs_post) : (athleteName === 'Armaan' ? 150 : 100),
    actualCarbsPost: r.actual_carbs_post != null ? Number(r.actual_carbs_post) : calculatedCarbsPost,
    postCarbsCompliant: r.post_carbs_compliant !== null ? r.post_carbs_compliant : (calculatedCarbsPost >= (r.target_carbs_post != null ? Number(r.target_carbs_post) : (athleteName === 'Armaan' ? 150 : 100))),

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
    workoutTrackingPrompt1: r.workout_tracking_prompt_1 ?? null,
    workoutTrackingPrompt2: r.workout_tracking_prompt_2 ?? null,
    workoutTrackingPrompt3: r.workout_tracking_prompt_3 ?? null,

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

// ---------------------------------------------------------------------------
// EVENING BRIEFING DETAIL — rich structured fetch
// ---------------------------------------------------------------------------
export type EveningBriefingDetail = {
  id: string
  date: Date
  athleteName: string

  // ── Top stats ──────────────────────────────────────────────────────────────
  strainScore: number | null
  recoveryScore: number | null
  recoveryColor: ReadinessColor | null

  // ── Macro Targets & Compliance ─────────────────────────────────────────────
  targetCarbsPre: number | null
  actualCarbsPre: number | null
  preCarbsCompliant: boolean | null
  targetProteinPre: number | null
  actualProteinPre: number | null
  preProteinCompliant: boolean | null

  targetCarbsPost: number | null
  actualCarbsPost: number | null
  postCarbsCompliant: boolean | null
  targetProteinPost: number | null
  actualProteinPost: number | null
  postProteinCompliant: boolean | null

  // ── Written briefing sections ──────────────────────────────────────────────
  workoutSummary: string | null
  postWorkoutVerdict: string | null

  // ── Lists for today's logs ──────────────────────────────────────────────────
  foodLogs: {
    logged_at: string
    meal_type: string
    notes: string
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }[]
  workoutLogs: {
    logged_at: string
    session_name: string
    duration_min: number
    avg_hr: number
    zone2_min: number
    zone4_min: number
    notes: string
  }[]
  runningLogs: {
    logged_at: string
    session_name: string
    distance_km: number
    duration_min: number
    avg_hr: number
    avg_pace_min_km: string
    avg_cadence: number
    notes: string
    max_hr?: number
    vertical_oscillation?: number
    ground_contact_time?: number
  }[]
  benchmarkLogs: {
    logged_at: string
    station_name: string
    time_seconds: number
    weight_kg: number
    rpe: number
    notes: string
  }[]
}

export async function fetchEveningBriefingDetailAction(id: string): Promise<EveningBriefingDetail | null> {
  const user = await getSafeUser()
  if (!user) return null

  const supabase = await createServerClient()
  const athleteName = getAthleteName(user.id)

  const { data: r } = await supabase
    .from('coaching_daily_readiness')
    .select('*')
    .eq('id', id)
    .eq('user_id', athleteName)
    .single()

  if (!r) return null

  const [year, month, day] = r.date.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 20, 0, 0))

  const startDate = `${r.date}T00:00:00.000Z`
  const endDate = `${r.date}T23:59:59.999Z`

  const { data: rawLogs } = await supabase
    .from('tracker_logs')
    .select('tracker_id, fields, logged_at')
    .eq('user_id', user.id)
    .gte('logged_at', startDate)
    .lte('logged_at', endDate)

  const logs = rawLogs || []

  // Determine tracker IDs based on athlete
  const foodTrackerId = athleteName === 'Armaan' 
    ? 'af889eb3-0761-4f97-8fbb-d62278ec2d76' 
    : '009625d3-ecc8-48ed-a64a-0c25e2493dac'
    
  const trainingTrackerId = athleteName === 'Armaan' 
    ? 'a8424250-333c-4c7f-9f81-164afe01ed76' 
    : 'd56f0546-9b38-4d00-84e4-8afd1474a394'

  const runningTrackerId = athleteName === 'Armaan'
    ? '88c9ddde-0f8c-4cf1-b827-180f1de41512'
    : '0ce9a8c0-de10-4ed1-9a33-a5a7b0c3ad85'

  const benchmarksTrackerId = athleteName === 'Armaan'
    ? 'd3b22449-ecf1-4325-b5ed-0e26abc93c78'
    : '8059508d-431e-48ed-90b2-b1bcdc5cffdc'

  // Fetch user trackers dynamically from trackers table to get dynamic live_workout tracker ID
  const { data: userTrackers } = await supabase
    .from('trackers')
    .select('id, type, name')
    .eq('user_id', user.id)

  const liveWorkoutTracker = userTrackers?.find(t => t.type === 'live_workout')
  const liveWorkoutTrackerId = liveWorkoutTracker?.id || (athleteName === 'Armaan'
    ? 'd655b418-4010-4a13-a073-849272db332f'
    : 'c2debce9-c98d-4a9c-9c62-83e1e70fef3c')

  const foodLogs: EveningBriefingDetail['foodLogs'] = []
  const workoutLogs: EveningBriefingDetail['workoutLogs'] = []
  const runningLogs: EveningBriefingDetail['runningLogs'] = []
  const benchmarkLogs: EveningBriefingDetail['benchmarkLogs'] = []

  logs.forEach(log => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const f = log.fields as Record<string, any> || {}
    if (log.tracker_id === foodTrackerId) {
      if (athleteName === 'Armaan') {
        foodLogs.push({
          logged_at: log.logged_at,
          meal_type: f.fld_1774452609139_yxub || '',
          notes: f.fld_1776932076369_9p5v || '',
          calories: Number(f.fld_1774452630176_lryh || 0),
          protein_g: Number(f.fld_1774452699543_7vxs || 0),
          carbs_g: Number(f.fld_1774452735170_c698 || 0),
          fat_g: Number(f.fld_1774452741950_h2p7 || 0),
        })
      } else {
        foodLogs.push({
          logged_at: log.logged_at,
          meal_type: f.fld_1776321412781_bfi3 || '',
          notes: f.fld_001 || '',
          calories: Number(f.fld_002 || 0),
          protein_g: Number(f.fld_003 || 0),
          carbs_g: Number(f.fld_004 || 0),
          fat_g: Number(f.fld_005 || 0),
        })
      }
    } else if (log.tracker_id === trainingTrackerId) {
      if (athleteName === 'Armaan') {
        workoutLogs.push({
          logged_at: log.logged_at,
          session_name: f.fld_1774521747208_armn || '',
          duration_min: parseTimeToMin(f.fld_1774521760614_d25w),
          avg_hr: Number(f.fld_1774521791876_apq1 || 0),
          zone2_min: parseTimeToMin(f.fld_1779037596598_vw40),
          zone4_min: parseTimeToMin(f.fld_1779037617910_plzw),
          notes: f.fld_1774854969310_koxs || '',
        })
      } else {
        workoutLogs.push({
          logged_at: log.logged_at,
          session_name: f.fld_1775777119619_9tpn || '',
          duration_min: parseTimeToMin(f.fld_1775790320469_fc75),
          avg_hr: Number(f.fld_1775790151686_xvvx || 0),
          zone2_min: parseTimeToMin(f.fld_1779037519979_ld1l),
          zone4_min: parseTimeToMin(f.fld_1779037525633_n7rf),
          notes: f.fld_1779267874418_bkzq || '',
        })
      }
    } else if (log.tracker_id === runningTrackerId) {
      if (athleteName === 'Armaan') {
        runningLogs.push({
          logged_at: log.logged_at,
          session_name: 'Running Session',
          distance_km: Number(f.fld_1774521926453_si1f || 0),
          duration_min: parseTimeToMin(f.fld_1774521933454_xxw7),
          avg_hr: Number(f.fld_1774521982409_bkai || 0),
          avg_pace_min_km: f.fld_1774521948335_k0wd || '',
          avg_cadence: Number(f.fld_1774522013740_epsg || 0),
          notes: f.fld_1774854937291_7zar || '',
          max_hr: f.fld_1780567023461_dnig != null ? Number(f.fld_1780567023461_dnig) : undefined,
        })
      } else {
        runningLogs.push({
          logged_at: log.logged_at,
          session_name: f.fld_1782039997627_8wis || 'Running Session',
          distance_km: 0.0,
          duration_min: parseTimeToMin(f.fld_1782040005092_isb5),
          avg_hr: Number(f.fld_1782040033484_aaw1 || 0),
          avg_pace_min_km: f.fld_1782040018514_uccz || '',
          avg_cadence: Number(f.fld_1782040044662_hcck || 0),
          notes: f.fld_1782040070104_xk69 || '',
          max_hr: f.fld_1782196169090_ruet != null ? Number(f.fld_1782196169090_ruet) : undefined,
          vertical_oscillation: f.fld_1782196207232_cwn9 != null ? Number(f.fld_1782196207232_cwn9) : undefined,
          ground_contact_time: f.fld_1782196237388_ba7y != null ? Number(f.fld_1782196237388_ba7y) : undefined,
        })
      }
    } else if (log.tracker_id === benchmarksTrackerId) {
      benchmarkLogs.push({
        logged_at: log.logged_at,
        station_name: f.fld_1779037796817_pwix || f.fld_1779037634494_dugg || '',
        time_seconds: Number(f.fld_1779038150381_3e15 || f.fld_1779038197793_vtws || 0),
        weight_kg: Number(f.fld_1779038165086_lfrt || 0),
        rpe: Number(f.fld_1779038193572_hlu1 || f.fld_1779038212882_u2xb || 0),
        notes: f.fld_1779038223948_pnkx || f.fld_1779038228817_x98c || '',
      })
    } else if (log.tracker_id === liveWorkoutTrackerId) {
      workoutLogs.push({
        logged_at: log.logged_at,
        session_name: 'Live Workout Tracking',
        duration_min: 0,
        avg_hr: 0,
        zone2_min: 0,
        zone4_min: 0,
        notes: f.fld_workout_details || f.notes || '',
      })
    }
  })

  // Calculate distance for Violetta's run if pace is available
  runningLogs.forEach(rl => {
    if (athleteName === 'Violet' && rl.avg_pace_min_km && rl.duration_min > 0) {
      const paceStr = String(rl.avg_pace_min_km).trim()
      let paceDec = 0
      if (paceStr.includes(':')) {
        const parts = paceStr.split(':').map(Number)
        if (parts.length === 2) {
          const [m, s] = parts
          paceDec = m + s / 60
        }
      } else {
        const parsed = Number(paceStr)
        if (!isNaN(parsed)) {
          paceDec = parsed
        }
      }
      if (paceDec > 0) {
        rl.distance_km = parseFloat((rl.duration_min / paceDec).toFixed(2))
      }
    }
  })

  return {
    id: r.id,
    date,
    athleteName,

    strainScore: r.strain_score != null ? Number(r.strain_score) : null,
    recoveryScore: r.recovery_score ?? null,
    recoveryColor: (r.recovery_color as ReadinessColor) ?? null,

    targetCarbsPre: r.target_carbs_pre != null ? Number(r.target_carbs_pre) : (athleteName === 'Armaan' ? 62 : 41),
    actualCarbsPre: r.actual_carbs_pre != null ? Number(r.actual_carbs_pre) : null,
    preCarbsCompliant: r.pre_carbs_compliant ?? null,
    targetProteinPre: r.target_protein_pre != null ? Number(r.target_protein_pre) : (athleteName === 'Armaan' ? 30 : 20),
    actualProteinPre: r.actual_protein_pre != null ? Number(r.actual_protein_pre) : null,
    preProteinCompliant: r.pre_protein_compliant ?? null,

    targetCarbsPost: r.target_carbs_post != null ? Number(r.target_carbs_post) : (athleteName === 'Armaan' ? 150 : 100),
    actualCarbsPost: r.actual_carbs_post != null ? Number(r.actual_carbs_post) : null,
    postCarbsCompliant: r.post_carbs_compliant ?? null,
    targetProteinPost: r.target_protein_post != null ? Number(r.target_protein_post) : (athleteName === 'Armaan' ? 50 : 40),
    actualProteinPost: r.actual_protein_post != null ? Number(r.actual_protein_post) : null,
    postProteinCompliant: r.post_protein_compliant ?? null,

    workoutSummary: r.workout_summary ?? null,
    postWorkoutVerdict: r.post_workout_verdict ?? null,

    foodLogs,
    workoutLogs,
    runningLogs,
    benchmarkLogs,
  }
}

// ---------------------------------------------------------------------------
// WEEKLY AUDIT DETAIL — rich structured fetch
// ---------------------------------------------------------------------------
export type WeeklyAuditDetail = {
  id: string
  athleteName: string
  weekStartDate: string
  weekEndDate: string

  // Averages
  avgSleepScore: number | null
  avgHrv: number | null
  avgRhr: number | null
  avgWeight: number | null
  avgKcal: number | null
  avgProtein: number | null
  avgCarbs: number | null
  totalSessions: number | null
  totalDistanceKm: number | null
  avgRpe: number | null
  avgSteps: number | null
  totalNetCalorieBalance: number | null

  // AI Written Content
  weeklyScore: number | null
  redFlags: string | null
  positives: string | null
  advancedRecovery: string | null
  athleteDeepDives: string | null
  phasePivotFixes: string | null
  auditMarkdown: string | null
  redFlagsMarkdown: string | null
  positivesMarkdown: string | null
  advancedRecoveryMarkdown: string | null
  athleteDeepDivesMarkdown: string | null
  phasePivotFixesMarkdown: string | null
}

export async function fetchWeeklyAuditDetailAction(id: string): Promise<WeeklyAuditDetail | null> {
  const user = await getSafeUser()
  if (!user) return null

  const supabase = await createServerClient()
  const athleteName = getAthleteName(user.id)

  const { data: r } = await supabase
    .from('coaching_weekly_audits')
    .select('*')
    .eq('id', id)
    .eq('user_id', athleteName)
    .single()

  if (!r) return null

  return {
    id: r.id,
    athleteName: r.user_id,
    weekStartDate: r.week_start_date,
    weekEndDate: r.week_end_date,

    avgSleepScore: r.avg_sleep_score != null ? Number(r.avg_sleep_score) : null,
    avgHrv: r.avg_hrv != null ? Number(r.avg_hrv) : null,
    avgRhr: r.avg_rhr != null ? Number(r.avg_rhr) : null,
    avgWeight: r.avg_weight != null ? Number(r.avg_weight) : null,
    avgKcal: r.avg_kcal != null ? Number(r.avg_kcal) : null,
    avgProtein: r.avg_protein != null ? Number(r.avg_protein) : null,
    avgCarbs: r.avg_carbs != null ? Number(r.avg_carbs) : null,
    totalSessions: r.total_sessions != null ? Number(r.total_sessions) : null,
    totalDistanceKm: r.total_distance_km != null ? Number(r.total_distance_km) : null,
    avgRpe: r.avg_rpe != null ? Number(r.avg_rpe) : null,
    avgSteps: r.avg_steps != null ? Number(r.avg_steps) : null,
    totalNetCalorieBalance: r.total_net_calorie_balance != null ? Number(r.total_net_calorie_balance) : null,

    weeklyScore: r.weekly_score ?? null,
    redFlags: r.red_flags ?? null,
    positives: r.positives ?? null,
    advancedRecovery: r.advanced_recovery ?? null,
    athleteDeepDives: r.athlete_deep_dives ?? null,
    phasePivotFixes: r.phase_pivot_fixes ?? null,
    auditMarkdown: r.audit_markdown ?? null,
    redFlagsMarkdown: r.red_flags_markdown ?? r.red_flags ?? null,
    positivesMarkdown: r.positives_markdown ?? r.positives ?? null,
    advancedRecoveryMarkdown: r.advanced_recovery_markdown ?? r.advanced_recovery ?? null,
    athleteDeepDivesMarkdown: r.athlete_deep_dives_markdown ?? r.athlete_deep_dives ?? null,
    phasePivotFixesMarkdown: r.phase_pivot_fixes_markdown ?? r.phase_pivot_fixes ?? null,
  }
}

// ---------------------------------------------------------------------------
// INTAKE QUESTIONNAIRE & BACKDOOR IMPERSONATION ACTIONS
// ---------------------------------------------------------------------------
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'

export async function fetchBaselineQuestionnaireAction(athleteName: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('coaching_baseline_questionnaires')
    .select('*')
    .eq('user_id', athleteName)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch questionnaire: ${error.message}`)
  if (data) return data

  // Initialize draft if not exists
  const { data: newRow, error: createError } = await supabase
    .from('coaching_baseline_questionnaires')
    .insert({ user_id: athleteName, status: 'draft' })
    .select('*')
    .single()

  if (createError) throw new Error(`Failed to initialize questionnaire: ${createError.message}`)
  return newRow
}

export type IntakeFormData = {
  age?: string
  height_cm?: string | number | null
  weight_kg?: string | number | null
  smartwatch_model?: string
  medical_conditions?: string
  preferred_activities?: string
  has_food_scale?: string
  workout_equipment_handy?: string
  foods_liked?: string
  foods_disliked?: string
  foods_must_stay?: string
  main_goal?: string
  roadblocks?: string
  strengths?: string
  additional_notes?: string
}

export async function saveIntakeDraftAction(data: IntakeFormData) {
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')
  const athleteName = getAthleteName(user.id)

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('coaching_baseline_questionnaires')
    .upsert({
      user_id: athleteName,
      age: data.age || '',
      height_cm: data.height_cm ? Number(data.height_cm) : null,
      weight_kg: data.weight_kg ? Number(data.weight_kg) : null,
      smartwatch_model: data.smartwatch_model || '',
      medical_conditions: data.medical_conditions || '',
      preferred_activities: data.preferred_activities || '',
      has_food_scale: data.has_food_scale || '',
      workout_equipment_handy: data.workout_equipment_handy || '',
      foods_liked: data.foods_liked || '',
      foods_disliked: data.foods_disliked || '',
      foods_must_stay: data.foods_must_stay || '',
      main_goal: data.main_goal || '',
      roadblocks: data.roadblocks || '',
      strengths: data.strengths || '',
      additional_notes: data.additional_notes || '',
      status: 'draft'
    }, { onConflict: 'user_id' })

  if (error) throw new Error(`Failed to save draft: ${error.message}`)
  return { success: true }
}

export async function submitIntakeFormAction(data: IntakeFormData) {
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')
  const athleteName = getAthleteName(user.id)

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('coaching_baseline_questionnaires')
    .upsert({
      user_id: athleteName,
      age: data.age || '',
      height_cm: data.height_cm ? Number(data.height_cm) : null,
      weight_kg: data.weight_kg ? Number(data.weight_kg) : null,
      smartwatch_model: data.smartwatch_model || '',
      medical_conditions: data.medical_conditions || '',
      preferred_activities: data.preferred_activities || '',
      has_food_scale: data.has_food_scale || '',
      workout_equipment_handy: data.workout_equipment_handy || '',
      foods_liked: data.foods_liked || '',
      foods_disliked: data.foods_disliked || '',
      foods_must_stay: data.foods_must_stay || '',
      main_goal: data.main_goal || '',
      roadblocks: data.roadblocks || '',
      strengths: data.strengths || '',
      additional_notes: data.additional_notes || '',
      status: 'submitted'
    }, { onConflict: 'user_id' })

  if (error) throw new Error(`Failed to submit: ${error.message}`)

  // Trigger Telegram Alert
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = "2052083060"
  const messageText = `${athleteName} finished their intake form.\n\n<a href="https://elite-yaha.vercel.app/coachDB?impersonate=${user.id}">Click here to enter backdoor &rarr;</a>`

  if (botToken) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML'
        })
      })
    } catch (e) {
      console.error('Failed to send Telegram message:', e)
    }
  } else {
    console.error('TELEGRAM_BOT_TOKEN is not defined in environment variables')
  }

  return { success: true }
}

export async function fetchCoachClientsAction() {
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')
  
  // Real user check
  const realUser = (user as unknown as { id: string; email?: string | null; realUser?: { id: string; email?: string | null } }).realUser || user
  const isCoach =
    realUser.id === '44ef9aae-79d7-4bc9-8eea-7d8a55964813' ||
    realUser.id === '4c74333b-18e6-465a-a62a-523a4ad2999b' ||
    realUser.email === 'armaan1993@gmail.com' ||
    realUser.email === 'violetmikulchik@gmail.com'
  if (!isCoach) throw new Error('Unauthorized: Coach Access Only')

  const supabase = createServiceClient()
  
  // Fetch all users who are not Armaan or Violetta
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, alias, access_status')
    .not('id', 'in', '("44ef9aae-79d7-4bc9-8eea-7d8a55964813","4c74333b-18e6-465a-a62a-523a4ad2999b")')

  if (usersError) throw new Error(`Failed to fetch clients: ${usersError.message}`)

  // Fetch baseline questionnaire statuses
  const { data: questionnaires } = await supabase
    .from('coaching_baseline_questionnaires')
    .select('user_id, status')

  const clientList = users.map(u => {
    const athleteName = getAthleteName(u.id)
    const q = questionnaires?.find(q => q.user_id === athleteName)
    return {
      id: u.id,
      alias: u.alias || 'Client',
      accessStatus: u.access_status,
      intakeStatus: q ? q.status : 'not_started'
    }
  })

  return clientList
}

export async function startImpersonatingAction(userId: string) {
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  // Real user check
  const realUser = (user as unknown as { id: string; email?: string | null; realUser?: { id: string; email?: string | null } }).realUser || user
  const isCoach =
    realUser.id === '44ef9aae-79d7-4bc9-8eea-7d8a55964813' ||
    realUser.id === '4c74333b-18e6-465a-a62a-523a4ad2999b' ||
    realUser.email === 'armaan1993@gmail.com' ||
    realUser.email === 'violetmikulchik@gmail.com'
  if (!isCoach) throw new Error('Unauthorized')

  const cookieStore = await cookies()
  cookieStore.set('impersonate_id', userId, {
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  })

  return { success: true }
}

export async function stopImpersonatingAction() {
  const cookieStore = await cookies()
  cookieStore.delete('impersonate_id')
  return { success: true }
}

export async function checkIsRoohanAction(): Promise<boolean> {
  const user = await getSafeUser()
  if (!user) return false
  const name = getAthleteName(user.id)
  return name === 'Roohan'
}

export async function saveWorkoutSummaryAction(id: string, summary: string) {
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')
  const athleteName = getAthleteName(user.id)

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('coaching_daily_readiness')
    .update({ workout_summary: summary })
    .eq('id', id)
    .eq('user_id', athleteName)

  if (error) throw new Error(`Failed to save workout summary: ${error.message}`)
  
  const { revalidatePath } = await import('next/cache')
  revalidatePath('/coaching')
  revalidatePath(`/coaching/report/morning/${id}`)
  
  return { success: true }
}

export type MacrocyclePhase = {
  id: string
  phase_name: string
  start_date: string
  end_date: string
  primary_focus: string
}

export type PrescribedWorkout = {
  id: string
  date: string
  phase: string
  session_time: string
  session_type: string
  workout_details: string
  status: string
}

export async function fetchMacrocycleAction(): Promise<MacrocyclePhase[]> {
  const user = await getSafeUser()
  if (!user) return []

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('coaching_macrocycle')
    .select('*')
    .order('start_date', { ascending: true })

  if (error) {
    console.error('Failed to fetch macrocycle phases:', error)
    return []
  }

  return (data || []) as MacrocyclePhase[]
}

export async function fetchPrescribedWorkoutsAction(): Promise<PrescribedWorkout[]> {
  const user = await getSafeUser()
  if (!user) return []

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('coaching_prescribed_workouts')
    .select('*')
    .order('date', { ascending: true })

  if (error) {
    console.error('Failed to fetch prescribed workouts:', error)
    return []
  }

  return (data || []) as PrescribedWorkout[]
}

export async function fetchWorkoutOverhaulApprovalAction(): Promise<{ status: string; feedback: string } | null> {
  const user = await getSafeUser()
  if (!user) return null

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('coaching_approvals')
    .select('*')
    .eq('proposal_name', 'Workout Overhaul')
    .eq('athlete_name', 'Violet')
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch workout overhaul approval:', error)
    return null
  }

  return data || { status: 'Pending', feedback: '' }
}

export async function submitWorkoutOverhaulApprovalAction(status: string, feedback: string): Promise<{ success: boolean }> {
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const athleteName = getAthleteName(user.id)
  
  if (athleteName === 'Armaan') {
    throw new Error('Only Violetta can submit approvals for this proposal.')
  }

  const supabase = await createServerClient()
  
  // Upsert the approval state
  const { error: approvalError } = await supabase
    .from('coaching_approvals')
    .upsert({
      proposal_name: 'Workout Overhaul',
      athlete_name: 'Violet',
      status: status,
      feedback: feedback,
      updated_at: new Date().toISOString()
    }, { onConflict: 'proposal_name,athlete_name' })

  if (approvalError) {
    console.error('Failed to submit approval state:', approvalError)
    throw new Error(`Failed to save approval: ${approvalError.message}`)
  }

  // Trigger Telegram Alerts to Coach (Armaan)
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const armaanChatId = "2052083060"

  if (botToken) {
    if (status === 'Approved') {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: armaanChatId,
            text: `✅ <b>Workout Overhaul Approved!</b>\n\nVioletta approved the proposed 3-week workout overhaul. The new periodized functional S&C & sled sessions are now live in the training calendar.`,
            parse_mode: 'HTML'
          })
        })
      } catch (e) {
        console.error('Failed to notify Armaan:', e)
      }
    } else if (status === 'Approved-But') {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: armaanChatId,
            text: `🔔 <b>Proposal Feedback Submitted!</b>\n\nVioletta approved the workout overhaul proposal <b>WITH suggested changes</b>:\n\n<pre>${feedback}</pre>\n\n<a href="https://elite-yaha.vercel.app/coaching/approvals">View feedback details &rarr;</a>`,
            parse_mode: 'HTML'
          })
        })
      } catch (e) {
        console.error('Failed to notify Armaan:', e)
      }
    }
  } else {
    console.error('TELEGRAM_BOT_TOKEN is not defined in environment variables')
  }

  // If approved, update the 6 workouts in coaching_prescribed_workouts table
  if (status === 'Approved') {
    const workoutsToOverhaul = [
      {
        date: '2026-06-30',
        workout_details: `**Open Gym: Sled Overload & Compromised Run Block (5 total exercises)**\n\n*   **Goal**: Establish overloaded sled mechanics and transition immediately into a leg-pump compromised run.\n*   **Warm-Up**:\n    *   Rowing: 3 min easy\n    *   McGill Big 3 (Bird-Dog, Side Plank, Curl-up) — 2 sets × 10s hold\n    *   3 Rounds: 10 Goblet Squats (light KB) + 10 Kettlebell Swings + 15m Bear Crawl\n*   **A. Overloaded Sled Push & Pull (Tactical Division of Labor)**:\n    *   *Setup*: Sled loaded to **172 kg** push / **123 kg** pull (Overload training weight for the team).\n    *   *Sled Push*: 4 rounds of 50m (4 × 12.5m laps).\n        *   *Tactical split*: Armaan pushes 35m (RPE 8.5, low drive), Violetta takes over for the final 15m.\n    *   *Sled Pull*: 4 rounds of 50m (4 × 12.5m laps).\n        *   *Tactical split*: Armaan pulls 35m, Violetta pulls 15m.\n*   **B. Strength-Endurance Density Block (12-Min AMRAP)**:\n    *   Perform as many rounds as possible of:\n        *   12 Double Kettlebell Front Squats (2×20kg for Armaan, 2×12kg for Violetta)\n        *   40m Heavy Farmer Carry (2×24kg for both)\n        *   10 Hanging Knee Raises\n*   **C. 🏃 Compromised Running Intervals**:\n    *   Immediately after the AMRAP, run **2 km total** together as:\n        *   500m Run (RPE 8, pace: ~4:45/km) + 20 Air Squats\n        *   500m Run (RPE 8) + 15 Push-ups\n        *   500m Run (RPE 8) + 20 Lunges\n        *   500m Run (RPE 9, final kick)\n\n---\n\n### 🏋️‍♂️ Technique Guides (Direct Embeds)\n\n<details>\n  <summary>🔍 View Technique Cues: Sled Push</summary>\n  \n  #### Elite Execution Strategy:\n  *   **Arm Placement & Structure**: Do NOT push with straight arms. Your triceps and shoulders will fatigue instantly. Place your forearms flat against the vertical poles. Clasp your hands together. Keep your hips low and spine completely neutral (flat back).\n  *   **Pacing: The Choppy Steps**: Take short, rapid, powerful steps. Do not take long lunging strides. MOMENTUM IS EVERYTHING. Once the sled starts moving, do whatever it takes to not stop.\n</details>\n\n<details>\n  <summary>🔍 View Technique Cues: Sled Pull</summary>\n  \n  #### Elite Execution Strategy:\n  *   **The Power Stance**: Keep your center of gravity incredibly low. Sit back into a quarter-squat. Lean back heavily against the rope so your body weight does the pulling, not your biceps.\n  *   **Rope Management**: Pull the rope in long, sweeping motions, pulling it past your hip and immediately stepping back. Do NOT let the rope pile up under your feet.\n</details>`
      },
      {
        date: '2026-07-02',
        workout_details: `**Open Gym: High-Volume Erg Engine & Wall Ball Durability (5 total exercises)**\n\n*   **Goal**: Machine pacing under cardiovascular fatigue, paired with high-frequency Wall Ball partner handoffs.\n*   **Warm-Up**:\n    *   3 mins BikeErg easy\n    *   Band pull-aparts + scapular pull-ups + bodyweight squats\n*   **A. Erg Pacing Intervals (Compromised Engine)**:\n    *   4 Rounds (Both working simultaneously):\n        *   750m Row @ target split (Armaan: 1:52/500m, Violetta: 1:58/500m)\n        *   750m SkiErg @ target split (Armaan: 1:55/500m, Violetta: 2:02/500m)\n        *   *Rest*: 90s between rounds. Focus on nasal breathing recovery.\n*   **B. Compromised Bodyweight Block**:\n    *   3 Rounds of:\n        *   15 Burpee Broad Jumps (Focus: Step-up technique from floor to conserve heart rate)\n        *   15 Kettlebell Swings (24kg for Armaan, 16kg for Violetta)\n*   **C. Partner Wall Ball Finisher (The 100-Rep Race Split)**:\n    *   **100 reps total** @ 6kg (Armaan: 3.0m target, Violetta: 2.75m target).\n    *   *Rules*: Strict IGO-UGO format. Alternating sets of **10 reps**.\n    *   The ball cannot touch the ground! If it drops, both perform a 5-burpee penalty before resuming.\n\n---\n\n### 🏋️‍♂️ Technique Guides (Direct Embeds)\n\n<details>\n  <summary>🔍 View Technique Cues: Wall Balls</summary>\n  \n  #### Elite Execution Strategy:\n  *   **Squat Depth & Catch**: Break parallel (hips below knees) on the squat. Catch the ball on the way down, absorbing its momentum into the squat. Do not catch standing and then squat.\n  *   **Arm Fatigue Management**: Let arms drop down to sides when the ball is in the air to flush lactic acid.\n  *   **Rep Splitting**: 100 reps is a shoulder killer. Use fast, short sets of 10 reps. Partner-alternating (IGO-UGO) format.\n</details>`
      },
      {
        date: '2026-07-07',
        workout_details: `**Open Gym: Peak Strength-Endurance Sled Overload (6 total exercises)**\n\n*   **Goal**: Force peak leg-drive power under maximum load, followed by a heavy compromised carry.\n*   **Warm-Up**:\n    *   3 mins SkiErg + dynamic mobility\n    *   Light sled push: 2 × 12.5m @ 80kg\n*   **A. Maximal Overloaded Sled Block**:\n    *   *Setup*: Sled loaded to **172 kg** (Overload Push) / **123 kg** (Overload Pull).\n    *   *Set 1-4*: 50m Sled Push (Armaan does 35m, Violetta does 15m)\n    *   *Set 5-8*: 50m Sled Pull (Armaan does 35m, Violetta does 15m)\n    *   *Rest*: 2 mins between sets. Armaan must focus on abdominal bracing and continuous breathing under load to protect his healing pelvic floor (no Valsalva).\n*   **B. Compromised Carry Complex**:\n    *   4 Rounds for Quality:\n        *   50m Sandbag Bearhug Carry (20kg bag)\n        *   50m Farmer Carry (2×24kg)\n        *   15 Dumbbell Bench Press (2×20kg Armaan, 2×12kg Violetta)\n*   **C. 🏃 Leg-Pump Compromised Run**:\n    *   Immediately run **2.5 km** together.\n    *   *Pacing*: First 1.5km at conversational Zone 2 (~5:45/km) to clear lactate, then accelerate to race pace (~4:45/km) for the final 1km.\n\n---\n\n### 🏋️‍♂️ Technique Guides (Direct Embeds)\n\n<details>\n  <summary>🔍 View Technique Cues: Sled Push & Pull</summary>\n  \n  *   **Sled Push**: Drive low, clasp hands, lock core, take short choppy steps. Keep the momentum going.\n  *   **Sled Pull**: Low squat position, lean back to use bodyweight, sweep rope past hip, do not let rope pile under feet.\n</details>`
      },
      {
        date: '2026-07-09',
        workout_details: `**Open Gym: Hyrox Station Medley & Wall Ball Pacing (6 total exercises)**\n\n*   **Goal**: Grouping functional movements to test tactical pacing and partner hand-off speed under anaerobic fatigue.\n*   **Warm-Up**:\n    *   3 mins Row + Arm swings, band dislocates, light squats\n*   **A. Hyrox Station Medley (Timed Circuit)**:\n    *   *Execute 2 rounds of the following block (Record time)*:\n        *   1,000m Row (Armaan 550m, Violetta 450m)\n        *   50m Burpee Broad Jumps (IGO-UGO alternating every 5 jumps)\n        *   200m Farmer Carry (2×24kg, switch every 50m)\n        *   80 Wall Balls @ 6kg (Alternating sets of 10 reps)\n    *   *Rest*: 4 mins between rounds.\n    *   *Target Time*: Under 15 mins per round.\n*   **B. Core Stability Finisher**:\n    *   3 Rounds of:\n        *   45-sec Plank (with 10kg plate on back)\n        *   15 Hanging Knee Raises (slow 3-sec negative descent)\n        *   12 Dumbbell Renegade Rows (no hip twisting)\n\n---\n\n### 🏋️‍♂️ Technique Guides (Direct Embeds)\n\n<details>\n  <summary>🔍 View Technique Cues: Burpee Broad Jumps</summary>\n  \n  #### Elite Execution Strategy:\n  *   **The Step-Up vs. The Jump-Up**: Step one foot up, then the other (the "Step-Up") from the bottom of the push-up. It saves massive energy and keeps HR in Zone 3/4 instead of Zone 5.\n  *   **The Broad Jump**: Moderate, controlled jumps. Consistency over raw distance.\n</details>`
      },
      {
        date: '2026-07-14',
        workout_details: `**Open Gym: Peak Sled & Compromised Run Sharpener (6 total exercises)**\n\n*   **Goal**: Final peak sled session before deload/race sim. High mechanical load followed by long compromised running.\n*   **Warm-Up**:\n    *   3 mins SkiErg + McGill Big 3 + Dynamic hip openers\n*   **A. Peak Overloaded Sled Drive**:\n    *   *Sled Push*: 6 rounds of 50m (4 × 12.5m).\n        *   *Loading*: **172 kg** (Overload training weight for the team).\n        *   *Splits*: Armaan does 35m, Violetta does 15m.\n    *   *Sled Pull*: 6 rounds of 50m (4 × 12.5m).\n        *   *Loading*: **123 kg** (Overload training weight for the team).\n        *   *Splits*: Armaan does 35m, Violetta does 15m.\n*   **B. Strength Auxiliary Set**:\n    *   3 Sets of:\n        *   10 Barbell Roman Deadlifts (hamstring focus, neutral spine)\n        *   10 strict Pull-ups (Armaan) / DB Rows (Violetta)\n        *   12 Push-ups\n*   **C. 🏃 The 3km Compromised Run Block**:\n    *   Immediately run **3 km continuous** together.\n    *   *Structure*:\n        *   Km 1: 05:15 pace (Zone 3, clearing heavy sled pump)\n        *   Km 2: 04:45 pace (Race Pace)\n        *   Km 3: 04:30 pace (Speed Threshold)`
      },
      {
        date: '2026-07-16',
        workout_details: `**Open Gym: Mini Race Simulation & Wall Ball Target (5 total station types)**\n\n*   **Goal**: Full dress rehearsal of transition times, pace control, and rapid partner wall ball hand-offs.\n*   **Warm-Up**:\n    *   5 mins easy jog + mobility\n*   **A. Mini Race Simulation (Timed)**:\n    *   *Execute the following continuous circuit (Record total time)*:\n        1.  **1km Run** (together, Violetta leads, target 4:45–5:00/km)\n        2.  *Transition*: **1,000m SkiErg** (split: Armaan 600m, Violetta 400m)\n        3.  *Transition*: **1km Run** (together)\n        4.  *Transition*: **50m Sled Push** @ **152 kg** (race weight; Armaan does 35m, Violetta does 15m)\n        5.  *Transition*: **1km Run** (together)\n        6.  *Transition*: **50m Sled Pull** @ **103 kg** (race weight; Armaan does 35m, Violetta does 15m)\n        7.  *Transition*: **100 Wall Balls** @ 6kg (alternating sets of 10)\n    *   *Target Time*: Under 28 minutes.\n*   **B. Cool Down & Active Mobility**:\n    *   10 mins easy walk, foam roll, and static hamstring stretching.`
      }
    ]

    for (const w of workoutsToOverhaul) {
      // Archive current workout first to comply with database version control rules
      const { data: current } = await supabase
        .from('coaching_prescribed_workouts')
        .select('*')
        .eq('date', w.date)
        .eq('session_time', 'MAIN')
        .maybeSingle()

      if (current) {
        await supabase
          .from('coaching_prescribed_workouts_archive')
          .insert({
            original_id: current.id,
            date: current.date,
            phase: current.phase,
            session_time: current.session_time,
            session_type: current.session_type,
            workout_details: current.workout_details,
            status: current.status,
            reason: 'Workout Overhaul Proposal Approved by Violetta'
          })
      }

      await supabase
        .from('coaching_prescribed_workouts')
        .update({
          workout_details: w.workout_details,
          status: 'Pivot-Shifted'
        })
        .eq('date', w.date)
        .eq('session_time', 'MAIN')
    }
  }

  const { revalidatePath } = await import('next/cache')
  revalidatePath('/coaching')
  revalidatePath('/coaching/approvals')

  return { success: true }
}
