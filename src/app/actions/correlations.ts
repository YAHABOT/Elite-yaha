'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { getSafeUser } from '@/lib/supabase/auth'
import { createCorrelation, deleteCorrelation, updateCorrelation } from '@/lib/db/correlations'
import { getCorrelatorSuggestions } from '@/lib/correlator/suggestions'
import type { FormulaNode, CreateCorrelationInput, CorrelatorSuggestion, Correlation } from '@/types/correlator'
import type { Tracker } from '@/types/tracker'

const MAX_NAME_LENGTH = 50
const MAX_UNIT_LENGTH = 20

function isValidFormulaNode(node: unknown): node is FormulaNode {
  if (!node || typeof node !== 'object') return false
  const n = node as Record<string, unknown>

  if (n.type === 'constant') {
    return typeof n.value === 'number'
  }

  if (n.type === 'field') {
    return typeof n.trackerId === 'string' && typeof n.fieldId === 'string'
  }

  if (n.type === 'correlator') {
    return typeof n.correlatorId === 'string'
  }

  if (n.type === 'lastKnown') {
    return typeof n.trackerId === 'string' && typeof n.fieldId === 'string'
  }

  if (n.type === 'op') {
    const validOperators = ['+', '-', '*', '/']
    return (
      typeof n.operator === 'string' &&
      validOperators.includes(n.operator) &&
      isValidFormulaNode(n.left) &&
      isValidFormulaNode(n.right)
    )
  }

  return false
}

export async function createCorrelationAction(
  input: CreateCorrelationInput
): Promise<{ success?: true; error?: string }> {
  try {
    const name = input.name?.trim()
    if (!name) return { error: 'Name is required.' }
    if (name.length > MAX_NAME_LENGTH) {
      return { error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` }
    }

    const unit = input.unit?.trim() ?? ''
    if (unit.length > MAX_UNIT_LENGTH) {
      return { error: `Unit must be ${MAX_UNIT_LENGTH} characters or fewer.` }
    }

    if (!isValidFormulaNode(input.formula)) {
      return { error: 'Invalid formula structure.' }
    }

    await createCorrelation({ name, formula: input.formula, unit })
    const user = await getSafeUser()
    if (user) revalidateTag(`correlations-${user.id}`)
    revalidatePath('/journal/correlations')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create correlation' }
  }
}

export async function updateCorrelationAction(
  id: string,
  input: CreateCorrelationInput
): Promise<{ success?: true; error?: string }> {
  try {
    const name = input.name?.trim()
    if (!name) return { error: 'Name is required.' }
    if (name.length > MAX_NAME_LENGTH) {
      return { error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` }
    }

    const unit = input.unit?.trim() ?? ''
    if (unit.length > MAX_UNIT_LENGTH) {
      return { error: `Unit must be ${MAX_UNIT_LENGTH} characters or fewer.` }
    }

    if (!isValidFormulaNode(input.formula)) {
      return { error: 'Invalid formula structure.' }
    }

    await updateCorrelation(id, { name, formula: input.formula, unit })
    const user = await getSafeUser()
    if (user) revalidateTag(`correlations-${user.id}`)
    revalidatePath('/journal/correlations')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update correlation' }
  }
}

export async function deleteCorrelationAction(
  id: string
): Promise<{ success?: true; error?: string }> {
  try {
    await deleteCorrelation(id)
    const user = await getSafeUser()
    if (user) revalidateTag(`correlations-${user.id}`)
    revalidatePath('/journal/correlations')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete correlation' }
  }
}

export async function suggestCorrelationsAction(
  trackers: Tracker[],
  existingCorrelations: Correlation[],
  lastKnownValues?: Record<string, number>
): Promise<{ suggestions?: CorrelatorSuggestion[]; error?: string }> {
  try {
    const suggestions = getCorrelatorSuggestions(trackers, existingCorrelations, lastKnownValues)
    return { suggestions }
  } catch (e) {
    console.error('[suggestCorrelations]', e instanceof Error ? e.message : e)
    return { error: 'Failed to load suggestions' }
  }
}
