'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'
import type { Tracker } from '@/types/tracker'
import type { LinkedField } from '@/types/summary'

type CorrelationOption = { id: string; name: string; unit?: string | null }

type Props = {
  trackers: Tracker[]
  correlations: CorrelationOption[]
  existing: LinkedField[]
  onAdd: (field: LinkedField) => void
  onClose: () => void
}

export function LinkedFieldsPicker({ trackers, correlations, existing, onAdd, onClose }: Props): React.ReactElement {
  const [selectedTrackerId, setSelectedTrackerId] = useState<string>('')

  const CORRELATIONS_ID = '__correlations__'
  const isCorrelations = selectedTrackerId === CORRELATIONS_ID
  const selectedTracker = isCorrelations ? null : trackers.find(t => t.id === selectedTrackerId)

  const isAlreadyLinked = (trackerId: string, fieldId: string) =>
    existing.some(f => f.trackerId === trackerId && f.fieldId === fieldId)

  const availableFields = isCorrelations
    ? correlations.map(c => ({
        fieldId: c.id,
        label: c.name,
        type: 'number' as const,
        unit: c.unit ?? undefined,
        isCorrelation: true,
      }))
    : (selectedTracker?.schema.filter(f => ['number', 'rating', 'duration'].includes(f.type)) ?? []).map(f => ({
        ...f,
        isCorrelation: false,
      }))

  function handleSelect(fieldId: string, fieldLabel: string, fieldType: string, unit?: string, isCorrelation = false): void {
    const trackerId = isCorrelation ? CORRELATIONS_ID : selectedTrackerId
    const trackerName = isCorrelation ? 'Correlations' : (selectedTracker?.name ?? '')
    if (isAlreadyLinked(trackerId, fieldId)) return

    onAdd({
      trackerId,
      trackerName,
      fieldId,
      fieldLabel,
      fieldType,
      unit,
      isCorrelation,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0A0A0A] flex flex-col"
        style={{ maxHeight: '82vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-6 pb-4">
          <h3 className="font-display-heading text-base text-textPrimary">Add Linked Fields</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-textMuted/60 hover:text-textPrimary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {/* Tracker / source picker */}
          <div className="mb-4">
            <p className="mb-2 font-ui uppercase text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.14em' }}>Select source</p>
            <div className="flex flex-wrap gap-2">
              {trackers.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTrackerId(t.id)}
                  className="rounded-xl border px-3 py-1.5 font-ui transition-all"
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.10em',
                    borderColor: selectedTrackerId === t.id ? `${t.color ?? '#00d4ff'}60` : 'rgba(255,255,255,0.08)',
                    background: selectedTrackerId === t.id ? `${t.color ?? '#00d4ff'}14` : 'transparent',
                    color: selectedTrackerId === t.id ? (t.color ?? '#00d4ff') : 'rgba(148,163,184,0.6)',
                  }}
                >
                  {t.name}
                </button>
              ))}
              {correlations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTrackerId(CORRELATIONS_ID)}
                  className="rounded-xl border px-3 py-1.5 font-ui transition-all"
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.10em',
                    borderColor: isCorrelations ? 'rgba(0,212,255,0.40)' : 'rgba(255,255,255,0.08)',
                    background: isCorrelations ? 'rgba(0,212,255,0.10)' : 'transparent',
                    color: isCorrelations ? '#00d4ff' : 'rgba(148,163,184,0.6)',
                  }}
                >
                  Correlations
                </button>
              )}
            </div>
          </div>

          {/* Fields list */}
          {selectedTrackerId && (
            <div className="flex flex-col gap-2">
              <p className="mb-1 font-ui uppercase text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.14em' }}>Select fields</p>
              {availableFields.length === 0 ? (
                <p className="font-ui text-textMuted/40" style={{ fontSize: '11px' }}>No numeric fields in this tracker.</p>
              ) : (
                availableFields.map(f => {
                  const trackerId = f.isCorrelation ? CORRELATIONS_ID : selectedTrackerId
                  const linked = isAlreadyLinked(trackerId, f.fieldId)
                  return (
                    <button
                      key={f.fieldId}
                      type="button"
                      onClick={() => { if (!linked) handleSelect(f.fieldId, f.label, f.type, f.unit, f.isCorrelation) }}
                      className="flex items-center justify-between rounded-2xl border px-4 py-3 transition-all"
                      style={{
                        borderColor: linked ? 'rgba(16,185,129,0.30)' : 'rgba(255,255,255,0.08)',
                        background: linked ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                        cursor: linked ? 'default' : 'pointer',
                      }}
                    >
                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="font-display-heading text-sm" style={{ color: linked ? '#10b981' : '#F5F5F5' }}>{f.label}</span>
                        <span className="font-ui text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.10em' }}>
                          {f.type.toUpperCase()}{f.unit ? ` · ${f.unit}` : ''}
                        </span>
                      </div>
                      {linked && <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Fixed footer — Done button */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-3 font-ui transition-all"
            style={{
              fontSize: '11px',
              letterSpacing: '0.12em',
              background: 'rgba(0,212,255,0.12)',
              border: '1px solid rgba(0,212,255,0.30)',
              color: '#00d4ff',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
