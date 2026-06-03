'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { getSafeUser } from '@/lib/supabase/auth'
import { addUserTarget, deleteUserTarget, updateUserTargetValue } from '@/lib/db/users'
import type { UserTarget } from '@/lib/db/users'

export async function addTargetAction(
  target: Omit<UserTarget, 'id'>
): Promise<{ success?: boolean; error?: string }> {
  try {
    const id = crypto.randomUUID()
    await addUserTarget({ ...target, id })
    const user = await getSafeUser()
    if (user) revalidateTag(`user-profile-${user.id}`)
    revalidatePath('/settings/targets')
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { error: 'Failed to add target' }
  }
}

export async function deleteTargetAction(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    await deleteUserTarget(id)
    const user = await getSafeUser()
    if (user) revalidateTag(`user-profile-${user.id}`)
    revalidatePath('/settings/targets')
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { error: 'Failed to delete target' }
  }
}

export async function updateTargetValueAction(
  id: string,
  value: number
): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!Number.isFinite(value) || value <= 0) {
      return { error: 'Target value must be a positive number' }
    }
    await updateUserTargetValue(id, value)
    const user = await getSafeUser()
    if (user) revalidateTag(`user-profile-${user.id}`)
    revalidatePath('/settings/targets')
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { error: 'Failed to update target' }
  }
}
