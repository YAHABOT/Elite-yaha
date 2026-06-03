'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { addTargetAction } from '@/app/actions/targets'
import type { Tracker, SchemaField } from '@/types/tracker'

// Only fields that can have a numeric target
const TARGETABLE_TYPES = ['number', 'rating', 'duration']

// Sentinel ID used when the user picks "Correlations" as the source
const CORRELATIONS_ID = '__correlations__'

type CorrelationOption = { id: string; name: string; unit: string | null }

type Props = {
  trackers: Tracker[]
  correlations?: CorrelationOption[]
}

export function CreateTargetForm({ trackers, correlations = [] }: Props): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedTrackerId, setSelectedTrackerId] = useState<string>('')
  const [selectedFieldId, setSelectedFieldId] = useState<string>('')
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [value, setValue] = useState<string>('')
  const [durationHours, setDurationHours] = useState<string>('')
  const [durationMinutes, setDurationMinutes] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const isCorrelations = selectedTrackerId === CORRELATIONS_ID
  const selectedTracker = isCorrelations ? null : (trackers.find(t => t.id === selectedTrackerId) ?? null)

  // Fields available for the selected source
  const targetableFields: SchemaField[] = isCorrelations
    ? correlations.map(c => ({
        fieldId: c.id,
        label: c.name,
        type: 'number' as const,
        unit: c.unit ?? undefined,
      }))
    : (selectedTracker?.schema.filter(f => TARGETABLE_TYPES.includes(f.type)) ?? [])

  const selectedField = targetableFields.find(f => f.fieldId === selectedFieldId) ?? null
  const isDuration = selectedField?.type === 'duration'

  function handleTrackerChange(id: string): void {
    setSelectedTrackerId(id)
    setSelectedFieldId('')
    setValue('')
    setDurationHours('')
    setDurationMinutes('')
    setError(null)
  }

  function handleFieldChange(id: string): void {
    setSelectedFieldId(id)
    setDirection('above')
    setValue('')
    setDurationHours('')
    setDurationMinutes('')
    setError(null)
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!selectedField) {
      setError('Select a source and field')
      return
    }

    let numVal: number

    if (isDuration) {
      const h = parseInt(durationHours || '0', 10)
      const m = parseInt(durationMinutes || '0', 10)
      if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0 || m > 59) {
        setError('Enter a valid time (hours 0–99, minutes 0–59)')
        return
      }
      numVal = h * 3600 + m * 60
      if (numVal <= 0) {
        setError('Target must be greater than zero')
        return
      }
    } else {
      numVal = parseFloat(value)
      if (!Number.isFinite(numVal) || numVal <= 0) {
        setError('Enter a positive target value')
        return
      }
    }

    setError(null)

    // Derive tracker name for display
    const trackerName = isCorrelations ? 'Correlations' : (selectedTracker?.name ?? '')

    startTransition(async () => {
      const result = await addTargetAction({
        trackerId: isCorrelations ? CORRELATIONS_ID : selectedTrackerId,
        trackerName,
        fieldId: selectedField.fieldId,
        fieldLabel: selectedField.label,
        fieldType: selectedField.type,
        unit: selectedField.unit,
        value: numVal,
        direction,
      })
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/settings/targets')
      }
    })
  }

  const hasValue = isDuration
    ? (durationHours !== '' || durationMinutes !== '')
    : value !== ''

  const trackersWithTargetableFields = trackers.filter(t =>
    t.schema.some(f => TARGETABLE_TYPES.includes(f.type))
  )

  const selectClass = "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-textPrimary focus:border-[rgba(0,212,255,0.35)] focus:outline-none transition-all duration-200 appearance-none cursor-pointer"
  const inputClass = "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-textPrimary placeholder:text-textMuted/20 focus:border-[rgba(0,212,255,0.35)] focus:outline-none transition-all duration-200"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step 1 — Pick tracker or correlations */}
      <div className="space-y-2">
        <label className="block font-ui text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.16em' }}>
          SOURCE
        </label>
        <select
          value={selectedTrackerId}
          onChange={e => handleTrackerChange(e.target.value)}
          className={selectClass}
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <option value="">Select a source…</option>

          {/* Regular trackers */}
          {trackersWithTargetableFields.length > 0 && (
            <optgroup label="Trackers">
              {trackersWithTargetableFields.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </optgroup>
          )}

          {/* Correlations — only shown if any exist */}
          {correlations.length > 0 && (
            <optgroup label="Formulas">
              <option value={CORRELATIONS_ID}>Correlations</option>
            </optgroup>
          )}
        </select>

        {trackersWithTargetableFields.length === 0 && correlations.length === 0 && (
          <p className="font-ui text-textMuted/40" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>
            No trackers with numeric fields found. Create a tracker with number, rating, or duration fields first.
          </p>
        )}
      </div>

      {/* Step 2 — Pick field */}
      {selectedTrackerId && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <label className="block font-ui text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.16em' }}>
            {isCorrelations ? 'CORRELATION' : 'FIELD'}
          </label>
          {targetableFields.length === 0 ? (
            <p className="font-ui text-textMuted/40 px-1" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>
              {isCorrelations ? 'No correlations found.' : 'This tracker has no numeric fields.'}
            </p>
          ) : (
            <select
              value={selectedFieldId}
              onChange={e => handleFieldChange(e.target.value)}
              className={selectClass}
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <option value="">Select {isCorrelations ? 'a correlation' : 'a field'}…</option>
              {targetableFields.map(f => (
                <option key={f.fieldId} value={f.fieldId}>
                  {f.label}{f.unit ? ` (${f.unit})` : ''}
                  {!isCorrelations ? ` — ${f.type}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Step 2b — Direction */}
      {selectedField && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <label className="block font-ui text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.16em' }}>
            DIRECTION
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'above', label: '↑ At least',    desc: 'Higher is better' },
              { key: 'below', label: '↓ No more than', desc: 'Lower is better' },
            ] as { key: 'above' | 'below'; label: string; desc: string }[]).map(({ key, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => setDirection(key)}
                className={`flex flex-col gap-0.5 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                  direction === key
                    ? 'border-[rgba(0,212,255,0.40)] bg-[rgba(0,212,255,0.08)]'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <span className="font-ui font-black" style={{
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  color: direction === key ? '#00d4ff' : 'rgba(245,245,245,0.7)',
                }}>
                  {label}
                </span>
                <span className="font-ui" style={{ fontSize: '9px', color: 'rgba(148,163,184,0.4)' }}>
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Set value */}
      {selectedField && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <label className="block font-ui text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.16em' }}>
            {direction === 'below' ? 'NO MORE THAN' : 'AT LEAST'}{isDuration ? ' (HH : MM)' : selectedField.unit ? ` (${selectedField.unit})` : ''}
          </label>

          {isDuration ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={durationHours}
                  onChange={e => setDurationHours(e.target.value)}
                  placeholder="0"
                  min={0}
                  max={99}
                  className={inputClass + ' text-center pr-10'}
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-ui text-textMuted/40 pointer-events-none" style={{ fontSize: '10px', letterSpacing: '0.10em' }}>
                  HRS
                </span>
              </div>
              <span className="font-ui text-textMuted/40 text-lg shrink-0">:</span>
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(e.target.value)}
                  placeholder="00"
                  min={0}
                  max={59}
                  className={inputClass + ' text-center pr-10'}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-ui text-textMuted/40 pointer-events-none" style={{ fontSize: '10px', letterSpacing: '0.10em' }}>
                  MIN
                </span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={selectedField.type === 'rating' ? '1–10' : '0'}
                min={0}
                max={selectedField.type === 'rating' ? 10 : undefined}
                step="any"
                className={inputClass}
                autoFocus
              />
              {selectedField.unit && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-ui text-textMuted/40 pointer-events-none" style={{ fontSize: '10px', letterSpacing: '0.10em' }}>
                  {selectedField.unit}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || !selectedField || !hasValue}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-ui transition-all duration-300 disabled:opacity-30"
        style={{
          fontSize: '11px',
          letterSpacing: '0.14em',
          background: 'linear-gradient(135deg, rgba(0,212,255,0.20), rgba(0,212,255,0.10))',
          border: '1px solid rgba(0,212,255,0.35)',
          color: '#00d4ff',
        }}
      >
        <Check className="h-4 w-4" />
        {isPending ? 'Saving…' : 'Save Target'}
      </button>
    </form>
  )
}
