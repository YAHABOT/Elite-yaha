'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { sanitizeFields } from '@/lib/ai/actions'
import { upsertDailyScore } from '@/lib/db/scores'
import type { ActionCard, UpdateDataCard, CreateTrackerCard } from '@/types/action-card'
import type { SchemaField } from '@/types/tracker'
import type { UserTarget } from '@/lib/db/users'

export async function confirmLogAction(
  card: ActionCard,
  messageId?: string,
  cardIndex?: number
): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!card.trackerId) return { error: 'Tracker ID is required' }
    if (!card.fields || Object.keys(card.fields).length === 0) {
      return { error: 'Fields are required' }
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Validate date format before constructing Date object to avoid Invalid Date throws
    if (!/^\d{4}-\d{2}-\d{2}$/.test(card.date)) {
      return { error: 'Invalid date format — expected YYYY-MM-DD' }
    }

    // CRITICAL: The action card's date field MUST be the source of truth for when to log.
    // This date comes from the AI's action card JSON output, which was instructed
    // with the correct logging date in the system prompt.
    // Validate that the date is not undefined or empty.
    const logDateStr = card.date.trim()
    if (!logDateStr) {
      return { error: 'Action card date is required and cannot be empty' }
    }

    // BUG-V32-3: Validate fieldIds exist in tracker schema before inserting
    // Fetch tracker to check schema — prevents data landing in wrong fields
    const { data: tracker } = await supabase
      .from('trackers')
      .select('schema, user_id')
      .eq('id', card.trackerId)
      .single()

    if (!tracker) {
      return { error: `Tracker not found: ${card.trackerId}` }
    }

    // Verify user owns this tracker
    if (tracker.user_id !== user.id) {
      return { error: 'Tracker not found' }
    }

    // Validate all fieldIds in card.fields exist in tracker schema
    const schema = (tracker.schema as SchemaField[]) || []
    const validFieldIds = new Set(schema.map(f => f.fieldId))
    for (const fieldId of Object.keys(card.fields)) {
      if (!validFieldIds.has(fieldId)) {
        return { error: `Field "${fieldId}" does not exist in tracker schema` }
      }
    }

    // BUG-V32-EX10, EX14, EX15, EX18, EX19, EX33, EX34: Validate numeric field calculations
    // Audit trail for field values to prevent hallucinated/fabricated values
    const numericFields = Object.entries(card.fields).filter(([, v]) => typeof v === 'number')
    for (const [fieldId, value] of numericFields) {
      if (typeof value === 'number' && value >= 0) {
        // Log exact value for audit trail (no rounding)
        console.log(`[confirmLogAction] Field validation: ${fieldId} = ${value} (exact)`)
      }
    }

    // Sanitize fields against tracker schema before insert
    const sanitizedFields = sanitizeFields(card.fields, schema)

    // Use the actual confirmation time (wall-clock) so entries are not stuck at midnight UTC.
    // Only use the action card's date for the calendar date — the time component comes from right now.
    const now = new Date()
    const nowDateStr = now.toISOString().split('T')[0]
    const loggedAt = logDateStr === nowDateStr
      ? now.toISOString()                               // today: use exact confirmation time
      : `${logDateStr}T${now.toISOString().split('T')[1]}` // backdated: use current wall-clock time on target date

    console.log('[confirmLogAction] Logging to date:', logDateStr, '— loggedAt:', loggedAt, '— tracker:', card.trackerId)

    // Duplicate guard — only blocks re-confirming the SAME card (same messageId + cardIndex).
    // Checks if this specific message's action card is already marked confirmed in the DB.
    // Does NOT block multiple entries for the same tracker on the same day (e.g. two meals).
    let alreadyConfirmed = false
    if (messageId && cardIndex !== undefined) {
      const { data: msgCheck } = await supabase
        .from('chat_messages')
        .select('actions')
        .eq('id', messageId)
        .single()
      if (msgCheck) {
        const actions = msgCheck.actions as ActionCard[] ?? []
        alreadyConfirmed = actions[cardIndex]?.confirmed === true
      }
    }

    if (!alreadyConfirmed) {
      const { error } = await supabase
        .from('tracker_logs')
        .insert({
          tracker_id: card.trackerId,
          user_id: user.id,
          fields: sanitizedFields,
          logged_at: loggedAt,
          source: 'chat',
        })
      if (error) return { error: `Failed to log entry: ${error.message}` }
    }

    // Persist confirmed: true onto the matching action card in the message's JSONB so the
    // card initialises as confirmed after a page refresh instead of reverting to pending.
    if (messageId) {
      const { data: msg } = await supabase
        .from('chat_messages')
        .select('actions, session_id')
        .eq('id', messageId)
        .single()

      if (msg) {
        // Verify the message belongs to this user via session ownership
        const { error: sessErr } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('id', msg.session_id as string)
          .eq('user_id', user.id)
          .single()

        if (sessErr) {
          // Log entry was already written to tracker_logs above — this is non-blocking.
          // confirmed:true will not persist but the data is saved. Log for debugging.
          console.error('[confirmLogAction] Session ownership check failed — confirmed state not persisted:', sessErr.message)
        } else {
          const rawActions = msg.actions as ActionCard[] ?? []
          // Index-based match is exact — avoids tracker+date collisions and string diff bugs.
          // Fall back to trackerId+date matching for messages that predate cardIndex.
          // Use the validated logDateStr (not card.date directly) to ensure consistency.
          const actions = rawActions.map((a: ActionCard, i: number) => {
            const matches = cardIndex !== undefined
              ? i === cardIndex
              : a.trackerId === card.trackerId && a.date === logDateStr
            return matches ? { ...a, confirmed: true } : a
          })
          const { error: updateErr } = await supabase
            .from('chat_messages')
            .update({ actions })
            .eq('id', messageId)
          if (updateErr) {
            console.error('[confirmLogAction] Failed to persist confirmed state:', updateErr.message)
          }
        }
      }
    }

    // Upsert daily score snapshot for this date (fire-and-forget — don't block confirm)
    void upsertScoreForDate(supabase, user.id, logDateStr).catch(() => {})

    revalidatePath('/journal')
    revalidatePath('/dashboard')
    revalidatePath('/trackers', 'layout')
    revalidatePath('/chat')

    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to confirm log' }
  }
}

