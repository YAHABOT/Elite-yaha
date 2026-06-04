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

export type AdminInsights = {
  totalSignups: number
  usersWithTrackers: number
  usersLoggedThisWeek: number
  aiAccuracy7d: number | null
  actionCardOutcomes30d: { confirmed_clean: number; confirmed_edited: number; dismissed: number }
  dailyActivity14d: { date: string; count: number }[]
  topTrackers: { tracker_name: string; count: number }[]
  recentEvents: { id: string; user_id: string; event_type: string; metadata: Record<string, unknown>; created_at: string }[]
}

export async function getAdminInsights(): Promise<AdminInsights> {
  const supabase = createServiceClient()
  const now = new Date()
  const ago = (days: number) => new Date(now.getTime() - days * 864e5).toISOString()

  const [authUsersRes, trackerUsersRes, loggedWkRes, accuracyRes, outcomesRes, dailyRes, trackersRes, recentRes] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('trackers').select('user_id'),
    supabase.from('tracker_logs').select('user_id').gte('logged_at', ago(7)),
    supabase.from('usage_events').select('metadata').eq('event_type', 'action_card_confirmed').gte('created_at', ago(7)),
    supabase.from('usage_events').select('event_type, metadata').in('event_type', ['action_card_confirmed', 'action_card_dismissed']).gte('created_at', ago(30)),
    supabase.from('usage_events').select('created_at').gte('created_at', ago(14)).order('created_at', { ascending: true }),
    supabase.from('usage_events').select('metadata').eq('event_type', 'action_card_confirmed'),
    supabase.from('usage_events').select('id, user_id, event_type, metadata, created_at').order('created_at', { ascending: false }).limit(20),
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

  return {
    totalSignups: authUsersRes.data?.users?.length ?? 0,
    usersWithTrackers,
    usersLoggedThisWeek,
    aiAccuracy7d,
    actionCardOutcomes30d: { confirmed_clean, confirmed_edited, dismissed },
    dailyActivity14d: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
    topTrackers: Array.from(tMap.entries()).map(([tracker_name, count]) => ({ tracker_name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    recentEvents: (recentRes.data ?? []) as AdminInsights['recentEvents'],
  }
}
