'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { updateShareCardConfigAction } from '@/app/actions/settings'
import type { Tracker, SchemaField } from '@/types/tracker'
import type { Correlation } from '@/types/correlator'
import type {
  ShareCardItem,
  ShareTrackerItem,
  ShareCorrelationItem,
  ShareCardConfig,
  ShareFieldConfig,
} from '@/lib/db/users'

const TRACKER_COLORS: Record<string, string> = {
  nutrition: '#00ff9d',
  sleep:     '#a855f7',
  workout:   '#ff6b35',
  mood:      '#ffd700',
  water:     '#00d4ff',
  custom:    '#94a3b8',
}

function isAggregable(type: string): boolean {
  return type === 'number' || type === 'rating' || type === 'duration'
}

function buildDefault(trackers: Tracker[], correlations: Correlation[]): ShareCardConfig {
  return {
    items: [
      ...trackers.map((t): ShareTrackerItem => ({
        type: 'tracker',
        id: t.id,
        enabled: true,
        fields: t.schema.map((f): ShareFieldConfig => ({ fieldId: f.fieldId, enabled: true, aggregation: 'sum' })),
      })),
      ...correlations.map((c): ShareCorrelationItem => ({
        type: 'correlation',
        id: c.id,
        enabled: true,
      })),
    ],
  }
}

function mergeConfig(
  saved: ShareCardConfig,
  trackers: Tracker[],
  correlations: Correlation[],
): ShareCardConfig {
  const savedMap = new Map(saved.items.map(i => [i.id, i]))

  const tItems: ShareTrackerItem[] = trackers.map(t => {
    const s = savedMap.get(t.id) as ShareTrackerItem | undefined
    if (s?.type === 'tracker') {
      const sfMap = new Map(s.fields.map(f => [f.fieldId, f]))
      return { ...s, fields: t.schema.map(sf => sfMap.get(sf.fieldId) ?? { fieldId: sf.fieldId, enabled: true, aggregation: 'sum' as const }) }
    }
    return { type: 'tracker', id: t.id, enabled: true, fields: t.schema.map(f => ({ fieldId: f.fieldId, enabled: true, aggregation: 'sum' as const })) }
  })

  const cItems: ShareCorrelationItem[] = correlations.map(c => {
    const s = savedMap.get(c.id) as ShareCorrelationItem | undefined
    return s?.type === 'correlation' ? s : { type: 'correlation', id: c.id, enabled: true }
  })

  const existingIds = new Set([...trackers.map(t => t.id), ...correlations.map(c => c.id)])
  const tMap = new Map(tItems.map(i => [i.id, i]))
  const cMap = new Map(cItems.map(i => [i.id, i]))

  const ordered = saved.items
    .filter(i => existingIds.has(i.id))
    .map(i => i.type === 'tracker' ? tMap.get(i.id)! : cMap.get(i.id)!)
    .filter(Boolean) as ShareCardItem[]

  const savedIds = new Set(saved.items.map(i => i.id))
  const newItems: ShareCardItem[] = [
    ...tItems.filter(t => !savedIds.has(t.id)),
    ...cItems.filter(c => !savedIds.has(c.id)),
  ]

  return { items: [...ordered, ...newItems] }
}

type Props = {
  trackers: Tracker[]
  correlations: Correlation[]
  initialConfig: ShareCardConfig | undefined
}

type SortableRowProps = {
  item: ShareCardItem
  tracker?: Tracker
  correlation?: Correlation
  onToggle: (id: string) => void
  onFieldToggle: (trackerId: string, fieldId: string) => void
  onAggChange: (trackerId: string, fieldId: string, agg: 'sum' | 'avg') => void
}

