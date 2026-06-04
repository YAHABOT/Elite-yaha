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

export type UsageEventMetadata = Record<string, string | number | boolean | null>

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

export type UserProfile = {
  id: string
  email: string
  joinedAt: string
  lastSeenAt: string | null
  trackerCount: number
  trackerNames: string[]
  totalLogs: number
  logsLast7d: number
  lastLogAt: string | null
  status: 'active' | 'dormant' | 'new'
}

export type AdminInsights = {
  totalSignups: number
  usersWithTrackers: number
  usersLoggedThisWeek: number
  aiAccuracy7d: number | null
  actionCardOutcomes30d: { confirmed_clean: number; confirmed_edited: number; dismissed: number }
  dailyActivity14d: { date: string; count: number }[]
  topTrackers: { tracker_name: string; count: number }[]
  recentEvents: { id: string; user_id: string; event_type: string; metadata: Record<string, unknown>; created_at: string }[]
  userProfiles: UserProfile[]
}

export async function getAdminInsights(): Promise<AdminInsights> {
  const supabase = createServiceClient()
  const now = new Date()
  const ago = (days: number) => new Date(now.getTime() - days * 864e5).toISOString()

  const [authUsersRes, trackerUsersRes, loggedWkRes, accuracyRes, outcomesRes, dailyRes, trackersRes, recentRes, allTrackersRes, allLogsRes] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('trackers').select('user_id'),
    supabase.from('tracker_logs').select('user_id').gte('logged_at', ago(7)),
    supabase.from('usage_events').select('metadata').eq('event_type', 'action_card_confirmed').gte('created_at', ago(7)),
    supabase.from('usage_events').select('event_type, metadata').in('event_type', ['action_card_confirmed', 'action_card_dismissed']).gte('created_at', ago(30)),
    supabase.from('usage_events').select('created_at').gte('created_at', ago(14)).order('created_at', { ascending: true }),
    supabase.from('usage_events').select('metadata').eq('event_type', 'action_card_confirmed'),
    supabase.from('usage_events').select('id, user_id, event_type, metadata, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('trackers').select('user_id, name').order('created_at', { ascending: true }),
    supabase.from('tracker_logs').select('user_id, logged_at').order('logged_at', { ascending: false }).limit(50000),
  ])

  // AI accuracy
  const confirmed = (accuracyRes.data ?? []) as { metadata: Record<string, unknown> }[]
  const aiAccuracy7d = confirmed.length === 0 ? null
    : Math.round(confirmed.filter(e => e.metadata?.was_edited === false).length / confirmed.length * 100)

  // Outcomes
  type OutcomeRow = { event_type: string; metadata: Record<string, unknown> }
  const outcomes = (outcomesRes.data ?? []) as OutcomeRow[]
  const confirmed_clean  = outcomes.filter(e => e.event_type === 'action_card_confirmed' && e.metadata?.was_edited === false).length
  const confirmed_edited = outcomes.filter(e => e.event_type === 'action_card_confirmed' && e.metadata?.was_edited === true).length
  const dismissed        = outcomes.filter(e => e.event_type === 'action_card_dismissed').length

  // Daily activity — fill all 14 days with 0 first
  const dailyMap = new Map<string, number>()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    dailyMap.set(d.toISOString().split('T')[0], 0)
  }
  for (const e of (dailyRes.data ?? [])) {
    const date = (e.created_at as string).split('T')[0]
    if (dailyMap.has(date)) dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1)
  }

  // Top trackers
  const tMap = new Map<string, number>()
  for (const e of (trackersRes.data ?? [])) {
    const name = ((e.metadata as Record<string, unknown>)?.tracker_name) as string | undefined
    if (name) tMap.set(name, (tMap.get(name) ?? 0) + 1)
  }

  const usersWithTrackers = new Set((trackerUsersRes.data ?? []).map(r => r.user_id as string)).size
  const usersLoggedThisWeek = new Set((loggedWkRes.data ?? []).map(r => r.user_id as string)).size

  // Per-user profiles
  type TrackerRow = { user_id: string; name: string }
  type LogRow = { user_id: string; logged_at: string }

  const trackersByUser = new Map<string, string[]>()
  for (const t of (allTrackersRes.data ?? []) as TrackerRow[]) {
    const arr = trackersByUser.get(t.user_id) ?? []
    arr.push(t.name)
    trackersByUser.set(t.user_id, arr)
  }

  const logCountByUser = new Map<string, number>()
  const lastLogByUser = new Map<string, string>()
  const logLast7dByUser = new Map<string, number>()
  const sevenDaysAgo = ago(7)
  for (const l of (allLogsRes.data ?? []) as LogRow[]) {
    logCountByUser.set(l.user_id, (logCountByUser.get(l.user_id) ?? 0) + 1)
    if (!lastLogByUser.has(l.user_id)) lastLogByUser.set(l.user_id, l.logged_at)
    if (l.logged_at >= sevenDaysAgo) {
      logLast7dByUser.set(l.user_id, (logLast7dByUser.get(l.user_id) ?? 0) + 1)
    }
  }

  const authUsers = authUsersRes.data?.users ?? []
  const userProfiles: UserProfile[] = authUsers.map(u => {
    const totalLogs = logCountByUser.get(u.id) ?? 0
    const logsLast7d = logLast7dByUser.get(u.id) ?? 0
    const lastLogAt = lastLogByUser.get(u.id) ?? null
    const status: UserProfile['status'] =
      logsLast7d > 0 ? 'active'
      : totalLogs > 0 ? 'dormant'
      : 'new'
    return {
      id: u.id,
      email: u.email ?? '(no email)',
      joinedAt: u.created_at,
      lastSeenAt: u.last_sign_in_at ?? null,
      trackerCount: (trackersByUser.get(u.id) ?? []).length,
      trackerNames: trackersByUser.get(u.id) ?? [],
      totalLogs,
      logsLast7d,
      lastLogAt,
      status,
    }
  }).sort((a, b) => {
    // active first, then dormant, then new; within group sort by totalLogs desc
    const order = { active: 0, dormant: 1, new: 2 }
    const diff = order[a.status] - order[b.status]
    return diff !== 0 ? diff : b.totalLogs - a.totalLogs
  })

  return {
    totalSignups: authUsers.length,
    usersWithTrackers,
    usersLoggedThisWeek,
    aiAccuracy7d,
    actionCardOutcomes30d: { confirmed_clean, confirmed_edited, dismissed },
    dailyActivity14d: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
    topTrackers: Array.from(tMap.entries()).map(([tracker_name, count]) => ({ tracker_name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    recentEvents: (recentRes.data ?? []) as AdminInsights['recentEvents'],
    userProfiles,
  }
}
