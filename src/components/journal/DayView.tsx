'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, GitBranch, Eye, EyeOff, Plus, Menu, X, Share2 } from 'lucide-react'
import type { Tracker } from '@/types/tracker'
import type { TrackerLog } from '@/types/log'
import type { Correlation } from '@/types/correlator'
import type { ShareCardConfig, ShareTrackerItem } from '@/lib/db/users'
import { SortableJournalList } from '@/components/journal/SortableJournalList'
import { CorrelationCard, MacroGroupCard, MACRO_GROUP_NAMES } from '@/components/journal/CorrelationCard'
import { CorrelatorModal } from '@/components/journal/CorrelatorModal'
import { JournalCalendar } from '@/components/journal/JournalCalendar'
import { JournalShareCard, type ComputedTracker, type ComputedField, type ComputedCorrelation } from '@/components/journal/JournalShareCard'
import { captureAndShare } from '@/lib/share/capture'
import { buildFieldValueMapWithCorrelators, evaluateFormula, formatResult } from '@/lib/correlator/formula-engine'
import { formatFieldValue } from '@/lib/utils/format'

type Props = {
  date: string
  trackers: Tracker[]
  logs: TrackerLog[]
  loggedDates: string[]
  correlations: Correlation[]
  lastKnownValues?: Record<string, number>
  initialOpenCorrelator?: boolean
  shareCardConfig?: ShareCardConfig
}

type ShareData = { trackers: ComputedTracker[]; correlations: ComputedCorrelation[] }

type GroupedLogs = Map<string, TrackerLog[]>

function groupLogsByTracker(logs: TrackerLog[]): GroupedLogs {
  const grouped: GroupedLogs = new Map()
  for (const log of logs) {
    const existing = grouped.get(log.tracker_id) ?? []
    grouped.set(log.tracker_id, [...existing, log])
  }
  return grouped
}


function formatHeaderDateParts(dateStr: string): { weekday: string; date: string } {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
  const date = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return { weekday, date }
}

function addDays(dateStr: string, n: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().split('T')[0]
}

