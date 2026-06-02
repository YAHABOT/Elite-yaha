'use client'
// needed for edit mode toggle state + add widget modal state + skip actions

import { useState, useTransition } from 'react'
import { Plus, Pencil, Check, RotateCcw, FlaskConical, Sunrise, Moon, ChevronRight } from 'lucide-react'
import { WidgetCard } from '@/components/dashboard/WidgetCard'
import { AddWidgetModal } from '@/components/dashboard/AddWidgetModal'
import { deleteWidgetAction } from '@/app/actions/dashboard'
import { resetDayStateAction, resetEndDayStateAction, skipStartDayAction, skipEndDayAction } from '@/app/actions/day-state'
import { getTrackerTypeColor } from '@/lib/utils/tracker-colors'
import type { Widget, WidgetValue } from '@/types/widget'
import type { Tracker } from '@/types/tracker'
import type { Routine } from '@/types/routine'
import type { UserDayState } from '@/lib/db/day-state'
import type { UserTargets } from '@/lib/db/users'

// Returns YYYY-MM-DD in the user's LOCAL timezone
function getLocalDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Props = {
  widgets: Widget[]
  widgetValues: WidgetValue[]
  trackers: Tracker[]
  dayStartRoutine: Routine | null
  dayEndRoutine: Routine | null
  dayState: UserDayState | null
  userName: string
  targets: UserTargets
}

/** Match a widget label to a user target value (only for field_total widgets). */
function getWidgetTarget(widget: Widget, targets: UserTargets): number | undefined {
  if (widget.type !== 'field_total') return undefined
  const label = widget.label.toLowerCase()
  if (/calor|kcal/.test(label) && targets.calories) return targets.calories
  if (/sleep|slept|rest/.test(label) && targets.sleep) return targets.sleep
  if (/water|fluid|hydrat/.test(label) && targets.water) return targets.water
  if (/step/.test(label) && targets.steps) return targets.steps
  return undefined
}

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

function getShortDate(): string {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const date = d.getDate()
  return `${day} · ${month} ${date}`
}

/**
 * EX13 FIX: Apply tracker type colors to widgets.
 * For widgets linked to trackers, use the tracker's type-specific color.
 * For correlator widgets, keep the existing widget.color.
 */
function applyTrackerColorToWidget(widget: Widget, trackers: Tracker[]): Widget {
  // If widget already has an explicit color, keep it (for correlators)
  if (widget.color) return widget

  // If widget is linked to a tracker, apply the tracker's type color
  if (widget.tracker_id) {
    const tracker = trackers.find(t => t.id === widget.tracker_id)
    if (tracker) {
      return { ...widget, color: getTrackerTypeColor(tracker.type) }
    }
  }

  return widget
}

