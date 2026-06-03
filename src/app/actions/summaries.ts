'use server'

import { revalidatePath } from 'next/cache'
import { getSafeUser } from '@/lib/supabase/auth'
import { upsertSummaryConfig } from '@/lib/db/summaries'
import { generateSummaryForUser, getPeriodDates } from '@/lib/ai/summary-generator'
import { createServerClient } from '@/lib/supabase/server'
import type { SummaryType, LinkedField } from '@/types/summary'

export async function saveSummaryConfigAction(
  type: SummaryType,
  data: { enabled: boolean; instructions: string; linked_fields: LinkedField[] }
): Promise<{ error?: string }> {
  try {
    const user = await getSafeUser()
    if (!user) return { error: 'Unauthorized' }

    await upsertSummaryConfig(type, {
      enabled: data.enabled,
      instructions: data.instructions.slice(0, 500),
      linked_fields: data.linked_fields,
    })

    revalidatePath('/settings/summaries')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to save' }
  }
}

/** Manual regeneration trigger from settings page */
export async function regenerateSummaryAction(
  type: SummaryType
): Promise<{ error?: string }> {
  try {
    const user = await getSafeUser()
    if (!user) return { error: 'Unauthorized' }

    const supabase = await createServerClient()
    const today = new Date()
    const { start, end } = getPeriodDates(type, today)

    await generateSummaryForUser(user.id, type, start, end, supabase)
    revalidatePath('/dashboard/summaries')
    return {}
  } catch (e) {
    console.error('[regenerateSummaryAction]', e)
    return { error: e instanceof Error ? e.message : 'Generation failed' }
  }
}
