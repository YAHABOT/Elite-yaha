'use client'

import { useState } from 'react'
import { X, Plus, ChevronLeft } from 'lucide-react'
import { createWidgetAction } from '@/app/actions/dashboard'
import type { CreateWidgetInput, ExtraField, WidgetType, WidgetPeriod, TargetDisplay } from '@/types/widget'
import type { Tracker } from '@/types/tracker'
import type { UserTarget } from '@/lib/db/users'

type Step = 'tracker' | 'entry_type' | 'config'
type EntryMode = 'last_entry' | 'single_field' | 'correlator'
type Aggregation = 'latest' | 'today' | 'this_week' | 'last_week' | 'average' | 'total'

const MAX_LABEL_LENGTH = 50
const DEFAULT_DAYS = 7

type CorrelationOption = { id: string; name: string; unit?: string }

type Props = {
  trackers: Tracker[]
  targets?: UserTarget[]
  correlations?: CorrelationOption[]
  onClose: () => void
}

export function AddWidgetModal({ trackers, targets = [], correlations = [], onClose }: Props): React.ReactElement {
  const [step, setStep] = useState<Step>('tracker')
  const [selectedTrackerId, setSelectedTrackerId] = useState('')
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null)
  const [selectedFieldId, setSelectedFieldId] = useState('')
  const [selectedCorrelationId, setSelectedCorrelationId] = useState('')
  const [aggregation, setAggregation] = useState<Aggregation>('latest')
  const [daysStr, setDaysStr] = useState(String(DEFAULT_DAYS))
  const [label, setLabel] = useState('')
  const width = 'full' as const
  const [extraFields, setExtraFields] = useState<ExtraField[]>([])
  const [targetDisplay, setTargetDisplay] = useState<TargetDisplay>('bar')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTracker = trackers.find(t => t.id === selectedTrackerId) ?? null

  // Check if the selected field has a user target (for showing target display options)
  const matchingTarget = entryMode === 'single_field' && selectedFieldId
    ? (targets.find(t => t.fieldId === selectedFieldId) ??
       targets.find(t => t.fieldLabel.toLowerCase() === (selectedTracker?.schema.find(f => f.fieldId === selectedFieldId)?.label ?? '').toLowerCase()))
    : null

  const widgetType: WidgetType =
    entryMode === 'last_entry' ? 'tracker_latest' :
    entryMode === 'correlator' ? 'correlator' :
    aggregation === 'average' ? 'field_average' :
    (aggregation === 'total' || aggregation === 'today' || aggregation === 'this_week' || aggregation === 'last_week') ? 'field_total' :
    'field_latest'

  function handleSelectTracker(trackerId: string): void {
    setSelectedTrackerId(trackerId)
    setEntryMode(null)
    setSelectedFieldId('')
    setExtraFields([])
    setTargetDisplay('bar')
    setStep('entry_type')
    setError(null)
  }

  function handleSelectCorrelator(): void {
    setSelectedTrackerId('')
    setEntryMode('correlator')
    setStep('config')
    setError(null)
  }

  function handleSelectEntryMode(mode: EntryMode): void {
    setEntryMode(mode)
    setSelectedFieldId('')
    setExtraFields([])
    setStep('config')
    setError(null)
  }

  function handleBack(): void {
    if (step === 'entry_type') {
      setStep('tracker')
      setEntryMode(null)
    } else if (step === 'config') {
      if (entryMode === 'correlator') {
        setStep('tracker')
        setEntryMode(null)
      } else {
        setStep('entry_type')
      }
    }
    setError(null)
  }

  const defaultLabel =
    entryMode === 'last_entry' ? `${selectedTracker?.name ?? ''} Latest` :
    entryMode === 'correlator' ? 'Correlation' :
    selectedTracker?.schema.find(f => f.fieldId === selectedFieldId)?.label ?? 'Widget'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const isWeekPeriod = aggregation === 'this_week' || aggregation === 'last_week'
      const daysNum = aggregation === 'today' ? 1 : isWeekPeriod ? 7 : Math.max(1, Math.min(365, parseInt(daysStr, 10) || DEFAULT_DAYS))
      const input: CreateWidgetInput = {
        type: widgetType,
        label: label.trim() || defaultLabel,
        days: daysNum,
        position: 0,
        width,
        tracker_id: selectedTrackerId || undefined,
        field_id: entryMode === 'single_field' && selectedFieldId ? selectedFieldId : undefined,
        correlation_id: entryMode === 'correlator' && selectedCorrelationId ? selectedCorrelationId : undefined,
        extra_fields: extraFields.filter(ef => ef.field_id !== ''),
        target_display: matchingTarget ? targetDisplay : undefined,
        period: isWeekPeriod ? (aggregation as WidgetPeriod) : undefined,
      }

      const result = await createWidgetAction(input)
      if (result.error) {
        setError(result.error)
        setSubmitting(false)
        return
      }

      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const stepSubtitle =
    step === 'tracker' ? 'Choose a tracker' :
    step === 'entry_type' ? selectedTracker?.name ?? '' :
    entryMode === 'last_entry' ? 'Last Entry · Configure' :
    entryMode === 'single_field' ? 'Single Field · Configure' :
    'Correlator · Configure'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-surface p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step !== 'tracker' && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-textMuted transition-all hover:border-white/20 hover:text-textPrimary"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <div>
              <h2 className="text-base font-black tracking-tight text-textPrimary">Add Widget</h2>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-textMuted">
                {stepSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-textMuted transition-all hover:border-white/20 hover:text-textPrimary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ── Step 1: Tracker ── */}
        {step === 'tracker' && (
          <div className="flex flex-col gap-2">
            {trackers.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTracker(t.id)}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left transition-all duration-200 hover:border-white/15 hover:bg-white/[0.05] active:scale-[0.98]"
              >
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: t.color, boxShadow: `0 0 6px ${t.color}80` }}
                />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-textPrimary">{t.name}</span>
                  <span className="text-[9px] uppercase tracking-widest" style={{ color: t.color }}>{t.type}</span>
                </div>
                <span className="shrink-0 text-[9px] text-textMuted/40">
                  {t.schema.length} field{t.schema.length !== 1 ? 's' : ''}
                </span>
              </button>
            ))}

            {/* Correlator option */}
            <button
              type="button"
              onClick={handleSelectCorrelator}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left transition-all duration-200 hover:border-white/15 hover:bg-white/[0.05] active:scale-[0.98]"
            >
              <div className="h-2 w-2 shrink-0 rounded-full bg-textMuted/30" />
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-textPrimary">Correlator Formula</span>
                <span className="text-[9px] uppercase tracking-widest text-textMuted/40">custom formula</span>
              </div>
            </button>
          </div>
        )}

        {/* ── Step 2: Entry type ── */}
        {step === 'entry_type' && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleSelectEntryMode('last_entry')}
              className="flex flex-col gap-1.5 rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-left transition-all duration-200 hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/5 active:scale-[0.98]"
            >
              <span className="text-sm font-black uppercase tracking-widest text-textPrimary">Last Entry</span>
              <span className="text-[10px] leading-relaxed text-textMuted">
                Show all fields from the most recent log
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectEntryMode('single_field')}
              className="flex flex-col gap-1.5 rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-left transition-all duration-200 hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/5 active:scale-[0.98]"
            >
              <span className="text-sm font-black uppercase tracking-widest text-textPrimary">Single Field</span>
              <span className="text-[10px] leading-relaxed text-textMuted">
                Track one specific field — latest value, daily average, or total
              </span>
            </button>
          </div>
        )}

        {/* ── Step 3: Config ── */}
        {step === 'config' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Single field — field picker + aggregation */}
            {entryMode === 'single_field' && selectedTracker && (
              <>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">
                    Field
                  </label>
                  <select
                    value={selectedFieldId}
                    onChange={e => setSelectedFieldId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-textPrimary focus:border-[#00d4ff]/40 focus:outline-none"
                  >
                    <option value="">Select a field…</option>
                    {selectedTracker.schema.map(f => (
                      <option key={f.fieldId} value={f.fieldId}>
                        {f.label}{f.unit ? ` (${f.unit})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">
                    Show as
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: 'latest',    label: 'Latest Value',  desc: 'Most recent log' },
                      { key: 'today',     label: 'Today so far',  desc: 'Running total today' },
                      { key: 'this_week', label: 'This Week',     desc: 'Mon → today' },
                      { key: 'last_week', label: 'Last Week',     desc: 'Full Mon–Sun' },
                      { key: 'average',   label: 'N-Day Avg',     desc: 'Average over N days' },
                      { key: 'total',     label: 'N-Day Total',   desc: 'Sum over N days' },
                    ] as { key: Aggregation; label: string; desc: string }[]).map(({ key, label, desc }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAggregation(key)}
                        className={`flex flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-all duration-200 border ${
                          aggregation === key
                            ? 'border-[#00d4ff]/40 bg-[#00d4ff]/10 text-[#00d4ff]'
                            : 'border-white/10 bg-white/5 text-textMuted hover:border-white/20'
                        }`}
                      >
                        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                        <span className="text-[8px] opacity-60 normal-case tracking-normal font-normal">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(aggregation === 'average' || aggregation === 'total') && (
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">
                      Days window
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={daysStr}
                      onChange={e => setDaysStr(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-textPrimary focus:border-[#00d4ff]/40 focus:outline-none"
                    />
                  </div>
                )}

                {/* Extra fields */}
                {selectedFieldId && selectedTracker.schema.length > 1 && (
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-textMuted">
                      Extra Fields{' '}
                      <span className="normal-case font-medium tracking-normal text-textMuted/40">(optional — up to 3)</span>
                    </label>
                    <div className="flex flex-col gap-2">
                      {extraFields.map((ef, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            value={ef.field_id}
                            onChange={e => {
                              const f = selectedTracker.schema.find(s => s.fieldId === e.target.value)
                              if (!f) return
                              setExtraFields(prev => prev.map((x, i) =>
                                i === idx ? { field_id: f.fieldId, label: f.label, unit: f.unit } : x
                              ))
                            }}
                            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-textPrimary focus:border-[#00d4ff]/40 focus:outline-none"
                          >
                            <option value="">Select field…</option>
                            {selectedTracker.schema
                              .filter(f =>
                                f.fieldId !== selectedFieldId &&
                                !extraFields.some((x, i) => i !== idx && x.field_id === f.fieldId)
                              )
                              .map(f => (
                                <option key={f.fieldId} value={f.fieldId}>
                                  {f.label}{f.unit ? ` (${f.unit})` : ''}
                                </option>
                              ))
                            }
                          </select>
                          <button
                            type="button"
                            onClick={() => setExtraFields(prev => prev.filter((_, i) => i !== idx))}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-textMuted transition-all hover:border-red-500/30 hover:text-red-400"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {extraFields.length < 3 && (
                        <button
                          type="button"
                          onClick={() => setExtraFields(prev => [...prev, { field_id: '', label: '', unit: undefined }])}
                          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-textMuted transition-all hover:border-white/20"
                        >
                          <Plus className="h-3 w-3" /> Add Field
                        </button>
                      )}
                      {extraFields.length > 0 && (
                        <p className="text-[9px] text-textMuted/40">Multi-field cards work best with Full Width</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Correlator — pick existing correlation */}
            {entryMode === 'correlator' && (
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">
                  Formula
                </label>
                {correlations.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-textMuted">
                    No correlations yet. Create one in Settings → Correlations first.
                  </p>
                ) : (
                  <select
                    value={selectedCorrelationId}
                    onChange={e => setSelectedCorrelationId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-textPrimary focus:border-[#00d4ff]/40 focus:outline-none"
                  >
                    <option value="">Select a formula…</option>
                    {correlations.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.unit ? ` (${c.unit})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Target display style — only when field has a matching target */}
            {matchingTarget && (
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">
                  Target Indicator{' '}
                  <span className="normal-case font-medium tracking-normal text-textMuted/40">({matchingTarget.value}{matchingTarget.unit ? ` ${matchingTarget.unit}` : ''})</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    { key: 'bar',    label: 'Bar',    desc: 'Progress bar' },
                    { key: 'ring',   label: 'Ring',   desc: 'Circular ring' },
                    { key: 'number', label: 'x / y',  desc: 'Number badge' },
                    { key: 'hide',   label: 'Hide',   desc: 'No indicator' },
                  ] as { key: TargetDisplay; label: string; desc: string }[]).map(({ key, label: tLabel, desc }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTargetDisplay(key)}
                      className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-center transition-all duration-200 border ${
                        targetDisplay === key
                          ? 'border-[#00d4ff]/40 bg-[#00d4ff]/10 text-[#00d4ff]'
                          : 'border-white/10 bg-white/5 text-textMuted hover:border-white/20'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none">{tLabel}</span>
                      <span className="text-[7px] opacity-60 normal-case tracking-normal font-normal">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Label */}
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">
                Label{' '}
                <span className="normal-case font-medium tracking-normal text-textMuted/50">(optional)</span>
              </label>
              <input
                type="text"
                maxLength={MAX_LABEL_LENGTH}
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder={defaultLabel}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-textPrimary placeholder-textMuted/30 focus:border-[#00d4ff]/40 focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-[11px] font-black uppercase tracking-widest text-textMuted transition-all hover:border-white/20 hover:text-textPrimary"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl border border-[#00d4ff]/30 bg-[#00d4ff]/10 py-2.5 text-[11px] font-black uppercase tracking-widest text-[#00d4ff] transition-all hover:border-[#00d4ff]/50 hover:bg-[#00d4ff]/20 disabled:opacity-40"
              >
                {submitting ? 'Adding…' : 'Add Widget'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
