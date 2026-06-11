'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSafeUser } from '@/lib/supabase/auth'
import { createCorrelation, deleteCorrelation, updateCorrelation } from '@/lib/db/correlations'
import type { FormulaNode, CreateCorrelationInput, CorrelatorSuggestion, Correlation } from '@/types/correlator'
import type { Tracker } from '@/types/tracker'

const SUGGESTION_MODEL = 'gemini-2.0-flash-lite'

const MAX_NAME_LENGTH = 50
const MAX_UNIT_LENGTH = 20

function isValidFormulaNode(node: unknown): node is FormulaNode {
  if (!node || typeof node !== 'object') return false
  const n = node as Record<string, unknown>

  if (n.type === 'constant') {
    return typeof n.value === 'number'
  }

  if (n.type === 'field') {
    return typeof n.trackerId === 'string' && typeof n.fieldId === 'string'
  }

  if (n.type === 'correlator') {
    return typeof n.correlatorId === 'string'
  }

  if (n.type === 'op') {
    const validOperators = ['+', '-', '*', '/']
    return (
      typeof n.operator === 'string' &&
      validOperators.includes(n.operator) &&
      isValidFormulaNode(n.left) &&
      isValidFormulaNode(n.right)
    )
  }

  return false
}

export async function createCorrelationAction(
  input: CreateCorrelationInput
): Promise<{ success?: true; error?: string }> {
  try {
    const name = input.name?.trim()
    if (!name) return { error: 'Name is required.' }
    if (name.length > MAX_NAME_LENGTH) {
      return { error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` }
    }

    const unit = input.unit?.trim() ?? ''
    if (unit.length > MAX_UNIT_LENGTH) {
      return { error: `Unit must be ${MAX_UNIT_LENGTH} characters or fewer.` }
    }

    if (!isValidFormulaNode(input.formula)) {
      return { error: 'Invalid formula structure.' }
    }

    await createCorrelation({ name, formula: input.formula, unit })
    const user = await getSafeUser()
    if (user) revalidateTag(`correlations-${user.id}`)
    revalidatePath('/journal/correlations')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create correlation' }
  }
}

export async function updateCorrelationAction(
  id: string,
  input: CreateCorrelationInput
): Promise<{ success?: true; error?: string }> {
  try {
    const name = input.name?.trim()
    if (!name) return { error: 'Name is required.' }
    if (name.length > MAX_NAME_LENGTH) {
      return { error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` }
    }

    const unit = input.unit?.trim() ?? ''
    if (unit.length > MAX_UNIT_LENGTH) {
      return { error: `Unit must be ${MAX_UNIT_LENGTH} characters or fewer.` }
    }

    if (!isValidFormulaNode(input.formula)) {
      return { error: 'Invalid formula structure.' }
    }

    await updateCorrelation(id, { name, formula: input.formula, unit })
    const user = await getSafeUser()
    if (user) revalidateTag(`correlations-${user.id}`)
    revalidatePath('/journal/correlations')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update correlation' }
  }
}

export async function deleteCorrelationAction(
  id: string
): Promise<{ success?: true; error?: string }> {
  try {
    await deleteCorrelation(id)
    const user = await getSafeUser()
    if (user) revalidateTag(`correlations-${user.id}`)
    revalidatePath('/journal/correlations')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete correlation' }
  }
}

type GeminiSuggestionRaw = {
  name: string
  description: string
  unit: string
  formula: FormulaNode
  requiredFields: Array<{
    trackerId: string
    fieldId: string
    label: string
  }>
}

