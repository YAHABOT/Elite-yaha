'use server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSafeUser } from '@/lib/supabase/auth'

export type UsageEventType =
  | 'action_card_confirmed'
  | 'action_card_dismissed'
  | 'routine_step_skipped'
  | 'routine_completed'
  | 'manual_log_created'
  | 'chat_no_action_card'

export type UsageEventMetadata = Record<string, string | number | boolean | null | string[]>

/** Fire-and-forget — never throws, never blocks the calling flow */
export async function recordEvent(
  eventType: UsageEventType,
  metadata: UsageEventMetadata = {}
): Promise<void> {
  try {
    const supabase = await createServerClient()
    const user = await getSafeUser()
    if (!user) return
    await supabase.from('usage_events').insert({ user_id: user.id, event_type: eventType, metadata })
  } catch { /* intentionally silent */ }
}

export type TrackerStat = {
  name: string
  count: number    // all-time logs
  unused: boolean  // created but never logged
}

export type UserProfile = {
  id: string
  email: string
  joinedAt: string
  lastSeenAt: string | null
  trackerCount: number
  trackerNames: string[]
  trackerBreakdown: TrackerStat[]  // sorted: most-logged first, unused last
  totalLogs: number
  logsLast7d: number
  logsLast7dByDay: number[]        // [day-6, ..., today]
  engagementScore: number          // 0-100
  peakHour: number | null          // 0-23, most common logging hour
  currentStreak: number            // consecutive days with logs, ending today or yesterday
  lastLogAt: string | null
  status: 'active' | 'dormant' | 'new'
}

export type AdminInsights = {
  totalSignups: number
  usersWithTrackers: number
  usersLoggedThisWeek: number
  aiAccuracy7d: number | null
  aiAccuracyTrend: { label: string; accuracy: number | null; total: number }[]  // 4 weeks, oldest→newest
  trackerAccuracy: {
    tracker_name: string
    accuracy: number
    total: number
    frequentlyMissedFields: { field: string; missRate: number }[]  // fields AI blanks >20% of logs
  }[]  // sorted by total desc
  actionCardOutcomes30d: { confirmed_clean: number; confirmed_edited: number; dismissed: number }
  dailyActivity14d: { date: string; count: number }[]
  topTrackers: { tracker_name: string; count: number }[]
  recentEvents: { id: string; user_id: string; event_type: string; metadata: Record<string, unknown>; created_at: string }[]
  routineHealth: { completions: number; skips: number; topSkippedStep: string | null }
  chatFailures7d: number
  userProfiles: UserProfile[]
}