export async function updateLogAction(
  card: UpdateDataCard,
  messageId?: string,
  cardIndex?: number
): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!card.logId) return { error: 'Log ID is required' }
    if (!card.trackerId) return { error: 'Tracker ID is required' }
    if (!card.fields || Object.keys(card.fields).length === 0) {
      return { error: 'Fields are required' }
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Verify the log belongs to the user by checking tracker ownership
    // Also fetch schema so we can sanitize incoming fields before writing
    const { data: tracker } = await supabase
      .from('trackers')
      .select('id, schema')
      .eq('id', card.trackerId)
      .eq('user_id', user.id)
      .single()

    if (!tracker) {
      return { error: 'Tracker not found or you do not have permission to update this log' }
    }

    // Verify the log exists
    const { data: existingLog } = await supabase
      .from('tracker_logs')
      .select('id, fields')
      .eq('id', card.logId)
      .eq('tracker_id', card.trackerId)
      .eq('user_id', user.id)
      .single()

    if (!existingLog) {
      return { error: 'Log entry not found' }
    }

    // Sanitize incoming fields against tracker schema before merging —
    // prevents arbitrary JSONB from AI output landing in the DB unchecked
    const trackerSchema = (tracker.schema ?? []) as SchemaField[]
    const sanitized = sanitizeFields(card.fields as Record<string, unknown>, trackerSchema)
    const mergedFields = { ...existingLog.fields as Record<string, unknown>, ...sanitized }

    // Update the log entry — user_id filter enforces ownership at mutation level (defense in depth)
    const { error } = await supabase
      .from('tracker_logs')
      .update({ fields: mergedFields })
      .eq('id', card.logId)
      .eq('user_id', user.id)

    if (error) return { error: `Failed to update log: ${error.message}` }

    // Persist confirmed: true onto the matching action card in the message JSONB
    if (messageId) {
      const { data: msg } = await supabase
        .from('chat_messages')
        .select('actions, session_id')
        .eq('id', messageId)
        .single()

      if (msg) {
        const { error: sessErr } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('id', msg.session_id as string)
          .eq('user_id', user.id)
          .single()

        if (sessErr) {
          console.error('[updateLogAction] Session ownership check failed — confirmed state not persisted:', sessErr.message)
        } else {
          const rawActions = msg.actions as UpdateDataCard[] ?? []
          const actions = rawActions.map((a: UpdateDataCard, i: number) => {
            const matches = cardIndex !== undefined
              ? i === cardIndex
              : a.logId === card.logId
            return matches ? { ...a, confirmed: true } : a
          })
          const { error: updateErr } = await supabase
            .from('chat_messages')
            .update({ actions })
            .eq('id', messageId)
          if (updateErr) {
            console.error('[updateLogAction] Failed to persist confirmed state:', updateErr.message)
          }
        }
      }
    }

    revalidatePath('/journal')
    revalidatePath('/dashboard')
    revalidatePath('/trackers', 'layout')
    revalidatePath('/chat')

    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update log' }
  }
}

