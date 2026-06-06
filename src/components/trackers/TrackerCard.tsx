'use client'

import Link from 'next/link'
import { ClipboardList, Pencil, Eye, Activity, GripVertical } from 'lucide-react'
import type { Tracker } from '@/types/tracker'

type Props = {
  tracker: Tracker
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

export function TrackerCard({ tracker, dragHandleProps }: Props): React.ReactElement {
  const fieldCount = tracker.schema.length

  return (
    <div
      className="group flex items-center gap-2 rounded-2xl bg-surface p-3 transition-all duration-200"
      style={{ border: `1px solid ${tracker.color}18` }}
      data-testid="tracker-card"
    >
      {/* Drag handle — visible only when dragHandleProps are provided */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="shrink-0 cursor-grab touch-none text-textMuted/20 hover:text-textMuted/60 transition-colors active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: `${tracker.color}14`,
          border: `1px solid ${tracker.color}30`,
          boxShadow: `0 0 12px ${tracker.color}20`,
        }}
        data-testid="tracker-color-dot"
      >
        <Activity className="h-3.5 w-3.5" style={{ color: tracker.color }} />
      </div>

      {/* Name + badges */}
      <div className="min-w-0 flex-1">
        <h3 className="font-display-heading text-sm text-textPrimary leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {tracker.name}
        </h3>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span
            className="font-ui"
            style={{ fontSize: '9px', letterSpacing: '0.14em', color: tracker.color }}
          >
            {tracker.type.toUpperCase()}
          </span>
          <span className="font-ui text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.10em' }}>
            {fieldCount} {fieldCount === 1 ? 'FIELD' : 'FIELDS'}
          </span>
        </div>
      </div>

      {/* Action buttons — stacked on the right */}
      <div className="flex shrink-0 flex-col gap-1.5">
        <Link
          href={`/trackers/${tracker.id}/log`}
          className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 font-ui text-textMuted transition-all duration-200 hover:border-white/15 hover:text-textPrimary"
          style={{ fontSize: '9px', letterSpacing: '0.10em' }}
        >
          <ClipboardList className="h-2.5 w-2.5 shrink-0" />
          Log Entry
        </Link>
        <Link
          href={`/trackers/${tracker.id}/schema`}
          className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 font-ui text-textMuted transition-all duration-200 hover:border-white/15 hover:text-textPrimary"
          style={{ fontSize: '9px', letterSpacing: '0.10em' }}
        >
          <Pencil className="h-2.5 w-2.5 shrink-0" />
          Edit Schema
        </Link>
        <Link
          href={`/trackers/${tracker.id}`}
          className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 font-ui text-textMuted transition-all duration-200 hover:border-white/15 hover:text-textPrimary"
          style={{ fontSize: '9px', letterSpacing: '0.10em' }}
        >
          <Eye className="h-2.5 w-2.5 shrink-0" />
          View History
        </Link>
      </div>
    </div>
  )
}
