import { unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSafeUser } from '@/lib/supabase/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

const USER_COLUMNS = 'id, alias, targets, stats, telegram_handle, access_status'

/**
 * A single daily target — linked to a real tracker field.
 * Only numeric-ish fields (number, rating, duration) make sense.
 */
export type UserTarget = {
  id: string           // crypto.randomUUID() assigned at creation
  trackerId: string
  trackerName: string
  fieldId: string
  fieldLabel: string
  fieldType: string    // 'number' | 'duration' | 'rating'
  unit?: string
  value: number        // the target amount
  direction?: 'above' | 'below'  // undefined → 'above' (higher is better)
}

/** Stored as a JSONB array in users.targets */
export type UserTargets = UserTarget[]

export type OnboardingManualFlags = {
  home_screen?: boolean       // step 1
  profile_done?: boolean      // step 2
  journal_visited?: boolean   // step 6
  correlator_done?: boolean   // step 7
  routines_done?: boolean     // step 8
  food_bank_done?: boolean    // step 10
  agents_done?: boolean       // step 11
  tracker_page_done?: boolean // step 4
  dismissed?: boolean         // user dismissed chip permanently
}

export type UserProfile = {
  dob?: string              // YYYY-MM-DD
  heightCm?: number
  gender?: 'male' | 'female'
}

export type ShareFieldConfig = {
  fieldId: string
  enabled: boolean
  aggregation: 'sum' | 'avg'
}

export type ShareTrackerItem = {
  type: 'tracker'
  id: string
  enabled: boolean
  fields: ShareFieldConfig[]
}

export type ShareCorrelationItem = {
  type: 'correlation'
  id: string
  enabled: boolean
}

export type ShareCardItem = ShareTrackerItem | ShareCorrelationItem

export type ShareCardConfig = {
  items: ShareCardItem[]
}

export type UserStats = {
  confirmOnRefresh?: boolean
  onboarding?: OnboardingManualFlags
  profile?: UserProfile
  shareCard?: ShareCardConfig
}

export type User = {
  id: string
  alias: string | null
  targets: UserTargets
  stats: UserStats
  telegram_handle: string | null
  access_status: 'green' | 'red'
}

export type UpsertUserInput = {
  alias?: string | null
  targets?: UserTargets
  stats?: UserStats
  telegram_handle?: string | null
  access_status?: 'green' | 'red'
}

function cachedGetUser(userId: string) {
  return unstable_cache(
    async () => {
      const supabase = createServiceClient()
      const { data, error } = await supabase
        .from('users')
        .select(USER_COLUMNS)
        .eq('id', userId)
        .maybeSingle()
      if (error) throw new Error(`Failed to fetch user: ${error.message}`)
      if (!data) return null
      const rawTargets = data.targets
      const targets: UserTargets = Array.isArray(rawTargets) ? (rawTargets as UserTargets) : []
      return {
        id: data.id,
        alias: data.alias ?? null,
        targets,
        stats: (data.stats as UserStats) ?? {},
        telegram_handle: data.telegram_handle ?? null,
        access_status: (data.access_status as 'green' | 'red') ?? 'red',
      } as User
    },
    [`user-profile-${userId}`],
    { tags: [`user-profile-${userId}`], revalidate: false }
  )()
}

export async function getUser(id?: string, supabaseClient?: SupabaseClient): Promise<User | null> {
  // When an explicit client is provided, bypass cache (cron, admin operations)
  if (supabaseClient) {
    let userId = id
    if (!userId) {
      const authUser = await getSafeUser()
      if (!authUser) throw new Error('Unauthorized')
      userId = authUser.id
    }
    const { data, error } = await supabaseClient
      .from('users')
      .select(USER_COLUMNS)
      .eq('id', userId)
      .maybeSingle()
    if (error) throw new Error(`Failed to fetch user: ${error.message}`)
    if (!data) return null
    const rawTargets = data.targets
    const targets: UserTargets = Array.isArray(rawTargets) ? (rawTargets as UserTargets) : []
    return {
      id: data.id,
      alias: data.alias ?? null,
      targets,
      stats: (data.stats as UserStats) ?? {},
      telegram_handle: data.telegram_handle ?? null,
      access_status: (data.access_status as 'green' | 'red') ?? 'red',
    }
  }

  // No explicit client — use cache
  let userId = id
  if (!userId) {
    const authUser = await getSafeUser()
    if (!authUser) throw new Error('Unauthorized')
    userId = authUser.id
  }

  return cachedGetUser(userId)
}

export async function upsertUserProfile(input: UpsertUserInput): Promise<User> {
  const supabase = createServiceClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const upsertPayload: Record<string, unknown> = { id: user.id }
  if (input.alias !== undefined) upsertPayload.alias = input.alias
  if (input.targets !== undefined) upsertPayload.targets = input.targets
  if (input.stats !== undefined) upsertPayload.stats = input.stats
  if (input.telegram_handle !== undefined) upsertPayload.telegram_handle = input.telegram_handle
  if (input.access_status !== undefined) upsertPayload.access_status = input.access_status

  const { data, error } = await supabase
    .from('users')
    .upsert(upsertPayload, { onConflict: 'id' })
    .select(USER_COLUMNS)
    .single()

  if (error) throw new Error(`Failed to upsert user profile: ${error.message}`)

  const rawTargets = data.targets
  const targets: UserTargets = Array.isArray(rawTargets) ? (rawTargets as UserTargets) : []

  return {
    id: data.id,
    alias: data.alias ?? null,
    targets,
    stats: (data.stats as UserStats) ?? {},
    telegram_handle: data.telegram_handle ?? null,
    access_status: (data.access_status as 'green' | 'red') ?? 'red',
  }
}

/** Add one target to the user's targets array */
export async function addUserTarget(target: UserTarget): Promise<UserTargets> {
  const authUser = await getSafeUser()
  if (!authUser) throw new Error('Unauthorized')

  // getUser() returns null when the users row doesn't exist yet — fall back to empty targets
  const user = await getUser()
  const updated = [...(user?.targets ?? []), target]
  await upsertUserProfile({ targets: updated })
  return updated
}

/** Delete a target by id */
export async function deleteUserTarget(id: string): Promise<UserTargets> {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')

  const updated = user.targets.filter(t => t.id !== id)
  await upsertUserProfile({ targets: updated })
  return updated
}

/** Update only the value of an existing target */
export async function updateUserTargetValue(id: string, value: number): Promise<UserTargets> {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')

  const updated = user.targets.map(t => t.id === id ? { ...t, value } : t)
  await upsertUserProfile({ targets: updated })
  return updated
}
