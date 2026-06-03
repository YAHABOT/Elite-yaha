'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { getSafeUser } from '@/lib/supabase/auth'
import { createWidget, deleteWidget, reorderWidgets, updateWidget } from '@/lib/db/dashboard'
import { WIDGET_TYPES } from '@/types/widget'
import type { CreateWidgetInput } from '@/types/widget'

const MAX_WIDGET_LABEL = 50
const MIN_DAYS = 1
const MAX_DAYS = 365

export async function createWidgetAction(
  input: CreateWidgetInput
): Promise<{ success?: boolean; error?: string }> {
  try {
    const label = input.label?.trim()
    if (!label) return { error: 'Label is required.' }
    if (label.length > MAX_WIDGET_LABEL) {
      return { error: `Label must be ${MAX_WIDGET_LABEL} characters or fewer.` }
    }
    if (!WIDGET_TYPES.includes(input.type)) {
      return { error: 'Invalid widget type.' }
    }

    const days =
      input.days !== undefined
        ? Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.floor(input.days)))
        : 7

    const width = input.width === 'full' ? 'full' : 'half'
    await createWidget({ ...input, label, days, width })
    const user = await getSafeUser()
    if (user) revalidateTag(`widgets-${user.id}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { error: 'Failed to create widget.' }
  }
}

export async function updateWidgetAction(
  id: string,
  data: Partial<CreateWidgetInput>
): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!id) return { error: 'Widget ID is required.' }
    const label = data.label?.trim()
    if (label !== undefined && label.length > MAX_WIDGET_LABEL) {
      return { error: `Label must be ${MAX_WIDGET_LABEL} characters or fewer.` }
    }
    const days =
      data.days !== undefined
        ? Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.floor(data.days)))
        : undefined
    await updateWidget(id, { ...data, label, days })
    const user = await getSafeUser()
    if (user) revalidateTag(`widgets-${user.id}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { error: 'Failed to update widget.' }
  }
}

export async function deleteWidgetAction(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!id) return { error: 'Widget ID is required.' }
    await deleteWidget(id)
    const user = await getSafeUser()
    if (user) revalidateTag(`widgets-${user.id}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { error: 'Failed to delete widget.' }
  }
}

export async function reorderWidgetsAction(
  orderedIds: string[]
): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return { error: 'orderedIds must be a non-empty array.' }
    }
    if (!orderedIds.every(id => typeof id === 'string')) {
      return { error: 'All widget IDs must be strings.' }
    }

    await reorderWidgets(orderedIds)
    const user = await getSafeUser()
    if (user) revalidateTag(`widgets-${user.id}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { error: 'Failed to reorder widgets.' }
  }
}
