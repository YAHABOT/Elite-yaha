import { unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSafeUser } from '@/lib/supabase/auth'
import { getColorForTrackerType } from '@/lib/db/dashboard-data'
import type { Widget, CreateWidgetInput } from '@/types/widget'
import type { SupabaseClient } from '@supabase/supabase-js'

const WIDGET_COLUMNS = 'id, user_id, type, label, tracker_id, field_id, correlation_id, days, period, position, color, width, extra_fields, target_display, pb_direction, aggregation'

function cachedGetWidgets(userId: string) {
  return unstable_cache(
    async () => {
      const supabase = createServiceClient()
      const { data, error } = await supabase
        .from('widgets')
        .select(WIDGET_COLUMNS)
        .eq('user_id', userId)
        .order('position', { ascending: true })
      if (error) throw new Error(`Failed to fetch widgets: ${error.message}`)
      return (data ?? []) as Widget[]
    },
    [`widgets-${userId}`],
    { tags: [`widgets-${userId}`], revalidate: false }
  )()
}

export async function getWidgets(supabaseClient?: SupabaseClient): Promise<Widget[]> {
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  if (supabaseClient) {
    const { data, error } = await supabaseClient
      .from('widgets')
      .select(WIDGET_COLUMNS)
      .eq('user_id', user.id)
      .order('position', { ascending: true })
    if (error) throw new Error(`Failed to fetch widgets: ${error.message}`)
    return (data ?? []) as Widget[]
  }

  return cachedGetWidgets(user.id)
}

export async function createWidget(input: CreateWidgetInput): Promise<Widget> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  // Determine next position (max + 1)
  const { data: existing } = await supabase
    .from('widgets')
    .select('position')
    .eq('user_id', user.id)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existing && existing.length > 0
    ? (existing[0].position as number) + 1
    : 0

  // EX13 FIX: Map tracker type to color if color not explicitly provided
  let widgetColor = input.color ?? null
  if (!widgetColor && input.tracker_id) {
    const { data: tracker } = await supabase
      .from('trackers')
      .select('type')
      .eq('id', input.tracker_id)
      .eq('user_id', user.id)
      .single()

    if (tracker?.type) {
      widgetColor = getColorForTrackerType(tracker.type)
    }
  }

  const { data, error } = await supabase
    .from('widgets')
    .insert({
      user_id: user.id,
      type: input.type,
      label: input.label,
      tracker_id: input.tracker_id ?? null,
      field_id: input.field_id ?? null,
      correlation_id: input.correlation_id ?? null,
      days: input.days ?? 7,
      position: nextPosition,
      color: widgetColor,
      width: input.width ?? 'half',
      extra_fields: input.extra_fields ?? [],
      target_display: input.target_display ?? 'bar',
      period: input.period ?? null,
      pb_direction: input.pb_direction ?? 'above',
      aggregation: input.aggregation ?? 'sum',
    })
    .select(WIDGET_COLUMNS)
    .single()

  if (error) throw new Error(`Failed to create widget: ${error.message}`)
  return data as Widget
}

export async function updateWidget(
  id: string,
  data: Partial<CreateWidgetInput>
): Promise<Widget> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const updates: Record<string, unknown> = {}
  if (data.type !== undefined) updates.type = data.type
  if (data.label !== undefined) updates.label = data.label
  if (data.tracker_id !== undefined) updates.tracker_id = data.tracker_id
  if (data.field_id !== undefined) updates.field_id = data.field_id
  if (data.correlation_id !== undefined) updates.correlation_id = data.correlation_id
  if (data.days !== undefined) updates.days = data.days
  if (data.position !== undefined) updates.position = data.position
  if (data.color !== undefined) updates.color = data.color
  if (data.width !== undefined) updates.width = data.width
  if (data.extra_fields !== undefined) updates.extra_fields = data.extra_fields
  if (data.target_display !== undefined) updates.target_display = data.target_display
  if (data.period !== undefined) updates.period = data.period ?? null
  if (data.pb_direction !== undefined) updates.pb_direction = data.pb_direction
  if (data.aggregation !== undefined) updates.aggregation = data.aggregation

  if (Object.keys(updates).length === 0) {
    throw new Error('No fields to update')
  }

  const { data: updated, error } = await supabase
    .from('widgets')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(WIDGET_COLUMNS)
    .single()

  if (error) throw new Error(`Failed to update widget: ${error.message}`)
  return updated as Widget
}

export async function deleteWidget(id: string): Promise<void> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('widgets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`Failed to delete widget: ${error.message}`)
}

export async function reorderWidgets(orderedIds: string[]): Promise<void> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  // Update each widget's position in sequence
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('widgets')
      .update({ position: index })
      .eq('id', id)
      .eq('user_id', user.id)
  )

  const results = await Promise.all(updates)
  const failed = results.find(r => r.error)
  if (failed?.error) throw new Error(`Failed to reorder widgets: ${failed.error.message}`)
}
