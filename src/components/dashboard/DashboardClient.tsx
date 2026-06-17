'use client'
// needed for edit mode toggle state + add widget modal state + skip actions

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Check, RotateCcw, FlaskConical, Sunrise, Moon, ChevronRight, Eye, EyeOff } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { WidgetCard } from '@/components/dashboard/WidgetCard'
import { AddWidgetModal } from '@/components/dashboard/AddWidgetModal'
import { EditWidgetModal } from '@/components/dashboard/EditWidgetModal'
import { ScoreCard } from '@/components/dashboard/ScoreCard'
import { deleteWidgetAction, reorderWidgetsAction } from '@/app/actions/dashboard'
import { resetDayStateAction, resetEndDayStateAction, skipStartDayAction, skipEndDayAction } from '@/app/actions/day-state'
import { getTrackerTypeColor } from '@/lib/utils/tracker-colors'
import type { Widget, WidgetValue } from '@/types/widget'
import type { Tracker } from '@/types/tracker'
import type { Routine } from '@/types/routine'
import type { UserDayState } from '@/lib/db/day-state'
import type { UserTarget } from '@/lib/db/users'

// Returns YYYY-MM-DD in the user's LOCAL timezone
function getLocalDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Props ────────────────────────────────────────────────────────────────────

type CorrelationOption = { id: string; name: string; unit?: string }

type Props = {
  widgets: Widget[]
  widgetValues: WidgetValue[]
  trackers: Tracker[]
  dayStartRoutine: Routine | null
  dayEndRoutine: Routine | null
  dayState: UserDayState | null
  userName: string
  targets: UserTarget[]
  dailyScore: number | null
  correlations: CorrelationOption[]
}

