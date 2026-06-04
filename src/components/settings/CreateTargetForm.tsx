'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { addTargetAction } from '@/app/actions/targets'
import type { Tracker, SchemaField } from '@/types/tracker'

// Only fields that can have a numeric target
const TARGETABLE_TYPES = ['number', 'rating', 'duration']

// Sentinels stored in DB for non-tracker sources
const CORRELATIONS_ID = '__correlations__'
const COMBINED_ID     = '__combined__'

// Prefix for combined-type source values in the <select>
const CTYPE_PREFIX = '__ctype_'

const TYPE_COLORS: Record<string, string> = {
  nutrition: '#10b981',
  sleep:     '#3b82f6',
  workout:   '#f97316',
  mood:      '#a855f7',
  water:     '#06b6d4',
  custom:    '#6B7280',
}

type CorrelationOption = { id: string; name: string; unit: string | null }
type CombinedTypeOption = {
  trackerType: string
  typeColor: string
  trackerCount: number
  fields: { label: string; normalizedLabel: string }[]
}

type Props = {
  trackers: Tracker[]
  correlations?: CorrelationOption[]
}

export function CreateTargetForm({ trackers, correlations = [] }: Props): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedTrackerId, setSelectedTrackerId] = useState<string>('')
  const [selectedFieldId, setSelectedFieldId] = useState<string>('')
  const [selectedCombinedFieldNl, setSelectedCombinedFieldNl] = useState<string>('')
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  // Mirror user's drag order from the Trackers page
  const [sortedTrackers, setSortedTrackers] = useState<Tracker[]>(trackers)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('yaha_tracker_order')
      if (!saved) { setSortedTrackers(trackers); return }
      const order: string[] = JSON.parse(saved)
      setSortedTrackers([...trackers].sort((a, b) => {
        const ai = order.indexOf(a.id)
        const bi = order.indexOf(b.id)
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      }))
    } catch { setSortedTrackers(trackers) }
  }, [trackers])
  const [value, setValue] = useState<string>('')
  const [durationHours, setDurationHours] = useState<string>('')
  const [durationMinutes, setDurationMinutes] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // ── Source detection ────────────────────────────────────────────────────
  const isCorrelation  = correlations.some(c => c.id === selectedTrackerId)
  const isCombinedType = selectedTrackerId.startsWith(CTYPE_PREFIX)
  const combinedTypeName = isCombinedType ? selectedTrackerId.slice(CTYPE_PREFIX.length) : null

  const selectedTracker    = (!isCorrelation && !isCombinedType && selectedTrackerId)
    ? (sortedTrackers.find(t => t.id === selectedTrackerId) ?? null) : null
  const selectedCorrelation = isCorrelation
    ? (correlations.find(c => c.id === selectedTrackerId) ?? null) : null

  // ── Combined-type options (one per tracker type with 2+ trackers sharing targetable fields) ──
  const combinedTypeOptions: CombinedTypeOption[] = (() => {
    const byType = new Map<string, Tracker[]>()
    for (const t of sortedTrackers) {
      const arr = byType.get(t.type) ?? []
      arr.push(t)
      byType.set(t.type, arr)
    }
    const result: CombinedTypeOption[] = []
    for (const [type, group] of byType) {
      if (group.length < 2) continue
      const labelCounts = new Map<string, { originalLabel: string; count: number }>()
      for (const tracker of group) {
        for (const field of tracker.schema) {
          if (!TARGETABLE_TYPES.includes(field.type)) continue
          const nl = field.label.toLowerCase().trim()
          const existing = labelCounts.get(nl)
          if (existing) existing.count++
          else labelCounts.set(nl, { originalLabel: field.label, count: 1 })
        }
      }
      const sharedFields = [...labelCounts.entries()]
        .filter(([, { count }]) => count >= 2)
        .map(([nl, { originalLabel }]) => ({ label: originalLabel, normalizedLabel: nl }))
      if (sharedFields.length > 0) {
        result.push({ trackerType: type, typeColor: TYPE_COLORS[type] ?? '#6B7280', trackerCount: group.length, fields: sharedFields })
      }
    }
    return result
  })()

  const combinedFieldsForType = isCombinedType
    ? (combinedTypeOptions.find(o => o.trackerType === combinedTypeName)?.fields ?? [])
    : []

  // ── Resolved field (drives direction + value UI) ─────────────────────────
  const selectedField: SchemaField | null = (() => {
    if (isCorrelation && selectedCorrelation) {
      return { fieldId: selectedCorrelation.id, label: selectedCorrelation.name, type: 'number', unit: selectedCorrelation.unit ?? undefined }
    }
    if (isCombinedType && selectedCombinedFieldNl) {
      const f = combinedFieldsForType.find(x => x.normalizedLabel === selectedCombinedFieldNl)
      if (!f) return null
      return { fieldId: `combined:${combinedTypeName}:${selectedCombinedFieldNl}`, label: f.label, type: 'number', unit: undefined }
    }
    if (selectedTracker && selectedFieldId) {
      return selectedTracker.schema.find(f => f.fieldId === selectedFieldId) ?? null
    }
    return null
  })()

  const isDuration = selectedField?.type === 'duration'

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleTrackerChange(id: string): void {
    setSelectedTrackerId(id)
    setSelectedFieldId('')
    setSelectedCombinedFieldNl('')
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

  function handleCombinedFieldChange(nl: string): void {
    setSelectedCombinedFieldNl(nl)
    setDirection('above')
    setValue('')
    setDurationHours('')
    setDurationMinutes('')
    setError(null)
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!selectedField) { setError('Select a source and field'); return }

    let numVal: number
    if (isDuration) {
      const h = parseInt(durationHours || '0', 10)
      const m = parseInt(durationMinutes || '0', 10)
      if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0 || m > 59) {
        setError('Enter a valid time (hours 0–99, minutes 0–59)'); return
      }
      numVal = h * 3600 + m * 60
      if (numVal <= 0) { setError('Target must be greater than zero'); return }
    } else {
      numVal = parseFloat(value)
      if (!Number.isFinite(numVal) || numVal <= 0) { setError('Enter a positive target value'); return }
    }

    setError(null)

    const trackerId   = isCorrelation ? CORRELATIONS_ID
                      : isCombinedType ? COMBINED_ID
                      : selectedTrackerId
    const trackerName = isCorrelation ? 'Correlations'
                      : isCombinedType ? `${combinedTypeName} (Combined)`
                      : (selectedTracker?.name ?? '')

    startTransition(async () => {
      const result = await addTargetAction({
        trackerId,
        trackerName,
        fieldId:    selectedField.fieldId,
        fieldLabel: selectedField.label,
        fieldType:  selectedField.type,
        unit:       selectedField.unit,
        value:      numVal,
        direction,
      })
      if (result.error) setError(result.error)
      else router.push('/settings/targets')
    })
  }

  const hasValue = isDuration
    ? (durationHours !== '' || durationMinutes !== '')
    : value !== ''

  const trackersWithTargetableFields = sortedTrackers.filter(t =>
    t.schema.some(f => TARGETABLE_TYPES.includes(f.type))
  )

  const selectClass = "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-textPrimary focus:border-[rgba(0,212,255,0.35)] focus:outline-none transition-all duration-200 appearance-none cursor-pointer"
  const inputClass  = "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-textPrimary placeholder:text-textMuted/20 focus:border-[rgba(0,212,255,0.35)] focus:outline-none transition-all duration-200"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step 1 — Pick source */}
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

          {/* Individual trackers */}
          {trackersWithTargetableFields.length > 0 && (
            <optgroup label="Trackers">
              {trackersWithTargetableFields.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </optgroup>
          )}

          {/* Each correlation as its own direct option */}
          {correlations.length > 0 && (
            <optgroup label="Correlations">
              {correlations.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.unit ? ` (${c.unit})` : ''}</option>
              ))}
            </optgroup>
          )}

          {/* Combined Fields — one option per tracker type */}
          {combinedTypeOptions.length > 0 && (
            <optgroup label="Combined Fields">
              {combinedTypeOptions.map(opt => (
                <option key={opt.trackerType} value={`${CTYPE_PREFIX}${opt.trackerType}`}>
                  {opt.trackerType.charAt(0).toUpperCase() + opt.trackerType.slice(1)} — {opt.trackerCount} trackers
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {trackersWithTargetableFields.length === 0 && correlations.length === 0 && combinedTypeOptions.length === 0 && (
          <p className="font-ui text-textMuted/40" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>
            No trackers with numeric fields found. Create a tracker with number, rating, or duration fields first.
          </p>
        )}
      </div>

      {/* Step 2a — Tracker field picker */}
      {selectedTracker && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <label className="block font-ui text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.16em' }}>
            FIELD
          </label>
          {selectedTracker.schema.filter(f => TARGETABLE_TYPES.includes(f.type)).length === 0 ? (
            <p className="font-ui text-textMuted/40 px-1" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>
              This tracker has no numeric fields.
            </p>
          ) : (
            <select
              value={selectedFieldId}
              onChange={e => handleFieldChange(e.target.value)}
              className={selectClass}
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <option value="">Select a field…</option>
              {selectedTracker.schema
                .filter(f => TARGETABLE_TYPES.includes(f.type))
                .map(f => (
                  <option key={f.fieldId} value={f.fieldId}>
                    {f.label}{f.unit ? ` (${f.unit})` : ''} — {f.type}
                  </option>
                ))}
            </select>
          )}
        </div>
      )}

      {/* Step 2b — Combined field picker */}
      {isCombinedType && combinedFieldsForType.length > 0 && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <label className="block font-ui text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.16em' }}>
            COMBINED FIELD
          </label>
          <select
            value={selectedCombinedFieldNl}
            onChange={e => handleCombinedFieldChange(e.target.value)}
            className={selectClass}
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <option value="">Select a field…</option>
            {combinedFieldsForType.map(f => (
              <option key={f.normalizedLabel} value={f.normalizedLabel}>{f.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Step 3 — Direction */}
      {selectedField && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <label className="block font-ui text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.16em' }}>
            DIRECTION
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'above', label: '↑ At least',     desc: 'Higher is better' },
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
                  fontSize: '11px', letterSpacing: '0.08em',
                  color: direction === key ? '#00d4ff' : 'rgba(245,245,245,0.7)',
                }}>{label}</span>
                <span className="font-ui" style={{ fontSize: '9px', color: 'rgba(148,163,184,0.4)' }}>{desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4 — Set value */}
      {selectedField && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <label className="block font-ui text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.16em' }}>
            {direction === 'below' ? 'NO MORE THAN' : 'AT LEAST'}
            {isDuration ? ' (HH : MM)' : selectedField.unit ? ` (${selectedField.unit})` : ''}
          </label>

          {isDuration ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input type="number" value={durationHours} onChange={e => setDurationHours(e.target.value)}
                  placeholder="0" min={0} max={99} className={inputClass + ' text-center pr-10'} autoFocus />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-ui text-textMuted/40 pointer-events-none" style={{ fontSize: '10px', letterSpacing: '0.10em' }}>HRS</span>
              </div>
              <span className="font-ui text-textMuted/40 text-lg shrink-0">:</span>
              <div className="flex-1 relative">
                <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)}
                  placeholder="00" min={0} max={59} className={inputClass + ' text-center pr-10'} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-ui text-textMuted/40 pointer-events-none" style={{ fontSize: '10px', letterSpacing: '0.10em' }}>MIN</span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                type="number" value={value} onChange={e => setValue(e.target.value)}
                placeholder={selectedField.type === 'rating' ? '1–10' : '0'}
                min={0} max={selectedField.type === 'rating' ? 10 : undefined} step="any"
                className={inputClass} autoFocus
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
          fontSize: '11px', letterSpacing: '0.14em',
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
