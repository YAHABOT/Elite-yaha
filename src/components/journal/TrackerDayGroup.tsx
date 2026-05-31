'use client'

import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import type { Tracker } from '@/types/tracker'
import type { TrackerLog, LogSource } from '@/types/log'
import { formatFieldValue } from '@/lib/utils/format'
import {
  TotalsConfigModal,
  loadTotalsConfig,
  type TrackerTotalsConfig,
} from '@/components/journal/TotalsConfigModal'

type Props = {
  tracker: Tracker
  logs: TrackerLog[]
  showTotals: boolean
}

const SOURCE_LABELS: Record<LogSource, string> = {
  manual: 'manual',
  web: 'web',
  telegram: 'telegram',
  chat: 'chat',
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getSourceBadgeClass(source: LogSource): string {
  if (source === 'telegram') return 'bg-sleep/10 text-sleep border border-sleep/20'
  if (source === 'web') return 'bg-nutrition/10 text-nutrition border border-nutrition/20'
  if (source === 'chat') return 'bg-mood/10 text-mood border border-mood/20'
  return 'bg-white/[0.04] text-textMuted border border-white/5'
}

// ── Totals helpers ────────────────────────────────────────────────────────────

type TotalItem = {
  fieldId: string
  label: string
  value: number
  unit?: string
  aggregation: 'sum' | 'avg'
  fieldType: string
}

function computeTotals(
  logs: TrackerLog[],
  tracker: Tracker,
  config: TrackerTotalsConfig
): TotalItem[] {
  const results: TotalItem[] = []

  for (const field of tracker.schema) {
    if (field.type === 'text' || field.type === 'select') continue
    const cfg = config[field.fieldId]
    if (!cfg || cfg.hidden) continue

    const values: number[] = []
    for (const log of logs) {
      const raw = log.fields[field.fieldId]
      if (raw !== undefined && raw !== null && raw !== '') {
        const num = typeof raw === 'number' ? raw : Number(raw)
        if (!isNaN(num)) values.push(num)
      }
    }

    if (values.length === 0) continue

    const value =
      cfg.aggregation === 'avg'
        ? values.reduce((a, b) => a + b, 0) / values.length
        : values.reduce((a, b) => a + b, 0)

    results.push({
      fieldId: field.fieldId,
      label: field.label,
      value,
      unit: field.unit,
      aggregation: cfg.aggregation,
      fieldType: field.type,
    })
  }

  return results
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TrackerDayGroup({ tracker, logs, showTotals }: Props): React.ReactElement {
  const logCount = logs.length
  const [totalsConfig, setTotalsConfig] = useState<TrackerTotalsConfig>({})
  const [configLoaded, setConfigLoaded] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)

  // Load per-field config from localStorage after mount (localStorage is client-only)
  useEffect(() => {
    setTotalsConfig(loadTotalsConfig(tracker.id, tracker.schema))
    setConfigLoaded(true)
  }, [tracker.id, tracker.schema])

  const showTotalsRow = showTotals && logCount > 1 && configLoaded
  const totals = showTotalsRow ? computeTotals(logs, tracker, totalsConfig) : []

  return (
    <>
      <div
        className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md transition-all duration-300"
        style={{ boxShadow: `0 0 0 1px ${tracker.color}18, inset 0 0 24px ${tracker.color}06` }}
      >
        {/* Tracker header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Colored icon badge */}
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `${tracker.color}18`,
                border: `1px solid ${tracker.color}30`,
                boxShadow: `0 0 10px ${tracker.color}20`,
              }}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: tracker.color }}
                data-testid="tracker-color-dot"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-textPrimary leading-tight">
                {tracker.name}
              </h3>
            </div>
          </div>
          {/* Log count badge */}
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{
              backgroundColor: `${tracker.color}15`,
              color: tracker.color,
              border: `1px solid ${tracker.color}25`,
            }}
          >
            {logCount} {logCount === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Log entries */}
        <div className="space-y-2.5">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-white/[0.04] bg-background/60 px-4 py-3 transition-all duration-300 hover:bg-background/80 hover:border-white/[0.07]"
            >
              {/* Log entry header */}
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-textMuted">
                  {formatTime(log.logged_at)}
                </span>
                <span
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${getSourceBadgeClass(log.source)}`}
                >
                  {SOURCE_LABELS[log.source] ?? log.source}
                </span>
              </div>

              {/* Field values — ordered by tracker schema, not JSONB key order */}
              {/* P2-2.6 FIX: text/select fields span full width to prevent narrow 2-3 word wrapping */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {tracker.schema
                  .filter((schemaField) => log.fields[schemaField.fieldId] !== undefined)
                  .map((schemaField) => {
                    const value = log.fields[schemaField.fieldId]
                    const label = schemaField.label
                    const unit = schemaField.unit
                    // Text and select fields always span full width to prevent narrow wrapping
                    const isWideField =
                      schemaField.type === 'text' ||
                      schemaField.type === 'select' ||
                      (typeof value === 'string' && value.length > 20)

                    return (
                      <div key={schemaField.fieldId} className={isWideField ? 'col-span-full' : ''}>
                        <span className="block text-[10px] font-medium uppercase tracking-wider text-textMuted">
                          {label}
                        </span>
                        <span
                          className={`text-sm font-semibold text-textPrimary ${isWideField ? 'break-words' : ''}`}
                        >
                          {formatFieldValue(value, unit, label, schemaField.type)}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Totals row — only when 2+ entries and showTotals is on ── */}
        {showTotalsRow && totals.length > 0 && (
          <div className="mt-4 border-t border-white/[0.04] pt-4">
            {/* Section label + configure button */}
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-textMuted">
                Daily totals
              </span>
              <button
                onClick={() => setConfigOpen(true)}
                className="flex items-center gap-1 rounded-lg border border-white/[0.04] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-textMuted transition-colors hover:border-white/[0.10] hover:text-textPrimary"
                title="Configure totals"
              >
                <Settings className="h-2.5 w-2.5" />
                Configure
              </button>
            </div>

            {/* Totals grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {totals.map((item) => (
                <div
                  key={item.fieldId}
                  className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2"
                >
                  <span className="block text-[9px] font-medium uppercase tracking-wider text-textMuted truncate">
                    {item.aggregation === 'avg' ? 'Avg ' : ''}{item.label}
                  </span>
                  <span className="text-sm font-bold text-textPrimary">
                    {formatFieldValue(item.value, item.unit, item.label, item.fieldType)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals row is on but no fields to show — offer configure */}
        {showTotalsRow && totals.length === 0 && configLoaded && (
          <div className="mt-4 border-t border-white/[0.04] pt-3 flex items-center justify-between">
            <span className="text-[10px] text-textMuted italic">All fields hidden</span>
            <button
              onClick={() => setConfigOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-white/[0.04] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-textMuted transition-colors hover:border-white/[0.10] hover:text-textPrimary"
            >
              <Settings className="h-2.5 w-2.5" />
              Configure
            </button>
          </div>
        )}
      </div>

      {/* Totals config modal */}
      {configOpen && (
        <TotalsConfigModal
          trackerId={tracker.id}
          trackerName={tracker.name}
          trackerColor={tracker.color}
          schema={tracker.schema}
          onClose={() => setConfigOpen(false)}
          onSave={(newConfig) => setTotalsConfig(newConfig)}
        />
      )}
    </>
  )
}
