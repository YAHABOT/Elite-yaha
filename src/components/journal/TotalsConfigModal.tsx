'use client'

import { useState } from 'react'
import { X, BarChart2 } from 'lucide-react'
import type { SchemaField } from '@/types/tracker'

// ── Types ────────────────────────────────────────────────────────────────────

export type FieldAggregation = 'sum' | 'avg'

export type FieldTotalsConfig = {
  hidden: boolean
  aggregation: FieldAggregation
}

export type TrackerTotalsConfig = {
  [fieldId: string]: FieldTotalsConfig
}

type StoredConfig = {
  [trackerId: string]: TrackerTotalsConfig
}

// ── LocalStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'journal_totals_config'

export function getDefaultAggregation(field: SchemaField): FieldAggregation {
  // Ratings and time values should be averaged — summing scores / timestamps is meaningless
  if (field.type === 'rating' || field.type === 'time') return 'avg'
  return 'sum'
}

export function loadTotalsConfig(trackerId: string, schema: SchemaField[]): TrackerTotalsConfig {
  let stored: StoredConfig = {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) stored = JSON.parse(raw) as StoredConfig
  } catch {
    // localStorage unavailable (SSR, private mode, etc.)
  }

  const result: TrackerTotalsConfig = {}
  for (const field of schema) {
    if (field.type === 'text' || field.type === 'select') continue
    result[field.fieldId] = stored[trackerId]?.[field.fieldId] ?? {
      hidden: false,
      aggregation: getDefaultAggregation(field),
    }
  }
  return result
}

export function saveTotalsConfig(trackerId: string, config: TrackerTotalsConfig): void {
  let stored: StoredConfig = {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) stored = JSON.parse(raw) as StoredConfig
  } catch { /* ignore */ }
  stored[trackerId] = config
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch { /* ignore */ }
}

// ── Component ────────────────────────────────────────────────────────────────

type Props = {
  trackerId: string
  trackerName: string
  trackerColor: string
  schema: SchemaField[]
  onClose: () => void
  onSave: (config: TrackerTotalsConfig) => void
}

export function TotalsConfigModal({
  trackerId,
  trackerName,
  trackerColor,
  schema,
  onClose,
  onSave,
}: Props): React.ReactElement {
  const numericFields = schema.filter((f) => f.type !== 'text' && f.type !== 'select')

  const [config, setConfig] = useState<TrackerTotalsConfig>(() =>
    loadTotalsConfig(trackerId, schema)
  )

  function setFieldProp<K extends keyof FieldTotalsConfig>(
    fieldId: string,
    key: K,
    value: FieldTotalsConfig[K]
  ) {
    setConfig((prev) => ({
      ...prev,
      [fieldId]: {
        ...(prev[fieldId] ?? { hidden: false, aggregation: getDefaultAggregation(schema.find((f) => f.fieldId === fieldId)!) }),
        [key]: value,
      },
    }))
  }

  function handleSave() {
    saveTotalsConfig(trackerId, config)
    onSave(config)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.06] bg-surface p-5 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `${trackerColor}18`,
                border: `1px solid ${trackerColor}30`,
              }}
            >
              <BarChart2 className="h-3.5 w-3.5" style={{ color: trackerColor }} />
            </div>
            <div>
              <p className="text-sm font-bold text-textPrimary leading-none">{trackerName}</p>
              <p className="mt-0.5 text-[10px] text-textMuted uppercase tracking-wider">Totals config</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-textMuted hover:bg-white/[0.06] hover:text-textPrimary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {numericFields.length === 0 ? (
          <p className="py-8 text-center text-xs text-textMuted">
            No numeric fields in this tracker.
          </p>
        ) : (
          <>
            <p className="mb-2.5 text-[10px] text-textMuted uppercase tracking-wider">
              Choose what shows in the totals row
            </p>
            <div className="space-y-1.5">
              {numericFields.map((field) => {
                const cfg = config[field.fieldId] ?? {
                  hidden: false,
                  aggregation: getDefaultAggregation(field),
                }
                return (
                  <div
                    key={field.fieldId}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                      cfg.hidden
                        ? 'border-white/[0.03] bg-white/[0.01] opacity-40'
                        : 'border-white/[0.06] bg-white/[0.02]'
                    }`}
                  >
                    {/* Field label */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-medium truncate ${
                          cfg.hidden ? 'text-textMuted' : 'text-textPrimary'
                        }`}
                      >
                        {field.label}
                      </p>
                      {field.unit && (
                        <p className="text-[9px] text-textMuted">{field.unit}</p>
                      )}
                    </div>

                    <div className="ml-3 flex items-center gap-1.5">
                      {/* Sum / Avg pill — only when visible */}
                      {!cfg.hidden && (
                        <div className="flex rounded-lg border border-white/[0.06] overflow-hidden">
                          <button
                            onClick={() => setFieldProp(field.fieldId, 'aggregation', 'sum')}
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                              cfg.aggregation === 'sum'
                                ? 'bg-white/[0.10] text-textPrimary'
                                : 'text-textMuted hover:text-textPrimary'
                            }`}
                          >
                            Sum
                          </button>
                          <button
                            onClick={() => setFieldProp(field.fieldId, 'aggregation', 'avg')}
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                              cfg.aggregation === 'avg'
                                ? 'bg-white/[0.10] text-textPrimary'
                                : 'text-textMuted hover:text-textPrimary'
                            }`}
                          >
                            Avg
                          </button>
                        </div>
                      )}

                      {/* Show / Hide toggle */}
                      <button
                        onClick={() => setFieldProp(field.fieldId, 'hidden', !cfg.hidden)}
                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          cfg.hidden
                            ? 'border-white/[0.06] text-textMuted hover:border-white/[0.12] hover:text-textPrimary'
                            : 'border-white/[0.06] text-textMuted hover:border-red-500/30 hover:text-red-400'
                        }`}
                      >
                        {cfg.hidden ? 'Show' : 'Hide'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <button
          onClick={handleSave}
          className="mt-4 w-full rounded-xl bg-white/[0.06] py-2.5 text-xs font-bold text-textPrimary transition-colors hover:bg-white/[0.10] border border-white/[0.04]"
        >
          Save
        </button>
      </div>
    </div>
  )
}
