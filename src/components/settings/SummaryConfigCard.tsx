'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Sparkles, RefreshCw } from 'lucide-react'
import { saveSummaryConfigAction, regenerateSummaryAction } from '@/app/actions/summaries'
import { LinkedFieldsPicker } from './LinkedFieldsPicker'
import type { SummaryConfig, SummaryType, LinkedField } from '@/types/summary'
import type { Tracker } from '@/types/tracker'

type CorrelationOption = { id: string; name: string; unit?: string | null }

type Props = {
  type: SummaryType
  initial: SummaryConfig | null
  trackers: Tracker[]
  correlations: CorrelationOption[]
}

const TYPE_LABELS: Record<SummaryType, { title: string; trigger: string; coverage: string }> = {
  weekly: {
    title: 'Weekly Summary',
    trigger: 'Monday · 7:00 AM or after Sunday evening routine',
    coverage: 'Previous Mon – Sun (7 days)',
  },
  monthly: {
    title: 'Monthly Summary',
    trigger: '1st of month · 7:00 AM or after last evening routine',
    coverage: 'Previous full calendar month',
  },
}

export function SummaryConfigCard({ type, initial, trackers, correlations }: Props): React.ReactElement {
  const [isPending, startTransition] = useTransition()
  const [enabled, setEnabled] = useState(initial?.enabled ?? false)
  const [instructions, setInstructions] = useState(initial?.instructions ?? '')
  const [linkedFields, setLinkedFields] = useState<LinkedField[]>(initial?.linked_fields ?? [])
  const [showPicker, setShowPicker] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const meta = TYPE_LABELS[type]
  const MAX_INSTRUCTIONS = 500

  function handleAddField(field: LinkedField): void {
    setLinkedFields(prev => [...prev, field])
    setSaved(false)
  }

  function handleRemoveField(idx: number): void {
    setLinkedFields(prev => prev.filter((_, i) => i !== idx))
    setSaved(false)
  }

  function handleSave(): void {
    setError(null)
    startTransition(async () => {
      const result = await saveSummaryConfigAction(type, { enabled, instructions, linked_fields: linkedFields })
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  function handleRegenerate(): void {
    setRegenerating(true)
    startTransition(async () => {
      const result = await regenerateSummaryAction(type)
      setRegenerating(false)
      if (result.error) setError(result.error)
    })
  }

  return (
    <>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
        {/* Header + toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: '#00d4ff' }} />
              <h3 className="font-display-heading text-base text-textPrimary">{meta.title}</h3>
            </div>
            <p className="font-ui text-textMuted/50 mt-1" style={{ fontSize: '9px', letterSpacing: '0.10em' }}>{meta.trigger}</p>
            <p className="font-ui text-textMuted/40" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>{meta.coverage}</p>
          </div>
          <button
            type="button"
            onClick={() => { setEnabled(e => !e); setSaved(false) }}
            className="relative flex-shrink-0 h-6 w-11 rounded-full transition-colors duration-200"
            style={{ background: enabled ? '#00d4ff' : 'rgba(255,255,255,0.08)' }}
            aria-label={enabled ? 'Disable' : 'Enable'}
          >
            <span
              className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {enabled && (
          <>
            {/* Instructions */}
            <div>
              <p className="mb-1.5 font-ui uppercase text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.14em' }}>
                Instructions to AI
              </p>
              <textarea
                value={instructions}
                onChange={e => { setInstructions(e.target.value.slice(0, MAX_INSTRUCTIONS)); setSaved(false) }}
                placeholder="e.g. Average my sleep duration and score. Count total workouts. Show calorie total vs target. Flag any day where protein was under 150g. End with one coaching note."
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-ui text-textPrimary placeholder-textMuted/30 focus:outline-none focus:border-[rgba(0,212,255,0.35)] resize-none"
                style={{ fontSize: '12px' }}
              />
              <p className="mt-1 text-right font-ui text-textMuted/30" style={{ fontSize: '8px' }}>
                {instructions.length}/{MAX_INSTRUCTIONS}
              </p>
            </div>

            {/* Linked fields */}
            <div>
              <p className="mb-2 font-ui uppercase text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.14em' }}>
                Linked Trackers & Fields
              </p>
              <div className="flex flex-col gap-2">
                {linkedFields.length === 0 && (
                  <p className="font-ui text-textMuted/30 text-xs">No fields linked yet. Add fields so the AI knows exactly what to summarise.</p>
                )}
                {linkedFields.map((lf, idx) => (
                  <div
                    key={`${lf.trackerId}-${lf.fieldId}`}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <div>
                      <span className="font-ui text-textPrimary" style={{ fontSize: '11px' }}>{lf.fieldLabel}</span>
                      <span className="ml-2 font-ui text-textMuted/40" style={{ fontSize: '9px' }}>
                        {lf.trackerName.toUpperCase()}{lf.unit ? ` · ${lf.unit}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { handleRemoveField(idx); }}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-textMuted/40 hover:text-red-400 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-2.5 font-ui text-textMuted/40 transition-all hover:border-[rgba(0,212,255,0.25)] hover:text-[rgba(0,212,255,0.70)]"
                  style={{ fontSize: '10px', letterSpacing: '0.12em' }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Field
                </button>
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-400">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isPending || regenerating || !enabled}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-ui text-textMuted/50 transition-all hover:text-textPrimary disabled:opacity-30"
            style={{ fontSize: '10px', letterSpacing: '0.10em' }}
          >
            <RefreshCw className={`h-3 w-3 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate Now
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-ui transition-all disabled:opacity-40"
            style={{
              fontSize: '11px',
              letterSpacing: '0.10em',
              background: saved ? 'rgba(16,185,129,0.15)' : 'rgba(0,212,255,0.12)',
              border: saved ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(0,212,255,0.30)',
              color: saved ? '#10b981' : '#00d4ff',
            }}
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      {showPicker && (
        <LinkedFieldsPicker
          trackers={trackers}
          correlations={correlations}
          existing={linkedFields}
          onAdd={handleAddField}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
