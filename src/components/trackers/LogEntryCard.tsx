'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2, Pencil, Check, X } from 'lucide-react'
import { deleteLogAction, updateLogAction, createLogAction } from '@/app/actions/logs'
import { formatFieldValue } from '@/lib/utils/format'
import type { TrackerLog, LogFields } from '@/types/log'
import type { SchemaField } from '@/types/tracker'

type Props = {
  log: TrackerLog
  schema: SchemaField[]
  trackerId: string
  trackerName: string
  trackerColor: string
}

const RATING_MIN = 1
const RATING_MAX = 10

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

// Converts a UTC ISO string to the YYYY-MM-DDTHH:MM format expected by <input type="datetime-local">.
// Uses local-time getters so the input shows the user's local clock, not UTC.
function toDatetimeLocal(isoUTC: string): string {
  const d = new Date(isoUTC)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Parse a duration string to total seconds (shared with LogForm logic)
function parseDurationToSeconds(raw: string): number | null {
  const s = raw.trim()
  if (s === '') return null
  const hmsMatch = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
  if (hmsMatch) {
    const total = parseInt(hmsMatch[1]) * 3600 + parseInt(hmsMatch[2]) * 60 + parseInt(hmsMatch[3])
    return total <= 86400 ? total : null
  }
  const msMatch = s.match(/^(\d{1,3}):(\d{2})$/)
  if (msMatch) {
    const total = parseInt(msMatch[1]) * 60 + parseInt(msMatch[2])
    return total <= 86400 ? total : null
  }
  const hMatch = s.match(/(\d+)\s*h/i)
  const mMatch = s.match(/(\d+)\s*m(?!s)/i)
  const secMatch = s.match(/(\d+)\s*s(?:ec)?/i)
  if (hMatch || mMatch || secMatch) {
    const total =
      (hMatch ? parseInt(hMatch[1]) * 3600 : 0) +
      (mMatch ? parseInt(mMatch[1]) * 60 : 0) +
      (secMatch ? parseInt(secMatch[1]) : 0)
    return total <= 86400 ? total : null
  }
  const n = parseFloat(s)
  if (!isNaN(n)) return Math.round(n) <= 86400 ? Math.round(n) : null
  return null
}

function getSourceBadgeStyle(source: string): React.CSSProperties {
  if (source === 'telegram') {
    return {
      background: 'rgba(168,85,247,0.18)',
      color: '#a855f7',
      border: '1px solid rgba(168,85,247,0.30)',
    }
  }
  if (source === 'chat') {
    return {
      background: 'rgba(0,212,255,0.18)',
      color: '#00d4ff',
      border: '1px solid rgba(0,212,255,0.30)',
    }
  }
  if (source === 'web') {
    return {
      background: 'rgba(0,212,255,0.18)',
      color: '#00d4ff',
      border: '1px solid rgba(0,212,255,0.30)',
    }
  }
  // manual / default
  return {
    background: '#234468',
    color: '#94a3b8',
    border: '1px solid rgba(0,212,255,0.13)',
  }
}

export function LogEntryCard({ log, schema, trackerId }: Props): React.ReactElement {
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isSaving, startSaveTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [originalValues, setOriginalValues] = useState<Record<string, unknown>>({})
  const [editLoggedAt, setEditLoggedAt] = useState<string>('')
  const [editError, setEditError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false)
  const [isLoggingAgain, startLogAgainTransition] = useTransition()
  const [loggedAgainMsg, setLoggedAgainMsg] = useState<string | null>(null)

  // activeSchema: used for new edits only (can't re-log an archived field)
  const activeSchema = schema.filter((field) => !field.archived)
  // filledFields: uses full schema so archived fields still show in past entries
  const filledFields = schema.filter(
    (field) => log.fields[field.fieldId] !== null && log.fields[field.fieldId] !== undefined
  )

  function handleLogAgainExact(): void {
    startLogAgainTransition(async () => {
      const result = await createLogAction(trackerId, log.fields as Record<string, number | string | null>)
      if (result.error) {
        setLoggedAgainMsg('Error')
      } else {
        setLoggedAgainMsg('✓ Logged!')
      }
      setTimeout(() => setLoggedAgainMsg(null), 2000)
    })
  }

  const handleDelete = (): void => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    startDeleteTransition(async () => {
      await deleteLogAction(log.id, log.tracker_id)
    })
  }

  const handleCancelDelete = (): void => {
    setConfirmDelete(false)
  }

  function startEdit(): void {
    const raw: Record<string, string> = {}
    const original: Record<string, unknown> = {}
    for (const field of activeSchema) {
      const val = log.fields[field.fieldId]
      original[field.fieldId] = val
      if (val !== null && val !== undefined) {
        if (field.type === 'duration' && typeof val === 'number') {
          // DB stores duration as total seconds. Display as HH:MM:SS or MM:SS for editing.
          const totalSecs = Math.round(val)
          const h = Math.floor(totalSecs / 3600)
          const m = Math.floor((totalSecs % 3600) / 60)
          const s = totalSecs % 60
          if (h > 0) {
            raw[field.fieldId] = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          } else {
            raw[field.fieldId] = `${m}:${String(s).padStart(2, '0')}`
          }
        } else if (field.type === 'number' || field.type === 'rating') {
          // Use the raw numeric value directly. formatFieldValue appends the unit suffix
          // (e.g. "94 %", "72 bpm") which <input type="number"> treats as NaN → blank field.
          raw[field.fieldId] = String(val)
        } else {
          const formatted = formatFieldValue(val, field.unit, field.label)
          raw[field.fieldId] = formatted === '---' ? String(val) : formatted
        }
      } else {
        raw[field.fieldId] = ''
      }
    }
    setOriginalValues(original)
    setEditValues(raw)
    setEditLoggedAt(toDatetimeLocal(log.logged_at))
    setIsEditing(true)
    setEditError(null)
  }

  function cancelEdit(): void {
    setIsEditing(false)
    setEditValues({})
    setOriginalValues({})
    setEditLoggedAt('')
    setEditError(null)
  }

  function saveEdit(): void {
    setEditError(null)
    startSaveTransition(async () => {
      const fields: LogFields = {}
      for (const field of activeSchema) {
        const raw = editValues[field.fieldId]
        const original = originalValues[field.fieldId]

        // Determine the new value
        let newValue: unknown = null
        if (raw !== '' && raw !== undefined) {
          if (field.type === 'number' || field.type === 'rating') {
            const parsed = Number(raw)
            newValue = Number.isNaN(parsed) ? null : parsed
          } else if (field.type === 'duration') {
            // Parse the edited string back to total seconds
            newValue = parseDurationToSeconds(raw)
          } else {
            newValue = raw
          }
        }

        // Only include fields that were actually modified (dirty fields pattern)
        // Explicit null guard: never patch a field with null — the merge in updateLog
        // already preserves existing values; including null would overwrite them.
        const hasChanged = newValue !== original
        if (hasChanged && newValue !== null) {
          fields[field.fieldId] = newValue as never
        }
      }

      // Detect timestamp change — convert local datetime back to UTC ISO for the DB
      const newLoggedAt = editLoggedAt
        ? new Date(editLoggedAt).toISOString()
        : undefined
      const loggedAtChanged = newLoggedAt !== undefined && newLoggedAt !== log.logged_at

      // Only proceed if there are actual changes (fields or timestamp)
      if (Object.keys(fields).length === 0 && !loggedAtChanged) {
        setIsEditing(false)
        setEditValues({})
        setOriginalValues({})
        setEditLoggedAt('')
        return
      }

      const result = await updateLogAction(
        log.id,
        log.tracker_id,
        fields,
        loggedAtChanged ? newLoggedAt : undefined
      )
      if (result.error) {
        setEditError(result.error)
      } else {
        setIsEditing(false)
        setEditValues({})
        setOriginalValues({})
        setEditLoggedAt('')
      }
    })
  }

  return (
    <div
      className={`group rounded-[14px] border border-white/5 bg-[#1c3858] px-4 py-3.5 transition-all duration-300 hover:border-white/10 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)] ${isDeleting ? 'opacity-50 scale-[0.99]' : ''}`}
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-data-value text-[11px] text-[#94a3b8]">{formatTime(log.logged_at)}</span>
          {log.source !== 'manual' && (
            <span
              className="rounded-[6px] px-[7px] py-[3px] font-ui-label"
              style={{ fontSize: '10px', fontWeight: 900, ...getSourceBadgeStyle(log.source) }}
            >
              {log.source}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={saveEdit}
                disabled={isSaving}
                className="rounded-lg p-1 text-nutrition transition-all duration-300 hover:bg-nutrition/10 disabled:opacity-50"
                aria-label="Save edit"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSaving}
                className="rounded-lg p-1 text-textMuted transition-all duration-300 hover:bg-white/[0.04] hover:text-textPrimary disabled:opacity-50"
                aria-label="Cancel edit"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : confirmDelete ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all duration-200 hover:bg-red-500/10 disabled:opacity-50"
                aria-label="Confirm delete"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm?'}
              </button>
              <button
                type="button"
                onClick={handleCancelDelete}
                className="rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-textMuted transition-colors hover:text-textPrimary"
                aria-label="Cancel delete"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {/* Log Again — re-logs exact same values instantly */}
              <button
                type="button"
                onClick={handleLogAgainExact}
                disabled={isLoggingAgain}
                className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-black uppercase tracking-widest text-textMuted transition-all duration-200 hover:border-[rgba(0,212,255,0.3)] hover:bg-[rgba(0,212,255,0.08)] hover:text-[#00d4ff] disabled:opacity-50"
                aria-label="Log again"
                style={{ fontSize: '10px', letterSpacing: '0.08em' }}
              >
                {isLoggingAgain ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : loggedAgainMsg ? (
                  <span style={{ color: loggedAgainMsg.startsWith('✓') ? '#10b981' : '#ef4444' }}>{loggedAgainMsg}</span>
                ) : (
                  'Log Again'
                )}
              </button>
              <button
                type="button"
                onClick={startEdit}
                className="rounded-lg p-1 text-textMuted transition-all duration-300 hover:bg-white/[0.04] hover:text-textPrimary"
                aria-label="Edit entry"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg p-1 text-textMuted transition-all duration-300 hover:bg-red-500/10 hover:text-red-400 hover:shadow-[0_0_8px_rgba(239,68,68,0.2)] disabled:opacity-50"
                title="Delete entry"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editing banner — high-visibility indicator that the card is in edit mode */}
      {isEditing && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.08] px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-widest text-blue-400">
            Editing — confirm or cancel changes
          </span>
        </div>
      )}

      {/* Editable timestamp — only visible in edit mode */}
      {isEditing && (
        <div className="mb-3">
          <label className="block text-[10px] font-medium uppercase tracking-wider text-textMuted mb-1">
            Date &amp; Time
          </label>
          <input
            type="datetime-local"
            value={editLoggedAt}
            onChange={(e) => setEditLoggedAt(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-textPrimary focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
      )}

      {/* Edit error */}
      {isEditing && editError && (
        <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {editError}
        </div>
      )}

      {/* Field display / edit */}
      {isEditing ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {activeSchema.map((field) => (
            <EditFieldInput
              key={field.fieldId}
              field={field}
              value={editValues[field.fieldId] ?? ''}
              onChange={(val) =>
                setEditValues((prev) => ({ ...prev, [field.fieldId]: val }))
              }
            />
          ))}
        </dl>
      ) : filledFields.length === 0 ? (
        <p className="text-sm text-textMuted">No fields recorded</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {filledFields.map((field) => {
            const rawValue = log.fields[field.fieldId]
            // text/time/select fields or long string values span full width (P2-2.6 FIX)
            const isWide = field.type === 'text' || field.type === 'time' || field.type === 'select' ||
              (typeof rawValue === 'string' && isNaN(Number(rawValue)) && String(rawValue).length > 15)
            // Strip parenthetical unit suffixes from legacy labels like "Magnesium Citrate (g)" (EX3 cleanup)
            const displayLabel = field.label.replace(/\s*\([^)]+\)\s*$/, '').trim()
            return (
              <div key={field.fieldId} className={isWide ? 'col-span-2' : ''}>
                <dt className="font-ui-label text-textMuted/70" style={{ fontSize: '9px' }}>{displayLabel}</dt>
                <dd className="font-data-value mt-0.5 text-sm font-semibold text-textPrimary break-words">
                  {formatFieldValue(rawValue ?? null, field.unit, field.label, field.type)}
                </dd>
              </div>
            )
          })}
        </dl>
      )}
    </div>
  )
}