function SortableRow({ item, tracker, correlation, onToggle, onFieldToggle, onAggChange }: SortableRowProps) {
  const [expanded, setExpanded] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const color = item.type === 'tracker' ? (TRACKER_COLORS[tracker?.type ?? 'custom'] ?? '#94a3b8') : '#00d4ff'
  const name  = item.type === 'tracker' ? (tracker?.name ?? 'Unknown') : (correlation?.name ?? 'Unknown')
  const hasFields = item.type === 'tracker' && tracker && tracker.schema.length > 0

  const tItem = item.type === 'tracker' ? (item as ShareTrackerItem) : null

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined }}
    >
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        {/* Row header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            aria-label="Drag to reorder"
            className="touch-none text-textMuted/30 hover:text-textMuted/60 transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />

          <span className="text-sm font-bold text-textPrimary flex-1 min-w-0 truncate">{name}</span>

          {hasFields && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="text-textMuted/40 hover:text-textMuted transition-colors flex-shrink-0"
              aria-label={expanded ? 'Collapse fields' : 'Expand fields'}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}

          {/* Toggle */}
          <button
            type="button"
            onClick={() => onToggle(item.id)}
            aria-label={item.enabled ? 'Disable' : 'Enable'}
            className={[
              'relative h-6 w-11 shrink-0 rounded-full border transition-all duration-200',
              item.enabled ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40' : 'bg-[#1E1E1E] border-[#1E1E1E]',
            ].join(' ')}
          >
            <span className={[
              'absolute top-0.5 h-5 w-5 rounded-full transition-all duration-200',
              item.enabled ? 'left-[calc(100%-1.375rem)] bg-[#00d4ff]' : 'left-0.5 bg-[#A1A1AA]/40',
            ].join(' ')} />
          </button>
        </div>

        {/* Field list (tracker only) */}
        {expanded && hasFields && tItem && tracker && (
          <div className="border-t border-white/[0.04] px-4 pb-3 pt-2 space-y-2">
            {tracker.schema.map((field: SchemaField) => {
              const fc = tItem.fields.find(f => f.fieldId === field.fieldId)
              const enabled = fc?.enabled ?? true
              const agg = fc?.aggregation ?? 'sum'
              const canAgg = isAggregable(field.type)

              return (
                <div key={field.fieldId} className="flex items-center gap-3 py-1">
                  {/* Field checkbox */}
                  <button
                    type="button"
                    onClick={() => onFieldToggle(item.id, field.fieldId)}
                    aria-label={enabled ? 'Hide field' : 'Show field'}
                    className={[
                      'w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                      enabled ? 'bg-[#00d4ff]/20 border-[#00d4ff]/60' : 'bg-white/[0.03] border-white/10',
                    ].join(' ')}
                  >
                    {enabled && <span className="text-[#00d4ff] text-[10px] font-bold">✓</span>}
                  </button>

                  <span className="text-xs text-textMuted flex-1 min-w-0 truncate">
                    {field.label}{field.unit ? ` (${field.unit})` : ''}
                  </span>

                  {/* Sum / Avg toggle — only for aggregable types */}
                  {canAgg && enabled && (
                    <div className="flex rounded-lg border border-white/[0.06] overflow-hidden flex-shrink-0">
                      {(['sum', 'avg'] as const).map(a => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => onAggChange(item.id, field.fieldId, a)}
                          className={[
                            'px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors',
                            agg === a
                              ? 'bg-[#00d4ff]/15 text-[#00d4ff]'
                              : 'bg-transparent text-textMuted/40 hover:text-textMuted/70',
                          ].join(' ')}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function ShareCardSettings({ trackers, correlations, initialConfig }: Props) {
  const trackerMap = new Map(trackers.map(t => [t.id, t]))
  const corrMap    = new Map(correlations.map(c => [c.id, c]))

  const [items, setItems] = useState<ShareCardItem[]>(() => {
    const cfg = initialConfig
      ? mergeConfig(initialConfig, trackers, correlations)
      : buildDefault(trackers, correlations)
    return cfg.items
  })

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const save = useCallback((nextItems: ShareCardItem[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void updateShareCardConfigAction({ items: nextItems })
    }, 600)
  }, [])

  // Auto-seed on first render if no config saved
  useEffect(() => {
    if (!initialConfig && isFirstRender.current) {
      isFirstRender.current = false
      void updateShareCardConfigAction({ items })
    } else {
      isFirstRender.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems(prev => {
      const oldIndex = prev.findIndex(i => i.id === active.id)
      const newIndex = prev.findIndex(i => i.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)
      save(next)
      return next
    })
  }

  const handleToggle = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i)
      save(next)
      return next
    })
  }, [save])

  const handleFieldToggle = useCallback((trackerId: string, fieldId: string) => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id !== trackerId || item.type !== 'tracker') return item
        const tItem = item as ShareTrackerItem
        return {
          ...tItem,
          fields: tItem.fields.map(f => f.fieldId === fieldId ? { ...f, enabled: !f.enabled } : f),
        }
      })
      save(next)
      return next
    })
  }, [save])

  const handleAggChange = useCallback((trackerId: string, fieldId: string, agg: 'sum' | 'avg') => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id !== trackerId || item.type !== 'tracker') return item
        const tItem = item as ShareTrackerItem
        return {
          ...tItem,
          fields: tItem.fields.map(f => f.fieldId === fieldId ? { ...f, aggregation: agg } : f),
        }
      })
      save(next)
      return next
    })
  }, [save])

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center">
        <p className="text-sm text-textMuted opacity-60">No trackers or correlations yet. Create some first.</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map(item => (
            <SortableRow
              key={item.id}
              item={item}
              tracker={item.type === 'tracker' ? trackerMap.get(item.id) : undefined}
              correlation={item.type === 'correlation' ? corrMap.get(item.id) : undefined}
              onToggle={handleToggle}
              onFieldToggle={handleFieldToggle}
              onAggChange={handleAggChange}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
