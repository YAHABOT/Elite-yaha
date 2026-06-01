'use client'

import { useState, useEffect, useCallback } from 'react'
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
import type { Tracker } from '@/types/tracker'
import type { TrackerLog } from '@/types/log'

const ORDER_KEY = 'yaha_tracker_order'

type Props = {
  trackers: Tracker[]
  grouped: Map<string, TrackerLog[]>
  showTotals: boolean
}

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

export function SortableJournalList({ trackers, grouped, showTotals }: Props) {
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

    setItems((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === active.id)
      const newIndex = prev.findIndex((t) => t.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)
      try {
        localStorage.setItem(ORDER_KEY, JSON.stringify(next.map((t) => t.id)))
      } catch { /* ignore */ }
      return next
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {allCollapsed && items.length > 1 && (
            <p className="px-1 font-ui text-textMuted/35 text-center" style={{ fontSize: '9px', letterSpacing: '0.14em' }}>
              Hold &amp; drag to reorder
            </p>
          )}
          {items.map((tracker) => {
            const logs = grouped.get(tracker.id) ?? []
            return (
              <SortableGroup
                key={tracker.id}
                tracker={tracker}
                logs={logs}
                showTotals={showTotals}
                isOpen={openMap[tracker.id] ?? false}
                onToggle={() => handleToggle(tracker.id)}
                dragEnabled={allCollapsed}
              />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
