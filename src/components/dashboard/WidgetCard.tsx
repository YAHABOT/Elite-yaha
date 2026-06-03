'use client'
// needed for interactive delete button handler + Recharts client rendering

import { X, Pencil, GripVertical } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, LabelList } from 'recharts'
import type { Widget, WidgetValue, ExtraFieldValue } from '@/types/widget'

function formatDuration(seconds: number): string {
  const totalSeconds = Math.round(Math.abs(seconds))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDisplayValue(val: number | string | null, fieldType?: string): string | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'string') return val
  if (fieldType === 'duration') return formatDuration(val)
  const rounded = Math.round(val * 10) / 10
  return Number.isInteger(rounded) ? String(Math.round(val)) : rounded.toFixed(1)
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const SPARKLINE_HEIGHT = 82
const DEFAULT_BORDER_COLOR = '#1E1E1E'

function getDayLabels(n: number): string[] {
  const today = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (n - 1 - i))
    return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3).toUpperCase()
  })
}

type Props = {
  widget: Widget
  value: WidgetValue
  editMode: boolean
  onDelete: () => void
  onEdit?: () => void
  target?: number
  targetDirection?: 'above' | 'below'
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

function Sparkline({ trend, color }: { trend: number[]; color: string }): React.ReactElement | null {
  if (trend.length < 2) return null

  try {
    const labels = getDayLabels(trend.length)
    const chartData = trend.map((v, i) => ({
      day: labels[i],
      v,
      display: formatDisplayValue(v) ?? '',
    }))

    return (
      <div className="mt-3">
        <ResponsiveContainer width="100%" height={SPARKLINE_HEIGHT}>
          <LineChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 7, fill: 'rgba(148,163,184,0.4)', letterSpacing: '0.05em' }}
              interval={0}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 2, fill: color, strokeWidth: 0 }}
            >
              <LabelList
                dataKey="display"
                position="top"
                style={{ fontSize: '7.5px', fill: color, fontWeight: 700 }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  } catch {
    return null
  }
}

type RingProgressProps = {
  pct: number
  color: string
  target: number
  value: number
  fieldType?: string
  direction?: 'above' | 'below'
}

