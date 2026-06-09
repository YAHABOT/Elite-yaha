'use client'

import { useState, useEffect } from 'react'
import { X, Plus, ChevronLeft } from 'lucide-react'
import { createWidgetAction } from '@/app/actions/dashboard'
import type { CreateWidgetInput, ExtraField, WidgetType, WidgetPeriod, TargetDisplay } from '@/types/widget'
import type { Tracker } from '@/types/tracker'
import type { UserTarget } from '@/lib/db/users'

// Two steps only: pick a source → configure it
type Step = 'tracker' | 'config'
type EntryMode = 'single_field' | 'correlator' | 'combined_field'
type Aggregation = 'latest' | 'today' | 'this_week' | 'last_week' | 'average' | 'total'

const MAX_LABEL_LENGTH = 50
const DEFAULT_DAYS = 7

type CorrelationOption = { id: string; name: string; unit?: string }

// One entry per tracker type that has 2+ trackers sharing numeric fields
type CombinedTypeOption = {
  trackerType: string
  typeColor: string
  trackerCount: number
  fields: { label: string; normalizedLabel: string }[]
}

const TYPE_COLORS: Record<string, string> = {
  nutrition: '#10b981',
  sleep:     '#3b82f6',
  workout:   '#f97316',
  mood:      '#a855f7',
  water:     '#06b6d4',
  custom:    '#6B7280',
}

type Props = {
  trackers: Tracker[]
  targets?: UserTarget[]
  correlations?: CorrelationOption[]
  onClose: () => void
}

