import { createServerClient } from '@/lib/supabase/server'
import { getSafeUser } from '@/lib/supabase/auth'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SummaryConfig, SummaryContent, SummaryType, Summary, LinkedField } from '@/types/summary'

// ── Summary Configs ───────────────────────────────────────────────────────────

export async function getSummaryConfig(
  type: SummaryType,
  supabaseClient?: SupabaseClient
): Promise<SummaryConfig | null> {
  const supabase = supabaseClient ?? await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('summary_configs')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', type)
    .maybeSingle()

  if (error) throw new Error(`Failed to get summary config: ${error.message}`)
  return data as SummaryConfig | null
}

export async function getSummaryConfigs(
  supabaseClient?: SupabaseClient
): Promise<SummaryConfig[]> {
  const supabase = supabaseClient ?? await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('summary_configs')
    .select('*')
    .eq('user_id', user.id)
    .order('type')

  if (error) throw new Error(`Failed to get summary configs: ${error.message}`)
  return (data ?? []) as SummaryConfig[]
}

export async function upsertSummaryConfig(
  type: SummaryType,
  updates: { enabled?: boolean; instructions?: string; linked_fields?: LinkedField[] },
  supabaseClient?: SupabaseClient
): Promise<SummaryConfig> {
  const supabase = supabaseClient ?? await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('summary_configs')
    .upsert(
      {
        user_id: user.id,
        type,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,type' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to save summary config: ${error.message}`)
  return data as SummaryConfig
}

// ── Summaries ─────────────────────────────────────────────────────────────────

export async function getSummaries(
  type: SummaryType,
  limit = 12,
  supabaseClient?: SupabaseClient
): Promise<Summary[]> {
  const supabase = supabaseClient ?? await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('summaries')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', type)
    .order('period_start', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to get summaries: ${error.message}`)
  return (data ?? []) as Summary[]
}

export async function getSummaryById(
  id: string,
  supabaseClient?: SupabaseClient
): Promise<Summary | null> {
  const supabase = supabaseClient ?? await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('summaries')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw new Error(`Failed to get summary: ${error.message}`)
  return data as Summary | null
}

export async function upsertSummary(
  userId: string,
  type: SummaryType,
  periodStart: string,
  periodEnd: string,
  content: SummaryContent,
  supabaseClient: SupabaseClient
): Promise<Summary> {
  const { data, error } = await supabaseClient
    .from('summaries')
    .upsert(
      {
        user_id: userId,
        type,
        period_start: periodStart,
        period_end: periodEnd,
        content,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,type,period_start' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert summary: ${error.message}`)
  return data as Summary
}

/** Get all users who have a specific summary type enabled — for cron batch generation */
export async function getEnabledSummaryUserIds(
  type: SummaryType,
  supabaseClient: SupabaseClient
): Promise<string[]> {
  const { data, error } = await supabaseClient
    .from('summary_configs')
    .select('user_id')
    .eq('type', type)
    .eq('enabled', true)

  if (error) throw new Error(`Failed to get enabled summary users: ${error.message}`)
  return (data ?? []).map((r: { user_id: string }) => r.user_id)
}

/** Get a single user's summary config by userId — used by cron (no auth context) */
export async function getSummaryConfigByUserId(
  userId: string,
  type: SummaryType,
  supabaseClient: SupabaseClient
): Promise<SummaryConfig | null> {
  const { data, error } = await supabaseClient
    .from('summary_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .maybeSingle()

  if (error) throw new Error(`Failed to get summary config: ${error.message}`)
  return data as SummaryConfig | null
}

/** Get previous period summary for delta comparisons */
export async function getPreviousSummary(
  userId: string,
  type: SummaryType,
  beforePeriodStart: string,
  supabaseClient: SupabaseClient
): Promise<Summary | null> {
  const { data, error } = await supabaseClient
    .from('summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .lt('period_start', beforePeriodStart)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data as Summary | null
}