export async function getAdminInsights(): Promise<AdminInsights> {
  const supabase = createServiceClient()
  const now = new Date()
  const ago = (days: number) => new Date(now.getTime() - days * 864e5).toISOString()

  const [
    authUsersRes,
    trackerUsersRes,
    loggedWkRes,
    accuracyRes,
    outcomesRes,       // 30d confirmed+dismissed WITH created_at — used for trend + per-tracker
    dailyRes,
    trackersRes,
    recentRes,
    allTrackersRes,
    allLogsRes,
    routineEventsRes,
    chatFailuresRes,
  ] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('trackers').select('user_id'),
    supabase.from('tracker_logs').select('user_id').gte('logged_at', ago(7)),
    supabase.from('usage_events').select('metadata').eq('event_type', 'action_card_confirmed').gte('created_at', ago(7)),
    supabase.from('usage_events').select('event_type, metadata, created_at').in('event_type', ['action_card_confirmed', 'action_card_dismissed']).gte('created_at', ago(30)),
    supabase.from('usage_events').select('created_at').gte('created_at', ago(14)).order('created_at', { ascending: true }),
    supabase.from('usage_events').select('metadata').eq('event_type', 'action_card_confirmed'),
    supabase.from('usage_events').select('id, user_id, event_type, metadata, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('trackers').select('id, user_id, name').order('created_at', { ascending: true }),
    supabase.from('tracker_logs').select('user_id, tracker_id, logged_at').order('logged_at', { ascending: false }).limit(50000),
    supabase.from('usage_events').select('event_type, metadata').in('event_type', ['routine_completed', 'routine_step_skipped']),
    supabase.from('usage_events').select('id').eq('event_type', 'chat_no_action_card').gte('created_at', ago(7)),
  ])

  // ── AI accuracy (7d) ─────────────────────────────────────────────────────
  const confirmed7d = (accuracyRes.data ?? []) as { metadata: Record<string, unknown> }[]
  const aiAccuracy7d = confirmed7d.length === 0 ? null
    : Math.round(confirmed7d.filter(e => e.metadata?.was_edited === false).length / confirmed7d.length * 100)

  // ── Outcomes + week-over-week trend + per-tracker accuracy ────────────────
  type OutcomeRow = { event_type: string; metadata: Record<string, unknown>; created_at: string }
  const outcomes = (outcomesRes.data ?? []) as OutcomeRow[]

  const confirmed_clean  = outcomes.filter(e => e.event_type === 'action_card_confirmed' && e.metadata?.was_edited === false).length
  const confirmed_edited = outcomes.filter(e => e.event_type === 'action_card_confirmed' && e.metadata?.was_edited === true).length
  const dismissed        = outcomes.filter(e => e.event_type === 'action_card_dismissed').length

  // Week-over-week trend: 4 buckets (oldest to newest)
  const aiAccuracyTrend = Array.from({ length: 4 }, (_, i): AdminInsights['aiAccuracyTrend'][0] => {
    const weekIdx = 3 - i   // 3=oldest, 0=this week
    const windowEnd   = new Date(now.getTime() - weekIdx * 7 * 864e5)
    const windowStart = new Date(windowEnd.getTime() - 7 * 864e5)
    const weekRows = outcomes.filter(e =>
      e.event_type === 'action_card_confirmed' &&
      e.created_at >= windowStart.toISOString() &&
      e.created_at < windowEnd.toISOString()
    )
    const total = weekRows.length
    const label = weekIdx === 0 ? 'This week' : weekIdx === 1 ? 'Last week' : `${weekIdx * 7}d ago`
    return {
      label,
      total,
      accuracy: total === 0 ? null : Math.round(weekRows.filter(e => e.metadata?.was_edited === false).length / total * 100),
    }
  })

  // Per-tracker accuracy + field-level miss rate detection
  const tAccMap = new Map<string, {
    clean: number
    total: number
    fieldMissCounts: Map<string, number>  // fieldLabel → times AI left it blank + user filled
  }>()
  for (const e of outcomes.filter(e => e.event_type === 'action_card_confirmed')) {
    const name = e.metadata?.tracker_name as string | undefined
    if (!name) continue
    const prev = tAccMap.get(name) ?? { clean: 0, total: 0, fieldMissCounts: new Map() }
    prev.total++
    if (e.metadata?.was_edited === false) prev.clean++
    // user_fields_added_names: fields AI left blank that the user completed
    const addedNames = e.metadata?.user_fields_added_names
    if (Array.isArray(addedNames)) {
      for (const fieldLabel of addedNames as string[]) {
        prev.fieldMissCounts.set(fieldLabel, (prev.fieldMissCounts.get(fieldLabel) ?? 0) + 1)
      }
    }
    tAccMap.set(name, prev)
  }
  const trackerAccuracy = [...tAccMap.entries()]
    .map(([tracker_name, { clean, total, fieldMissCounts }]) => {
      // A field is "frequently missed" if AI leaves it blank in >20% of confirmed logs
      const frequentlyMissedFields = [...fieldMissCounts.entries()]
        .filter(([, count]) => count / total >= 0.2)
        .map(([field, count]) => ({ field, missRate: Math.round((count / total) * 100) }))
        .sort((a, b) => b.missRate - a.missRate)
      return {
        tracker_name,
        accuracy: Math.round((clean / total) * 100),
        total,
        frequentlyMissedFields,
      }
    })
    .sort((a, b) => b.total - a.total)

  // ── Daily activity ────────────────────────────────────────────────────────
  const dailyMap = new Map<string, number>()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    dailyMap.set(d.toISOString().split('T')[0], 0)
  }
  for (const e of (dailyRes.data ?? [])) {
    const date = (e.created_at as string).split('T')[0]
    if (dailyMap.has(date)) dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1)
  }

  // ── Top trackers ──────────────────────────────────────────────────────────
  const topMap = new Map<string, number>()
  for (const e of (trackersRes.data ?? [])) {
    const name = ((e.metadata as Record<string, unknown>)?.tracker_name) as string | undefined
    if (name) topMap.set(name, (topMap.get(name) ?? 0) + 1)
  }

  const usersWithTrackers  = new Set((trackerUsersRes.data ?? []).map(r => r.user_id as string)).size
  const usersLoggedThisWeek = new Set((loggedWkRes.data ?? []).map(r => r.user_id as string)).size
  const chatFailures7d      = (chatFailuresRes.data ?? []).length

  // ── Per-user profiles ─────────────────────────────────────────────────────
  type TrackerRow = { id: string; user_id: string; name: string }
  type LogRow = { user_id: string; tracker_id: string; logged_at: string }

  const trackersByUser = new Map<string, { id: string; name: string }[]>()
  for (const t of (allTrackersRes.data ?? []) as TrackerRow[]) {
    const arr = trackersByUser.get(t.user_id) ?? []
    arr.push({ id: t.id, name: t.name })
    trackersByUser.set(t.user_id, arr)
  }

  // 7-day keys: index 0 = today-6, index 6 = today
  const dayKeys: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    dayKeys.push(d.toISOString().split('T')[0])
  }
  const sevenDaysAgo = dayKeys[0] + 'T00:00:00.000Z'

  const logCountByUser   = new Map<string, number>()
  const lastLogByUser    = new Map<string, string>()
  const logDaysByUser    = new Map<string, Map<string, number>>()  // userId → dateStr → count (7d only)
  const allDaysByUser    = new Map<string, Set<string>>()          // userId → all dates with logs
  const logByUserTracker = new Map<string, Map<string, number>>()  // userId → trackerId → count
  const hoursByUser      = new Map<string, Map<number, number>>()  // userId → hour → count

  for (const l of (allLogsRes.data ?? []) as LogRow[]) {
    logCountByUser.set(l.user_id, (logCountByUser.get(l.user_id) ?? 0) + 1)
    if (!lastLogByUser.has(l.user_id)) lastLogByUser.set(l.user_id, l.logged_at)

    // per-tracker count
    if (!logByUserTracker.has(l.user_id)) logByUserTracker.set(l.user_id, new Map())
    logByUserTracker.get(l.user_id)!.set(l.tracker_id, (logByUserTracker.get(l.user_id)!.get(l.tracker_id) ?? 0) + 1)

    // peak hour (UTC)
    const hour = new Date(l.logged_at).getUTCHours()
    if (!hoursByUser.has(l.user_id)) hoursByUser.set(l.user_id, new Map())
    hoursByUser.get(l.user_id)!.set(hour, (hoursByUser.get(l.user_id)!.get(hour) ?? 0) + 1)

    // date sets
    const dateStr = l.logged_at.split('T')[0]
    if (!allDaysByUser.has(l.user_id)) allDaysByUser.set(l.user_id, new Set())
    allDaysByUser.get(l.user_id)!.add(dateStr)

    // 7-day breakdown
    if (l.logged_at >= sevenDaysAgo) {
      if (!logDaysByUser.has(l.user_id)) logDaysByUser.set(l.user_id, new Map())
      logDaysByUser.get(l.user_id)!.set(dateStr, (logDaysByUser.get(l.user_id)!.get(dateStr) ?? 0) + 1)
    }
  }

  // ── Routine health ────────────────────────────────────────────────────────
  type RoutineEventRow = { event_type: string; metadata: Record<string, unknown> }
  const routineEvents    = (routineEventsRes.data ?? []) as RoutineEventRow[]
  const routineCompletions = routineEvents.filter(e => e.event_type === 'routine_completed').length
  const routineSkips       = routineEvents.filter(e => e.event_type === 'routine_step_skipped').length
  const skipStepCounts     = new Map<string, number>()
  for (const e of routineEvents.filter(e => e.event_type === 'routine_step_skipped')) {
    const step = (e.metadata?.step_name as string | undefined) ?? (e.metadata?.step as string | undefined)
    if (step) skipStepCounts.set(step, (skipStepCounts.get(step) ?? 0) + 1)
  }
  const topSkippedStep = skipStepCounts.size > 0
    ? [...skipStepCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : null

  // ── Build user profiles ───────────────────────────────────────────────────
  const authUsers = authUsersRes.data?.users ?? []

  const userProfiles: UserProfile[] = authUsers.map(u => {
    const totalLogs      = logCountByUser.get(u.id) ?? 0
    const dayMap         = logDaysByUser.get(u.id)
    const logsLast7dByDay = dayKeys.map(k => dayMap?.get(k) ?? 0)
    const logsLast7d     = logsLast7dByDay.reduce((a, b) => a + b, 0)
    const engagementScore = Math.min(100, Math.round((logsLast7d / 7) * 100))
    const lastLogAt      = lastLogByUser.get(u.id) ?? null

    // tracker breakdown
    const userTrackers    = trackersByUser.get(u.id) ?? []
    const userTrackerLogs = logByUserTracker.get(u.id)
    const trackerBreakdown: TrackerStat[] = userTrackers
      .map(t => ({
        name: t.name,
        count: userTrackerLogs?.get(t.id) ?? 0,
        unused: !(userTrackerLogs?.has(t.id)),
      }))
      .sort((a, b) => {
        if (a.unused !== b.unused) return a.unused ? 1 : -1
        return b.count - a.count
      })

    // peak hour
    const hMap = hoursByUser.get(u.id)
    const peakHour: number | null = hMap && hMap.size > 0
      ? [...hMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : null

    // current streak (consecutive days ending today or yesterday)
    const allDates = allDaysByUser.get(u.id)
    let currentStreak = 0
    if (allDates) {
      const cursor = new Date(now)
      const todayStr = cursor.toISOString().split('T')[0]
      // Allow yesterday to still count (user may not have logged yet today)
      if (!allDates.has(todayStr)) cursor.setDate(cursor.getDate() - 1)
      for (;;) {
        const ds = cursor.toISOString().split('T')[0]
        if (allDates.has(ds)) { currentStreak++; cursor.setDate(cursor.getDate() - 1) }
        else break
      }
    }

    const status: UserProfile['status'] =
      logsLast7d > 0 ? 'active' : totalLogs > 0 ? 'dormant' : 'new'

    return {
      id: u.id,
      email: u.email ?? '(no email)',
      joinedAt: u.created_at,
      lastSeenAt: u.last_sign_in_at ?? null,
      trackerCount: userTrackers.length,
      trackerNames: userTrackers.map(t => t.name),
      trackerBreakdown,
      totalLogs,
      logsLast7d,
      logsLast7dByDay,
      engagementScore,
      peakHour,
      currentStreak,
      lastLogAt,
      status,
    }
  }).sort((a, b) => {
    const order = { active: 0, dormant: 1, new: 2 }
    const diff = order[a.status] - order[b.status]
    return diff !== 0 ? diff : b.totalLogs - a.totalLogs
  })

  return {
    totalSignups: authUsers.length,
    usersWithTrackers,
    usersLoggedThisWeek,
    aiAccuracy7d,
    aiAccuracyTrend,
    trackerAccuracy,
    actionCardOutcomes30d: { confirmed_clean, confirmed_edited, dismissed },
    dailyActivity14d: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
    topTrackers: Array.from(topMap.entries()).map(([tracker_name, count]) => ({ tracker_name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    recentEvents: (recentRes.data ?? []) as AdminInsights['recentEvents'],
    routineHealth: { completions: routineCompletions, skips: routineSkips, topSkippedStep },
    chatFailures7d,
    userProfiles,
  }
}
