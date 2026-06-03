import type { SupabaseClient } from '@supabase/supabase-js'

export type DailyAchievement = {
  targetId: string
  fieldLabel: string
  trackerName: string
  fieldId: string
  trackerId: string
  targetValue: number
  actual: number
  pct: number
  hit: boolean
  direction: 'above' | 'below'
}

export type DailyScoreRecord = {
  date: string
  score: number
  targets_count: number
  targets_hit: number
  achievements: DailyAchievement[]
}

export async function upsertDailyScore(
  userId: string,
  record: DailyScoreRecord,
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase
    .from('daily_scores')
    .upsert(
      {
        user_id: userId,
        date: record.date,
        score: record.score,
        targets_count: record.targets_count,
        targets_hit: record.targets_hit,
        achievements: record.achievements,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    )
  if (error) {
    console.error('[upsertDailyScore]', error.message)
  }
}

export async function getDailyScoresForPeriod(
  userId: string,
  from: string,
  to: string,
  supabase: SupabaseClient
): Promise<DailyScoreRecord[]> {
  const { data } = await supabase
    .from('daily_scores')
    .select('date, score, targets_count, targets_hit, achievements')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  return (data ?? []) as DailyScoreRecord[]
}
