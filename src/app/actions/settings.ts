'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { getSafeUser } from '@/lib/supabase/auth'
import { upsertUserProfile } from '@/lib/db/users'

export async function updateConfirmOnRefreshAction(
  enabled: boolean
): Promise<{ success?: boolean; error?: string }> {
  try {
    await upsertUserProfile({ stats: { confirmOnRefresh: enabled } })
    const user = await getSafeUser()
    if (user) revalidateTag(`user-profile-${user.id}`)
    revalidatePath('/settings')
    return { success: true }
  } catch {
    return { error: 'Failed to save preference' }
  }
}

const MAX_ALIAS_LENGTH = 50
const MAX_TELEGRAM_LENGTH = 50

export async function updateAliasAction(
  alias: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const trimmed = alias.trim()
    if (trimmed.length > MAX_ALIAS_LENGTH) {
      return { error: `Alias must be ${MAX_ALIAS_LENGTH} characters or fewer.` }
    }
    await upsertUserProfile({ alias: trimmed || undefined })
    const user = await getSafeUser()
    if (user) revalidateTag(`user-profile-${user.id}`)
    revalidatePath('/settings')
    return { success: true }
  } catch {
    return { error: 'Failed to save alias' }
  }
}

function stripLeadingAt(handle: string): string {
  return handle.startsWith('@') ? handle.slice(1) : handle
}

export async function saveSettingsAction(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  try {
    const rawAlias = formData.get('alias') as string | null
    const rawTelegramHandle = formData.get('telegram_handle') as string | null

    // Validate alias
    const alias = rawAlias?.trim() ?? ''
    if (alias.length > MAX_ALIAS_LENGTH) {
      return { error: `Alias must be ${MAX_ALIAS_LENGTH} characters or fewer.` }
    }

    // Validate telegram handle
    const rawHandle = rawTelegramHandle?.trim() ?? ''
    const telegramHandle = stripLeadingAt(rawHandle)
    if (telegramHandle.length > MAX_TELEGRAM_LENGTH) {
      return { error: `Telegram handle must be ${MAX_TELEGRAM_LENGTH} characters or fewer.` }
    }

    await upsertUserProfile({
      alias: alias || undefined,
      telegram_handle: telegramHandle || undefined,
    })

    const user = await getSafeUser()
    if (user) revalidateTag(`user-profile-${user.id}`)
    revalidatePath('/settings')
    return { success: true }
  } catch {
    return { error: 'Failed to save settings' }
  }
}
