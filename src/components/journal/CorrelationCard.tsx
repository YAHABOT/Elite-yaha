'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import type { Correlation } from '@/types/correlator'
import type { TrackerLog } from '@/types/log'
import type { Tracker } from '@/types/tracker'
import {
  buildFieldValueMapWithCorrelators,
  buildCrossTrackerMap,
  evaluateFormula,
  formatResult,
} from '@/lib/correlator/formula-engine'
import { CorrelationInsightSheet } from '@/components/journal/CorrelationInsightSheet'

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
  const [infoOpen, setInfoOpen] = useState(false)

  const lastKnownMap = lastKnownValues ? new Map(Object.entries(lastKnownValues)) : undefined
  const crossTrackerMap = trackers ? buildCrossTrackerMap(logs, trackers) : undefined
  const fieldValueMap = buildFieldValueMapWithCorrelators(logs, allCorrelations, lastKnownMap, crossTrackerMap)

  // Deduplicate by short name (guard against duplicate correlators in DB)
  const seenNames = new Set<string>()
  const items = correlations
    .map(c => {
      const result = evaluateFormula(c.formula, fieldValueMap, lastKnownMap, crossTrackerMap)
      const shortName = c.name.replace(/ % of Calories$/i, '').replace(/ %$/i, '')
      return { name: shortName, result }
    })
    .filter(({ name }) => {
      if (seenNames.has(name)) return false
      seenNames.add(name)
      return true
    })
    .slice(0, 3)

  return (
    <>
      <div className="col-span-2 rounded-xl border border-border bg-surface px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <p className="font-ui-label text-[9px] uppercase tracking-wide text-textMuted leading-none">
            Macro Split
          </p>
          <button
            onClick={() => setInfoOpen(true)}
            className="rounded p-0.5 text-textMuted transition-colors hover:text-textPrimary"
            aria-label="About Macro Split"
          >
            <Info className="h-2.5 w-2.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {items.map(({ name, result }) => (
            <div key={name}>
              <p className="font-ui-label text-[9px] uppercase tracking-wider text-textMuted truncate">{name}</p>
              <p className={`font-data-value text-[15px] tabular-nums leading-none ${result === null ? 'text-textMuted' : 'text-textPrimary'}`}>
                {result === null ? '---' : `${Math.round(result * 10) / 10}%`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {infoOpen && (
        <CorrelationInsightSheet
          name="Macro Split"
          unit="%"
          onClose={() => setInfoOpen(false)}
        />
      )}
    </>
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
  const [infoOpen, setInfoOpen] = useState(false)

  const lastKnownMap = lastKnownValues ? new Map(Object.entries(lastKnownValues)) : undefined
  const crossTrackerMap = trackers ? buildCrossTrackerMap(logs, trackers) : undefined
  const fieldValueMap = buildFieldValueMapWithCorrelators(logs, allCorrelations, lastKnownMap, crossTrackerMap)
  const result = evaluateFormula(correlation.formula, fieldValueMap, lastKnownMap, crossTrackerMap)
  const display = formatResult(result, correlation.unit)

  const isDataMissing = result === null

  return (
    <>
      <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
        <div className="flex items-start justify-between gap-1">
          <p className="font-ui-label text-[9px] uppercase tracking-wide text-textMuted leading-tight line-clamp-2 flex-1">
            {correlation.name}
          </p>
          <button
            onClick={() => setInfoOpen(true)}
            className="shrink-0 rounded p-0.5 text-textMuted transition-colors hover:text-textPrimary"
            aria-label={`About ${correlation.name}`}
          >
            <Info className="h-2.5 w-2.5" />
          </button>
        </div>
        <p
          className={`font-data-value mt-1.5 text-[15px] tabular-nums leading-none ${
            isDataMissing ? 'text-textMuted' : 'text-textPrimary'
          }`}
        >
          {isDataMissing ? '---' : display.split(' ')[0]}
        </p>
        {!isDataMissing && correlation.unit && (
          <p className="mt-0.5 text-[10px] text-textMuted">{correlation.unit}</p>
        )}
      </div>

      {infoOpen && (
        <CorrelationInsightSheet
          name={correlation.name}
          unit={correlation.unit}
          onClose={() => setInfoOpen(false)}
        />
      )}
    </>
  )
}
