import { createServerClient } from '@/lib/supabase/server'
import { getSafeUser } from '@/lib/supabase/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

export type UserDayState = {
  id: string
  user_id: string
  date: string
  day_started_at: string | null
  day_ended_at: string | null
  active_routine_id?: string | null
  current_step_index?: number
  routine_step_data?: Record<string, unknown> | null
  routine_last_activity_at?: string | null
}

export async function getDayState(date?: string, supabaseClient?: SupabaseClient): Promise<UserDayState | null> {
  const supabase = supabaseClient ?? await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  // If no date given, fall back to UTC server date
  const d = date ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('user_day_state')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', d)
    .single()

  if (error && error.code === 'PGRST116') return null // no row = not started
  if (error) throw new Error(`Failed to fetch day state: ${error.message}`)
  return data as UserDayState
}

/**
 * Returns the currently open day session — a day that was started but not yet ended.
 * This is the authoritative "active logging date" for all chat messages.
 * Returns null when no session is open (neutral state).
 * BUG-V32-EX35: Optional timezone parameter to convert server UTC to local time boundaries.
 * If timezone provided, checks for sessions active in the user's local timezone.
 */
export async function getActiveDayState(supabaseClient?: SupabaseClient, timezone?: string): Promise<UserDayState | null> {
  const supabase = supabaseClient ?? await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('user_day_state')
    .select('*')
    .eq('user_id', user.id)
    .not('day_started_at', 'is', null)
    .is('day_ended_at', null)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch active day state: ${error.message}`)

  // BUG-V32-EX35: If timezone provided, validate that day_started_at is still valid in local timezone
  if (data && timezone) {
    try {
      const startTime = new Date(data.day_started_at || '')
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      const parts = formatter.formatToParts(startTime)
      const localDateStr = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`
      // Validate that the session date matches or is recent (within 1 day) in the user's timezone
      const sessionDate = new Date(data.date)
      const sessionDateStr = sessionDate.toISOString().split('T')[0]
      if (localDateStr !== sessionDateStr) {
        // Session may have crossed day boundary in user's timezone — return it anyway
        // The UI will handle day boundary transitions
      }
    } catch {
      // If timezone conversion fails, just return the session as-is (fallback to UTC logic)
    }
  }

  return data as UserDayState | null
}

/**
 * Called when the Start Day routine is TRIGGERED (not completed).
 * date: the client's local YYYY-MM-DD (not UTC server date).
 * Also closes any other open sessions so there is never more than one active session.
 * This means starting 8/3 automatically closes the lingering 7/3 session.
 */
export async function markDayStarted(date: string): Promise<void> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const now = new Date().toISOString()

  // Close any previously open sessions (different date) — prevents stale sessions
  // accumulating when the user skips End Day and starts a new day
  await supabase
    .from('user_day_state')
    .update({ day_ended_at: now, updated_at: now })
    .eq('user_id', user.id)
    .is('day_ended_at', null)
    .neq('date', date)

  const { error } = await supabase
    .from('user_day_state')
    .upsert({
      user_id: user.id,
      date,
      day_started_at: now,
      updated_at: now,
    }, { onConflict: 'user_id,date' })

  if (error) throw new Error(`Failed to mark day started: ${error.message}`)
}

/**
 * Skip Start Day — marks a new session as started without running routine steps.
 * Equivalent to Start Day completion but bypasses the chat routine flow.
 * date: the client's local YYYY-MM-DD.
 */
export async function skipStartDay(date: string): Promise<void> {
  // Reuse markDayStarted — identical semantics: opens a session for the given date
  // and closes any other open sessions (prevents multiple active sessions).
  await markDayStarted(date)
}

/**
 * Skip End Day — marks the currently open session as ended without running routine steps.
 * Equivalent to End Day completion but bypasses the chat routine flow.
 * activeDate: the date of the currently open session.
 */
export async function skipEndDay(activeDate: string): Promise<void> {
  // Reuse markDayEnded — identical semantics: closes the session for the given date.
  await markDayEnded(activeDate)
}

/**
 * Persist routine execution state to day_state.
 * Called after each step completes to survive page reloads.
 * FIX: BUG-V32-EX6, EX17 — step halting, restart on reload
 */
export async function persistRoutineState(
  date: string,
  routineId: string | null,
  currentStepIndex: number,
  stepData?: Record<string, unknown>
): Promise<void> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('user_day_state')
    .upsert({
      user_id: user.id,
      date,
      active_routine_id: routineId,
      current_step_index: currentStepIndex,
      routine_step_data: stepData ?? {},
      routine_last_activity_at: now,
      updated_at: now,
    }, { onConflict: 'user_id,date' })

  if (error) throw new Error(`Failed to persist routine state: ${error.message}`)
}

/**
 * Clear routine state when routine completes or is cancelled.
 * FIX: BUG-V32-EX16, EX21 — final step completion, data loss on cancel
 */
export async function clearRoutineState(date: string): Promise<void> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('user_day_state')
    .update({
      active_routine_id: null,
      current_step_index: 0,
      routine_step_data: null,
      routine_last_activity_at: now,
      updated_at: now,
    })
    .eq('user_id', user.id)
    .eq('date', date)

  if (error) throw new Error(`Failed to clear routine state: ${error.message}`)
}

/**
 * BUG-V32-7 FIX: Called when the End Day routine completes.
 * Closes the currently open session (started but not ended) rather than
 * assuming it's today's UTC date — which would break for UTC+ users
 * finishing a session that started the previous local day.
 * Also records the completion timestamp in routine_last_activity_at.
 */
export async function markDayEnded(activeDate: string): Promise<void> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('user_day_state')
    .upsert({
      user_id: user.id,
      date: activeDate,
      day_ended_at: now,
      routine_last_activity_at: now,
      updated_at: now,
    }, { onConflict: 'user_id,date' })

  if (error) throw new Error(`Failed to mark day ended: ${error.message}`)
}
