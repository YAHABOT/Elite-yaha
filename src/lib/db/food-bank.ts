import { createServerClient } from '@/lib/supabase/server'
import { getSafeUser } from '@/lib/supabase/auth'
import type { FoodBankEntry, CreateFoodBankInput } from '@/types/food-bank'

const FOOD_BANK_COLUMNS = 'id, user_id, name, entry_type, shortcut, emoji, serving_label, serving_size_g, kcal, protein_g, carbs_g, fat_g, fibre_g, ingredients, batch_yield_g, batch_kcal, batch_protein_g, batch_carbs_g, batch_fat_g, notes, created_at, updated_at'

export async function getFoodBankEntries(): Promise<FoodBankEntry[]> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('food_bank_entries')
    .select(FOOD_BANK_COLUMNS)
    .eq('user_id', user.id)
    .order('entry_type', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to fetch food bank entries: ${error.message}`)
  return (data ?? []) as FoodBankEntry[]
}

export async function getFoodBankEntry(id: string): Promise<FoodBankEntry> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('food_bank_entries')
    .select(FOOD_BANK_COLUMNS)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) throw new Error(`Failed to fetch food bank entry: ${error.message}`)
  return data as FoodBankEntry
}

export async function createFoodBankEntry(input: CreateFoodBankInput): Promise<FoodBankEntry> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('food_bank_entries')
    .insert({ ...input, user_id: user.id })
    .select(FOOD_BANK_COLUMNS)
    .single()

  if (error) throw new Error(`Failed to create food bank entry: ${error.message}`)
  return data as FoodBankEntry
}

export async function updateFoodBankEntry(
  id: string,
  input: Partial<CreateFoodBankInput>
): Promise<FoodBankEntry> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('food_bank_entries')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select(FOOD_BANK_COLUMNS)
    .single()

  if (error) throw new Error(`Failed to update food bank entry: ${error.message}`)
  return data as FoodBankEntry
}

export async function deleteFoodBankEntry(id: string): Promise<void> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('food_bank_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`Failed to delete food bank entry: ${error.message}`)
}
