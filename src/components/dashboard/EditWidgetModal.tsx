'use client'
// needed for form state, field selectors, and submit handler

import { useState } from 'react'
import { X, Pencil, Plus } from 'lucide-react'
import { updateWidgetAction } from '@/app/actions/dashboard'
import { WIDGET_TYPES } from '@/types/widget'
import type { Widget, WidgetType, WidgetPeriod, ExtraField, TargetDisplay } from '@/types/widget'
import type { Tracker } from '@/types/tracker'
import type { UserTarget } from '@/lib/db/users'

type CorrelationOption = { id: string; name: string; unit?: string }

const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  field_latest: 'Latest Value',
  field_average: 'N-Day Average',
  field_total: 'N-Day Total',
  tracker_latest: 'Latest Entry',
  correlator: 'Correlator',
  combined_field: 'Combined Field',
}

const MAX_LABEL_LENGTH = 50
const DEFAULT_DAYS = 7

type Props = {
  widget: Widget
  trackers: Tracker[]
  targets?: UserTarget[]
  correlations?: CorrelationOption[]
  onClose: () => void
}

export function EditWidgetModal({ widget, trackers, targets = [], correlations = [], onClose }: Props): React.ReactElement {
  const [selectedType, setSelectedType] = useState<WidgetType>(widget.type)
  const [selectedTrackerId, setSelectedTrackerId] = useState(widget.tracker_id ?? '')
  const [selectedFieldId, setSelectedFieldId] = useState(widget.field_id ?? '')
  const [selectedCorrelationId, setSelectedCorrelationId] = useState(widget.correlation_id ?? '')
  const [selectedPeriod, setSelectedPeriod] = useState<WidgetPeriod | ''>(widget.period ?? '')
  const [label, setLabel] = useState(widget.label)
  const [daysStr, setDaysStr] = useState(String(widget.days ?? DEFAULT_DAYS))
  const width = 'full' as const
  const [extraFields, setExtraFields] = useState<ExtraField[]>(widget.extra_fields ?? [])
  const [targetDisplay, setTargetDisplay] = useState<TargetDisplay>(widget.target_display ?? 'bar')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFieldType = selectedType === 'field_latest'
    || selectedType === 'field_average'
    || selectedType === 'field_total'
  const isTrackerOnlyType = selectedType === 'tracker_latest'
  const isCorrelatorType = selectedType === 'correlator'

  const selectedTracker = trackers.find(t => t.id === selectedTrackerId) ?? null

  const matchingTarget = isFieldType && selectedFieldId
    ? (targets.find(t => t.fieldId === selectedFieldId) ??
       targets.find(t => t.fieldLabel.toLowerCase() === (selectedTracker?.schema.find(f => f.fieldId === selectedFieldId)?.label ?? '').toLowerCase()))
    : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const daysNum = Math.max(1, Math.min(365, parseInt(daysStr, 10) || DEFAULT_DAYS))
      const result = await updateWidgetAction(widget.id, {
        type: selectedType,
        label: label.trim() || widget.label,
        days: daysNum,
        width,
        tracker_id: (isFieldType || isTrackerOnlyType) && selectedTrackerId ? selectedTrackerId : undefined,
        field_id: isFieldType && selectedFieldId ? selectedFieldId : undefined,
        correlation_id: isCorrelatorType && selectedCorrelationId ? selectedCorrelationId : undefined,
        extra_fields: extraFields.filter(ef => ef.field_id !== ''),
        target_display: matchingTarget ? targetDisplay : undefined,
        period: selectedPeriod || undefined,
      })

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-surface p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black tracking-tight text-textPrimary">
              Edit Widget
            </h2>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-textMuted">
              {WIDGET_TYPE_LABELS[selectedType] ?? selectedType}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-textMuted transition-all duration-200 hover:border-white/20 hover:text-textPrimary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Type switcher */}
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted">
              Widget Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {WIDGET_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSelectedType(t)
                    setSelectedFieldId('')
                    setExtraFields([])
                    setSelectedPeriod('')
                    setSelectedCorrelationId('')
                  }}
                  className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all duration-200 border ${
                    selectedType === t
                      ? 'border-[#00d4ff]/40 bg-[#00d4ff]/10 text-[#00d4ff]'
                      : 'border-white/10 bg-white/[0.03] text-textMuted hover:border-white/20'
                  }`}
                >
                  {WIDGET_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Tracker selector — for field types and tracker_latest */}
          {(isFieldType || isTrackerOnlyType) && (
            <>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted" htmlFor="edit-tracker-select">
                  Tracker
                </label>
                <select
                  id="edit-tracker-select"
                  value={selectedTrackerId}
                  onChange={e => {
                    setSelectedTrackerId(e.target.value)
                    setSelectedFieldId('')
                    setExtraFields([])
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-textPrimary backdrop-blur-sm transition-colors focus:border-nutrition/40 focus:outline-none"
                >
                  <option value="">Select a tracker…</option>
                  {trackers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Field selector — only for field types, not tracker_latest */}
              {selectedTracker && !isTrackerOnlyType && (
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted" htmlFor="edit-field-select">
                    Field
                  </label>
                  <select
                    id="edit-field-select"
                    value={selectedFieldId}
                    onChange={e => setSelectedFieldId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-textPrimary backdrop-blur-sm transition-colors focus:border-nutrition/40 focus:outline-none"
                  >
                    <option value="">Select a field…</option>
                    {selectedTracker.schema.map(f => (
                      <option key={f.fieldId} value={f.fieldId}>
                        {f.label}{f.unit ? ` (${f.unit})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Additional fields — only for field types with multi-field trackers */}
              {selectedTracker && selectedFieldId && !isTrackerOnlyType && selectedTracker.schema.length > 1 && (
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-textMuted">
                    Additional Fields <span className="normal-case font-medium tracking-normal text-textMuted/40">(optional — up to 3)</span>
                  </label>
                  <div className="flex flex-col gap-2">
                    {extraFields.map((ef, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={ef.field_id}
                          onChange={e => {
                            const f = selectedTracker.schema.find(s => s.fieldId === e.target.value)
                            if (!f) return
                            setExtraFields(prev => prev.map((x, i) => i === idx ? { field_id: f.fieldId, label: f.label, unit: f.unit } : x))
                          }}
                          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-textPrimary focus:border-nutrition/40 focus:outline-none"
                        >
                          <option value="">Select field…</option>
                          {selectedTracker.schema
                            .filter(f => f.fieldId !== selectedFieldId && !extraFields.some((x, i) => i !== idx && x.field_id === f.fieldId))
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
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-textMuted hover:border-red-500/30 hover:text-red-400 transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {extraFields.length < 3 && (
                      <button
                        type="button"
                        onClick={() => setExtraFields(prev => [...prev, { field_id: '', label: '', unit: undefined }])}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-textMuted hover:border-white/20 transition-all"
                      >
                        <Plus className="h-3 w-3" /> Add Field
                      </button>
                    )}
                  </div>
                  {extraFields.length > 0 && (
                    <p className="mt-1.5 text-[9px] text-textMuted/40">
                      Multi-field cards work best with Full Width
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Correlator — pick existing correlation */}
          {isCorrelatorType && (
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-textPrimary backdrop-blur-sm transition-colors focus:border-nutrition/40 focus:outline-none"
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
                        : 'border-white/10 bg-white/[0.03] text-textMuted hover:border-white/20'
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">{tLabel}</span>
                    <span className="text-[7px] opacity-60 normal-case tracking-normal font-normal">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Days window / period — for field_average and field_total */}
          {(selectedType === 'field_average' || selectedType === 'field_total') && (
            <div className="flex flex-col gap-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-textMuted">
                Time window
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { key: '',          label: 'N-Day',     desc: 'Custom days' },
                  { key: 'this_week', label: 'This Week', desc: 'Mon → today' },
                  { key: 'last_week', label: 'Last Week', desc: 'Full Mon–Sun' },
                ] as { key: WidgetPeriod | ''; label: string; desc: string }[]).map(({ key, label: pLabel, desc }) => (
                  <button
                    key={key || 'nday'}
                    type="button"
                    onClick={() => setSelectedPeriod(key)}
                    className={`flex flex-col gap-0.5 rounded-xl px-3 py-2 text-left transition-all duration-200 border ${
                      selectedPeriod === key
                        ? 'border-nutrition/40 bg-nutrition/10 text-nutrition'
                        : 'border-white/10 bg-white/5 text-textMuted hover:border-white/20'
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest">{pLabel}</span>
                    <span className="text-[8px] opacity-60 normal-case tracking-normal font-normal">{desc}</span>
                  </button>
                ))}
              </div>
              {selectedPeriod === '' && (
                <input
                  id="edit-days-input"
                  type="number"
                  min={1}
                  max={365}
                  value={daysStr}
                  onChange={e => setDaysStr(e.target.value)}
                  placeholder="7"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-textPrimary backdrop-blur-sm transition-colors focus:border-nutrition/40 focus:outline-none"
                />
              )}
            </div>
          )}

          {/* Label */}
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-textMuted" htmlFor="edit-label-input">
              Label <span className="font-medium normal-case tracking-normal text-textMuted/50">(optional)</span>
            </label>
            <input
              id="edit-label-input"
              type="text"
              maxLength={MAX_LABEL_LENGTH}
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-textPrimary placeholder-textMuted/30 backdrop-blur-sm transition-colors focus:border-nutrition/40 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-[11px] font-black uppercase tracking-widest text-textMuted transition-all duration-200 hover:border-white/20 hover:text-textPrimary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-nutrition/30 bg-nutrition/15 py-2.5 text-[11px] font-black uppercase tracking-widest text-nutrition transition-all duration-200 hover:border-nutrition/50 hover:bg-nutrition/25 hover:shadow-[0_0_16px_rgba(16,185,129,0.15)] disabled:opacity-40"
            >
              <Pencil className="h-3 w-3" />
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
