import type { Correlation } from '@/types/correlator'
import type { TrackerLog } from '@/types/log'
import {
  buildFieldValueMapWithCorrelators,
  evaluateFormula,
  formatResult,
} from '@/lib/correlator/formula-engine'

type Props = {
  correlation: Correlation
  logs: TrackerLog[]
  allCorrelations: Correlation[]
}

export function CorrelationCard({ correlation, logs, allCorrelations }: Props): React.ReactElement {
  const fieldValueMap = buildFieldValueMapWithCorrelators(logs, allCorrelations)
  const result = evaluateFormula(correlation.formula, fieldValueMap)
  const display = formatResult(result, correlation.unit)

  const isDataMissing = result === null

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-textMuted">
        {correlation.name}
      </p>
      <p
        className={`mt-2 text-3xl font-bold tabular-nums ${
          isDataMissing ? 'text-textMuted' : 'text-textPrimary'
        }`}
      >
        {isDataMissing ? '---' : display.split(' ')[0]}
      </p>
      {!isDataMissing && correlation.unit && (
        <p className="mt-1 text-sm text-textMuted">{correlation.unit}</p>
      )}
    </div>
  )
}
