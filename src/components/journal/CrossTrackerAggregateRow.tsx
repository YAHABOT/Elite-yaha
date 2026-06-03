'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import type { Tracker, SchemaField } from '@/types/tracker'
import type { TrackerLog } from '@/types/log'
import {
  TotalsConfigModal,
  loadCrossTotalsConfig,
  saveCrossTotalsConfig,
  getDefaultAggregation,
  type CrossTrackerTotalsConfig,
  type FieldTotalsConfig,
} from '@/components/journal/TotalsConfigModal'
import { formatFieldValue } from '@/lib/utils/format'

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  trackerType: string
  typeColor: string
  trackers: Tracker[]
  logs: TrackerLog[]
  showTotals: boolean
}

type AggregatedField = {
  normalizedLabel: string
  label: string
  unit?: string
  fieldType: string
  values: number[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildFieldsByLabel(
  trackers: Tracker[],
  logs: TrackerLog[]
): Map<string, AggregatedField> {
  const fieldsByLabel = new Map<string, AggregatedField>()

  for (const tracker of trackers) {
    const trackerLogs = logs.filter((l) => l.tracker_id === tracker.id)

    for (const field of tracker.schema) {
      if (
        field.type === 'text' ||
        field.type === 'time' ||
        field.type === 'select'
      ) {
        continue
      }

      const normalizedLabel = field.label.toLowerCase().trim()
      if (!fieldsByLabel.has(normalizedLabel)) {
        fieldsByLabel.set(normalizedLabel, {
          normalizedLabel,
          label: field.label,
          unit: field.unit,
          fieldType: field.type,
          values: [],
        })
      }

      // Sum all numeric values for this fieldId across this tracker's logs
      let trackerSum = 0
      let hasValue = false
      for (const log of trackerLogs) {
        const raw = log.fields[field.fieldId]
        if (raw !== undefined && raw !== null && raw !== '') {
          const num = typeof raw === 'number' ? raw : Number(raw)
          if (!isNaN(num)) {
            trackerSum += num
            hasValue = true
          }
        }
      }
      if (hasValue) {
        fieldsByLabel.get(normalizedLabel)!.values.push(trackerSum)
      }
    }
  }

  return fieldsByLabel
}

function buildFakeSchemaFields(
  fieldsByLabel: Map<string, AggregatedField>
): SchemaField[] {
  const fields: SchemaField[] = []
  for (const [normalizedLabel, agg] of fieldsByLabel) {
    if (agg.values.length < 2) continue
    fields.push({
      fieldId: normalizedLabel,  // use normalizedLabel as stable fieldId for cross-tracker config
      label: agg.label,
      type: agg.fieldType as SchemaField['type'],
      unit: agg.unit,
    })
  }
  return fields
}

function getDefaultCrossConfig(
  normalizedLabel: string,
  field: AggregatedField,
  stored: CrossTrackerTotalsConfig
): FieldTotalsConfig {
  return stored[normalizedLabel] ?? {
    hidden: false,
    aggregation: getDefaultAggregation({
      fieldId: normalizedLabel,
      label: field.label,
      type: field.fieldType as SchemaField['type'],
    }),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CrossTrackerAggregateRow({
  trackerType,
  typeColor,
  trackers,
  logs,
  showTotals,
}: Props): React.ReactElement | null {
  const [config, setConfig] = useState<CrossTrackerTotalsConfig>(() =>
    loadCrossTotalsConfig(trackerType)
  )
  const [showModal, setShowModal] = useState(false)

  if (!showTotals) return null

  const fieldsByLabel = buildFieldsByLabel(trackers, logs)

  // Only keep fields present in 2+ trackers
  const crossFields = new Map<string, AggregatedField>()
  for (const [key, agg] of fieldsByLabel) {
    if (agg.values.length >= 2) {
      crossFields.set(key, agg)
    }
  }

  if (crossFields.size === 0) return null

  // Build items to display
  type DisplayItem = {
    normalizedLabel: string
    label: string
    unit?: string
    fieldType: string
    value: number
    aggregation: 'sum' | 'avg'
  }

  const displayItems: DisplayItem[] = []
  for (const [normalizedLabel, agg] of crossFields) {
    const cfg = getDefaultCrossConfig(normalizedLabel, agg, config)
    if (cfg.hidden) continue

    const sum = agg.values.reduce((a, b) => a + b, 0)
    const value =
      cfg.aggregation === 'avg'
        ? Math.round((sum / agg.values.length) * 10) / 10
        : sum

    displayItems.push({
      normalizedLabel,
      label: agg.label,
      unit: agg.unit,
      fieldType: agg.fieldType,
      value,
      aggregation: cfg.aggregation,
    })
  }

  // Build fake schema fields for TotalsConfigModal reuse
  const fakeSchema = buildFakeSchemaFields(fieldsByLabel)

  function handleSave(newConfig: Record<string, FieldTotalsConfig>): void {
    // newConfig uses normalizedLabel as key (same as fieldId in fakeSchema)
    const crossConfig: CrossTrackerTotalsConfig = {}
    for (const [key, val] of Object.entries(newConfig)) {
      crossConfig[key] = val
    }
    saveCrossTotalsConfig(trackerType, crossConfig)
    setConfig(crossConfig)
  }

  const displayType =
    trackerType.charAt(0).toUpperCase() + trackerType.slice(1)

  return (
    <>
      <div
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
        style={{
          borderLeft: `2px solid ${typeColor}`,
          boxShadow: `0 0 0 1px ${typeColor}10, inset 0 0 20px ${typeColor}04`,
        }}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
              style={{
                backgroundColor: `${typeColor}15`,
                color: typeColor,
                border: `1px solid ${typeColor}25`,
              }}
            >
              Combined
            </span>
            <span className="text-xs font-bold text-textPrimary">
              {displayType} · {trackers.length} trackers
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-textMuted opacity-40">
              {'Σ'} Combined
            </span>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 rounded-lg border border-white/[0.04] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-textMuted transition-colors hover:border-white/[0.10] hover:text-textPrimary"
              title="Configure combined totals"
            >
              <Settings className="h-2.5 w-2.5" />
              Configure
            </button>
          </div>
        </div>

        {displayItems.length === 0 ? (
          <p className="text-[10px] italic text-textMuted">All fields hidden.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {displayItems.map((item) => (
              <div
                key={item.normalizedLabel}
                className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2"
              >
                <span className="font-ui-label block truncate text-textMuted">
                  {item.aggregation === 'avg' ? 'Avg ' : ''}
                  {item.label}
                </span>
                <span className="font-data-value text-sm text-textPrimary">
                  {formatFieldValue(item.value, item.unit, item.label, item.fieldType)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <TotalsConfigModal
          trackerId={`cross_${trackerType}`}
          trackerName={`Combined ${displayType}`}
          trackerColor={typeColor}
          schema={fakeSchema}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          initialConfig={config}
        />
      )}
    </>
  )
}
