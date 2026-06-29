import { getRoutines } from '@/lib/db/routines'
import type { Routine } from '@/types/routine'

export async function detectRoutineTrigger(message: string): Promise<Routine | null> {
  // If the message is a massive pasted prompt (e.g. from the AI tracking prompt), it should NEVER trigger a routine!
  // Routine triggers are short intent commands like "End day", "Morning routine", etc.
  if (message.length > 100) return null

  const routines = await getRoutines()
  const normalized = message.toLowerCase().trim()
  
  return routines.find((r) => {
    const trigger = r.trigger_phrase.toLowerCase().trim()
    // Escape regex characters
    const escapedTrigger = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match trigger phrase as a whole word/phrase with boundaries
    const regex = new RegExp(`\\b${escapedTrigger}\\b`, 'i')
    return regex.test(normalized)
  }) ?? null
}
