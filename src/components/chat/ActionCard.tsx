'use client' // needed for confirm/discard state management and server action calls

import { useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import { confirmLogAction, updateLogAction } from '@/app/actions/chat'
import { recordEventAction } from '@/app/actions/analytics'
import type { ActionCard as ActionCardType, UpdateDataCard } from '@/types/action-card'

type ActionCardStatus = 'pending' | 'confirmed' | 'discarded' | 'loading'

function formatDuration(seconds: number): string {
  const total = Math.round(Math.abs(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function parseDuration(str: string): number | null {
  const parts = str.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60
  return null
}

type Props = {
  card: ActionCardType
  messageId?: string       // DB message ID — used to persist confirmed: true on the message's JSONB
  cardIndex?: number       // Position in message.actions array — used for exact JSONB match
  onConfirm?: () => void
  onDiscard?: () => void
  onConfirmed?: () => void  // fires after the card is confirmed — used by ChatInterface to advance routine
}

const TRACKER_TYPE_COLORS: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  nutrition: {
    border: 'border-l-nutrition',
    bg: 'bg-nutrition/[0.05]',
    text: 'text-nutrition',
    glow: 'shadow-[0_0_24px_rgba(16,185,129,0.12)]',
  },
  sleep: {
    border: 'border-l-sleep',
    bg: 'bg-sleep/[0.05]',
    text: 'text-sleep',
    glow: 'shadow-[0_0_24px_rgba(59,130,246,0.12)]',
  },
  workout: {
    border: 'border-l-workout',
    bg: 'bg-workout/[0.05]',
    text: 'text-workout',
    glow: 'shadow-[0_0_24px_rgba(249,115,22,0.12)]',
  },
  mood: {
    border: 'border-l-mood',
    bg: 'bg-mood/[0.05]',
    text: 'text-mood',
    glow: 'shadow-[0_0_24px_rgba(168,85,247,0.12)]',
  },
  water: {
    border: 'border-l-water',
    bg: 'bg-water/[0.05]',
    text: 'text-water',
    glow: 'shadow-[0_0_24px_rgba(6,182,212,0.12)]',
  },
}

const DEFAULT_TYPE_COLORS = {
  border: 'border-l-white/10',
  bg: 'bg-white/[0.02]',
  text: 'text-muted-foreground',
  glow: 'shadow-[0_4px_24px_rgba(0,0,0,0.4)]',
}

function getTypeColors(trackerType?: string) {
  if (!trackerType) return DEFAULT_TYPE_COLORS
  return TRACKER_TYPE_COLORS[trackerType.toLowerCase()] ?? DEFAULT_TYPE_COLORS
}

export function ActionCard({ card, messageId, cardIndex, onConfirm, onDiscard, onConfirmed }: Props): React.ReactElement {
  // Initialize as confirmed if the DB already has confirmed: true — survives page refresh
  const [status, setStatus] = useState<ActionCardStatus>(card.confirmed ? 'confirmed' : 'pending')
  const [isEditExpanded, setIsEditExpanded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Auto-clear error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  const [editableFields, setEditableFields] = useState<Record<string, string | number | null>>(() => {
    // Include ALL fields from schema (fieldLabels), not just logged ones
    // Unlogged fields initialize as empty strings
    const allSchemaKeys = card.fieldLabels ? Object.keys(card.fieldLabels) : Object.keys(card.fields)

    return Object.fromEntries(
      allSchemaKeys.map((key) => {
        // Get the logged value if it exists, otherwise undefined (will be empty string)
        const value = card.fields?.[key]

        if (value === null || value === undefined || value === '') return [key, '']
        // Multi-select array: join as comma-separated string for editing
        if (Array.isArray(value)) return [key, value.join(', ')]
        // Duration fields: convert raw seconds → H:MM:SS for the input
        if (card.fieldDefinitions?.[key]?.type === 'duration') {
          const numVal = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN
          if (!isNaN(numVal)) return [key, formatDuration(numVal)]
        }
        // All other fields: raw value only — unit pill handles the suffix display
        return [key, value]
      })
    )
  })

  const typeColors = getTypeColors(card.trackerName)

  async function handleConfirm(): Promise<void> {
    setStatus('loading')
    setErrorMessage(null)

    console.log('[ActionCard] handleConfirm — messageId:', messageId, 'cardIndex:', cardIndex)

    // Convert H:MM:SS edit strings back to seconds for duration fields
    const fieldsToConfirm = Object.fromEntries(
      Object.entries(editableFields).map(([key, val]) => {
        if (card.fieldDefinitions?.[key]?.type === 'duration' && typeof val === 'string' && val.includes(':')) {
          const secs = parseDuration(val)
          return [key, secs ?? val]  // fallback to original string if parse fails
        }
        return [key, val]
      })
    )

    // Strip fields with no value — only persist what the user actually provided
    const confirmedFields = Object.fromEntries(
      Object.entries(fieldsToConfirm).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    )

    const result = await confirmLogAction({
      ...card,
      fields: confirmedFields
    }, messageId, cardIndex)

    if (result.error) {
      setErrorMessage(result.error)
      setStatus('pending')
      return
    }

    setStatus('confirmed')

    // Signal to FeedbackModal that a log was just confirmed — may trigger the feedback popup
    window.dispatchEvent(new CustomEvent('yaha:log-confirmed'))

    // Fire analytics event (fire-and-forget, never awaited on the critical path)
    // AI accuracy: only count it as wrong when the user changes a value the AI actually filled in.
    // Filling in a field the AI left blank does NOT count against accuracy.
    const allFieldKeys = Object.keys(card.fieldLabels ?? card.fields ?? {})

    // Fields the AI actually provided a value for (non-empty in card.fields)
    const aiFilledKeys = allFieldKeys.filter(key => {
      const v = card.fields?.[key]
      return v !== null && v !== undefined && String(v).trim() !== ''
    })

    // Of AI-filled fields, which did the user change?
    const aiChangedKeys = aiFilledKeys.filter(key => {
      const isDuration = card.fieldDefinitions?.[key]?.type === 'duration'
      const original = card.fields?.[key]
      const edited = editableFields[key]
      if (isDuration && typeof original === 'number' && typeof edited === 'string') {
        const editedSecs = parseDuration(edited)
        return editedSecs !== null && editedSecs !== Math.round(original)
      }
      return String(original ?? '') !== String(edited ?? '')
    })

    // Fields AI left blank that the user filled in (user contribution, not AI error)
    const userAddedKeys = allFieldKeys.filter(key => {
      const original = card.fields?.[key]
      const wasBlank = original === null || original === undefined || String(original).trim() === ''
      return wasBlank && String(editableFields[key] ?? '').trim() !== ''
    })

    // Resolve human-readable labels for field keys (e.g. "fld_001" → "Calories")
    const labelFor = (key: string) => card.fieldLabels?.[key] ?? key

    // For each AI-changed field, capture before (AI value) and after (user correction)
    // Used in admin analytics to surface "AI usually overestimates Calories by ~200"
    const fieldEditNames   = aiChangedKeys.map(labelFor)
    const fieldEditsBefore = aiChangedKeys.map(key => String(card.fields?.[key] ?? ''))
    const fieldEditsAfter  = aiChangedKeys.map(key => String(editableFields[key] ?? ''))

    void recordEventAction('action_card_confirmed', {
      tracker_id: card.trackerId ?? null,
      tracker_name: card.trackerName ?? null,
      was_edited: aiChangedKeys.length > 0,            // true only if AI's value was corrected
      ai_fields_changed: aiChangedKeys.length,          // how many AI values the user overrode
      ai_fields_changed_names: fieldEditNames,          // which fields (for per-field accuracy)
      field_edits_before: fieldEditsBefore,             // AI's original values (parallel to names)
      field_edits_after: fieldEditsAfter,               // user's corrected values (parallel to names)
      ai_fields_total: aiFilledKeys.length,             // how many fields AI actually filled
      ai_fields_total_names: aiFilledKeys.map(labelFor),    // which fields AI filled
      user_fields_added: userAddedKeys.length,          // how many blanks the user completed
      user_fields_added_names: userAddedKeys.map(labelFor), // which fields — detects AI miss patterns
    })

    onConfirm?.()
    onConfirmed?.()
  }

  function handleDiscard(): void {
    setStatus('discarded')

    // Fire analytics event (fire-and-forget)
    void recordEventAction('action_card_dismissed', {
      tracker_id: card.trackerId ?? null,
      tracker_name: card.trackerName ?? null,
    })

    onDiscard?.()
  }

  const handleFieldChange = (key: string, value: string) => {
    setEditableFields(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (status === 'confirmed') {
    return (
      <div
        className="animate-in fade-in zoom-in-95 duration-500 rounded-2xl bg-nutrition/[0.06] border border-nutrition/25 p-5 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
        data-testid="action-card-confirmed"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-nutrition/20 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-nutrition"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <div>
            <p className="text-sm font-black text-nutrition">Logged Successfully</p>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{card.trackerName}</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'discarded') {
    return (
      <div
        className="animate-out fade-out zoom-out-95 duration-500 rounded-2xl bg-white/[0.02] border border-white/5 p-5"
        data-testid="action-card-discarded"
      >
        <p className="text-sm font-medium text-muted-foreground/50">Log discarded</p>
      </div>
    )
  }

  // fieldOrder is an explicit array — survives JSONB round-trip without alphabetical reordering.
  // Fall back: fieldLabels keys (may be alphabetical after JSONB), then raw editableFields order.
  const orderedKeys = card.fieldOrder
    ?? (card.fieldLabels ? Object.keys(card.fieldLabels) : Object.keys(editableFields))
  const fieldEntries = orderedKeys.map((key) => [key, editableFields[key]] as [string, string | number | null])

  return (
    <div
      className={`animate-in slide-in-from-bottom-4 duration-500 relative flex flex-col gap-4 rounded-3xl border-l-4 border border-white/[0.06] p-6 backdrop-blur-md transition-all overflow-visible ${typeColors.border} ${typeColors.bg} ${typeColors.glow}`}
      data-testid="action-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`h-2 w-2 rounded-full ${typeColors.text.replace('text-', 'bg-')} opacity-80`} />
          <h3 className="text-base font-black tracking-tight text-foreground">
            {card.trackerName}
          </h3>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${typeColors.text} border-current/20 bg-current/5`}>
            {isEditExpanded ? 'Editing' : 'Pending Log'}
          </span>
          <button
            type="button"
            onClick={() => setIsEditExpanded(!isEditExpanded)}
            className="rounded-lg p-1 text-muted-foreground/60 transition-all hover:bg-white/[0.08] hover:text-muted-foreground"
            aria-label="Edit entry"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Fields Grid */}
      <div className={`grid gap-2.5 transition-all duration-200 w-full overflow-visible ${isEditExpanded ? 'rounded-2xl ring-1 ring-blue-500/30 p-1' : ''}`} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 100px), 1fr))' }}>
        {fieldEntries.map(([key, value]) => {
          // Text fields and descriptions should take full width to avoid awkward wrapping
          const fieldLabel = card.fieldLabels?.[key] || key
          const isTextField = fieldLabel.toLowerCase().includes('name') ||
                              fieldLabel.toLowerCase().includes('item') ||
                              fieldLabel.toLowerCase().includes('notes') ||
                              fieldLabel.toLowerCase().includes('description')
          const isStringValue = typeof value === 'string' && value !== '' && isNaN(Number(value)) && !String(value).match(/^\d{2}:\d{2}$/)
          const isLarge = isTextField || isStringValue || String(value || '').length > 15 || (fieldLabel.length ?? 0) > 16
          const label = fieldLabel
          const unit = card.fieldUnits?.[key]

          return (
            <div
              key={key}
              className={`flex flex-col gap-1.5 rounded-2xl bg-white/[0.03] p-3.5 border transition-all duration-200 overflow-visible ${isEditExpanded ? 'border-blue-500/20 bg-blue-500/[0.03]' : 'border-white/[0.05]'} focus-within:border-blue-500/40 focus-within:bg-white/[0.05] ${isLarge ? 'col-span-full' : ''}`}
            >
              <div className="flex flex-wrap items-start gap-1 min-w-0">
                <span className="min-w-0 flex-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  {label}
                </span>
              </div>

              {isEditExpanded ? (
                card.fieldDefinitions?.[key]?.type === 'select' ? (
                  <select
                    value={value ?? ''}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent text-sm font-bold text-foreground w-full min-w-0 placeholder:text-muted-foreground/20 leading-snug focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded border border-white/10 cursor-pointer hover:border-white/20 transition-colors z-10 relative"
                  >
                    <option value="">Select option...</option>
                    {(card.fieldDefinitions?.[key]?.selectOptions ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={value ?? ''}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className="bg-transparent text-sm font-bold text-foreground w-full min-w-0 placeholder:text-muted-foreground/20 leading-snug focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded border border-white/10 focus:border-blue-500/40"
                    placeholder="..."
                  />
                )
              ) : (
                <p className="text-sm font-bold text-foreground w-full leading-snug break-words whitespace-pre-wrap flex items-baseline gap-1.5 flex-wrap">
                  {value !== null && value !== undefined && value !== ''
                    ? (() => {
                        const isDuration = card.fieldDefinitions?.[key]?.type === 'duration'
                        // editableFields converts duration raw-seconds → "H:MM:SS" string on init.
                        // parseFloat("9:59:00") = 9 (only leading digit) → formatDuration(9) = "0:00:09" ❌
                        // Fix: if it's already a H:MM:SS string, display it directly.
                        const displayValue = isDuration
                          ? (typeof value === 'string' && /^\d+:\d{2}/.test(value)
                              ? value
                              : (() => {
                                  const n = typeof value === 'number' ? value : parseFloat(String(value))
                                  return isNaN(n) ? String(value) : formatDuration(n)
                                })())
                          : String(value)
                        return (
                          <>
                            <span>{displayValue}</span>
                            {unit && !isDuration && (
                              <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/40 select-none">
                                {unit}
                              </span>
                            )}
                          </>
                        )
                      })()
                    : <span className="text-muted-foreground/20">—</span>}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Date row */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-medium text-muted-foreground/50">
          {card.date}
        </span>
      </div>

      {/* Error */}
      {errorMessage && (
        <p className="rounded-2xl bg-red-500/[0.08] border border-red-500/20 p-3.5 text-xs font-medium text-red-400" data-testid="action-card-error">
          {errorMessage}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2.5">
        <button
          onClick={handleConfirm}
          disabled={status === 'loading'}
          className="flex-1 rounded-2xl bg-nutrition px-4 py-3 text-sm font-black text-black transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:scale-100"
          data-testid="action-card-confirm"
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-black/60 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-black/60 animate-bounce [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-black/60 animate-bounce [animation-delay:240ms]" />
            </span>
          ) : 'Log Entry'}
        </button>
        <button
          onClick={handleDiscard}
          disabled={status === 'loading'}
          className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 text-sm font-bold text-muted-foreground/60 transition-all duration-200 hover:bg-white/[0.07] hover:text-muted-foreground active:scale-[0.98] disabled:opacity-30"
          data-testid="action-card-discard"
        >
          Discard
        </button>
      </div>
    </div>
  )
}

type UpdateDataCardProps = {
  card: UpdateDataCard
  messageId?: string
  cardIndex?: number
  onConfirm?: () => void
  onDiscard?: () => void
}

export function UpdateDataCardComponent({ card, messageId, cardIndex, onConfirm, onDiscard }: UpdateDataCardProps): React.ReactElement {
  const [status, setStatus] = useState<ActionCardStatus>(card.confirmed ? 'confirmed' : 'pending')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Auto-clear error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  const [editableFields, setEditableFields] = useState<Record<string, string | number | null>>(() =>
    Object.fromEntries(
      Object.entries(card.fields).map(([key, val]) => {
        if (val === null || val === undefined) return [key, '']
        if (Array.isArray(val)) return [key, val.join(', ')]
        // Duration fields: convert raw seconds → H:MM:SS for the input
        if (card.fieldDefinitions?.[key]?.type === 'duration') {
          const numVal = typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val as string) : NaN
          if (!isNaN(numVal)) return [key, formatDuration(numVal)]
        }
        return [key, val]
      })
    )
  )

  const typeColors = getTypeColors(card.trackerName)

  async function handleConfirm(): Promise<void> {
    setStatus('loading')
    setErrorMessage(null)
    // Convert H:MM:SS strings back to seconds for duration fields (mirrors LOG_DATA confirm)
    const fieldsToConfirm = Object.fromEntries(
      Object.entries(editableFields).map(([key, val]) => {
        if (card.fieldDefinitions?.[key]?.type === 'duration' && typeof val === 'string' && val.includes(':')) {
          const secs = parseDuration(val)
          return [key, secs ?? val]
        }
        return [key, val]
      })
    )
    const confirmedFields = Object.fromEntries(
      Object.entries(fieldsToConfirm).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    )
    const result = await updateLogAction({ ...card, fields: confirmedFields }, messageId, cardIndex)
    if (result.error) {
      setErrorMessage(result.error)
      setStatus('pending')
      return
    }
    setStatus('confirmed')
    onConfirm?.()
  }

  function handleDiscard(): void {
    setStatus('discarded')
    onDiscard?.()
  }

  if (status === 'confirmed') {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 rounded-2xl bg-sleep/[0.06] border border-sleep/25 p-5 shadow-[0_0_20px_rgba(59,130,246,0.1)]" data-testid="update-card-confirmed">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sleep/20 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-sleep"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <div>
            <p className="text-sm font-black text-sleep">Updated Successfully</p>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{card.trackerName}</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'discarded') {
    return (
      <div className="animate-out fade-out zoom-out-95 duration-500 rounded-2xl bg-white/[0.02] border border-white/5 p-5">
        <p className="text-sm font-medium text-muted-foreground/50">Update discarded</p>
      </div>
    )
  }

  const orderedKeys = card.fieldOrder ?? (card.fieldLabels ? Object.keys(card.fieldLabels) : Object.keys(editableFields))
  const fieldEntries = orderedKeys.map((key) => [key, editableFields[key]] as [string, string | number | null])

  return (
    <div
      className={`animate-in slide-in-from-bottom-4 duration-500 relative flex flex-col gap-4 rounded-3xl border-l-4 border border-white/[0.06] p-6 backdrop-blur-md transition-all overflow-visible ${typeColors.border} ${typeColors.bg} ${typeColors.glow}`}
      data-testid="update-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`h-2 w-2 rounded-full ${typeColors.text.replace('text-', 'bg-')} opacity-80`} />
          <h3 className="text-base font-black tracking-tight text-foreground">{card.trackerName}</h3>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${typeColors.text} border-current/20 bg-current/5`}>
          Pending Update
        </span>
      </div>

      <div className="grid gap-2.5 w-full overflow-visible" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))' }}>
        {fieldEntries.map(([key, value]) => {
          const fieldLabel = card.fieldLabels?.[key] || key
          const unit = card.fieldUnits?.[key]
          const isStringValue = typeof value === 'string' && value !== '' && isNaN(Number(value)) && !String(value).match(/^\d{2}:\d{2}$/)
          const isLarge = isStringValue || String(value || '').length > 15 || (fieldLabel.length ?? 0) > 16
          return (
            <div key={key} className={`flex flex-col gap-1.5 rounded-2xl bg-white/[0.03] p-3.5 border border-white/[0.05] overflow-visible ${isLarge ? 'col-span-full' : ''}`}>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{fieldLabel}</span>
              <input
                type="text"
                value={value ?? ''}
                onChange={(e) => setEditableFields(prev => ({ ...prev, [key]: e.target.value }))}
                className="bg-transparent text-sm font-bold text-foreground w-full min-w-0 placeholder:text-muted-foreground/20 leading-snug focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded border border-white/10 focus:border-blue-500/40"
                placeholder="..."
              />
              {unit && <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/40">{unit}</span>}
            </div>
          )
        })}
      </div>

      {errorMessage && (
        <p className="rounded-2xl bg-red-500/[0.08] border border-red-500/20 p-3.5 text-xs font-medium text-red-400">{errorMessage}</p>
      )}

      <div className="flex gap-2.5">
        <button
          onClick={handleConfirm}
          disabled={status === 'loading'}
          className="flex-1 rounded-2xl bg-sleep px-4 py-3 text-sm font-black text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:scale-100"
          data-testid="update-card-confirm"
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:240ms]" />
            </span>
          ) : 'Update Entry'}
        </button>
        <button
          onClick={handleDiscard}
          disabled={status === 'loading'}
          className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 text-sm font-bold text-muted-foreground/60 transition-all duration-200 hover:bg-white/[0.07] hover:text-muted-foreground active:scale-[0.98] disabled:opacity-30"
          data-testid="update-card-discard"
        >
          Discard
        </button>
      </div>
    </div>
  )
}