export function AddWidgetModal({ trackers, targets = [], correlations = [], onClose }: Props): React.ReactElement {
  const [step, setStep]                           = useState<Step>('tracker')
  const [selectedTrackerId, setSelectedTrackerId] = useState('')
  const [entryMode, setEntryMode]                 = useState<EntryMode>('single_field')
  const [selectedFieldId, setSelectedFieldId]     = useState('')
  const [selectedCorrelationId, setSelectedCorrelationId] = useState('')
  const [aggregation, setAggregation]             = useState<Aggregation>('latest')
  const [daysStr, setDaysStr]                     = useState(String(DEFAULT_DAYS))
  const [label, setLabel]                         = useState('')
  const width                                     = 'full' as const
  const [extraFields, setExtraFields]             = useState<ExtraField[]>([])
  const [targetDisplay, setTargetDisplay]         = useState<TargetDisplay>('bar')
  const [pbLower, setPbLower]                     = useState(false)
  const [submitting, setSubmitting]               = useState(false)
  const [error, setError]                         = useState<string | null>(null)
  // Combined-field state
  const [selectedCombinedType, setSelectedCombinedType]       = useState<CombinedTypeOption | null>(null)
  const [selectedCombinedFieldNl, setSelectedCombinedFieldNl] = useState('')
  // Trackers sorted by user's drag order from the Trackers page
  const [sortedTrackers, setSortedTrackers]                   = useState<Tracker[]>(trackers)

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

  const selectedTracker = trackers.find(t => t.id === selectedTrackerId) ?? null

  // Build one CombinedTypeOption per tracker-type that has ≥2 trackers with shared numeric fields
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
          if (field.type === 'text' || field.type === 'time' || field.type === 'select') continue
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

  // Target match for single_field (shows target indicator options)
  const matchingTarget = entryMode === 'single_field' && selectedFieldId
    ? (targets.find(t => t.fieldId === selectedFieldId) ??
       targets.find(t => t.fieldLabel.toLowerCase() === (selectedTracker?.schema.find(f => f.fieldId === selectedFieldId)?.label ?? '').toLowerCase()))
    : null

  const widgetType: WidgetType =
    entryMode === 'correlator'    ? 'correlator' :
    entryMode === 'combined_field'? 'combined_field' :
    aggregation === 'average'     ? 'field_average' :
    (aggregation === 'total' || aggregation === 'today' || aggregation === 'this_week' || aggregation === 'last_week')
                                  ? 'field_total' :
    'field_latest'

  // ── Navigation handlers ──────────────────────────────────────────────────

  function handleSelectTracker(trackerId: string): void {
    setSelectedTrackerId(trackerId)
    setEntryMode('single_field')
    setSelectedFieldId('')
    setExtraFields([])
    setTargetDisplay('bar')
    setAggregation('latest')
    setLabel('')
    setStep('config')
    setError(null)
  }

  function handleSelectCorrelator(): void {
    setSelectedTrackerId('')
    setEntryMode('correlator')
    setAggregation('today')
    setLabel('')
    setStep('config')
    setError(null)
  }

  function handleSelectCombinedType(opt: CombinedTypeOption): void {
    setSelectedCombinedType(opt)
    setSelectedCombinedFieldNl('')
    setSelectedTrackerId('')
    setEntryMode('combined_field')
    setAggregation('today')
    setLabel('')
    setStep('config')
    setError(null)
  }

  function handleBack(): void {
    setStep('tracker')
    setEntryMode('single_field')
    setSelectedCombinedType(null)
    setSelectedCombinedFieldNl('')
    setError(null)
  }

  // ── Derived values ───────────────────────────────────────────────────────

  const selectedCombinedField = selectedCombinedType?.fields.find(f => f.normalizedLabel === selectedCombinedFieldNl) ?? null

  const defaultLabel =
    entryMode === 'correlator'     ? 'Correlation' :
    entryMode === 'combined_field' && selectedCombinedField
                                   ? `${selectedCombinedField.label} (Combined)` :
    entryMode === 'combined_field' && selectedCombinedType
                                   ? `${selectedCombinedType.trackerType} Combined` :
    selectedTracker?.schema.find(f => f.fieldId === selectedFieldId)?.label ?? 'Widget'

  const isSubmitDisabled =
    submitting ||
    (entryMode === 'correlator'     && !selectedCorrelationId) ||
    (entryMode === 'combined_field' && !selectedCombinedFieldNl) ||
    (entryMode === 'single_field'   && !selectedFieldId)

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const isWeekPeriod = aggregation === 'this_week' || aggregation === 'last_week'
      const daysNum = aggregation === 'today' ? 1
        : isWeekPeriod ? 7
        : Math.max(1, Math.min(365, parseInt(daysStr, 10) || DEFAULT_DAYS))

      const combinedFieldId = entryMode === 'combined_field' && selectedCombinedType && selectedCombinedFieldNl
        ? `combined:${selectedCombinedType.trackerType}:${selectedCombinedFieldNl}`
        : undefined

      const input: CreateWidgetInput = {
        type:           widgetType,
        label:          label.trim() || defaultLabel,
        days:           daysNum,
        position:       0,
        width,
        tracker_id:     entryMode === 'combined_field' ? undefined : (selectedTrackerId || undefined),
        field_id:       entryMode === 'single_field'    ? (selectedFieldId || undefined)
                      : entryMode === 'combined_field'  ? combinedFieldId
                      : undefined,
        correlation_id: entryMode === 'correlator' && selectedCorrelationId ? selectedCorrelationId : undefined,
        extra_fields:   extraFields.filter(ef => ef.field_id !== ''),
        target_display: matchingTarget ? targetDisplay : undefined,
        period:         isWeekPeriod ? (aggregation as WidgetPeriod) : undefined,
        pb_direction:   pbLower ? 'below' : 'above',
      }

      const result = await createWidgetAction(input)
      if (result.error) { setError(result.error); setSubmitting(false); return }
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  // ── Subtitle ─────────────────────────────────────────────────────────────

  const stepSubtitle =
    step === 'tracker'             ? 'Choose a source' :
    entryMode === 'single_field'   ? `${selectedTracker?.name ?? ''} · Configure` :
    entryMode === 'combined_field' ? `${selectedCombinedType?.trackerType ?? ''} Combined · Configure` :
    'Correlator · Configure'

  // ── Shared aggregation options ────────────────────────────────────────────

  const AGGS_FULL = [
    { key: 'latest' as Aggregation,    label: 'Latest Value',  desc: 'Most recent log' },
    { key: 'today' as Aggregation,     label: 'Today so far',  desc: 'Running total today' },
    { key: 'this_week' as Aggregation, label: 'This Week',     desc: 'Mon → today' },
    { key: 'last_week' as Aggregation, label: 'Last Week',     desc: 'Full Mon–Sun' },
    { key: 'average' as Aggregation,   label: 'N-Day Avg',     desc: 'Average over N days' },
    { key: 'total' as Aggregation,     label: 'N-Day Total',   desc: 'Sum over N days' },
  ]

  const AGGS_NO_LATEST = AGGS_FULL.filter(a => a.key !== 'latest')

  const AGGS_CORRELATOR = [
    { key: 'today' as Aggregation,     label: 'Today',        desc: 'Running total today' },
    { key: 'this_week' as Aggregation, label: 'This Week',    desc: 'Mon → today' },
    { key: 'last_week' as Aggregation, label: 'Last Week',    desc: 'Full Mon–Sun' },
    { key: 'total' as Aggregation,     label: 'Last N Days',  desc: 'Custom day window' },
  ]

  function AggGrid({ options }: { options: typeof AGGS_FULL }) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ key, label: aLabel, desc }) => (
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
            <span className="text-[9px] font-black uppercase tracking-widest">{aLabel}</span>
            <span className="text-[8px] opacity-60 normal-case tracking-normal font-normal">{desc}</span>
          </button>
        ))}
      </div>
    )
  }

  function DaysInput() {
    return (
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
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

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
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-textMuted">{stepSubtitle}</p>
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

        {/* ── Step 1: Source picker ─────────────────────────────────────────── */}
        {step === 'tracker' && (
          <div className="flex flex-col gap-2">

            {/* Individual trackers — user's saved order from Trackers page */}
            {sortedTrackers.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTracker(t.id)}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left transition-all duration-200 hover:border-white/15 hover:bg-white/[0.05] active:scale-[0.98]"
              >
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color, boxShadow: `0 0 6px ${t.color}80` }} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-textPrimary">{t.name}</span>
                  <span className="text-[9px] uppercase tracking-widest" style={{ color: t.color }}>{t.type}</span>
                </div>
                <span className="shrink-0 text-[9px] text-textMuted/40">{t.schema.length} field{t.schema.length !== 1 ? 's' : ''}</span>
              </button>
            ))}

            {/* Correlator formula — sits with individual trackers, before combined section */}
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

            {/* Combined Fields — one row per tracker type */}
            {combinedTypeOptions.length > 0 && (
              <>
                <p className="mt-3 mb-1 text-[9px] font-black uppercase tracking-widest text-textMuted/40">Combined Fields</p>
                {combinedTypeOptions.map(opt => (
                  <button
                    key={opt.trackerType}
                    type="button"
                    onClick={() => handleSelectCombinedType(opt)}
                    className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left transition-all duration-200 hover:border-white/15 hover:bg-white/[0.05] active:scale-[0.98]"
                  >
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: opt.typeColor, boxShadow: `0 0 6px ${opt.typeColor}80` }} />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-textPrimary capitalize">{opt.trackerType}</span>
                      <span className="text-[9px] uppercase tracking-widest" style={{ color: opt.typeColor }}>
                        {opt.trackerCount} trackers · {opt.fields.length} shared field{opt.fields.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="shrink-0 text-[9px] text-textMuted/40">Combined</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Step 2: Configure ─────────────────────────────────────────────── */}
        {step === 'config' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* ── Single field ── */}
            {entryMode === 'single_field' && selectedTracker && (
              <>
                {/* Field picker */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">Field</label>
                  <select
                    value={selectedFieldId}
                    onChange={e => setSelectedFieldId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-textPrimary focus:border-[#00d4ff]/40 focus:outline-none"
                  >
                    <option value="">Select a field…</option>
                    {selectedTracker.schema.map(f => (
                      <option key={f.fieldId} value={f.fieldId}>{f.label}{f.unit ? ` (${f.unit})` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Show as */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">Show as</label>
                  <AggGrid options={AGGS_FULL} />
                </div>

                {(aggregation === 'average' || aggregation === 'total') && <DaysInput />}

                {/* Extra fields — up to 4 */}
                {selectedFieldId && selectedTracker.schema.length > 1 && (
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-textMuted">
                      Extra Fields{' '}
                      <span className="normal-case font-medium tracking-normal text-textMuted/40">(optional — up to 4)</span>
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
                              .filter(f => f.fieldId !== selectedFieldId && !extraFields.some((x, i) => i !== idx && x.field_id === f.fieldId))
                              .map(f => (
                                <option key={f.fieldId} value={f.fieldId}>{f.label}{f.unit ? ` (${f.unit})` : ''}</option>
                              ))}
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
                      {extraFields.length < 4 && (
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

            {/* ── Correlator ── */}
            {entryMode === 'correlator' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">Formula</label>
                  {correlations.length === 0 ? (
                    <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-textMuted">
                      No correlations yet. Create one in Settings → Correlations first.
                    </p>
                  ) : (
                    <>
                      <select
                        value={selectedCorrelationId}
                        onChange={e => setSelectedCorrelationId(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-textPrimary focus:border-[#00d4ff]/40 focus:outline-none"
                      >
                        <option value="">Select a formula…</option>
                        {correlations.map(c => (
                          <option key={c.id} value={c.id}>{c.name}{c.unit ? ` (${c.unit})` : ''}</option>
                        ))}
                      </select>
                      {!selectedCorrelationId && <p className="mt-1 text-[9px] text-textMuted/50">Select a formula to continue.</p>}
                    </>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">Evaluate over</label>
                  <AggGrid options={AGGS_CORRELATOR} />
                </div>
                {aggregation === 'total' && <DaysInput />}
              </div>
            )}

            {/* ── Combined field ── */}
            {entryMode === 'combined_field' && selectedCombinedType && (
              <div className="space-y-4">
                {/* Field picker — all shared fields for this type */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">Field</label>
                  <select
                    value={selectedCombinedFieldNl}
                    onChange={e => setSelectedCombinedFieldNl(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-textPrimary focus:border-[#00d4ff]/40 focus:outline-none"
                  >
                    <option value="">Select a field…</option>
                    {selectedCombinedType.fields.map(f => (
                      <option key={f.normalizedLabel} value={f.normalizedLabel}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Show as — no "Latest Value" for aggregated cross-tracker fields */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">Show as</label>
                  <AggGrid options={AGGS_NO_LATEST} />
                </div>

                {(aggregation === 'average' || aggregation === 'total') && <DaysInput />}
              </div>
            )}

            {/* Target display — only when field has a matching target */}
            {matchingTarget && (
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">
                  Target Indicator{' '}
                  <span className="normal-case font-medium tracking-normal text-textMuted/40">
                    ({matchingTarget.value}{matchingTarget.unit ? ` ${matchingTarget.unit}` : ''})
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    { key: 'bar',    label: 'Bar',   desc: 'Progress bar' },
                    { key: 'ring',   label: 'Ring',  desc: 'Circular ring' },
                    { key: 'number', label: 'x / y', desc: 'Number badge' },
                    { key: 'hide',   label: 'Hide',  desc: 'No indicator' },
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

            {/* PB direction */}
            <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all hover:border-white/10">
              <input
                type="checkbox"
                checked={pbLower}
                onChange={e => setPbLower(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#00d4ff]"
              />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-textPrimary">Personal Best is lower</p>
                <p className="text-[9px] text-textMuted/50 normal-case tracking-normal font-normal mt-0.5">e.g. resting HR, body weight</p>
              </div>
            </label>

            {/* Label */}
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">
                Label{' '}<span className="normal-case font-medium tracking-normal text-textMuted/50">(optional)</span>
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
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">{error}</p>
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
                disabled={isSubmitDisabled}
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
