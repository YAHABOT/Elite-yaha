'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { getSafeUser } from '@/lib/supabase/auth'
import { getUser, upsertUserProfile } from '@/lib/db/users'
import type { OnboardingStepId } from '@/lib/db/onboarding'

export async function markOnboardingStep(
  step: OnboardingStepId
): Promise<{ success?: boolean; error?: string }> {
  try {
    const authUser = await getSafeUser()
    if (!authUser) return { error: 'Unauthorized' }

    const user = await getUser(authUser.id)
    const existing = user?.stats?.onboarding ?? {}

    // Map step ID to the manual flag key
    const flagMap: Partial<Record<OnboardingStepId, keyof typeof existing>> = {
      home_screen: 'home_screen',
      profile: 'profile_done',
      journal: 'journal_visited',
      correlator: 'correlator_done',
      routines: 'routines_done',
      food_bank: 'food_bank_done',
      agents: 'agents_done',
    }

    const flagKey = flagMap[step]
    if (!flagKey) {
      // Auto-completion steps (trackers, first_log, targets, dashboard) — no manual flag
      return { success: true }
    }

    const updatedStats = {
      ...user?.stats,
      onboarding: {
        ...existing,
        [flagKey]: true,
      },
    }

    await upsertUserProfile({ stats: updatedStats })
    revalidateTag(`user-profile-${authUser.id}`)
    revalidatePath('/')
    return { success: true }
  } catch {
    return { error: 'Failed to mark step as done' }
  }
}

export async function dismissOnboarding(): Promise<{ success?: boolean; error?: string }> {
  try {
    const authUser = await getSafeUser()
    if (!authUser) return { error: 'Unauthorized' }

    const user = await getUser(authUser.id)
    const existing = user?.stats?.onboarding ?? {}

    const updatedStats = {
      ...user?.stats,
      onboarding: {
        ...existing,
        dismissed: true,
      },
    }

    await upsertUserProfile({ stats: updatedStats })
    revalidateTag(`user-profile-${authUser.id}`)
    revalidatePath('/')
    return { success: true }
  } catch {
    return { error: 'Failed to dismiss guide' }
  }
}

export async function restoreOnboarding(): Promise<{ success?: boolean; error?: string }> {
  try {
    const authUser = await getSafeUser()
    if (!authUser) return { error: 'Unauthorized' }

    const user = await getUser(authUser.id)
    const existing = user?.stats?.onboarding ?? {}

    const updatedStats = {
      ...user?.stats,
      onboarding: {
        ...existing,
        dismissed: false,
      },
    }

    await upsertUserProfile({ stats: updatedStats })
    revalidateTag(`user-profile-${authUser.id}`)
    revalidatePath('/')
    return { success: true }
  } catch {
    return { error: 'Failed to restore guide' }
  }
}