export async function suggestCorrelationsAction(
  trackers: Tracker[],
  existingCorrelations: Correlation[]
): Promise<{ suggestions?: CorrelatorSuggestion[]; error?: string }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return { error: 'Failed to generate suggestions' }

    const numericTypes = new Set(['number', 'rating', 'duration', 'time'])
    const trackerSchema = trackers
      .map(t => ({
        id: t.id,
        name: t.name,
        fields: t.schema
          .filter(f => numericTypes.has(f.type))
          .map(f => ({ fieldId: f.fieldId, label: f.label, type: f.type, unit: f.unit ?? null })),
      }))
      .filter(t => t.fields.length > 0)

    const existingMetrics = existingCorrelations.map(c => ({ id: c.id, name: c.name, unit: c.unit }))

    const prompt = `You are a health metrics expert. A user tracks their health data using these trackers and fields:

<TRACKER_SCHEMA>
${JSON.stringify(trackerSchema, null, 2)}
</TRACKER_SCHEMA>

They have already created these derived metrics:
<EXISTING_METRICS>
${JSON.stringify(existingMetrics, null, 2)}
</EXISTING_METRICS>

Suggest up to 8 meaningful derived health metrics this user could create. Focus on:
1. Metrics the user can create RIGHT NOW with their current fields (prioritize these)
2. Metrics that require 1-2 additional fields they don't track yet (show them what they're missing)
3. Aspirational metrics needing 3+ fields they don't have yet (show the potential)

Do NOT suggest metrics the user has already created.

For each suggestion, output a JSON object with exactly this structure:
{
  "name": "Thermic Effect of Food",
  "description": "Calories your body burns digesting food — protein costs the most to metabolize",
  "unit": "kcal",
  "formula": <FormulaNode JSON — see format below>,
  "requiredFields": [
    { "trackerId": "<actual tracker id from schema above>", "fieldId": "<actual field id>", "label": "Protein (Nutrition)" }
  ]
}

FormulaNode format (recursive):
- Field reference: { "type": "field", "trackerId": "uuid", "fieldId": "fld_xxx" }
- Constant: { "type": "constant", "value": 4.0 }
- Operation: { "type": "op", "operator": "+", "left": <node>, "right": <node> }
- Existing metric reference: { "type": "correlator", "correlatorId": "uuid" }

For fields NOT in the user's schema use trackerId="MISSING" and fieldId="MISSING_<semantic_name>".

Return ONLY a JSON array of suggestion objects. No explanation text.

Example formulas (adapt field IDs to the user's actual schema):
- Thermic Effect of Food: protein_g*4*0.30 + carbs_g*4*0.08 + fat_g*9*0.03
- Net Caloric Balance: calories_consumed - calories_burned
- Protein Adequacy Ratio: protein_g / weight_kg
- Sleep Efficiency: (sleep_duration_hrs / time_in_bed_hrs) * 100
- BMI: weight_kg / (height_m * height_m)
- Session Training Load: rpe_score * workout_duration_min
- HRV Readiness: hrv_today / hrv_7day_avg * 100`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: SUGGESTION_MODEL })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })
    const responseText = result.response.text()

    const cleaned = responseText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    const rawSuggestions = JSON.parse(cleaned) as GeminiSuggestionRaw[]

    if (!Array.isArray(rawSuggestions)) {
      return { error: 'Failed to generate suggestions' }
    }

    const knownFields = new Set<string>()
    for (const t of trackers) {
      for (const f of t.schema) {
        knownFields.add(`${t.id}:${f.fieldId}`)
      }
    }

    const processed: CorrelatorSuggestion[] = rawSuggestions
      .filter(s => s && typeof s === 'object' && s.name && s.formula && Array.isArray(s.requiredFields))
      .map(s => {
        const requiredFields = s.requiredFields.map(rf => ({
          label: rf.label,
          trackerId: rf.trackerId,
          fieldId: rf.fieldId,
          found: rf.trackerId !== 'MISSING' && knownFields.has(`${rf.trackerId}:${rf.fieldId}`),
        }))

        const missingCount = requiredFields.filter(f => !f.found).length
        const readiness: CorrelatorSuggestion['readiness'] =
          missingCount === 0 ? 'ready' : missingCount <= 2 ? 'almost' : 'aspirational'

        return {
          name: s.name,
          description: s.description ?? '',
          unit: s.unit ?? '',
          formula: s.formula,
          requiredFields,
          missingCount,
          readiness,
        }
      })
      .filter(s => s.requiredFields.some(f => f.found) || s.requiredFields.length === 0)

    const ORDER: Record<CorrelatorSuggestion['readiness'], number> = { ready: 0, almost: 1, aspirational: 2 }
    processed.sort((a, b) => ORDER[a.readiness] - ORDER[b.readiness])

    return { suggestions: processed.slice(0, 8) }
  } catch (e) {
    console.error('[suggestCorrelations]', e instanceof Error ? e.message : e)
    return { error: 'Failed to generate suggestions' }
  }
}
