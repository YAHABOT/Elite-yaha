'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { deleteTargetAction, updateTargetValueAction } from '@/app/actions/targets'
import type { UserTarget } from '@/lib/db/users'

/** Format raw seconds into "Xh Ym" for display */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

type Props = {
  targets: UserTarget[]
}

export function TargetsList({ targets }: Props): React.ReactElement {
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  function handleStartEdit(target: UserTarget): void {
    setEditingId(target.id)
    // For duration fields, pre-fill as "H:MM"
    if (target.fieldType === 'duration') {
      const h = Math.floor(target.value / 3600)
      const m = Math.floor((target.value % 3600) / 60)
      setEditValue(`${h}:${String(m).padStart(2, '0')}`)
    } else {
      setEditValue(String(target.value))
    }
    setError(null)
  }

  function handleCancelEdit(): void {
    setEditingId(null)
    setEditValue('')
    setError(null)
  }

  function handleSaveEdit(id: string): void {
    const target = targets.find(t => t.id === id)
    let val: number

    if (target?.fieldType === 'duration') {
      // Parse HH:MM format
      const parts = editValue.split(':')
      const h = parseInt(parts[0] ?? '0', 10)
      const m = parseInt(parts[1] ?? '0', 10)
      if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0 || m > 59) {
        setError('Enter time as H:MM (e.g. 8:00)')
        return
      }
      val = h * 3600 + m * 60
      if (val <= 0) {
        setError('Target must be greater than zero')
        return
      }
    } else {
      val = parseFloat(editValue)
      if (!Number.isFinite(val) || val <= 0) {
        setError('Enter a positive number')
        return
      }
    }

    setError(null)
    startTransition(async () => {
      const result = await updateTargetValueAction(id, val)
      if (result.error) {
        setError(result.error)
      } else {
        setEditingId(null)
      }
    })
  }

  function handleDelete(id: string): void {
    startTransition(async () => {
      await deleteTargetAction(id)
    })
  }

  if (targets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.20)' }}
        >
          <Plus className="h-7 w-7" style={{ color: '#00d4ff' }} />
        </div>
        <div className="space-y-1">
          <p className="font-display-heading text-sm text-textPrimary">No targets yet</p>
          <p className="font-ui text-textMuted/60" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>
            Add a target to track progress toward your daily goals
          </p>
        </div>
        <Link
          href="/settings/targets/new"
          className="flex items-center gap-2 rounded-2xl px-5 py-2.5 font-ui transition-all duration-200"
          style={{ fontSize: '11px', letterSpacing: '0.12em', background: 'rgba(0,212,255,0.10)', border: '1px solid rgba(0,212,255,0.30)', color: '#00d4ff' }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add First Target
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {targets.map((target) => (
        <div
          key={target.id}
          className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition-all duration-200"
        >
          {/* Tracker + field info */}
          <div className="flex-1 min-w-0">
            <p className="font-display-heading text-sm text-textPrimary leading-tight truncate">
              {target.fieldLabel}
            </p>
            <p className="font-ui text-textMuted/50 mt-0.5 truncate" style={{ fontSize: '9px', letterSpacing: '0.10em' }}>
              {target.trackerName.toUpperCase()} · {target.fieldType.toUpperCase()}{target.unit ? ` · ${target.unit}` : ''}
            </p>
          </div>

          {/* Value — inline edit or display */}
          {editingId === target.id ? (
            <div className="flex items-center gap-2 shrink-0">
              <input
                type={target.fieldType === 'duration' ? 'text' : 'number'}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(target.id); if (e.key === 'Escape') handleCancelEdit() }}
                placeholder={target.fieldType === 'duration' ? 'H:MM' : '0'}
                className="w-24 rounded-xl border border-white/20 bg-white/[0.06] px-3 py-1.5 text-center font-ui text-textPrimary focus:outline-none focus:border-[rgba(0,212,255,0.40)]"
                style={{ fontSize: '13px' }}
                autoFocus
              />
              {target.fieldType !== 'duration' && target.unit && (
                <span className="font-ui text-textMuted/40 shrink-0" style={{ fontSize: '9px' }}>{target.unit}</span>
              )}
              <button
                type="button"
                onClick={() => handleSaveEdit(target.id)}
                disabled={isPending}
                className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.30)', color: '#10b981' }}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-textMuted/60 transition-colors hover:text-textPrimary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="flex items-baseline gap-1">
                  <span className="font-ui" style={{ fontSize: '10px', color: 'rgba(148,163,184,0.35)' }}>
                    {target.direction === 'below' ? '≤' : '≥'}
                  </span>
                  <span
                    className="font-ui text-textPrimary"
                    style={{ fontSize: '16px', fontFamily: 'var(--font-share-mono)', color: '#00d4ff' }}
                  >
                    {target.fieldType === 'duration'
                      ? formatDuration(target.value)
                      : target.value}
                  </span>
                  {target.fieldType !== 'duration' && target.unit && (
                    <span className="font-ui text-textMuted/50" style={{ fontSize: '9px' }}>{target.unit}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleStartEdit(target)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-textMuted/50 transition-colors hover:border-white/20 hover:text-textPrimary"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(target.id)}
                disabled={isPending}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-textMuted/50 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add more */}
      <Link
        href="/settings/targets/new"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-3 font-ui text-textMuted/40 transition-all duration-200 hover:border-[rgba(0,212,255,0.25)] hover:text-[rgba(0,212,255,0.70)]"
        style={{ fontSize: '10px', letterSpacing: '0.12em' }}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Target
      </Link>
    </div>
  )
}
