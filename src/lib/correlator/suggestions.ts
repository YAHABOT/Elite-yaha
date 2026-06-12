import type { Tracker } from '@/types/tracker'
import type { Correlation, FormulaNode, CorrelatorSuggestion } from '@/types/correlator'

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function matchesAny(label: string, patterns: string[]): boolean {
  const norm = normalize(label)
  return patterns.some(p => norm.includes(normalize(p)))
}

type FieldMatch = {
  trackerId: string
  fieldId: string
  displayLabel: string
  fieldType: string
}

function resolveField(
  trackers: Tracker[],
  labelPatterns: string[],
  fieldTypes: string[],
  trackerTypeFilter?: string[]
): FieldMatch | null {
  for (const t of trackers) {
    if (trackerTypeFilter && !trackerTypeFilter.includes(t.type)) continue
    for (const f of t.schema) {
      if (!fieldTypes.includes(f.type)) continue
      if (!matchesAny(f.label, labelPatterns)) continue
      return { trackerId: t.id, fieldId: f.fieldId, displayLabel: f.label, fieldType: f.type }
    }
  }
  return null
}

function findCorrelatorByName(correlations: Correlation[], patterns: string[]): string | null {
  for (const c of correlations) {
    if (matchesAny(c.name, patterns)) return c.id
  }
  return null
}

// ── Formula node builders ─────────────────────────────────────────────────────

function fld(f: FieldMatch): FormulaNode {
  return { type: 'field', trackerId: f.trackerId, fieldId: f.fieldId }
}

function num(v: number): FormulaNode {
  return { type: 'constant', value: v }
}

function op(operator: '+' | '-' | '*' | '/', left: FormulaNode, right: FormulaNode): FormulaNode {
  return { type: 'op', operator, left, right }
}

// Duration fields store raw seconds — divide by 60 to get minutes
function toMinutes(f: FieldMatch): FormulaNode {
  return f.fieldType === 'duration' ? op('/', fld(f), num(60)) : fld(f)
}

// ── Template definitions ──────────────────────────────────────────────────────

type Template = {
  id: string
  name: string
  build(trackers: Tracker[], correlations: Correlation[]): CorrelatorSuggestion | null
}

