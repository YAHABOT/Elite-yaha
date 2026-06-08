export type FoodBankIngredient = {
  name: string
  qty_label: string
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export type FoodBankEntryType = 'dish' | 'pantry_item'

export type FoodBankEntry = {
  id: string
  user_id: string
  name: string
  entry_type: FoodBankEntryType
  shortcut: string | null
  emoji: string | null
  serving_label: string | null
  serving_size_g: number | null
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g: number | null
  ingredients: FoodBankIngredient[] | null
  batch_yield_g: number | null
  batch_kcal: number | null
  batch_protein_g: number | null
  batch_carbs_g: number | null
  batch_fat_g: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CreateFoodBankInput = Omit<FoodBankEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>