function RingProgress({ pct, color, target, value, fieldType, direction = 'above' }: RingProgressProps): React.ReactElement {
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const isComplete = pct >= 100
  const isBelow = direction === 'below'
  const isOver = isBelow && value > target
  const subText = isComplete
    ? '✓ Goal reached'
    : isOver
    ? `${formatDisplayValue(value - target, fieldType)} over`
    : `${formatDisplayValue(target - value, fieldType)} to go`
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={isComplete ? '#10b981' : isOver ? '#ef4444' : color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 36 36)"
            style={{
              filter: `drop-shadow(0 0 4px ${isComplete ? '#10b981' : isOver ? '#ef4444' : color}90)`,
              transition: 'stroke-dasharray 0.7s ease',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-ui text-[10px] font-black" style={{ color: isComplete ? '#10b981' : isOver ? '#ef4444' : color }}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-ui text-[9px] uppercase tracking-widest text-textMuted/50">{isBelow ? '≤' : '≥'} TARGET</span>
        <span className="font-mono text-base font-bold text-textPrimary">{formatDisplayValue(value, fieldType)}</span>
        <span className="font-ui text-[9px] text-textMuted/40">{subText}</span>
      </div>
    </div>
  )
}

function MultiMetricStrip({ extraValues, color }: { extraValues: ExtraFieldValue[]; color: string }): React.ReactElement {
  // color param reserved for potential future tinting; strip uses muted palette
  void color
  return (
    <div className="mt-3 pt-3 flex gap-0 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      {extraValues.map((ev, i) => (
        <div
          key={ev.field_id}
          className="flex-1 flex flex-col gap-0.5 px-2 first:pl-0 last:pr-0"
          style={i > 0 ? { borderLeft: '1px solid rgba(255,255,255,0.06)' } : {}}
        >
          <span
            className="font-mono font-bold leading-none"
            style={{
              fontSize: '16px',
              background: 'linear-gradient(135deg, #94a3b8, rgba(255,255,255,0.6))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {ev.value !== null ? (formatDisplayValue(ev.value, ev.fieldType) ?? '—') : '—'}
          </span>
          <span className="font-ui text-[8px] uppercase tracking-widest text-textMuted/50 leading-none mt-0.5">
            {ev.label}{ev.unit && typeof ev.unit === 'string' && ev.unit.length > 0 ? ` · ${ev.unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export function WidgetCard({ widget, value, editMode, onDelete, onEdit, target, targetDirection = 'above', dragHandleProps }: Props): React.ReactElement {
  const color = widget.color ?? DEFAULT_BORDER_COLOR
  const borderHex = `${color}33` // 20% opacity for subtle border
  const glowHex = `${color}1A`   // 10% opacity for glow
  const isFull = widget.width === 'full'
  const isLatestEntry = widget.type === 'tracker_latest'
  const isMultiMetric = (value.extraValues?.length ?? 0) > 0

  const displayValue = formatDisplayValue(value.value, value.fieldType)
  const isDuration = value.fieldType === 'duration'

  // Target progress — only when a numeric target is set and value is numeric
  const numericValue = typeof value.value === 'number' ? value.value : parseFloat(String(value.value ?? ''))
  const hasProgress = target !== undefined && target > 0 && !isNaN(numericValue)
  const isBelow = targetDirection === 'below'
  const progressPct = hasProgress
    ? isBelow
      ? (numericValue <= target ? 100 : Math.max(0, Math.round((target / numericValue) * 100)))
      : Math.min(100, Math.round((numericValue / target) * 100))
    : 0
  const isOver = isBelow && hasProgress && numericValue > target

  return (
    <div
      className="group relative flex min-h-[130px] flex-col overflow-hidden rounded-2xl border bg-surface p-5 backdrop-blur-sm transition-all duration-300 hover:bg-surfaceHighlight"
      style={{
        borderColor: borderHex,
        background: `linear-gradient(135deg, ${glowHex} 0%, #0A0A0A 60%)`,
      }}
    >
      {/* Header row */}
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
          />
          <span
            className="font-ui min-w-0 line-clamp-2 text-[10px] uppercase tracking-[0.15em] text-textMuted leading-tight"
            title={value.label}
          >
            {value.label}
          </span>
        </div>
        {editMode && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {dragHandleProps && (
              <div
                {...dragHandleProps}
                className="flex h-6 w-6 flex-shrink-0 cursor-grab touch-none items-center justify-center rounded-full border border-white/10 bg-white/5 text-textMuted/50 transition-all active:cursor-grabbing hover:text-textMuted"
                title="Drag to reorder"
              >
                <GripVertical className="h-3 w-3" />
              </div>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${value.label} widget`}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-textMuted transition-all duration-200 hover:border-white/40 hover:text-textPrimary"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${value.label} widget`}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-textMuted transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/20 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Value — full-width cards get a slightly larger value font; multi-metric uses text-2xl headline */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {isLatestEntry && !displayValue ? (
          <span className="font-ui text-sm text-textMuted/60 leading-none">
            {value.loggedAt ? timeAgo(value.loggedAt) : '—'}
          </span>
        ) : displayValue !== null ? (
          <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
            <span
              className={`font-mono leading-none truncate min-w-0 ${isMultiMetric ? 'text-2xl md:text-3xl' : isFull ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`}
              style={{
                fontFamily: 'var(--font-share-mono)',
                background: 'linear-gradient(135deg, #00d4ff, rgba(255,255,255,0.75))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {displayValue}
            </span>
            {value.unit && !isDuration && (
              <span className="font-ui shrink-0 text-xs text-[#94a3b8]">{value.unit}</span>
            )}
            {value.delta !== undefined && value.delta !== 0 && (
              <span
                className="font-ui leading-none shrink-0"
                style={{
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  color: value.delta > 0 ? '#10b981' : 'rgba(239,68,68,0.65)',
                }}
              >
                {value.delta > 0 ? '↑' : '↓'} {Math.abs(value.delta)}%
              </span>
            )}
          </div>
        ) : (
          <span className={`font-mono text-textMuted/40 leading-none ${isMultiMetric ? 'text-2xl md:text-3xl' : isFull ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`}>—</span>
        )}
      </div>

      {/* Sparkline — full-width cards get extra height */}
      {value.trend && value.trend.length > 1 && (
        <Sparkline trend={value.trend} color={color} />
      )}

      {/* Multi-metric strip — shown on full-width cards with extra fields */}
      {isMultiMetric && value.extraValues && value.extraValues.length > 0 && (
        <MultiMetricStrip extraValues={value.extraValues} color={color} />
      )}

      {/* Target progress — style controlled by widget.target_display */}
      {hasProgress && widget.target_display !== 'hide' && (
        <>
          {(widget.target_display === 'ring') && (
            <div className="mt-3">
              <RingProgress pct={progressPct} color={color} target={target!} value={numericValue} fieldType={value.fieldType} direction={targetDirection} />
            </div>
          )}

          {(widget.target_display === 'number') && (
            <div className="mt-3 flex items-center gap-2">
              <div className="h-px flex-1" style={{ background: `${color}30` }} />
              <span className="font-ui shrink-0" style={{ fontSize: '10px', letterSpacing: '0.10em', color: progressPct >= 100 ? '#10b981' : isOver ? '#ef4444' : color }}>
                {progressPct >= 100 ? '✓ ' : ''}{formatDisplayValue(numericValue, value.fieldType)} {isBelow ? '≤' : '/'} {formatDisplayValue(target!, value.fieldType)}
              </span>
            </div>
          )}

          {(!widget.target_display || widget.target_display === 'bar') && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-ui text-textMuted/40" style={{ fontSize: '8px', letterSpacing: '0.12em' }}>
                  {isBelow ? '≤' : '≥'} TARGET
                </span>
                <span className="font-ui" style={{ fontSize: '8px', letterSpacing: '0.10em', color: progressPct >= 100 ? '#10b981' : isOver ? '#ef4444' : color }}>
                  {progressPct}%
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPct}%`,
                    background: progressPct >= 100
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : isOver
                      ? 'linear-gradient(90deg, #ef444499, #ef4444)'
                      : `linear-gradient(90deg, ${color}99, ${color})`,
                    boxShadow: progressPct >= 100 ? '0 0 6px rgba(16,185,129,0.5)' : isOver ? '0 0 6px rgba(239,68,68,0.5)' : `0 0 6px ${color}60`,
                  }}
                />
              </div>
              <p className="mt-1 font-ui text-textMuted/30" style={{ fontSize: '8px', letterSpacing: '0.08em' }}>
                {progressPct >= 100
                  ? '✓ Goal reached'
                  : isOver
                  ? `${formatDisplayValue(numericValue - target!, value.fieldType)} over`
                  : `${formatDisplayValue(target! - numericValue, value.fieldType)} to go`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