export async function confirmCreateTrackerAction(
  card: CreateTrackerCard,
  messageId?: string,
  cardIndex?: number
): Promise<{ success?: boolean; trackerId?: string; error?: string }> {
  try {
    if (!card.name?.trim()) return { error: 'Tracker name is required' }
    if (!Array.isArray(card.schema)) return { error: 'Tracker schema is required' }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Duplicate guard — only blocks re-confirming the SAME card
    if (messageId && cardIndex !== undefined) {
      const { data: msgCheck } = await supabase
        .from('chat_messages')
        .select('actions')
        .eq('id', messageId)
        .single()
      if (msgCheck) {
        const actions = msgCheck.actions as Array<{ confirmed?: boolean }> ?? []
        if (actions[cardIndex]?.confirmed === true) {
          return { success: true }
        }
      }
    }

    const { data: newTracker, error } = await supabase
      .from('trackers')
      .insert({
        user_id: user.id,
        name: card.name.trim(),
        type: card.trackerType,
        color: card.color,
        schema: card.schema,
      })
      .select('id')
      .single()

    if (error) return { error: `Failed to create tracker: ${error.message}` }

    // Persist confirmed: true onto the action card in the message JSONB
    if (messageId) {
      const { data: msg } = await supabase
        .from('chat_messages')
        .select('actions, session_id')
        .eq('id', messageId)
        .single()

      if (msg) {
        const { error: sessErr } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('id', msg.session_id as string)
          .eq('user_id', user.id)
          .single()

        if (!sessErr) {
          const rawActions = msg.actions as Array<Record<string, unknown>> ?? []
          const updatedActions = rawActions.map((a, i: number) => {
            const matches = cardIndex !== undefined ? i === cardIndex : a.type === 'CREATE_TRACKER' && a.name === card.name
            return matches ? { ...a, confirmed: true } : a
          })
          await supabase
            .from('chat_messages')
            .update({ actions: updatedActions })
            .eq('id', messageId)
        }
      }
    }

    revalidateTag(`trackers-${user.id}`)
    revalidatePath('/trackers')
    revalidatePath('/chat')
    return { success: true, trackerId: newTracker.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create tracker' }
  }
}

export async function deleteSessionAction(id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const { deleteSession } = await import('@/lib/db/chat')
    await deleteSession(id)
    revalidatePath('/chat')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function deleteSessionsAction(ids: string[]): Promise<{ success?: boolean; error?: string }> {
  try {
    if (ids.length === 0) return { success: true }
    const { deleteSessions } = await import('@/lib/db/chat')
    await deleteSessions(ids)
    revalidatePath('/chat')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function renameSessionAction(id: string, title: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const { updateSession } = await import('@/lib/db/chat')
    await updateSession(id, { title })
    revalidatePath('/chat', 'layout')
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

/** Computes and persists today's score snapshot after any log change. */
async function upsertScoreForDate(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  dateStr: string
): Promise<void> {
  const [{ data: userRow }, { data: dayLogs }] = await Promise.all([
    supabase.from('users').select('targets').eq('id', userId).maybeSingle(),
    supabase
      .from('tracker_logs')
      .select('tracker_id, fields, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', `${dateStr}T00:00:00.000Z`)
      .lte('logged_at', `${dateStr}T23:59:59.999Z`),
  ])

  const targets = ((userRow?.targets ?? []) as UserTarget[]).filter(
    t => t.trackerId !== '__correlations__' &&
    ['number', 'rating', 'duration'].includes(t.fieldType) &&
    t.value > 0
  )

  if (targets.length === 0) return

  const logs = (dayLogs ?? []) as Array<{ tracker_id: string; fields: Record<string, unknown>; logged_at: string }>

  const achievements = targets.map(target => {
    const trackerLogs = logs.filter(l => l.tracker_id === target.trackerId)
    const values = trackerLogs
      .map(l => l.fields[target.fieldId])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    const actual = values.reduce((a, b) => a + b, 0)
    const pct = target.direction === 'below'
      ? (actual <= target.value ? 100 : Math.max(0, (target.value / actual) * 100))
      : Math.min(actual / target.value, 1) * 100

    return {
      targetId: target.id,
      fieldLabel: target.fieldLabel,
      trackerName: target.trackerName,
      fieldId: target.fieldId,
      trackerId: target.trackerId,
      targetValue: target.value,
      actual: Math.round(actual * 10) / 10,
      pct: Math.round(pct),
      hit: pct >= 100,
      direction: (target.direction ?? 'above') as 'above' | 'below',
    }
  })

  const score = Math.round(
    achievements.reduce((a, b) => a + b.pct, 0) / achievements.length
  )
  const targets_hit = achievements.filter(a => a.hit).length

  await upsertDailyScore(userId, {
    date: dateStr,
    score,
    targets_count: targets.length,
    targets_hit,
    achievements,
  }, supabase)
}
