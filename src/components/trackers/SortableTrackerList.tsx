'use client'

import { useState, useEffect } from 'react'
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
import { TrackerCard } from './TrackerCard'
import type { Tracker } from '@/types/tracker'

const ORDER_KEY = 'yaha_tracker_order'

function SortableItem({ tracker }: { tracker: Tracker }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tracker.id })

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
      <TrackerCard
        tracker={tracker}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function SortableTrackerList({ trackers }: { trackers: Tracker[] }) {
  const [items, setItems] = useState<Tracker[]>(trackers)

  // On mount, apply saved order from localStorage
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
    } catch {
      // ignore malformed localStorage
    }
  }, [trackers])

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
        <div className="flex flex-col gap-3">
          {items.map((tracker) => (
            <SortableItem key={tracker.id} tracker={tracker} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
