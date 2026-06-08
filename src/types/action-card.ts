import type { FoodBankIngredient } from '@/types/food-bank'

export type ActionCardType = 'LOG_DATA' | 'UPDATE_DATA' | 'CREATE_TRACKER' | 'SAVE_TO_FOOD_BANK'

export type SchemaFieldDef = {
  fieldId: string
  label: string
  type: 'number' | 'text' | 'rating' | 'duration' | 'time' | 'select'
  unit?: string
  selectOptions?: string[]
  multiSelect?: boolean
}

export type ActionCard = {
  type: 'LOG_DATA'
  trackerId: string
  trackerName: string
  fields: Record<string, number | string | string[] | null>
  fieldLabels?: Record<string, string>
  fieldUnits?: Record<string, string>
  fieldOrder?: string[]  // Explicit schema order — arrays survive JSONB without key reordering
  fieldDefinitions?: Record<string, SchemaFieldDef>  // Full schema info for SELECT/MULTI_SELECT rendering
  date: string // ISO date "YYYY-MM-DD"
  source: 'chat' | 'telegram' | 'manual'
  confirmed?: boolean // persisted to DB after user confirms — survives page refresh
}

export type UpdateDataCard = {
  type: 'UPDATE_DATA'
  logId: string            // ID of existing tracker_logs row to update
  trackerId: string
  trackerName: string
  fields: Record<string, number | string | string[] | null>  // partial field updates
  fieldLabels?: Record<string, string>
  fieldUnits?: Record<string, string>
  fieldOrder?: string[]
  confirmed?: boolean
}

export type CreateTrackerCard = {
  type: 'CREATE_TRACKER'
  name: string
  trackerType: 'nutrition' | 'sleep' | 'workout' | 'mood' | 'water' | 'custom'
  color: string
  schema: SchemaFieldDef[]
  confirmed?: boolean
}

export type SaveToFoodBankCard = {
  type: 'SAVE_TO_FOOD_BANK'
  name: string
  entry_type: 'dish' | 'pantry_item'
  shortcut?: string | null
  emoji?: string | null
  serving_label?: string | null
  serving_size_g?: number | null
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g?: number | null
  ingredients?: FoodBankIngredient[] | null
  batch_yield_g?: number | null
  batch_kcal?: number | null
  batch_protein_g?: number | null
  batch_carbs_g?: number | null
  batch_fat_g?: number | null
  notes?: string | null
}

export type AnyActionCard = ActionCard | UpdateDataCard | CreateTrackerCard | SaveToFoodBankCard

export type ChatAttachment = {
  type: 'image' | 'audio' | 'file'
  base64: string
  mimeType: string
  filename?: string
}

export type ChatInput = {
  text?: string
  attachments?: ChatAttachment[]
  sessionId: string
  // userId intentionally excluded — always derived from verified session in the DAL, never from caller
  date?: string // Optional backdate "YYYY-MM-DD"
}

export type GeminiResponse = {
  text: string
  actions: AnyActionCard[]
}
