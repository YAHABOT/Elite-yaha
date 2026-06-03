'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
import { TrackerDayGroup } from './TrackerDayGroup'
import { CrossTrackerAggregateRow } from './CrossTrackerAggregateRow'
import type { Tracker } from '@/types/tracker'
import type { TrackerLog } from '@/types/log'

const ORDER_KEY = 'yaha_tracker_order'

const TYPE_COLORS: Record<string, string> = {
  nutrition: '#00ff9d',
  sleep: '#a855f7',
  workout: '#ff6b35',
  mood: '#ffd700',
  water: '#00d4ff',
  custom: '#6B7280',
}

type Props = {
  trackers: Tracker[]
  grouped: Map<string, TrackerLog[]>
  showTotals: boolean
  crossTrackerGroups: Map<string, Tracker[]>
  allLogs: TrackerLog[]
}

// ── Drag item types ────────────────────────────────────────────────────────────

type SoloItem = { kind: 'solo'; id: string; tracker: Tracker }
type GroupItem = { kind: 'group'; id: string; trackerType: string; trackers: Tracker[] }
type DragItem = SoloItem | GroupItem

function buildDragItems(ordered: Tracker[], crossGroups: Map<string, Tracker[]>): DragItem[] {
  const visited = new Set<string>()
  const result: DragItem[] = []

  for (const tracker of ordered) {
    if (visited.has(tracker.id)) continue

    const group = crossGroups.get(tracker.type)
    if (group && group.length >= 2) {
      // Pull all group members from `ordered` in their current order
      const members = ordered.filter((t) => group.some((g) => g.id === t.id))
      members.forEach((t) => visited.add(t.id))
      result.push({
        kind: 'group',
        id: `group_${tracker.type}`,
        trackerType: tracker.type,
        trackers: members,
      })
    } else {
      visited.add(tracker.id)
      result.push({ kind: 'solo', id: tracker.id, tracker })
    }
  }
  return result
}

function flattenDragItems(items: DragItem[]): Tracker[] {
  return items.flatMap((item) => (item.kind === 'solo' ? [item.tracker] : item.trackers))
}

// ── SortableGroup (solo tracker) ──────────────────────────────────────────────

type SortableGroupProps = {
  tracker: Tracker
  logs: TrackerLog[]
  showTotals: boolean
  isOpen: boolean
  onToggle: () => void
  dragEnabled: boolean
}

function SortableGroup({ tracker, logs, showTotals, isOpen, onToggle, dragEnabled }: SortableGroupProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tracker.id, disabled: !dragEnabled })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
    >
      <TrackerDayGroup
        tracker={tracker}
        logs={logs}
        showTotals={showTotals}
        isOpen={isOpen}
        onToggle={onToggle}
        dragHandleProps={dragEnabled ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  )
}

// ── SortableGroupBlock (grouped same-type trackers) ───────────────────────────

type SortableGroupBlockProps = {
  item: GroupItem
  grouped: Map<string, TrackerLog[]>
  showTotals: boolean
  openMap: Record<string, boolean>
  onToggle: (id: string) => void
  dragEnabled: boolean
  crossTrackerGroups: Map<string, Tracker[]>
  allLogs: TrackerLog[]
  typeColor: string
}

function SortableGroupBlock({
  item,
  grouped,
  showTotals,
  openMap,
  onToggle,
  dragEnabled,
  crossTrackerGroups,
  allLogs,
  typeColor,
}: SortableGroupBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !dragEnabled })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
    >
      <div className="space-y-3">
        {item.trackers.map((tracker) => (
          <TrackerDayGroup
            key={tracker.id}
            tracker={tracker}
            logs={grouped.get(tracker.id) ?? []}
            showTotals={showTotals}
            isOpen={openMap[tracker.id] ?? false}
            onToggle={() => onToggle(tracker.id)}
            dragHandleProps={dragEnabled ? { ...attributes, ...listeners } : undefined}
          />
        ))}
        <CrossTrackerAggregateRow
          trackerType={item.trackerType}
          typeColor={typeColor}
          trackers={crossTrackerGroups.get(item.trackerType)!}
          logs={allLogs}
          showTotals={showTotals}
        />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SortableJournalList({ trackers, grouped, showTotals, crossTrackerGroups, allLogs }: Props) {
  const [items, setItems] = useState<Tracker[]>(trackers)
  // open state for each tracker — keyed by tracker ID, all start closed
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(trackers.map((t) => [t.id, false]))
  )

  // Apply saved order on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORDER_KEY)
      if (!saved) return
      const order: string[] = JSON.parse(saved)
      const sorted = [...trackers].sort((a, b) => {
        const ai = order.indexOf(a.id)
        const bi = order.indexOf(b.id)
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
      setItems(sorted)
    } catch { /* ignore */ }
  }, [trackers])

  const handleToggle = useCallback((trackerId: string) => {
    setOpenMap((prev) => ({ ...prev, [trackerId]: !prev[trackerId] }))
  }, [])

  // Drag is only enabled when ALL items are collapsed
  const allCollapsed = items.every((t) => !openMap[t.id])

  // Derived drag items from flat items + crossTrackerGroups
  const dragItems = buildDragItems(items, crossTrackerGroups)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setItems((prevFlat) => {
      const prevDrag = buildDragItems(prevFlat, crossTrackerGroups)
      const oldIndex = prevDrag.findIndex((d) => d.id === active.id)
      const newIndex = prevDrag.findIndex((d) => d.id === over.id)
      const nextDrag = arrayMove(prevDrag, oldIndex, newIndex)
      const nextFlat = flattenDragItems(nextDrag)
      try {
        localStorage.setItem(ORDER_KEY, JSON.stringify(nextFlat.map((t) => t.id)))
      } catch { /* ignore */ }
      return nextFlat
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={dragItems.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {allCollapsed && items.length > 1 && (
            <p className="px-1 font-ui text-textMuted/35 text-center" style={{ fontSize: '9px', letterSpacing: '0.14em' }}>
              Hold &amp; drag to reorder
            </p>
          )}
          {dragItems.map((dragItem) => {
            if (dragItem.kind === 'solo') {
              return (
                <SortableGroup
                  key={dragItem.id}
                  tracker={dragItem.tracker}
                  logs={grouped.get(dragItem.tracker.id) ?? []}
                  showTotals={showTotals}
                  isOpen={openMap[dragItem.tracker.id] ?? false}
                  onToggle={() => handleToggle(dragItem.tracker.id)}
                  dragEnabled={allCollapsed}
                />
              )
            }
            return (
              <SortableGroupBlock
                key={dragItem.id}
                item={dragItem}
                grouped={grouped}
                showTotals={showTotals}
                openMap={openMap}
                onToggle={handleToggle}
                dragEnabled={allCollapsed}
                crossTrackerGroups={crossTrackerGroups}
                allLogs={allLogs}
                typeColor={TYPE_COLORS[dragItem.trackerType] ?? '#6B7280'}
              />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