export function DashboardClient({
  widgets,
  widgetValues,
  trackers,
  dayStartRoutine,
  dayEndRoutine,
  dayState,
  userName,
  targets,
}: Props): React.ReactElement {
  const [editMode, setEditMode] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [devMode, setDevMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // EX13 FIX: Apply tracker type colors to widgets
  const widgetsWithColors = widgets.map(w => applyTrackerColorToWidget(w, trackers))

  const hasWidgets = widgets.length > 0

  // Derive explicit session state from dayState prop.
  // dayState comes from getActiveDayState() which only returns rows with
  // day_started_at IS NOT NULL AND day_ended_at IS NULL.
  // So: dayState !== null  ⟺  ACTIVE state.
  //     dayState === null   ⟺  NEUTRAL state (never started, or already ended).
  const sessionIsActive = dayState !== null
  const sessionIsNeutral = dayState === null

  // Cross-day guard: derive local today for skip actions and date checks.
  const nowHour = new Date().getHours()
  const localToday = getLocalDateStr()
  // EX2: End Day banner only appears after 7 PM, or if the active session is from a past date.
  const sessionDate = dayState?.date ?? localToday
  const sessionIsForPastDate = sessionDate < localToday
  const endDayTimeGatePassed = sessionIsForPastDate || nowHour >= 19

  function handleDelete(id: string): void {
    startTransition(async () => {
      await deleteWidgetAction(id)
    })
  }

  function handleResetDayState(): void {
    startTransition(async () => {
      await resetDayStateAction()
    })
  }

  function handleResetEndDayState(): void {
    startTransition(async () => {
      await resetEndDayStateAction()
    })
  }

  function handleSkipStartDay(): void {
    setError(null)
    startTransition(async () => {
      const result = await skipStartDayAction(localToday)
      if (result.error) {
        setError(result.error)
        // Auto-clear error after 5 seconds
        setTimeout(() => setError(null), 5000)
      }
    })
  }

  function handleSkipEndDay(): void {
    if (!dayState) return
    setError(null)
    startTransition(async () => {
      const result = await skipEndDayAction(dayState.date)
      if (result.error) {
        setError(result.error)
        // Auto-clear error after 5 seconds
        setTimeout(() => setError(null), 5000)
      }
    })
  }

  function handleCloseModal(): void {
    setShowAddModal(false)
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Greeting header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-ui text-textMuted/60" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>
            {getShortDate()}
          </p>
          <h1 className="font-display-heading text-2xl text-textPrimary leading-tight mt-0.5">
            {getTimeGreeting()}, {userName.toUpperCase()}
          </h1>
        </div>
        {/* Dev mode toggle — hidden until needed */}
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => setDevMode(prev => !prev)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 border transition-all duration-300 ${
              devMode
                ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
                : 'border-white/5 bg-transparent text-white/10 hover:text-white/20 hover:border-white/10'
            }`}
            style={{ fontSize: '8px', letterSpacing: '0.18em' }}
            title="Toggle Developer Mode"
          >
            <FlaskConical className="h-2 w-2" />
          </button>
          {devMode && (
            <>
              <button
                type="button"
                onClick={handleResetDayState}
                disabled={isPending}
                className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-400 transition-all duration-300 hover:border-amber-500/50 disabled:opacity-40"
                style={{ fontSize: '8px', letterSpacing: '0.14em' }}
                title="Clear day_started_at — makes Morning banner reappear"
              >
                <RotateCcw className="h-2 w-2" />
                Reset AM
              </button>
              <button
                type="button"
                onClick={handleResetEndDayState}
                disabled={isPending}
                className="flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-indigo-400 transition-all duration-300 hover:border-indigo-500/50 disabled:opacity-40"
                style={{ fontSize: '8px', letterSpacing: '0.14em' }}
                title="Clear day_ended_at — makes End Day banner reappear"
              >
                <RotateCcw className="h-2 w-2" />
                Reset PM
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Compact Start Day banner ── */}
      {dayStartRoutine && sessionIsNeutral && (
        <div className="flex flex-col gap-1.5">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ border: '1px solid rgba(245,158,11,0.22)', background: 'rgba(245,158,11,0.07)' }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.28)' }}>
              <Sunrise className="h-4 w-4" style={{ color: '#f59e0b' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display-heading text-xs text-textPrimary leading-tight">{dayStartRoutine.name}</p>
              <p className="font-ui text-textMuted/60 mt-0.5" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>
                {dayStartRoutine.steps.length} step{dayStartRoutine.steps.length !== 1 ? 's' : ''} · ~{Math.max(1, Math.round(dayStartRoutine.steps.length * 0.7))} min to log
              </p>
            </div>
            <a
              href={`/chat/new?routine=${dayStartRoutine.id}`}
              className="flex items-center gap-1 rounded-xl px-3 py-2 font-ui shrink-0 transition-all duration-200 hover:brightness-110"
              style={{ fontSize: '10px', letterSpacing: '0.10em', background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b' }}
            >
              Start <ChevronRight className="h-3 w-3" />
            </a>
          </div>
          <button
            type="button"
            onClick={handleSkipStartDay}
            disabled={isPending}
            className="self-center rounded-full px-4 py-1 font-ui text-textMuted/40 transition-all hover:text-textMuted/70 disabled:opacity-40"
            style={{ fontSize: '9px', letterSpacing: '0.12em', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            Skip Morning
          </button>
        </div>
      )}

      {/* ── Compact End Day banner ── */}
      {dayEndRoutine && sessionIsActive && endDayTimeGatePassed && (
        <div className="flex flex-col gap-1.5">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ border: '1px solid rgba(168,85,247,0.22)', background: 'rgba(168,85,247,0.07)' }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.28)' }}>
              <Moon className="h-4 w-4" style={{ color: '#a855f7' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display-heading text-xs text-textPrimary leading-tight">{dayEndRoutine.name}</p>
              <p className="font-ui text-textMuted/60 mt-0.5" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>
                {dayEndRoutine.steps.length} step{dayEndRoutine.steps.length !== 1 ? 's' : ''} · ~{Math.max(1, Math.round(dayEndRoutine.steps.length * 0.7))} min to log
              </p>
            </div>
            <a
              href={`/chat/new?routine=${dayEndRoutine.id}`}
              className="flex items-center gap-1 rounded-xl px-3 py-2 font-ui shrink-0 transition-all duration-200 hover:brightness-110"
              style={{ fontSize: '10px', letterSpacing: '0.10em', background: 'rgba(168,85,247,0.14)', border: '1px solid rgba(168,85,247,0.32)', color: '#a855f7' }}
            >
              Start <ChevronRight className="h-3 w-3" />
            </a>
          </div>
          <button
            type="button"
            onClick={handleSkipEndDay}
            disabled={isPending}
            className="self-center rounded-full px-4 py-1 font-ui text-textMuted/40 transition-all hover:text-textMuted/70 disabled:opacity-40"
            style={{ fontSize: '9px', letterSpacing: '0.12em', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            Skip Evening
          </button>
        </div>
      )}

      {/* ── Widget header row (Edit / Add) ── */}
      {(editMode || hasWidgets || !hasWidgets) && (
        <div className="flex items-center justify-end gap-2">
          {(editMode || hasWidgets) && (
            <button
              type="button"
              onClick={() => setEditMode(prev => !prev)}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-ui text-textMuted backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:text-textPrimary"
              style={{ fontSize: '10px', letterSpacing: '0.10em' }}
            >
              {editMode ? (
                <><Check className="h-3 w-3" />Done</>
              ) : (
                <><Pencil className="h-3 w-3" />Edit</>
              )}
            </button>
          )}
          {(editMode || !hasWidgets) && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 font-ui transition-all duration-300"
              style={{ fontSize: '10px', letterSpacing: '0.10em', border: '1px solid rgba(0,212,255,0.25)', background: 'rgba(0,212,255,0.08)', color: '#00d4ff' }}
            >
              <Plus className="h-3 w-3" />
              Add Widget
            </button>
          )}
        </div>
      )}

      {/* Widget grid or empty state */}
      {!hasWidgets ? (
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] py-20 text-center backdrop-blur-sm">
          {/* Subtle gradient background */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-nutrition/[0.03] via-transparent to-transparent" />
          <div className="relative flex flex-col items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-nutrition/20 bg-nutrition/10">
              <Plus className="h-7 w-7 text-nutrition" />
            </div>
            <div>
              <p className="text-sm font-bold text-textPrimary">No widgets yet</p>
              <p className="mt-1 text-xs text-textMuted">Pin your most important health metrics here</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-2xl border border-nutrition/30 bg-nutrition/10 px-5 py-2.5 text-sm font-bold text-nutrition transition-all duration-300 hover:border-nutrition/50 hover:bg-nutrition/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            >
              <Plus className="h-4 w-4" />
              Add your first widget
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {widgetsWithColors.map((widget, index) => (
            <WidgetCard
              key={widget.id}
              widget={widget}
              value={widgetValues[index] ?? { value: null, label: widget.label }}
              editMode={editMode}
              onDelete={() => handleDelete(widget.id)}
              target={getWidgetTarget(widget, targets)}
            />
          ))}
        </div>
      )}

      {/* Pending overlay (glass toast) */}
      {isPending && (
        <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-white/10 bg-surfaceHighlight/90 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-textMuted backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          Saving…
        </div>
      )}

      {/* Add widget modal */}
      {showAddModal && (
        <AddWidgetModal
          trackers={trackers}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
