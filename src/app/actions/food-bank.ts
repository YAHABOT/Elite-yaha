'use server'

import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  getFoodBankEntries,
  getFoodBankEntry,
  createFoodBankEntry,
  updateFoodBankEntry,
  deleteFoodBankEntry,
} from '@/lib/db/food-bank'
import { getTrackersBasic } from '@/lib/db/trackers'
import { createLog } from '@/lib/db/logs'
import type { FoodBankEntry, CreateFoodBankInput } from '@/types/food-bank'

export async function getFoodBankEntriesAction(): Promise<{ entries?: FoodBankEntry[]; error?: string }> {
  try {
    const entries = await getFoodBankEntries()
    return { entries }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to fetch food bank' }
  }
}

export async function createFoodBankEntryAction(
  input: CreateFoodBankInput
): Promise<{ success?: boolean; id?: string; error?: string }> {
  try {
    const entry = await createFoodBankEntry(input)
    revalidatePath('/settings/food-bank')
    return { success: true, id: entry.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to save entry' }
  }
}

export async function updateFoodBankEntryAction(
  id: string,
  input: Partial<CreateFoodBankInput>
): Promise<{ success?: boolean; error?: string }> {
  try {
    await updateFoodBankEntry(id, input)
    revalidatePath('/settings/food-bank')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update entry' }
  }
}

export async function deleteFoodBankEntryAction(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    await deleteFoodBankEntry(id)
    revalidatePath('/settings/food-bank')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete entry' }
  }
}

export async function logFoodBankEntryAction(
  entryId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const entry = await getFoodBankEntry(entryId)
    const trackers = await getTrackersBasic()
    const nutritionTracker = trackers.find(t => t.type === 'nutrition')
    if (!nutritionTracker) return { error: 'No nutrition tracker found. Create one first.' }

    const fields: Record<string, number | string | null> = {}
    for (const field of nutritionTracker.schema) {
      const label = field.label.toLowerCase()
      if (label.includes('calor')) fields[field.fieldId] = entry.kcal
      else if (label.includes('protein')) fields[field.fieldId] = entry.protein_g
      else if (label.includes('carb')) fields[field.fieldId] = entry.carbs_g
      else if (label.includes('fat')) fields[field.fieldId] = entry.fat_g
      else if (label.includes('fibr') || label.includes('fiber')) fields[field.fieldId] = entry.fibre_g ?? null
      else if (label.includes('item') || label.includes('name') || label.includes('meal') || label.includes('food')) {
        fields[field.fieldId] = entry.name
      }
    }

    await createLog({ tracker_id: nutritionTracker.id, fields, source: 'manual' })
    revalidatePath('/journal')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to log entry' }
  }
}

export async function parseFoodBankEntryAction(
  text: string,
  fileBase64?: string,
  fileMimeType?: string
): Promise<{ data?: Partial<CreateFoodBankInput>; error?: string }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return { error: 'AI not configured' }

    const genAI = new GoogleGenerativeAI(apiKey)
    const systemInstruction = `Extract all nutritional data from the provided recipe or food item and return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "name": "string - dish or item name",
  "entry_type": "dish or pantry_item",
  "shortcut": "string or null",
  "serving_label": "string or null",
  "serving_size_g": number or null,
  "kcal": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fibre_g": number or null,
  "ingredients": [{"name": "string", "qty_label": "string", "kcal": number, "protein_g": number, "carbs_g": number, "fat_g": number}] or null,
  "batch_yield_g": number or null,
  "batch_kcal": number or null,
  "batch_protein_g": number or null,
  "batch_carbs_g": number or null,
  "batch_fat_g": number or null,
  "notes": null
}
Rules: entry_type is "dish" for prepared meals/recipes, "pantry_item" for raw ingredients or packaged products. Include ALL ingredients if a breakdown is present. Top-level kcal/protein/carbs/fat are PER SERVING values.`

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite', systemInstruction })

    type Part = { text: string } | { inlineData: { mimeType: string; data: string } }
    const parts: Part[] = []
    if (text.trim()) parts.push({ text })
    if (fileBase64 && fileMimeType) {
      parts.push({ inlineData: { mimeType: fileMimeType, data: fileBase64 } })
    }
    if (parts.length === 0) return { error: 'No input provided' }

    const contents = [{ role: 'user' as const, parts }]
    const result = await model.generateContent({ contents })

    const rawText = result.response.text().trim()
    const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(jsonText) as Partial<CreateFoodBankInput>
    return { data: parsed }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to parse recipe data' }
  }
}
