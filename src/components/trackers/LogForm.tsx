'use client' // Needed: manages form field state, handles submit, datetime picker

import { useState } from 'react'
import { createLogAction } from '@/app/actions/logs'
import type { Tracker } from '@/types/tracker'
import type { SchemaField } from '@/types/tracker'
import type { LogFields } from '@/types/log'
import Link from 'next/link'

type Props = {
  tracker: Tracker
}

const RATING_MIN = 1
const RATING_MAX = 10
const DEFAULT_RATING = 5

function buildInitialValues(schema: SchemaField[]): Record<string, string> {
  const values: Record<string, string> = {}
  for (const field of schema) {
    if (field.type === 'rating') {
      values[field.fieldId] = String(DEFAULT_RATING)
    } else {
      values[field.fieldId] = ''
    }
  }
  return values
}

// Parse a duration string to total seconds. Accepts HH:MM:SS, MM:SS, or written ("44m 25s").
// Returns null if the input cannot be parsed or exceeds 24 hours.
function parseDurationInput(raw: string): number | null {
  const s = raw.trim()
  if (s === '') return null

  // HH:MM:SS (3 parts) — always unambiguous
  const hmsMatch = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
  if (hmsMatch) {
    const total = parseInt(hmsMatch[1]) * 3600 + parseInt(hmsMatch[2]) * 60 + parseInt(hmsMatch[3])
    return total <= 86400 ? total : null
  }

  // MM:SS or HH:MM (2 parts) — treat as MM:SS (most natural for workout durations; user types HH:MM:SS for hours)
  const msMatch = s.match(/^(\d{1,3}):(\d{2})$/)
  if (msMatch) {
    const total = parseInt(msMatch[1]) * 60 + parseInt(msMatch[2])
    return total <= 86400 ? total : null
  }

  // Written: "1h 23m", "44m 25s", "2h 30m 15s", "90m", "45 min"
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

  // Plain number — treat as seconds
  const n = parseFloat(s)
  if (!isNaN(n)) return Math.round(n) <= 86400 ? Math.round(n) : null

  return null
}

function parseFieldValues(
  schema: SchemaField[],
  rawValues: Record<string, string>
): LogFields {
  const fields: LogFields = {}
  for (const field of schema) {
    const raw = rawValues[field.fieldId]
    if (raw === '' || raw === undefined) {
      fields[field.fieldId] = null
      continue
    }
    if (field.type === 'number' || field.type === 'rating') {
      const parsed = Number(raw)
      fields[field.fieldId] = Number.isNaN(parsed) ? null : parsed
    } else if (field.type === 'duration') {
      fields[field.fieldId] = parseDurationInput(raw)
    } else {
      fields[field.fieldId] = raw
    }
  }
  return fields
}

function hasAnyValue(rawValues: Record<string, string>): boolean {
  return Object.values(rawValues).some((v) => v !== '')
}

export function LogForm({ tracker }: Props): React.ReactElement {
  const activeSchema = tracker.schema.filter((f) => !f.archived)
  const [values, setValues] = useState<Record<string, string>>(
    () => buildInitialValues(activeSchema)
  )
  const [loggedAt, setLoggedAt] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [success, setSuccess] = useState<boolean>(false)

  function handleFieldChange(fieldId: string, value: string): void {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSuccess(false)
    setSubmitting(true)

    if (!hasAnyValue(values)) {
      setError('Fill in at least one field.')
      setSubmitting(false)
      return
    }

    const fields = parseFieldValues(activeSchema, values)
    const result = await createLogAction(
      tracker.id,
      fields,
      loggedAt || undefined,
      'manual'
    )

    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    } else {
      setValues(buildInitialValues(activeSchema))
      setLoggedAt('')
      setSuccess(true)
      setSubmitting(false)
    }
  }

  if (activeSchema.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="mb-3 text-sm text-textMuted">
          Add fields to this tracker first.
        </p>
        <Link
          href={`/trackers/${tracker.id}/schema`}
          className="inline-block rounded-lg bg-surfaceHighlight px-4 py-2 text-sm font-medium text-textPrimary transition-colors hover:bg-black/[0.06]"
        >
          Edit Schema
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-nutrition/20 bg-nutrition/10 px-4 py-3 text-sm text-nutrition">
          Entry logged successfully.
        </div>
      )}

      {activeSchema.map((field) => (
        <FieldInput
          key={field.fieldId}
          field={field}
          value={values[field.fieldId] ?? ''}
          onChange={(val) => handleFieldChange(field.fieldId, val)}
        />
      ))}

      {/* Backdate (optional) */}
      <div>
        <label
          htmlFor="log-datetime"
          className="mb-1 block text-sm text-textMuted"
        >
          Date &amp; Time (optional — defaults to now)
        </label>
        <input
          id="log-datetime"
          type="datetime-local"
          value={loggedAt}
          onChange={(e) => setLoggedAt(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-textPrimary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {submitting ? 'Saving...' : 'Log Entry'}
      </button>
    </form>
  )
}

// --- Field input renderer ---

type FieldInputProps = {
  field: SchemaField
  value: string
  onChange: (value: string) => void
}

function FieldInput({ field, value, onChange }: FieldInputProps): React.ReactElement {
  const inputId = `field-${field.fieldId}`

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 flex items-baseline gap-1.5 text-sm text-textMuted">
        <span>{field.label}</span>
        {field.unit && (
          <span className="text-xs text-textMuted/60" data-testid={`unit-${field.fieldId}`}>
            ({field.unit})
          </span>
        )}
      </label>

      {field.type === 'number' && (
        <input
          id={inputId}
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-textPrimary placeholder-textMuted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}

      {field.type === 'text' && (
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-textPrimary placeholder-textMuted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}

      {field.type === 'rating' && (
        <div className="flex items-center gap-3">
          <input
            id={inputId}
            type="range"
            min={RATING_MIN}
            max={RATING_MAX}
            value={value || DEFAULT_RATING}
            onChange={(e) => onChange(e.target.value)}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-surfaceHighlight accent-nutrition"
          />
          <span className="w-8 text-center text-sm font-medium text-textPrimary" data-testid={`rating-value-${field.fieldId}`}>
            {value || DEFAULT_RATING}
          </span>
        </div>
      )}

      {field.type === 'duration' && (
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 44:25 · 1:23:45 · 90m · 2h 30m"
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-textPrimary placeholder-textMuted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}

      {field.type === 'time' && (
        <input
          id={inputId}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-textPrimary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}

      {field.type === 'select' && !field.multiSelect && (
        <select
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-textPrimary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Select...</option>
          {(field.selectOptions ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {field.type === 'select' && field.multiSelect && (
        <div className="flex flex-wrap gap-2 pt-1">
          {(field.selectOptions ?? []).map((opt) => {
            const selected = value.split(',').filter(Boolean).includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const current = value.split(',').filter(Boolean)
                  const next = selected
                    ? current.filter((v) => v !== opt)
                    : [...current, opt]
                  onChange(next.join(','))
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-nutrition text-white'
                    : 'bg-surfaceHighlight text-textMuted hover:text-textPrimary'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
