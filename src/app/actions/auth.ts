'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { RoutineStep } from '@/types/routine'
import type { SchemaField } from '@/types/tracker'
import type { SupabaseClient } from '@supabase/supabase-js'

const MIN_PASSWORD_LENGTH = 6

export async function signIn(
  formData: FormData
): Promise<{ error?: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email?.trim() || !password?.trim()) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signUp(
  formData: FormData
): Promise<{ error?: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email?.trim() || !password?.trim()) {
    return { error: 'Email and password are required' }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    }
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: error.message }
  }

  // Create default routines for new user
  const userId = data.user?.id
  if (userId) {
    await createDefaultRoutines(supabase, userId).catch((err) => {
      console.error('Failed to create default routines:', err)
      // Don't fail signup if routine creation fails
    })
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

async function createDefaultRoutines(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    // Step 1: Create default trackers with schemas
    const moodTrackerResult = await supabase
      .from('trackers')
      .insert({
        user_id: userId,
        name: 'Mood',
        type: 'mood',
        color: '#a855f7',
        schema: [
          { fieldId: 'fld_mood_001', label: 'Mood Level', type: 'rating' },
          { fieldId: 'fld_mood_002', label: 'Energy Level', type: 'rating' },
        ] as SchemaField[],
      })
      .select('id')
      .single()

    const sleepTrackerResult = await supabase
      .from('trackers')
      .insert({
        user_id: userId,
        name: 'Sleep',
        type: 'sleep',
        color: '#3b82f6',
        schema: [
          { fieldId: 'fld_sleep_001', label: 'Hours Slept', type: 'number', unit: 'hrs' },
          { fieldId: 'fld_sleep_002', label: 'Sleep Quality', type: 'rating' },
        ] as SchemaField[],
      })
      .select('id')
      .single()

    const waterTrackerResult = await supabase
      .from('trackers')
      .insert({
        user_id: userId,
        name: 'Water',
        type: 'water',
        color: '#06b6d4',
        schema: [{ fieldId: 'fld_water_001', label: 'Cups of Water', type: 'number' }] as SchemaField[],
      })
      .select('id')
      .single()

    const nutritionTrackerResult = await supabase
      .from('trackers')
      .insert({
        user_id: userId,
        name: 'Nutrition',
        type: 'nutrition',
        color: '#10b981',
        schema: [{ fieldId: 'fld_nutrition_001', label: 'Calories', type: 'number', unit: 'kcal' }] as SchemaField[],
      })
      .select('id')
      .single()

    const workoutTrackerResult = await supabase
      .from('trackers')
      .insert({
        user_id: userId,
        name: 'Workout',
        type: 'workout',
        color: '#f97316',
        schema: [
          { fieldId: 'fld_workout_001', label: 'Workout Type', type: 'text' },
          { fieldId: 'fld_workout_002', label: 'Duration', type: 'number', unit: 'mins' },
        ] as SchemaField[],
      })
      .select('id')
      .single()

    // Step 2: Build routine steps using created tracker IDs
    if (!moodTrackerResult.data) throw new Error('Failed to create Mood tracker')
    if (!sleepTrackerResult.data) throw new Error('Failed to create Sleep tracker')
    if (!waterTrackerResult.data) throw new Error('Failed to create Water tracker')
    if (!nutritionTrackerResult.data) throw new Error('Failed to create Nutrition tracker')
    if (!workoutTrackerResult.data) throw new Error('Failed to create Workout tracker')

    const startDaySteps: RoutineStep[] = [
      {
        trackerId: moodTrackerResult.data.id,
        trackerName: 'Mood',
        trackerColor: '#a855f7',
        targetFields: ['fld_mood_001', 'fld_mood_002'],
      },
    ]

    const endDaySteps: RoutineStep[] = [
      {
        trackerId: sleepTrackerResult.data.id,
        trackerName: 'Sleep',
        trackerColor: '#3b82f6',
        targetFields: ['fld_sleep_001', 'fld_sleep_002'],
      },
      {
        trackerId: waterTrackerResult.data.id,
        trackerName: 'Water',
        trackerColor: '#06b6d4',
        targetFields: ['fld_water_001'],
      },
      {
        trackerId: nutritionTrackerResult.data.id,
        trackerName: 'Nutrition',
        trackerColor: '#10b981',
        targetFields: ['fld_nutrition_001'],
      },
      {
        trackerId: workoutTrackerResult.data.id,
        trackerName: 'Workout',
        trackerColor: '#f97316',
        targetFields: ['fld_workout_001', 'fld_workout_002'],
      },
    ]

    // Step 3: Insert routines with populated steps
    await supabase.from('routines').insert({
      user_id: userId,
      name: 'Start Day',
      trigger_phrase: 'start day',
      type: 'day_start',
      steps: startDaySteps,
    })

    await supabase.from('routines').insert({
      user_id: userId,
      name: 'End Day',
      trigger_phrase: 'end day',
      type: 'day_end',
      steps: endDaySteps,
    })
  } catch (err) {
    console.error('Failed to create default routines:', err)
    // Don't fail signup if routine creation fails
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
