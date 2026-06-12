import type { Correlation } from '@/types/correlator'
import type { TrackerLog } from '@/types/log'
import type { Tracker } from '@/types/tracker'
import {
  buildFieldValueMapWithCorrelators,
  buildCrossTrackerMap,
  evaluateFormula,
  formatResult,
} from '@/lib/correlator/formula-engine'

// ── Macro names that should be grouped into one card ──────────────────────────
export const MACRO_GROUP_NAMES = new Set([
  'protein % of calories',
  'carbs % of calories',
  'fat % of calories',
])

type GroupProps = {
  correlations: Correlation[]
  logs: TrackerLog[]
  allCorrelations: Correlation[]
  lastKnownValues?: Record<string, number>
  trackers?: Tracker[]
}

export function MacroGroupCard({ correlations, logs, allCorrelations, lastKnownValues, trackers }: GroupProps): React.ReactElement {
  const lastKnownMap = lastKnownValues ? new Map(Object.entries(lastKnownValues)) : undefined
  const crossTrackerMap = trackers ? buildCrossTrackerMap(logs, trackers) : undefined
  const fieldValueMap = buildFieldValueMapWithCorrelators(logs, allCorrelations, lastKnownMap, crossTrackerMap)

  const items = correlations.map(c => {
    const result = evaluateFormula(c.formula, fieldValueMap, lastKnownMap, crossTrackerMap)
    // Strip " % of Calories" → just "Protein", "Carbs", "Fat"
    const shortName = c.name.replace(/ % of Calories$/i, '').replace(/ %$/i, '')
    return { name: shortName, result }
  })

  return (
    <div className="col-span-2 rounded-xl border border-border bg-surface px-3 py-2.5">
      <p className="font-ui-label text-[9px] uppercase tracking-widest text-textMuted leading-none mb-2">
        Macro Split
      </p>
      <div className="flex gap-5">
        {items.map(({ name, result }) => (
          <div key={name}>
            <p className="font-ui-label text-[9px] uppercase tracking-wider text-textMuted">{name}</p>
            <p className={`font-data-value text-xl tabular-nums leading-none ${result === null ? 'text-textMuted' : 'text-textPrimary'}`}>
              {result === null ? '---' : `${Math.round(result * 10) / 10}%`}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

type Props = {
  correlation: Correlation
  logs: TrackerLog[]
  allCorrelations: Correlation[]
  lastKnownValues?: Record<string, number>
  trackers?: Tracker[]
}

export function CorrelationCard({ correlation, logs, allCorrelations, lastKnownValues, trackers }: Props): React.ReactElement {
  const lastKnownMap = lastKnownValues ? new Map(Object.entries(lastKnownValues)) : undefined
  const crossTrackerMap = trackers ? buildCrossTrackerMap(logs, trackers) : undefined
  const fieldValueMap = buildFieldValueMapWithCorrelators(logs, allCorrelations, lastKnownMap, crossTrackerMap)
  const result = evaluateFormula(correlation.formula, fieldValueMap, lastKnownMap, crossTrackerMap)
  const display = formatResult(result, correlation.unit)

  const isDataMissing = result === null

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <p className="font-ui-label text-[9px] uppercase tracking-widest text-textMuted leading-none truncate">
        {correlation.name}
      </p>
      <p
        className={`font-data-value mt-1.5 text-xl tabular-nums leading-none ${
          isDataMissing ? 'text-textMuted' : 'text-textPrimary'
        }`}
      >
        {isDataMissing ? '---' : display.split(' ')[0]}
      </p>
      {!isDataMissing && correlation.unit && (
        <p className="mt-0.5 text-[10px] text-textMuted">{correlation.unit}</p>
      )}
    </div>
  )
}
