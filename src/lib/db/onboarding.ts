import { createServiceClient } from '@/lib/supabase/service'
import type { OnboardingManualFlags } from '@/lib/db/users'

export type OnboardingStepId =
  | 'home_screen'
  | 'profile'
  | 'trackers'
  | 'tracker_page'
  | 'first_log'
  | 'journal'
  | 'correlator'
  | 'routines'
  | 'targets'
  | 'food_bank'
  | 'agents'
  | 'dashboard'

export type StepStatus = {
  id: OnboardingStepId
  complete: boolean
  unlocked: boolean
}

export type OnboardingState = {
  steps: StepStatus[]
  allComplete: boolean
  dismissed: boolean
}

const ALL_STEP_IDS: OnboardingStepId[] = [
  'home_screen',
  'profile',
  'trackers',
  'tracker_page',
  'first_log',
  'journal',
  'correlator',
  'routines',
  'targets',
  'food_bank',
  'agents',
  'dashboard',
]

export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const supabase = createServiceClient()

  // Fetch all counts + user data in parallel
  const [
    trackersResult,
    logsResult,
    widgetsResult,
    userResult,
  ] = await Promise.all([
    supabase
      .from('trackers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('tracker_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('widgets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('users')
      .select('alias, targets, stats')
      .eq('id', userId)
      .maybeSingle(),
  ])

  const trackersCount = trackersResult.count ?? 0
  const logsCount = logsResult.count ?? 0
  const widgetsCount = widgetsResult.count ?? 0

  const rawTargets = userResult.data?.targets
  const targetsLength = Array.isArray(rawTargets) ? rawTargets.length : 0

  const stats = userResult.data?.stats as { onboarding?: OnboardingManualFlags; profile?: { dob?: string; heightCm?: number; gender?: string } } | null
  const onboardingFlags = stats?.onboarding ?? {}
  const profileData = stats?.profile ?? {}

  const dismissed = onboardingFlags.dismissed === true

  const profileComplete =
    !!userResult.data?.alias &&
    !!profileData.dob &&
    !!profileData.heightCm &&
    !!profileData.gender

  // Derive per-step completion
  const completionMap: Record<OnboardingStepId, boolean> = {
    home_screen: onboardingFlags.home_screen === true,
    profile: profileComplete || onboardingFlags.profile_done === true,
    trackers: trackersCount > 0,
    tracker_page: onboardingFlags.tracker_page_done === true,
    first_log: logsCount > 0,
    journal: onboardingFlags.journal_visited === true,
    correlator: onboardingFlags.correlator_done === true,
    routines: onboardingFlags.routines_done === true,
    targets: targetsLength > 0,
    food_bank: onboardingFlags.food_bank_done === true,
    agents: onboardingFlags.agents_done === true,
    dashboard: widgetsCount > 0,
  }

  // All steps visible from day one — no progressive unlock
  const steps: StepStatus[] = ALL_STEP_IDS.map((id) => ({
    id,
    complete: completionMap[id],
    unlocked: true,
  }))

  const allComplete = ALL_STEP_IDS.every((id) => completionMap[id])

  return { steps, allComplete, dismissed }
}
