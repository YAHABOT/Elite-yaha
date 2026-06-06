'use server'
import { revalidatePath } from 'next/cache'
import { recordEvent, type UsageEventType, type UsageEventMetadata } from '@/lib/db/analytics'
import { createServiceClient } from '@/lib/supabase/service'
import { getSafeUser } from '@/lib/supabase/auth'

export async function recordEventAction(
  eventType: UsageEventType,
  metadata: UsageEventMetadata = {}
): Promise<void> {
  // Fire-and-forget — intentionally no return value, no error propagation
  await recordEvent(eventType, metadata)
}

/**
 * Admin-only: toggle excluded_from_analytics on a usage_event.
 * Uses service client so RLS does not block the UPDATE.
 * Revalidates the admin insights page so the next load reflects the change.
 */
export async function toggleEventExclusion(
  eventId: string,
  currentlyExcluded: boolean
): Promise<{ error?: string }> {
  const user = await getSafeUser()
  if (!user) return { error: 'Unauthorized' }

  // Only the designated admin may call this (keep auth server-side)
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL
  if (ADMIN_EMAIL && user.email !== ADMIN_EMAIL) return { error: 'Forbidden' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('usage_events')
    .update({ excluded_from_analytics: !currentlyExcluded })
    .eq('id', eventId)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}
