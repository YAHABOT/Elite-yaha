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
  trackerType: string
}

function resolveField(
  trackers: Tracker[],
  labelPatterns: string[],
  fieldTypes: string[],
  trackerTypeFilter?: string[],
  lastKnownValues?: Record<string, number>
): FieldMatch | null {
  let fallback: FieldMatch | null = null

  for (const t of trackers) {
    if (trackerTypeFilter && !trackerTypeFilter.includes(t.type)) continue
    for (const f of t.schema) {
      if (!fieldTypes.includes(f.type)) continue
      if (!matchesAny(f.label, labelPatterns)) continue
      const match = { trackerId: t.id, fieldId: f.fieldId, displayLabel: f.label, fieldType: f.type, trackerType: t.type }
      // Prefer this tracker if it has been logged to recently
      if (lastKnownValues && `${t.id}:${f.fieldId}` in lastKnownValues) return match
      if (!fallback) fallback = match
    }
  }
  return fallback
}

// Check if a cross-tracker field is present in ANY matching tracker
function crossTrackerFieldFound(
  trackers: Tracker[],
  labelPatterns: string[],
  fieldTypes: string[],
  trackerTypeFilter?: string[]
): boolean {
  for (const t of trackers) {
    if (trackerTypeFilter && !trackerTypeFilter.includes(t.type)) continue
    for (const f of t.schema) {
      if (!fieldTypes.includes(f.type)) continue
      if (matchesAny(f.label, labelPatterns)) return true
    }
  }
  return false
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

// Cross-tracker aggregate node — sums/averages a named field across all trackers of a type
function ct(trackerType: string, fieldLabel: string, aggregation: 'sum' | 'avg' = 'sum'): FormulaNode {
  return { type: 'crossTracker', trackerType, fieldLabel, aggregation }
}

// Duration fields store raw seconds — divide by 60 to get minutes
function toMinutes(f: FieldMatch): FormulaNode {
  return f.fieldType === 'duration' ? op('/', fld(f), num(60)) : fld(f)
}

// Cross-tracker duration in minutes (handles duration type storing seconds)
function ctMinutes(trackerType: string, fieldLabel: string, fieldType: string): FormulaNode {
  const node = ct(trackerType, fieldLabel, 'sum')
  return fieldType === 'duration' ? op('/', node, num(60)) : node
}

// ── Template definitions ──────────────────────────────────────────────────────

type ResolveFn = (
  labelPatterns: string[],
  fieldTypes: string[],
  trackerTypeFilter?: string[]
) => FieldMatch | null

type Template = {
  id: string
  name: string
  build(resolve: ResolveFn, trackers: Tracker[], correlations: Correlation[]): CorrelatorSuggestion | null
}

const TEMPLATES: Template[] = [
  // ── Net Caloric Balance ──────────────────────────────────────────────────────
  {
    id: 'net_caloric_balance',
    name: 'Net Caloric Balance',
    build(resolve, trackers, correlations) {
      const caloriesIn = resolve(['calori', 'kcal', 'energy'], ['number'], ['nutrition'])
      const caloriesBurned =
        resolve(['calori burn', 'calori expend', 'active cal', 'energy out', 'total burn', 'calories out'], ['number']) ??
        resolve(['burn', 'expend'], ['number'])
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

      return { name: this.name, description, unit: 'kcal', formula, requiredFields, missingCount, readiness, autoWidget: { label: 'Calorie Balance This Week', period: 'this_week' as const, aggregation: 'sum' as const } }
    },
  },

  // ── Sleep Efficiency % ───────────────────────────────────────────────────────
  {
    id: 'sleep_efficiency',
    name: 'Sleep Efficiency',
    build(resolve) {
      const sleepDuration =
        resolve(['sleep duration', 'total sleep', 'actual sleep', 'time asleep', 'hours slept', 'sleep time'], ['duration', 'number'], ['sleep']) ??
        resolve(['sleep', 'duration'], ['duration', 'number'], ['sleep'])
      const timeInBed = resolve(
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
        autoWidget: { label: 'Sleep Efficiency This Week', period: 'this_week' as const, aggregation: 'avg' as const },
      }
    },
  },

  // ── Protein per kg ────────────────────────────────────────────────────────────
  {
    id: 'protein_per_kg',
    name: 'Protein per kg',
    build(resolve) {
      const protein = resolve(['protein'], ['number'], ['nutrition'])
      const weight = resolve(['weight', 'bodyweight', 'body weight', 'bw', 'mass', 'kg'], ['number'])

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

  // ── Macro Split (creates Protein %, Carbs %, Fat % all at once) ──────────────
  {
    id: 'macro_split',
    name: 'Macro Split',
    build(resolve) {
      const protein  = resolve(['protein'], ['number'], ['nutrition'])
      const carbs    = resolve(['carb', 'carbohydrate'], ['number'], ['nutrition'])
      const fat      = resolve(['fat'], ['number'], ['nutrition'])
      const calories = resolve(['calori', 'kcal', 'energy'], ['number'], ['nutrition'])

      const requiredFields: CorrelatorSuggestion['requiredFields'] = [
        { label: protein  ? protein.displayLabel  : 'Protein (g) — Nutrition tracker',        trackerId: protein?.trackerId  ?? 'MISSING', fieldId: protein?.fieldId  ?? 'MISSING_protein', found: !!protein },
        { label: carbs    ? carbs.displayLabel    : 'Carbohydrates (g) — Nutrition tracker',  trackerId: carbs?.trackerId    ?? 'MISSING', fieldId: carbs?.fieldId    ?? 'MISSING_carbs',   found: !!carbs },
        { label: fat      ? fat.displayLabel      : 'Fat (g) — Nutrition tracker',             trackerId: fat?.trackerId      ?? 'MISSING', fieldId: fat?.fieldId      ?? 'MISSING_fat',     found: !!fat },
        { label: calories ? calories.displayLabel : 'Calories — Nutrition tracker',            trackerId: calories?.trackerId ?? 'MISSING', fieldId: calories?.fieldId ?? 'MISSING_cal',     found: !!calories },
      ]

      const missingCount = requiredFields.filter(f => !f.found).length
      const readiness: CorrelatorSuggestion['readiness'] =
        missingCount === 0 ? 'ready' : missingCount <= 2 ? 'almost' : 'aspirational'

      // Primary formula: Protein %
      const proteinFormula: FormulaNode = protein && calories
        ? op('*', op('/', op('*', fld(protein), num(4)), fld(calories)), num(100))
        : num(0)

      const additionalCreates = protein && carbs && fat && calories ? [
        {
          name: 'Carbs % of Calories',
          formula: op('*', op('/', op('*', fld(carbs), num(4)), fld(calories)), num(100)) as FormulaNode,
          unit: '%',
        },
        {
          name: 'Fat % of Calories',
          formula: op('*', op('/', op('*', fld(fat), num(9)), fld(calories)), num(100)) as FormulaNode,
          unit: '%',
        },
      ] : undefined

      return {
        name: 'Protein % of Calories',
        title: 'Macro Split',
        description: 'Creates Protein %, Carbs % and Fat % of Calories — all three in one tap.',
        unit: '%',
        formula: proteinFormula,
        requiredFields,
        missingCount,
        readiness,
        additionalCreates,
      }
    },
  },

  // ── Training Load (RPE × Duration) ───────────────────────────────────────────
  {
    id: 'training_load',
    name: 'Training Load',
    build(resolve) {
      const rpe =
        resolve(['rpe', 'perceived exertion', 'effort', 'intensity'], ['rating', 'number'], ['workout']) ??
        resolve(['rpe', 'effort', 'intensity'], ['rating', 'number'])
      const duration =
        resolve(['duration', 'workout time', 'session time', 'exercise time', 'minutes', 'mins'], ['duration', 'number'], ['workout']) ??
        resolve(['duration'], ['duration', 'number'])

      const requiredFields: CorrelatorSuggestion['requiredFields'] = [
        { label: rpe ? rpe.displayLabel : 'RPE / Effort rating — Workout tracker', trackerId: rpe?.trackerId ?? 'MISSING', fieldId: rpe?.fieldId ?? 'MISSING_rpe', found: !!rpe },
        { label: duration ? duration.displayLabel : 'Workout Duration — Workout tracker', trackerId: duration?.trackerId ?? 'MISSING', fieldId: duration?.fieldId ?? 'MISSING_duration', found: !!duration },
      ]

      const missingCount = requiredFields.filter(f => !f.found).length
      const readiness: CorrelatorSuggestion['readiness'] =
        missingCount === 0 ? 'ready' : missingCount <= 2 ? 'almost' : 'aspirational'

      // crossTracker: avg RPE × sum duration across all workout trackers that day
      const formula: FormulaNode = rpe && duration
        ? op('*',
            ct(rpe.trackerType, rpe.displayLabel, 'avg'),
            ctMinutes(duration.trackerType, duration.displayLabel, duration.fieldType)
          )
        : num(0)

      return {
        name: this.name,
        description: 'Avg RPE × total duration in minutes — aggregated across all workout trackers logged that day.',
        unit: 'AU',
        formula,
        requiredFields,
        missingCount,
        readiness,
        autoWidget: { label: 'Training Load This Week', period: 'this_week' as const, aggregation: 'sum' as const },
      }
    },
  },

  // ── Zone 2 % ──────────────────────────────────────────────────────────────────
  {
    id: 'zone2_pct',
    name: 'Zone 2 %',
    build(resolve) {
      const zone2 = resolve(['zone 2', 'zone2', 'z2'], ['duration', 'number'])
      const totalDuration =
        resolve(['duration', 'total time', 'workout time', 'total duration', 'session time'], ['duration', 'number'], ['workout']) ??
        resolve(['duration'], ['duration', 'number'])

      const requiredFields: CorrelatorSuggestion['requiredFields'] = [
        {
          label: zone2 ? `${zone2.displayLabel} (summed across all trackers)` : 'Zone 2 Time — add a "Time in Zone 2" field to your Workout tracker',
          trackerId: zone2?.trackerId ?? 'MISSING', fieldId: zone2?.fieldId ?? 'MISSING_zone2', found: !!zone2,
        },
        {
          label: totalDuration ? `${totalDuration.displayLabel} (summed across all trackers)` : 'Total Duration — Workout tracker',
          trackerId: totalDuration?.trackerId ?? 'MISSING', fieldId: totalDuration?.fieldId ?? 'MISSING_duration', found: !!totalDuration,
        },
      ]

      const missingCount = requiredFields.filter(f => !f.found).length
      const readiness: CorrelatorSuggestion['readiness'] =
        missingCount === 0 ? 'ready' : missingCount <= 2 ? 'almost' : 'aspirational'

      // Use crossTracker nodes — sums zone2 and duration across ALL matching trackers that day.
      // Both fields must be in the SAME unit for the ratio to be correct (unit-independent ratio).
      // Do NOT use ctMinutes here — dividing only duration by 60 makes the result 60× too large.
      const formula: FormulaNode = zone2 && totalDuration
        ? op('*',
            op('/',
              ct(zone2.trackerType, zone2.displayLabel, 'sum'),
              ct(totalDuration.trackerType, totalDuration.displayLabel, 'sum')
            ),
            num(100)
          )
        : num(0)

      return {
        name: this.name,
        description: 'Zone 2 time as a % of total workout duration — summed across all workout trackers logged that day.',
        unit: '%',
        formula,
        requiredFields,
        missingCount,
        readiness,
        autoWidget: { label: 'Zone 2 % This Week', period: 'this_week' as const, aggregation: 'avg' as const },
      }
    },
  },

  // ── Hydration Attainment % ────────────────────────────────────────────────────
  {
    id: 'hydration_attainment',
    name: 'Hydration Attainment',
    build(resolve) {
      // Strict patterns — 'hydrat' removed (matches "monohydrate"), 'ml' removed (unit not label)
      const water =
        resolve(['water', 'fluid intake', 'h2o', 'hydration'], ['number'], ['water']) ??
        resolve(['water intake', 'water consumed', 'daily water', 'fluid intake'], ['number'])
      const target = resolve(['water target', 'water goal', 'daily target', 'hydration goal'], ['number'])

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
  existingCorrelations: Correlation[],
  lastKnownValues?: Record<string, number>
): CorrelatorSuggestion[] {
  const results: CorrelatorSuggestion[] = []

  // Resolver that prefers trackers with recent data when available
  const resolve: ResolveFn = (labelPatterns, fieldTypes, trackerTypeFilter) =>
    resolveField(trackers, labelPatterns, fieldTypes, trackerTypeFilter, lastKnownValues)

  // Pre-normalized macro names for dedup check
  const MACRO_NAMES_NORM = new Set(
    ['protein % of calories', 'carbs % of calories', 'fat % of calories', 'macro split'].map(normalize)
  )

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

    // For Macro Split: also skip if any of the 3 individual macro correlators already exist
    if (template.id === 'macro_split') {
      const anyMacroExists = existingCorrelations.some(c => MACRO_NAMES_NORM.has(normalize(c.name)))
      if (anyMacroExists) continue
    }

    const suggestion = template.build(resolve, trackers, existingCorrelations)
    if (suggestion === null) continue

    results.push(suggestion)
  }

  const ORDER: Record<CorrelatorSuggestion['readiness'], number> = { ready: 0, almost: 1, aspirational: 2 }
  results.sort((a, b) => ORDER[a.readiness] - ORDER[b.readiness])

  return results
}