// Returns YYYY-MM-DD in the user's LOCAL timezone — avoids UTC midnight boundary where
// UTC+ users would see yesterday's date labelled TODAY until midnight UTC.
function getLocalDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function DayView({ date, trackers, logs, loggedDates, correlations, lastKnownValues, initialOpenCorrelator, shareCardConfig }: Props): React.ReactElement {
  const router = useRouter()
  const [correlatorOpen, setCorrelatorOpen] = useState(initialOpenCorrelator ?? false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  // showTotals: controls the daily totals row at the bottom of each tracker group
  const [showTotals, setShowTotals] = useState(true)
  const [isSharing, setIsSharing] = useState(false)
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const shareCardRef = useRef<HTMLDivElement>(null)
  const pendingCapture = useRef(false)
  const today = getLocalDateStr()
  const isToday = date === today

  useEffect(() => {
    if (shareData && pendingCapture.current) {
      pendingCapture.current = false
      void captureAndShare(shareCardRef, `yaha-${date}.jpg`).finally(() => {
        setShareData(null)
        setIsSharing(false)
      })
    }
  }, [shareData, date])

  function handleShare() {
    if (isSharing) return
    setIsSharing(true)

    const items = shareCardConfig?.items ?? []
    const fvMap = buildFieldValueMapWithCorrelators(logs, correlations)

    const computedTrackers: ComputedTracker[] = items
      .filter(i => i.enabled && i.type === 'tracker')
      .flatMap(i => {
        const item = i as ShareTrackerItem
        const tracker = trackers.find(t => t.id === item.id)
        if (!tracker) return []
        const trackerLogs = logs.filter(l => l.tracker_id === item.id)
        if (trackerLogs.length === 0) return []
        const computedFields: ComputedField[] = item.fields
          .filter(f => f.enabled)
          .flatMap((fc, fi) => {
            const schemaDef = tracker.schema.find(s => s.fieldId === fc.fieldId)
            if (!schemaDef) return []
            const rawVals = trackerLogs
              .map(l => (l.fields as Record<string, unknown>)[fc.fieldId])
              .filter(v => v != null && v !== '')
            if (rawVals.length === 0) return []
            let displayVal: number | string
            if (rawVals.length === 1) {
              displayVal = rawVals[0] as number | string
            } else {
              const nums = rawVals.map(v => Number(v)).filter(n => !isNaN(n))
              if (nums.length === 0) {
                displayVal = String(rawVals[rawVals.length - 1])
              } else {
                const sum = nums.reduce((a, b) => a + b, 0)
                displayVal = fc.aggregation === 'avg' ? sum / nums.length : sum
              }
            }
            const formatted = formatFieldValue(displayVal, schemaDef.unit, schemaDef.label, schemaDef.type)
            return [{ label: schemaDef.label, value: formatted, isKey: fi === 0 }]
          })
        if (computedFields.length === 0) return []
        return [{ name: tracker.name, type: tracker.type, fields: computedFields }]
      })

    const computedCorrelations: ComputedCorrelation[] = items
      .filter(i => i.enabled && i.type === 'correlation')
      .flatMap(i => {
        const corr = correlations.find(c => c.id === i.id)
        if (!corr) return []
        const result = evaluateFormula(corr.formula, fvMap)
        return [{ name: corr.name, value: result != null ? formatResult(result, corr.unit) : '—' }]
      })

    pendingCapture.current = true
    setShareData({ trackers: computedTrackers, correlations: computedCorrelations })
  }

  const grouped = groupLogsByTracker(logs)
  const trackersWithLogs = trackers.filter((t) => grouped.has(t.id))

  // Build cross-tracker groups: type → Tracker[] (only types with 2+ trackers that have logs today)
  const crossTrackerGroups = new Map<string, Tracker[]>()
  for (const t of trackersWithLogs) {
    const group = crossTrackerGroups.get(t.type) ?? []
    group.push(t)
    crossTrackerGroups.set(t.type, group)
  }
  for (const [type, group] of crossTrackerGroups) {
    if (group.length < 2) crossTrackerGroups.delete(type)
  }

  // When the user is viewing today and today has no logs yet, inject today so
  // the calendar highlights it as selected. Only for the currently-viewed date.
  const calendarDates =
    date === today && !loggedDates.includes(today)
      ? [today, ...loggedDates]
      : loggedDates

  function goTo(d: string) {
    router.push(`/journal?date=${d}`)
  }

  return (
    <div className="flex h-full min-h-0">
      {/* ── Mobile Drawer Overlay ── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        >
          {/* Visual backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none" />
          {/* Drawer panel */}
          <div
            className="absolute left-0 top-0 z-10 h-full w-56 flex flex-col bg-surface border-r border-white/5 animate-in slide-in-from-left-4 duration-300 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header: action buttons + close */}
            <div className="flex items-center justify-between border-b border-white/[0.04] px-3 py-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowTotals((v) => !v); setMobileSidebarOpen(false) }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                    showTotals
                      ? 'border-white/10 bg-white/[0.06] text-textPrimary'
                      : 'border-white/5 bg-white/[0.02] text-textMuted hover:bg-white/[0.05] hover:text-textPrimary'
                  }`}
                >
                  {showTotals ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Totals
                </button>
                <button
                  onClick={() => { setCorrelatorOpen(true); setMobileSidebarOpen(false) }}
                  className="flex flex-col items-center gap-0.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-300 hover:bg-primary/20"
                >
                  <GitBranch className="h-3 w-3" />
                  <span>Correlator</span>
                </button>
                <button
                  onClick={() => { setMobileSidebarOpen(false); handleShare() }}
                  disabled={isSharing}
                  className="flex flex-col items-center gap-0.5 rounded-xl border border-[#00d4ff]/20 bg-[#00d4ff]/10 px-3 py-1.5 text-xs font-semibold text-[#00d4ff] transition-all duration-300 hover:bg-[#00d4ff]/20 disabled:opacity-40"
                >
                  <Share2 className="h-3 w-3" />
                  <span>Share</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-textMuted hover:bg-white/[0.06] hover:text-textPrimary transition-colors"
                aria-label="Close day list"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <JournalCalendar
              loggedDates={calendarDates}
              selectedDate={date}
              today={today}
              onSelectDate={(d) => { goTo(d); setMobileSidebarOpen(false) }}
            />
          </div>
        </div>
      )}

      {/* ── Left Sidebar: Calendar (desktop only) ── */}
      <aside className="hidden w-52 flex-shrink-0 border-r border-white/5 bg-surface md:flex md:flex-col relative overflow-hidden">
        <JournalCalendar
          loggedDates={calendarDates}
          selectedDate={date}
          today={today}
          onSelectDate={goTo}
        />
      </aside>

      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header bar — flex-shrink-0 keeps it fixed-height inside the flex-col while content scrolls below */}
        <div className="z-10 flex flex-shrink-0 items-center justify-between border-b border-white/5 bg-surface/60 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            {/* Mobile hamburger — hidden on desktop */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.03] text-textMuted transition-all duration-200 hover:bg-white/[0.06] hover:text-textPrimary border border-white/5 md:hidden"
              aria-label="Open day list"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              onClick={() => goTo(addDays(date, -1))}
              className="rounded-xl bg-white/[0.03] p-1.5 text-textMuted transition-all duration-300 hover:bg-white/[0.06] hover:text-textPrimary border border-white/5"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0 px-2 flex flex-col items-center">
              <span className="font-ui text-[10px] uppercase tracking-widest text-textMuted/60 leading-none">{formatHeaderDateParts(date).weekday}</span>
              <span className="text-sm font-bold text-textPrimary leading-tight whitespace-nowrap">{formatHeaderDateParts(date).date}</span>
            </div>
            <button
              onClick={() => goTo(addDays(date, 1))}
              disabled={isToday}
              className="rounded-xl bg-white/[0.03] p-1.5 text-textMuted transition-all duration-300 hover:bg-white/[0.06] hover:text-textPrimary border border-white/5 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Desktop-only action buttons — hidden on mobile (moved to drawer) */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setShowTotals((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-all duration-300 ${
                showTotals
                  ? 'border-white/10 bg-white/[0.06] text-textPrimary'
                  : 'border-white/5 bg-white/[0.02] text-textMuted hover:bg-white/[0.05] hover:text-textPrimary'
              }`}
              title={showTotals ? 'Hide daily totals' : 'Show daily totals'}
            >
              {showTotals ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              Totals
            </button>
            <button
              onClick={() => setCorrelatorOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-300 hover:bg-primary/20 hover:shadow-[0_0_12px_rgba(163,230,53,0.15)]"
            >
              <GitBranch className="h-3 w-3" />
              Correlator
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing}
              title="Share today's overview"
              className="flex items-center gap-1.5 rounded-xl border border-[#00d4ff]/20 bg-[#00d4ff]/10 px-3 py-1.5 text-xs font-semibold text-[#00d4ff] transition-all duration-300 hover:bg-[#00d4ff]/20 disabled:opacity-40"
            >
              <Share2 className="h-3 w-3" />
              Share
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-y-none px-4 py-6">
          {/* Correlations row */}
          {correlations.length > 0 && (
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="font-ui text-[10px] uppercase tracking-widest text-textMuted">Correlations</p>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent w-16" />
                </div>
                <button
                  onClick={() => setCorrelatorOpen(true)}
                  className="flex items-center gap-1 text-[10px] font-medium text-primary transition-colors hover:text-primary/80"
                >
                  <Plus className="h-3 w-3" /> New
                </button>
              </div>
              {(() => {
                const macroGroup = correlations.filter(c => MACRO_GROUP_NAMES.has(c.name.toLowerCase()))
                const rest = correlations.filter(c => !MACRO_GROUP_NAMES.has(c.name.toLowerCase()))
                return (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {macroGroup.length >= 2 && (
                      <MacroGroupCard correlations={macroGroup} logs={logs} allCorrelations={correlations} lastKnownValues={lastKnownValues} trackers={trackers} />
                    )}
                    {macroGroup.length === 1 && (
                      <CorrelationCard correlation={macroGroup[0]} logs={logs} allCorrelations={correlations} lastKnownValues={lastKnownValues} trackers={trackers} />
                    )}
                    {rest.map((c) => (
                      <CorrelationCard key={c.id} correlation={c} logs={logs} allCorrelations={correlations} lastKnownValues={lastKnownValues} trackers={trackers} />
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Tracker entries section header */}
          {trackersWithLogs.length > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <p className="font-ui text-[10px] uppercase tracking-widest text-textMuted">Entries</p>
              <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
              <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-textMuted border border-white/5">
                {trackersWithLogs.length} tracker{trackersWithLogs.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Tracker entries */}
          {trackersWithLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] p-14 text-center backdrop-blur-md">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/5">
                <GitBranch className="h-5 w-5 text-textMuted" />
              </div>
              <p className="text-sm font-semibold text-textPrimary">No logs for this day</p>
              {!isToday && (
                <p className="mt-1.5 text-xs text-textMuted">Try selecting a different day from the sidebar.</p>
              )}
            </div>
          ) : (
            <SortableJournalList
              trackers={trackersWithLogs}
              grouped={grouped}
              showTotals={showTotals}
              crossTrackerGroups={crossTrackerGroups}
              allLogs={logs}
            />
          )}

          {/* Add correlator CTA if none exist */}
          {correlations.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] p-6 text-center backdrop-blur-md">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] border border-primary/20">
                <GitBranch className="h-4 w-4 text-primary/60" />
              </div>
              <p className="text-sm font-semibold text-textPrimary">No correlations yet</p>
              <p className="mt-1 text-xs text-textMuted">Create formula metrics that combine fields across trackers.</p>
              <button
                onClick={() => setCorrelatorOpen(true)}
                className="mt-4 rounded-xl border border-primary/20 bg-primary/10 px-5 py-2 text-xs font-semibold text-primary transition-all duration-300 hover:bg-primary/20 hover:shadow-[0_0_12px_rgba(163,230,53,0.15)]"
              >
                + New Correlation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Correlator Modal */}
      {correlatorOpen && (
        <CorrelatorModal
          trackers={trackers}
          correlations={correlations}
          onClose={() => setCorrelatorOpen(false)}
          lastKnownValues={lastKnownValues}
        />
      )}

      {/* Off-screen share card — mounted only during capture */}
      {shareData && (
        <JournalShareCard
          ref={shareCardRef}
          date={date}
          trackers={shareData.trackers}
          correlations={shareData.correlations}
        />
      )}
    </div>
  )
}