// --- Inline edit input sub-component ---

type EditFieldInputProps = {
  field: SchemaField
  value: string
  onChange: (value: string) => void
}

function EditFieldInput({ field, value, onChange }: EditFieldInputProps): React.ReactElement {
  const inputId = `edit-${field.fieldId}`
  const inputClasses =
    'w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-textPrimary focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20'
  // text/time/select fields span the full 2-column grid (P2-2.6 FIX)
  const isWide = field.type === 'text' || field.type === 'time' || field.type === 'select'

  return (
    <div className={isWide ? 'col-span-2' : ''}>
      <label htmlFor={inputId} className="block text-[10px] font-medium uppercase tracking-wider text-textMuted">
        {field.label}
        {field.unit && <span className="ml-1 normal-case text-textMuted/60">({field.unit})</span>}
      </label>

      {field.type === 'number' && (
        <input
          id={inputId}
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      )}

      {field.type === 'text' && (
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      )}

      {field.type === 'rating' && (
        <input
          id={inputId}
          type="number"
          min={RATING_MIN}
          max={RATING_MAX}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      )}

      {field.type === 'duration' && (
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 44:25 · 1:23:45 · 90m"
          className={inputClasses}
        />
      )}

      {field.type === 'time' && (
        <input
          id={inputId}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      )}
    </div>
  )
}