const TEMPLATES: Template[] = [
  // ── Net Caloric Balance ──────────────────────────────────────────────────────
  {
    id: 'net_caloric_balance',
    name: 'Net Caloric Balance',
    build(trackers, correlations) {
      const caloriesIn = resolveField(trackers, ['calori', 'kcal', 'energy'], ['number'], ['nutrition'])
      const caloriesBurned =
        resolveField(trackers, ['calori burn', 'calori expend', 'active cal', 'energy out', 'total burn', 'calories out'], ['number']) ??
        resolveField(trackers, ['burn', 'expend'], ['number'])
      const tefId = findCorrelatorByName(correlations, ['thermic', 'tef'])

      const requiredFields: CorrelatorSuggestion['requiredFields'] = [
        {
          label: caloriesIn ? caloriesIn.displayLabel : 'Calories (Nutrition tracker)',
          trackerId: caloriesIn?.trackerId ?? 'MISSING',
          fieldId: caloriesIn?.fieldId ?? 'MISSING_cal_in',
          found: !!caloriesIn,
        },
        {
          label: caloriesBurned ? caloriesBurned.displayLabel : 'Calories Burned (Workout / Activity tracker)',
          trackerId: caloriesBurned?.trackerId ?? 'MISSING',
          fieldId: caloriesBurned?.fieldId ?? 'MISSING_cal_burned',
          found: !!caloriesBurned,
        },
        {
          label: tefId
            ? 'Thermic Effect of Food ✓ (chained in)'
            : 'Thermic Effect of Food — create it first for full accuracy',
          trackerId: tefId ? 'correlator' : 'MISSING',
          fieldId: tefId ?? 'MISSING_tef',
          found: !!tefId,
        },
      ]

      const missingCount = requiredFields.filter(f => !f.found).length
      const readiness: CorrelatorSuggestion['readiness'] =
        missingCount === 0 ? 'ready' : missingCount <= 2 ? 'almost' : 'aspirational'

      const description = tefId
        ? 'Calories in − calories burned − thermic effect — your true daily energy balance.'
        : 'Calories in minus calories burned. Create a Thermic Effect of Food correlator first for full accuracy.'

      let formula: FormulaNode = num(0)
      if (caloriesIn && caloriesBurned) {
        const base = op('-', fld(caloriesIn), fld(caloriesBurned))
        formula = tefId
          ? op('-', base, { type: 'correlator', correlatorId: tefId })
          : base
      }

      return { name: this.name, description, unit: 'kcal', formula, requiredFields, missingCount, readiness }
    },
  },

  // ── Sleep Efficiency % ───────────────────────────────────────────────────────
  {
    id: 'sleep_efficiency',
    name: 'Sleep Efficiency',
    build(trackers) {
      const sleepDuration =
        resolveField(trackers, ['sleep duration', 'total sleep', 'actual sleep', 'time asleep', 'hours slept', 'sleep time'], ['duration', 'number'], ['sleep']) ??
        resolveField(trackers, ['sleep', 'duration'], ['duration', 'number'], ['sleep'])
      const timeInBed = resolveField(
        trackers,
        ['in bed', 'time in bed', 'time spent in bed', 'bed duration'],
        ['duration', 'number']
      )

      const requiredFields: CorrelatorSuggestion['requiredFields'] = [
        {
          label: sleepDuration ? sleepDuration.displayLabel : 'Sleep Duration (Sleep tracker)',
          trackerId: sleepDuration?.trackerId ?? 'MISSING',
          fieldId: sleepDuration?.fieldId ?? 'MISSING_sleep',
          found: !!sleepDuration,
        },
        {
          label: timeInBed ? timeInBed.displayLabel : 'Time in Bed — add to your Sleep tracker',
          trackerId: timeInBed?.trackerId ?? 'MISSING',
          fieldId: timeInBed?.fieldId ?? 'MISSING_in_bed',
          found: !!timeInBed,
        },
      ]

      const missingCount = requiredFields.filter(f => !f.found).length
      const readiness: CorrelatorSuggestion['readiness'] =
        missingCount === 0 ? 'ready' : missingCount <= 2 ? 'almost' : 'aspirational'

      const formula: FormulaNode =
        sleepDuration && timeInBed
          ? op('*', op('/', fld(sleepDuration), fld(timeInBed)), num(100))
          : num(0)

      return {
        name: this.name,
        description: 'Actual sleep ÷ time in bed × 100 — a core sleep quality signal used by Oura and Whoop.',
        unit: '%',
        formula,
        requiredFields,
        missingCount,
        readiness,
      }
    },
  },

  // ── Protein per kg ────────────────────────────────────────────────────────────
  {
    id: 'protein_per_kg',
    name: 'Protein per kg',
    build(trackers) {
      const protein = resolveField(trackers, ['protein'], ['number'], ['nutrition'])
      const weight = resolveField(trackers, ['weight', 'bodyweight', 'body weight', 'bw', 'mass', 'kg'], ['number'])

      const requiredFields: CorrelatorSuggestion['requiredFields'] = [
        {
          label: protein ? protein.displayLabel : 'Protein (g) — Nutrition tracker',
          trackerId: protein?.trackerId ?? 'MISSING',
          fieldId: protein?.fieldId ?? 'MISSING_protein',
          found: !!protein,
        },
        {
          label: weight ? weight.displayLabel : 'Bodyweight (kg) — add a Body Metrics tracker',
          trackerId: weight?.trackerId ?? 'MISSING',
          fieldId: weight?.fieldId ?? 'MISSING_weight',
          found: !!weight,
        },
      ]

      const missingCount = requiredFields.filter(f => !f.found).length
      const readiness: CorrelatorSuggestion['readiness'] =
        missingCount === 0 ? 'ready' : missingCount <= 2 ? 'almost' : 'aspirational'

      // Use lastKnown for weight — it's typically logged weekly not daily
      const formula: FormulaNode =
        protein && weight
          ? op('/', fld(protein), { type: 'lastKnown', trackerId: weight.trackerId, fieldId: weight.fieldId })
          : num(0)

      return {
        name: this.name,
        description: 'Daily protein intake relative to bodyweight — the standard fitness adequacy metric.',
        unit: 'g/kg',
        formula,
        requiredFields,
        missingCount,
        readiness,
      }
    },
  },

  // ── Protein % of Calories ─────────────────────────────────────────────────────
  {
    id: 'protein_pct',
    name: 'Protein % of Calories',
    build(trackers) {
      const protein = resolveField(trackers, ['protein'], ['number'], ['nutrition'])
      const calories = resolveField(trackers, ['calori', 'kcal', 'energy'], ['number'], ['nutrition'])

      const requiredFields: CorrelatorSuggestion['requiredFields'] = [
        { label: protein ? protein.displayLabel : 'Protein (g) — Nutrition tracker', trackerId: protein?.trackerId ?? 'MISSING', fieldId: protein?.fieldId ?? 'MISSING_protein', found: !!protein },
        { label: calories ? calories.displayLabel : 'Calories — Nutrition tracker', trackerId: calories?.trackerId ?? 'MISSING', fieldId: calories?.fieldId ?? 'MISSING_cal', found: !!calories },
      ]

      const missingCount = requiredFields.filter(f => !f.found).length
      const readiness: CorrelatorSuggestion['readiness'] =
        missingCount === 0 ? 'ready' : missingCount <= 2 ? 'almost' : 'aspirational'

      // (protein × 4 / calories) × 100
      const formula: FormulaNode =
        protein && calories
          ? op('*', op('/', op('*', fld(protein), num(4)), fld(calories)), num(100))
          : num(0)

      return { name: this.name, description: 'What share of your daily calories comes from protein.', unit: '%', formula, requiredFields, missingCount, readiness }
    },
  },

  // ── Carbs % of Calories ───────────────────────────────────────────────────────
  {
    id: 'carbs_pct',
    name: 'Carbs % of Calories',
    build(trackers) {
      const carbs = resolveField(trackers, ['carb', 'carbohydrate'], ['number'], ['nutrition'])
      const calories = resolveField(trackers, ['calori', 'kcal', 'energy'], ['number'], ['nutrition'])

      const requiredFields: CorrelatorSuggestion['requiredFields'] = [
        { label: carbs ? carbs.displayLabel : 'Carbohydrates (g) — Nutrition tracker', trackerId: carbs?.trackerId ?? 'MISSING', fieldId: carbs?.fieldId ?? 'MISSING_carbs', found: !!carbs },
        { label: calories ? calories.displayLabel : 'Calories — Nutrition tracker', trackerId: calories?.trackerId ?? 'MISSING', fieldId: calories?.fieldId ?? 'MISSING_cal', found: !!calories },
      ]

      const missingCount = requiredFields.filter(f => !f.found).length
      const readiness: CorrelatorSuggestion['readiness'] =
        missingCount === 0 ? 'ready' : missingCount <= 2 ? 'almost' : 'aspirational'

      const formula: FormulaNode =
        carbs && calories
          ? op('*', op('/', op('*', fld(carbs), num(4)), fld(calories)), num(100))
          : num(0)

      return { name: this.name, description: 'What share of your daily calories comes from carbohydrates.', unit: '%', formula, requiredFields, missingCount, readiness }
    },
  },

  // ── Fat % of Calories ─────────────────────────────────────────────────────────
  {
    id: 'fat_pct',
    name: 'Fat % of Calories',
    build(trackers) {
      // Restrict to nutrition tracker to avoid matching "body fat %" fields
      const fat = resolveField(trackers, ['fat'], ['number'], ['nutrition'])
      const calories = resolveField(trackers, ['calori', 'kcal', 'energy'], ['number'], ['nutrition'])

      const requiredFields: CorrelatorSuggestion['requiredFields'] = [
        { label: fat ? fat.displayLabel : 'Fat (g) — Nutrition tracker', trackerId: fat?.trackerId ?? 'MISSING', fieldId: fat?.fieldId ?? 'MISSING_fat', found: !!fat },
        { label: calories ? calories.displayLabel : 'Calories — Nutrition tracker', trackerId: calories?.trackerId ?? 'MISSING', fieldId: calories?.fieldId ?? 'MISSING_cal', found: !!calories },
      ]

      const missingCount = requiredFields.filter(f => !f.found).length
      const readiness: CorrelatorSuggestion['readiness'] =
        missingCount === 0 ? 'ready' : missingCount <= 2 ? 'almost' : 'aspirational'

      // (fat × 9 / calories) × 100
      const formula: FormulaNode =
        fat && calories
          ? op('*', op('/', op('*', fld(fat), num(9)), fld(calories)), num(100))
          : num(0)

      return { name: this.name, description: 'What share of your daily calories comes from dietary fat.', unit: '%', formula, requiredFields, missingCount, readiness }
    },
  },

  // ── Training Load (RPE × Duration) ───────────────────────────────────────────
  {
    id: 'training_load',
    name: 'Training Load',
    build(trackers) {
      const rpe =
        resolveField(trackers, ['rpe', 'perceived exertion', 'effort', 'intensity'], ['rating', 'number'], ['workout']) ??
        resolveField(trackers, ['rpe', 'effort', 'intensity'], ['rating', 'number'])
      const duration =
        resolveField(trackers, ['duration', 'workout time', 'session time', 'exercise time', 'minutes', 'mins'], ['duration', 'number'], ['workout']) ??
        resolveField(trackers, ['duration'], ['duration', 'number'])

      const requiredFields: CorrelatorSuggestion['requiredFields'] = [
        { label: rpe ? rpe.displayLabel : 'RPE / Effort rating — Workout tracker', trackerId: rpe?.trackerId ?? 'MISSING', fieldId: rpe?.fieldId ?? 'MISSING_rpe', found: !!rpe },
        { label: duration ? duration.displayLabel : 'Workout Duration — Workout tracker', trackerId: duration?.trackerId ?? 'MISSING', fieldId: duration?.fieldId ?? 'MISSING_duration', found: !!duration },
      ]

      const missingCount = requiredFields.filter(f => !f.found).length
      const readiness: CorrelatorSuggestion['readiness'] =
        missingCount === 0 ? 'ready' : missingCount <= 2 ? 'almost' : 'aspirational'

      const formula: FormulaNode =
        rpe && duration ? op('*', fld(rpe), toMinutes(duration)) : num(0)

      return {
        name: this.name,
        description: 'RPE × duration in minutes — a standard measure of how hard a session was.',
        unit: 'AU',
        formula,
        requiredFields,
        missingCount,
        readiness,
      }
    },
  },

  // ── Zone 2 % ──────────────────────────────────────────────────────────────────
  {
    id: 'zone2_pct',
    name: 'Zone 2 %',
    build(trackers) {
      const zone2 = resolveField(trackers, ['zone 2', 'zone2', 'z2'], ['duration', 'number'])
      const totalDuration =
        resolveField(trackers, ['duration', 'total time', 'workout time', 'total duration', 'session time'], ['duration', 'number'], ['workout']) ??
        resolveField(trackers, ['duration'], ['duration', 'number'])

      const requiredFields: CorrelatorSuggestion['requiredFields'] = [
        { label: zone2 ? zone2.displayLabel : 'Zone 2 Time — add a "Time in Zone 2" field to your Workout tracker', trackerId: zone2?.trackerId ?? 'MISSING', fieldId: zone2?.fieldId ?? 'MISSING_zone2', found: !!zone2 },
        { label: totalDuration ? totalDuration.displayLabel : 'Total Duration — Workout tracker', trackerId: totalDuration?.trackerId ?? 'MISSING', fieldId: totalDuration?.fieldId ?? 'MISSING_duration', found: !!totalDuration },
      ]

      const missingCount = requiredFields.filter(f => !f.found).length
      const readiness: CorrelatorSuggestion['readiness'] =
        missingCount === 0 ? 'ready' : missingCount <= 2 ? 'almost' : 'aspirational'

      const formula: FormulaNode =
        zone2 && totalDuration
          ? op('*', op('/', fld(zone2), fld(totalDuration)), num(100))
          : num(0)

      return {
        name: this.name,
        description: 'Time in aerobic base zone as a percentage of total workout duration.',
        unit: '%',
        formula,
        requiredFields,
        missingCount,
        readiness,
      }
    },
  },

  // ── Hydration Attainment % ────────────────────────────────────────────────────
  {
    id: 'hydration_attainment',
    name: 'Hydration Attainment',
    build(trackers) {
      const water =
        resolveField(trackers, ['water', 'hydrat', 'fluid', 'ml', 'litre', 'liter'], ['number'], ['water']) ??
        resolveField(trackers, ['water', 'hydrat', 'fluid'], ['number'])
      const target = resolveField(trackers, ['water target', 'water goal', 'daily target', 'hydration goal'], ['number'])

      const requiredFields: CorrelatorSuggestion['requiredFields'] = [
        {
          label: water ? water.displayLabel : 'Water intake — add a Water tracker',
          trackerId: water?.trackerId ?? 'MISSING',
          fieldId: water?.fieldId ?? 'MISSING_water',
          found: !!water,
        },
        {
          label: target ? target.displayLabel : 'Using 2000 ml default — edit after creating',
          trackerId: 'CONSTANT',
          fieldId: 'CONSTANT_2000',
          found: true, // always "found" — we use a constant fallback
        },
      ]

      const missingCount = requiredFields.filter(f => !f.found).length
      const readiness: CorrelatorSuggestion['readiness'] = missingCount === 0 ? 'ready' : 'almost'

      const divisor: FormulaNode = target ? fld(target) : num(2000)
      const formula: FormulaNode =
        water ? op('*', op('/', fld(water), divisor), num(100)) : num(0)

      return {
        name: this.name,
        description: 'How close you got to your daily water intake goal. Uses 2000 ml default — edit the constant to match your target.',
        unit: '%',
        formula,
        requiredFields,
        missingCount,
        readiness,
      }
    },
  },
]

// ── Main export ───────────────────────────────────────────────────────────────

export function getCorrelatorSuggestions(
  trackers: Tracker[],
  existingCorrelations: Correlation[]
): CorrelatorSuggestion[] {
  const results: CorrelatorSuggestion[] = []

  for (const template of TEMPLATES) {
    // Skip if a correlator with this name already exists (fuzzy match)
    const alreadyExists = existingCorrelations.some(c => {
      const normExisting = normalize(c.name)
      const normTemplate = normalize(template.name)
      return normExisting === normTemplate ||
        normExisting.includes(normTemplate) ||
        normTemplate.includes(normExisting)
    })
    if (alreadyExists) continue

    const suggestion = template.build(trackers, existingCorrelations)
    if (suggestion === null) continue // self-gated (e.g. Zone 2 with no zone2 field)

    results.push(suggestion)
  }

  const ORDER: Record<CorrelatorSuggestion['readiness'], number> = { ready: 0, almost: 1, aspirational: 2 }
  results.sort((a, b) => ORDER[a.readiness] - ORDER[b.readiness])

  return results
}
