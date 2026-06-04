'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, TrendingUp, Settings, Search, ChevronDown, ChevronRight } from 'lucide-react'
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
  fieldType: string
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

    results.push({ fieldId: field.fieldId, label: field.label, unit: field.unit, value, aggregation: cfg.aggregation, fieldType: field.type })
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

// ── CollapsibleDaySection ─────────────────────────────────────────────────────

type CollapsibleDaySectionProps = {
  group: GroupedLogs
  tracker: Tracker
  configLoaded: boolean
  totalsConfig: TrackerTotalsConfig
  onOpenConfig: () => void
}

function CollapsibleDaySection({
  group,
  tracker,
  configLoaded,
  totalsConfig,
  onOpenConfig,
}: CollapsibleDaySectionProps): React.ReactElement {
  const todayUTC = new Date().toISOString().slice(0, 10)
  const isToday = group.date === todayUTC
  const [isOpen, setIsOpen] = useState(isToday)

  const stats = configLoaded && group.entries.length > 1
    ? computeDailyStats(group.entries, tracker.schema, totalsConfig)
    : []

  return (
    <section
      className="overflow-hidden rounded-[20px]"
      style={{
        background: '#0e243a',
        border: `1px solid ${tracker.color}22`,
      }}
    >
      {/* Day header row — clickable toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
      >
        {/* Date label */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="font-ui-label text-[#94a3b8]">{group.heading}</span>
          {/* Entry count badge */}
          <span
            className="shrink-0 rounded-full px-2 py-0.5 font-ui-label text-[#94a3b8]"
            style={{ background: '#1c3858', fontSize: '9px' }}
          >
            {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Chevron toggle button */}
        <div
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full transition-all duration-200"
          style={{ background: '#1c3858' }}
        >
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-[#94a3b8]" strokeWidth={2} />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[#94a3b8]" strokeWidth={2} />
          )}
        </div>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {group.entries.map((log) => (
            <LogEntryCard
              key={log.id}
              log={log}
              schema={tracker.schema}
              trackerId={tracker.id}
              trackerName={tracker.name}
              trackerColor={tracker.color}
            />
          ))}

          {/* Daily Stats Footer — only when 2+ entries and config loaded */}
          {group.entries.length > 1 && configLoaded && (
            <div
              className="mt-2 rounded-[14px] p-4"
              style={{
                backgroundColor: `${tracker.color}08`,
                border: `1px solid ${tracker.color}28`,
                boxShadow: `inset 0 0 28px ${tracker.color}06`,
              }}
            >
              {/* Header + Configure button */}
              <div className="mb-3 flex items-center justify-between">
                <h3
                  className="flex items-center gap-2"
                  style={{ color: tracker.color }}
                >
                  <TrendingUp className="h-3 w-3" strokeWidth={2} />
                  <span className="font-display-heading text-[11px]">Daily Totals &amp; Averages</span>
                </h3>
                <button
                  onClick={onOpenConfig}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 font-ui-label text-textMuted transition-colors hover:text-textPrimary"
                  style={{ background: '#1c3858', border: '1px solid rgba(0,212,255,0.13)', fontSize: '9px' }}
                  title="Configure totals"
                >
                  <Settings className="h-2.5 w-2.5" />
                  Configure
                </button>
              </div>

              {stats.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {stats.map((stat) => (
                    <div key={stat.fieldId} className="flex flex-col gap-0.5">
                      <span className="font-ui-label text-textMuted/50 truncate" style={{ fontSize: '9px' }}>
                        {stat.label}
                      </span>
                      <span className="font-data-value text-sm font-semibold text-textPrimary">
                        {formatFieldValue(stat.value, stat.unit, stat.label, stat.fieldType)}
                      </span>
                      <span className="font-ui-label text-textMuted/30" style={{ fontSize: '9px' }}>
                        {stat.aggregation === 'avg' ? 'Average' : 'Total'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] italic text-textMuted">All fields hidden — tap Configure to show them.</p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export function TrackerHistoryView({ tracker, logs }: Props): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filteredLogs = logs.filter((log) => {
    // Date range filter
    const logDate = log.logged_at.slice(0, 10) // YYYY-MM-DD
    if (dateFrom && logDate < dateFrom) return false
    if (dateTo && logDate > dateTo) return false
    // Text search — match against all field values (stringify the whole fields object)
    if (searchQuery.trim()) {
      const haystack = JSON.stringify(log.fields).toLowerCase()
      const needle = searchQuery.trim().toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })

  const groups = groupLogsByDate(filteredLogs)

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
        {/* Back link — Fusion style */}
        <Link
          href="/trackers"
          className="mb-6 inline-flex items-center gap-1.5 font-ui-label text-[#475569] transition-colors duration-300 hover:text-[#94a3b8]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Trackers
        </Link>

        <div className="mt-6 flex flex-col gap-4">
          {/* Hero row — icon + name + meta */}
          <div className="flex items-center gap-4">
            <div
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] transition-all duration-300"
              style={{
                backgroundColor: `${tracker.color}18`,
                border: `1px solid ${tracker.color}30`,
                boxShadow: `0 0 18px -4px ${tracker.color}50`,
                color: tracker.color,
              }}
            >
              <TrendingUp className="h-6 w-6" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="font-display-heading text-2xl text-textPrimary leading-tight break-words">
                {tracker.name}
              </h1>
              <p className="mt-1.5 font-ui-label text-[#94a3b8]">
                {logs.length} total entries · {tracker.schema.length} fields
              </p>
            </div>
          </div>

          {/* LOG ENTRY button — full-width Fusion accent gradient */}
          <Link
            href={`/trackers/${tracker.id}/log`}
            className="w-full h-[52px] rounded-full bg-gradient-to-r from-[#00d4ff] to-[#0090cc] text-[#000d1a] font-bold text-sm uppercase tracking-wider shadow-[0_0_20px_-4px_rgba(0,212,255,0.5)] flex items-center justify-center gap-2.5 transition-all duration-300 hover:opacity-90 hover:scale-[1.01] active:scale-[0.98] mb-2"
          >
            <ClipboardList className="h-5 w-5" />
            Log Entry
          </Link>
        </div>
      </div>

      {/* Search + Date Filter */}
      <div className="mb-8 space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-textMuted/50" />
          <input
            type="text"
            placeholder="Search entries…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/5 bg-white/[0.03] py-2.5 pl-9 pr-4 text-sm text-textPrimary placeholder:text-textMuted/40 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
          />
        </div>

        {/* Date range */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-textMuted/50">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-textPrimary focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-textMuted/50">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-textPrimary focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
            />
          </div>
          {/* Clear button — only when any filter is active */}
          {(searchQuery || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo('') }}
              className="self-end rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-textMuted transition-colors hover:text-textPrimary"
            >
              Clear
            </button>
          )}
        </div>

        {/* Result count when filtering */}
        {(searchQuery || dateFrom || dateTo) && (
          <p className="text-[11px] text-textMuted/50">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'} found
          </p>
        )}
      </div>

      {/* Log History */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-white/5 bg-white/[0.02] p-16 text-center">
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
        <div className="space-y-4">
          {groups.map((group) => (
            <CollapsibleDaySection
              key={group.date}
              group={group}
              tracker={tracker}
              configLoaded={configLoaded}
              totalsConfig={totalsConfig}
              onOpenConfig={() => setConfigOpen(true)}
            />
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

