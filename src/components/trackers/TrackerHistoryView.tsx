'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, TrendingUp, Settings } from 'lucide-react'
import type { Tracker, SchemaField } from '@/types/tracker'
import type { TrackerLog } from '@/types/log'
import { LogEntryCard } from '@/components/trackers/LogEntryCard'
import { formatFieldValue } from '@/lib/utils/format'
import {
  TotalsConfigModal,
  loadTotalsConfig,
  type TrackerTotalsConfig,
} from '@/components/journal/TotalsConfigModal'

type Props = {
  tracker: Tracker
  logs: TrackerLog[]
}

// ── Stats helpers ─────────────────────────────────────────────────────────────

type StatItem = {
  fieldId: string
  label: string
  unit?: string
  value: number
  aggregation: 'sum' | 'avg'
}

function computeDailyStats(
  entries: TrackerLog[],
  schema: SchemaField[],
  config: TrackerTotalsConfig,
): StatItem[] {
  const results: StatItem[] = []

  for (const field of schema) {
    if (field.type === 'text' || field.type === 'select') continue
    const cfg = config[field.fieldId]
    if (!cfg || cfg.hidden) continue

    const values: number[] = []
    for (const log of entries) {
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

    results.push({ fieldId: field.fieldId, label: field.label, unit: field.unit, value, aggregation: cfg.aggregation })
  }

  return results
}

type GroupedLogs = {
  heading: string
  date: string
  entries: TrackerLog[]
}

function formatDateHeading(isoDate: string): string {
  // Always compare UTC date strings — isoDate is a full ISO timestamp whose UTC date
  // (slice 0-10) matches the groupLogsByDate key. Using local-time Date arithmetic
  // would shift the label for UTC+ users whose early-morning UTC timestamps fall on
  // the previous local day (or vice versa).
  const utcDate = isoDate.slice(0, 10)
  const todayUTC = new Date().toISOString().slice(0, 10)
  const yesterdayUTC = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

  if (utcDate === todayUTC) return 'Today'
  if (utcDate === yesterdayUTC) return 'Yesterday'

  // Build a Date at UTC noon to avoid any DST / day-boundary oddities in the formatter
  const [year, month, day] = utcDate.split('-').map(Number)
  const currentYear = new Date().getUTCFullYear()
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
    ...(year !== currentYear ? { year: 'numeric' } : {}),
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function groupLogsByDate(logs: TrackerLog[]): GroupedLogs[] {
  const groups = new Map<string, TrackerLog[]>()

  for (const log of logs) {
    const date = log.logged_at.slice(0, 10) // YYYY-MM-DD
    const existing = groups.get(date)
    if (existing) {
      existing.push(log)
    } else {
      groups.set(date, [log])
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([date, entries]) => ({
      heading: formatDateHeading(entries[0].logged_at),
      date,
      entries: entries.sort(
        (a, b) =>
          new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
      ),
    }))
}

export function TrackerHistoryView({ tracker, logs }: Props): React.ReactElement {
  const groups = groupLogsByDate(logs)

  const [totalsConfig, setTotalsConfig] = useState<TrackerTotalsConfig>({})
  const [configLoaded, setConfigLoaded] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)

  useEffect(() => {
    setTotalsConfig(loadTotalsConfig(tracker.id, tracker.schema))
    setConfigLoaded(true)
  }, [tracker.id, tracker.schema])

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-10">
        <Link
          href="/trackers"
          className="mb-6 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-textMuted transition-colors duration-300 hover:text-textPrimary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Trackers
        </Link>

        <div className="mt-6 flex flex-col gap-4">
          {/* Title row — icon + name + subtitle, no button here so name can't push it off-screen */}
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300"
              style={{
                backgroundColor: `${tracker.color}18`,
                border: `1px solid ${tracker.color}35`,
                boxShadow: `0 0 20px -5px ${tracker.color}50`,
                color: tracker.color,
              }}
            >
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-textPrimary leading-tight break-words">
                {tracker.name}
              </h1>
              <p className="mt-0.5 text-xs font-black uppercase tracking-widest text-textMuted/50">
                {logs.length} total entries · {tracker.schema.length} fields
              </p>
            </div>
          </div>

          {/* Log Entry button — full-width row below title so it's never crowded out */}
          <Link
            href={`/trackers/${tracker.id}/log`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[11px] font-black uppercase tracking-widest text-background transition-all duration-300 hover:scale-[1.01] hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundColor: tracker.color,
              boxShadow: `0 4px 20px -4px ${tracker.color}60`,
            }}
          >
            <ClipboardList className="h-4 w-4" />
            Log Entry
          </Link>
        </div>
      </div>

      {/* Log History */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/[0.02] p-16 text-center">
          <div
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: `${tracker.color}15`,
              border: `1px solid ${tracker.color}30`,
              color: tracker.color,
            }}
          >
            <ClipboardList className="h-7 w-7" />
          </div>
          <p className="mb-2 text-lg font-black text-textPrimary">No entries yet</p>
          <p className="mb-8 text-sm text-textMuted/60">Start tracking to see your history here.</p>
          <Link
            href={`/trackers/${tracker.id}/log`}
            className="rounded-full border border-white/10 bg-white/[0.04] px-8 py-2.5 text-[11px] font-black uppercase tracking-widest text-textPrimary transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20"
          >
            Create first entry
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {groups.map((group) => (
            <section key={group.date} className="relative">
              <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-white/5 bg-background/80 px-4 py-2.5 backdrop-blur-md">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-textMuted/60">
                  {group.heading}
                </h2>
              </div>

              <div className="space-y-3">
                {group.entries.map((log) => (
                  <LogEntryCard
                    key={log.id}
                    log={log}
                    schema={tracker.schema}
                  />
                ))}
              </div>

              {/* Daily Stats Footer — only when 2+ entries and config loaded */}
              {group.entries.length > 1 && configLoaded && (() => {
                const stats = computeDailyStats(group.entries, tracker.schema, totalsConfig)
                return (
                  <div
                    className="mt-4 rounded-2xl p-5"
                    style={{
                      backgroundColor: `${tracker.color}08`,
                      border: `1px solid ${tracker.color}20`,
                    }}
                  >
                    {/* Header + Configure button */}
                    <div className="mb-4 flex items-center justify-between">
                      <h3
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        style={{ color: `${tracker.color}99` }}
                      >
                        <TrendingUp className="h-3 w-3" />
                        Daily Totals & Averages
                      </h3>
                      <button
                        onClick={() => setConfigOpen(true)}
                        className="flex items-center gap-1 rounded-lg border border-white/[0.04] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-textMuted transition-colors hover:border-white/[0.10] hover:text-textPrimary"
                        title="Configure totals"
                      >
                        <Settings className="h-2.5 w-2.5" />
                        Configure
                      </button>
                    </div>

                    {stats.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {stats.map((stat) => (
                          <div key={stat.fieldId} className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-textMuted/50 truncate">
                              {stat.label}
                            </span>
                            <span className="text-sm font-black text-textPrimary">
                              {formatFieldValue(stat.value, stat.unit, stat.label)}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-textMuted/30">
                              {stat.aggregation === 'avg' ? 'Average' : 'Total'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] italic text-textMuted">All fields hidden — tap Configure to show them.</p>
                    )}
                  </div>
                )
              })()}
            </section>
          ))}
        </div>
      )}

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
    </div>
  )
}

