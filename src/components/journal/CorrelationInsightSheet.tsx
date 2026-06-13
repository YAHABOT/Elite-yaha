'use client'

import { X, Info } from 'lucide-react'
import { getCorrelationInsight } from '@/lib/correlator/insights'

type Props = {
  name: string
  unit: string
  onClose: () => void
}

export function CorrelationInsightSheet({ name, unit, onClose }: Props): React.ReactElement {
  const insight = getCorrelationInsight(name)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-border bg-surface shadow-2xl max-h-[85dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-bold text-textPrimary">{name}</p>
            {unit && <p className="text-xs text-textMuted">{unit}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-surfaceHighlight hover:text-textPrimary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {insight ? (
            <>
              {/* What */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-textMuted mb-1">What it measures</p>
                <p className="text-sm text-textPrimary leading-relaxed">{insight.what}</p>
              </div>

              {/* How to read */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-textMuted mb-1">How to use it</p>
                <p className="text-sm text-textMuted leading-relaxed">{insight.howToRead}</p>
              </div>

              {/* Ranges */}
              {insight.ranges && insight.ranges.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-textMuted mb-2">Reference ranges</p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    {insight.ranges.map((range, i) => (
                      <div
                        key={range.label}
                        className={`flex items-center justify-between px-3 py-2 ${
                          i % 2 === 0 ? 'bg-surface' : 'bg-white/[0.02]'
                        }`}
                      >
                        <span className="text-xs text-textMuted">{range.label}</span>
                        <span className="text-xs font-semibold text-textPrimary tabular-nums">{range.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Widget note */}
              {insight.widgetNote && (
                <div className="flex items-start gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5">
                  <Info className="h-3.5 w-3.5 shrink-0 text-cyan-400 mt-0.5" />
                  <p className="text-xs text-cyan-400/80 leading-relaxed">{insight.widgetNote}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-textMuted leading-relaxed">
              User-defined formula. Edit via the Correlator button in the journal.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