/** Match a widget to a user target (for any field_* or correlator widget type). */
function getWidgetTarget(widget: Widget, targets: UserTarget[]): { value: number; direction: 'above' | 'below' } | undefined {
  if (!targets.length) return undefined
  if (widget.type === 'correlator' && widget.correlation_id) {
    const t = targets.find(t => t.trackerId === '__correlations__' && t.fieldId === widget.correlation_id)
    return t ? { value: t.value, direction: t.direction ?? 'above' } : undefined
  }
  if (!['field_latest', 'field_average', 'field_total'].includes(widget.type)) return undefined
  const byFieldId = targets.find(t => t.fieldId === widget.field_id)
  if (byFieldId) return { value: byFieldId.value, direction: byFieldId.direction ?? 'above' }
  const byLabel = targets.find(t => t.fieldLabel.toLowerCase() === widget.label.toLowerCase())
  if (byLabel) return { value: byLabel.value, direction: byLabel.direction ?? 'above' }
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

// ── Sortable wrapper for a single widget ────────────────────────────────────

type SortableWidgetItemProps = {
  id: string
  widget: Widget
  value: WidgetValue
  editMode: boolean
  target?: number
  targetDirection?: 'above' | 'below'
  onDelete: () => void
  onEdit: () => void
}

function SortableWidgetItem({ id, widget, value, editMode, target, targetDirection, onDelete, onEdit }: SortableWidgetItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1, zIndex: isDragging ? 50 : undefined }}
    >
      {editMode ? (
        <WidgetCard
          widget={widget}
          value={value}
          editMode={editMode}
          onDelete={onDelete}
          onEdit={onEdit}
          target={target}
          targetDirection={targetDirection}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      ) : (
        <Link href={`/dashboard/widget/${widget.id}`} className="block">
          <WidgetCard
            widget={widget}
            value={value}
            editMode={editMode}
            onDelete={onDelete}
            onEdit={onEdit}
            target={target}
            targetDirection={targetDirection}
          />
        </Link>
      )}
    </div>
  )
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
  dailyScore,
  correlations,
}: Props): React.ReactElement {
  const router = useRouter()
  const [editMode, setEditMode] = useState(false)
  const [showScoreCard, setShowScoreCard] = useState(true)

  // Restore hide/show preferences from localStorage after mount (SSR-safe)
  useEffect(() => {
    const sc = localStorage.getItem('dash:showScoreCard')
    if (sc !== null) setShowScoreCard(sc !== 'false')
  }, [])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)
  const [devMode, setDevMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() =>
    [...widgets].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(w => w.id)
  )

  // Keep widgetOrder in sync when widgets are added or deleted from the server
  useEffect(() => {
    setWidgetOrder(prev => {
      const currentIds = new Set(widgets.map(w => w.id))
      // Remove deleted widgets, preserve existing drag order
      const filtered = prev.filter(id => currentIds.has(id))
      const existingSet = new Set(filtered)
      // Append any new widgets (by server position) that aren't in the order yet
      const newIds = [...widgets]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(w => w.id)
        .filter(id => !existingSet.has(id))
      return [...filtered, ...newIds]
    })
  }, [widgets])

  // EX13 FIX: Apply tracker type colors to widgets
  const widgetsWithColors = widgets.map(w => applyTrackerColorToWidget(w, trackers))

  // Build id→value map so reordering doesn't break value lookup
  const valueById = new Map<string, WidgetValue>(widgets.map((w, i) => [w.id, widgetValues[i]]))

  // Sort widgetsWithColors + values together by current drag order
  const sortedPairs = widgetOrder
    .map(id => {
      const w = widgetsWithColors.find(x => x.id === id)
      return w ? { widget: w, value: valueById.get(id) ?? { value: null, label: w.label } } : null
    })
    .filter((p): p is { widget: Widget; value: WidgetValue } => p !== null)

  const sortedWidgets = sortedPairs.map(p => p.widget)
  const sortedValues = sortedPairs.map(p => p.value)

  const hasWidgets = widgets.length > 0

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = widgetOrder.indexOf(String(active.id))
    const newIdx = widgetOrder.indexOf(String(over.id))
    if (oldIdx === -1 || newIdx === -1) return
    const next = arrayMove(widgetOrder, oldIdx, newIdx)
    setWidgetOrder(next)
    // Call server action outside state updater to avoid "update while rendering" error
    reorderWidgetsAction(next).catch(() => {/* silent — optimistic */})
  }

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

      {/* AI_SUMMARIES_DEFERRED — see docs/plans/ai-summaries-deferred.md */}

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

      {/* ── Hero Score Card ── */}
      {targets.length > 0 && (showScoreCard || editMode) && (
        <div className="relative">
          {showScoreCard ? (
            <>
              <Link href="/dashboard/score" className="block">
                <ScoreCard score={dailyScore} targets={targets} />
              </Link>
              {editMode && (
                <button
                  type="button"
                  onClick={() => { setShowScoreCard(false); localStorage.setItem('dash:showScoreCard', 'false') }}
                  className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/40 text-textMuted/50 transition-all hover:border-white/20 hover:text-textMuted"
                  title="Hide score card"
                >
                  <EyeOff className="h-3 w-3" />
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => { setShowScoreCard(true); localStorage.setItem('dash:showScoreCard', 'true') }}
              className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-2.5 transition-all hover:border-white/10"
            >
              <span className="font-ui text-textMuted/40" style={{ fontSize: '9px', letterSpacing: '0.14em' }}>DAILY SCORE</span>
              <Eye className="h-3 w-3 text-textMuted/30" />
            </button>
          )}
        </div>
      )}

      {/* ── Widget header row (Edit / Add) ── */}
      {(editMode || hasWidgets || !hasWidgets) && (
        <div className="flex items-center justify-end gap-1.5">
          {(editMode || hasWidgets) && (
            <button
              type="button"
              onClick={() => setEditMode(prev => !prev)}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-ui text-textMuted backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:text-textPrimary"
              style={{ fontSize: '9px', letterSpacing: '0.08em' }}
            >
              {editMode ? (
                <><Check className="h-2.5 w-2.5" />Done</>
              ) : (
                <><Pencil className="h-2.5 w-2.5" />Edit</>
              )}
            </button>
          )}
          {(editMode || !hasWidgets) && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 font-ui transition-all duration-300"
              style={{ fontSize: '9px', letterSpacing: '0.08em', border: '1px solid rgba(0,212,255,0.25)', background: 'rgba(0,212,255,0.08)', color: '#00d4ff' }}
            >
              <Plus className="h-2.5 w-2.5" />
              Add Widget
            </button>
          )}
        </div>
      )}

      {/* ── Widgets (flat list) or empty state ── */}
      {!hasWidgets ? (
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] py-20 text-center backdrop-blur-sm">
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedWidgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {sortedPairs.map(({ widget, value }) => {
                const widgetTarget = getWidgetTarget(widget, targets)
                return (
                  <SortableWidgetItem
                    key={widget.id}
                    id={widget.id}
                    widget={widget}
                    value={value}
                    editMode={editMode}
                    onDelete={() => handleDelete(widget.id)}
                    onEdit={() => setEditingWidget(widget)}
                    target={widgetTarget?.value}
                    targetDirection={widgetTarget?.direction}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Pending overlay */}
      {isPending && (
        <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-white/10 bg-surfaceHighlight/90 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-textMuted backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          Saving…
        </div>
      )}

      {/* Add widget modal */}
      {showAddModal && (
        <AddWidgetModal
          trackers={trackers}
          targets={targets}
          correlations={correlations}
          onClose={handleCloseModal}
        />
      )}

      {/* Edit widget modal */}
      {editingWidget && (
        <EditWidgetModal
          widget={editingWidget}
          trackers={trackers}
          targets={targets}
          correlations={correlations}
          onClose={() => { setEditingWidget(null); router.refresh() }}
        />
      )}
    </div>
  )
}
