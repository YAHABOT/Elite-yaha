'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import {
  ComposedChart, Bar, Line, Cell, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import type { DailyPoint } from '@/app/(app)/(content)/dashboard/widget/[widgetId]/page'
import type { Widget, WidgetType } from '@/types/widget'

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const total = Math.round(Math.abs(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatValue(val: number, fieldType?: string, unit?: string): string {
  if (fieldType === 'duration') return formatDuration(val)
  const rounded = Math.round(val * 10) / 10
  const str = Number.isInteger(rounded) ? String(Math.round(val)) : rounded.toFixed(1)
  return unit ? `${str} ${unit}` : str
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getTypeBadgeLabel(type: WidgetType): string {
  switch (type) {
    case 'field_average': return 'AVG'
    case 'field_total': return 'TOTAL'
    case 'field_latest': return 'LATEST'
    case 'tracker_latest': return 'TRACKER'
    case 'correlator': return 'FORMULA'
    case 'combined_field': return 'COMBINED'
    default: return (type as string).toUpperCase()
  }
}

// ── ISO week key ──────────────────────────────────────────────────────────────

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Preset = '7D' | '30D' | '90D' | 'ALL' | 'custom'

type ChartDatum = {
  date: string
  value: number | null
  movingAvg: number | null
}

type StatsResult = {
  min: number | null
  avg: number | null
  max: number | null
  pb: number | null
  pbDate: string | null
  streak: number
  trackedCount: number
  totalCount: number
}

type Props = {
  widget: Widget
  dailyPoints: DailyPoint[]
  trackerName: string
  trackerColor: string
  unit: string
  fieldType: string
  target: number | null
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

type CustomTooltipProps = {
  active?: boolean
  payload?: Array<{ value: number | null; name: string }>
  label?: string
  fieldType: string
  unit: string
  color: string
}

function CustomTooltip({ active, payload, label, fieldType, unit, color }: CustomTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const entry = payload.find(p => p.name === 'value')
  const maEntry = payload.find(p => p.name === 'movingAvg')
  const val = entry?.value
  return (
    <div className="rounded-xl border border-white/10 bg-surface px-3 py-2 shadow-xl" style={{ minWidth: 100 }}>
      {label && (
        <p className="font-ui mb-1" style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'rgba(0,212,255,0.5)' }}>
          {formatDate(label)}
        </p>
      )}
      <p className="font-mono font-bold" style={{ fontSize: '15px', color: val != null ? color : 'rgba(255,255,255,0.2)' }}>
        {val != null ? formatValue(val, fieldType, unit) : 'No data'}
      </p>
      {maEntry?.value != null && (
        <p className="font-ui mt-0.5" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
          MA {formatValue(maEntry.value, fieldType, unit)}
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function WidgetDetailClient({ widget, dailyPoints, trackerName, trackerColor, unit, fieldType, target }: Props): React.ReactElement {
  const [preset, setPreset] = useState<Preset>('30D')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showMA, setShowMA] = useState(false)
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily')

  const isAggregate = ['field_average', 'field_total', 'correlator', 'combined_field'].includes(widget.type)

  // ── Filtered points ────────────────────────────────────────────────────────
  const filteredPoints = useMemo<DailyPoint[]>(() => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    if (preset === '7D') {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6); cutoff.setHours(0, 0, 0, 0)
      return dailyPoints.filter(p => new Date(p.date + 'T12:00:00Z') >= cutoff)
    }
    if (preset === '30D') {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 29); cutoff.setHours(0, 0, 0, 0)
      return dailyPoints.filter(p => new Date(p.date + 'T12:00:00Z') >= cutoff)
    }
    if (preset === '90D') {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 89); cutoff.setHours(0, 0, 0, 0)
      return dailyPoints.filter(p => new Date(p.date + 'T12:00:00Z') >= cutoff)
    }
    if (preset === 'ALL') {
      return dailyPoints
    }
    if (preset === 'custom') {
      return dailyPoints.filter(p => {
        if (customFrom && p.date < customFrom) return false
        if (customTo && p.date > customTo) return false
        return true
      })
    }
    return dailyPoints
  }, [dailyPoints, preset, customFrom, customTo])

  // Auto-weekly for 90D and ALL
  const effectiveViewMode = (preset === '90D' || preset === 'ALL') ? 'weekly' : viewMode

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo<StatsResult>(() => {
    const values = filteredPoints.map(p => p.value).filter((v): v is number => v != null)
    if (values.length === 0) {
      return { min: null, avg: null, max: null, pb: null, pbDate: null, streak: 0, trackedCount: 0, totalCount: filteredPoints.length }
    }

    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((a, b) => a + b, 0) / values.length

    // PB = max (with date)
    let pbDate: string | null = null
    for (const p of filteredPoints) {
      if (p.value === max) { pbDate = p.date; break }
    }

    // Streak = consecutive non-null from newest (reverse order)
    const reversed = [...filteredPoints].reverse()
    let streak = 0
    for (const p of reversed) {
      if (p.value != null) streak++
      else break
    }

    return {
      min,
      avg: Math.round(avg * 10) / 10,
      max,
      pb: max,
      pbDate,
      streak,
      trackedCount: values.length,
      totalCount: filteredPoints.length,
    }
  }, [filteredPoints])

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo<ChartDatum[]>(() => {
    if (effectiveViewMode === 'weekly') {
      // Group into ISO weeks
      const weekMap = new Map<string, { values: number[]; dateStr: string }>()
      for (const p of filteredPoints) {
        const key = isoWeekKey(p.date)
        if (!weekMap.has(key)) weekMap.set(key, { values: [], dateStr: p.date })
        if (p.value != null) weekMap.get(key)!.values.push(p.value)
      }
      const weekEntries = Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b))
      return weekEntries.map(([, { values, dateStr }]) => {
        const value = values.length > 0
          ? (isAggregate ? values.reduce((a, b) => a + b, 0) : values.reduce((a, b) => a + b, 0) / values.length)
          : null
        return { date: dateStr, value: value != null ? Math.round(value * 10) / 10 : null, movingAvg: null }
      })
    }

    // Daily mode — compute 7-day moving average
    const dailyData = filteredPoints.map(p => ({ date: p.date, value: p.value, movingAvg: null as number | null }))
    for (let i = 0; i < dailyData.length; i++) {
      const window = dailyData.slice(Math.max(0, i - 6), i + 1)
      const windowVals = window.map(d => d.value).filter((v): v is number => v != null)
      if (windowVals.length >= 3) {
        dailyData[i].movingAvg = Math.round((windowVals.reduce((a, b) => a + b, 0) / windowVals.length) * 10) / 10
      }
    }
    return dailyData
  }, [filteredPoints, effectiveViewMode, isAggregate])

  // ── List items ─────────────────────────────────────────────────────────────
  const listItems = useMemo<DailyPoint[]>(() => {
    const reversed = [...filteredPoints].reverse()
    if (widget.type === 'field_latest' || widget.type === 'tracker_latest') {
      return reversed.filter(p => p.value != null)
    }
    return reversed
  }, [filteredPoints, widget.type])

  // ── Chart domain ───────────────────────────────────────────────────────────
  const chartValues = chartData.map(d => d.value).filter((v): v is number => v != null)
  const chartMax = chartValues.length > 0 ? Math.max(...chartValues) : 1

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        {/* Row 1: back + badge + log */}
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-all hover:border-white/20"
            style={{ color: '#00d4ff' }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div
              className="rounded-full px-2.5 py-0.5 font-ui uppercase"
              style={{
                fontSize: '8px',
                letterSpacing: '0.14em',
                background: `${trackerColor}22`,
                border: `1px solid ${trackerColor}55`,
                color: trackerColor,
              }}
            >
              {getTypeBadgeLabel(widget.type)}
            </div>
            <Link
              href={`/chat/new?preset=${encodeURIComponent(trackerName)}`}
              className="flex items-center gap-1 rounded-xl px-3 py-1.5 font-ui transition-all"
              style={{
                fontSize: '9px',
                letterSpacing: '0.12em',
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.25)',
                color: '#00d4ff',
              }}
            >
              + Log
            </Link>
          </div>
        </div>
        {/* Row 2: tracker name + widget title (full width, no truncate) */}
        <p className="font-ui uppercase" style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(0,212,255,0.5)' }}>
          {trackerName}
        </p>
        <h1 className="font-display-heading text-lg text-textPrimary leading-tight mt-0.5">
          {widget.label}
        </h1>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-6">

        {/* Date filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['7D', '30D', '90D', 'ALL', 'custom'] as Preset[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPreset(p)
                if (p !== '90D' && p !== 'ALL') setViewMode('daily')
              }}
              className="rounded-full px-3 py-1 font-ui uppercase transition-all"
              style={{
                fontSize: '9px',
                letterSpacing: '0.14em',
                background: preset === p ? `${trackerColor}22` : 'rgba(0,212,255,0.04)',
                border: `1px solid ${preset === p ? trackerColor + '55' : 'rgba(0,212,255,0.12)'}`,
                color: preset === p ? trackerColor : 'rgba(0,212,255,0.45)',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-ui text-textPrimary outline-none"
              style={{ fontSize: '12px', colorScheme: 'dark' }}
            />
            <span className="font-ui text-textMuted" style={{ fontSize: '10px' }}>to</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-ui text-textPrimary outline-none"
              style={{ fontSize: '12px', colorScheme: 'dark' }}
            />
          </div>
        )}

        {/* Stats strip */}
        <div className="rounded-2xl border border-white/[0.06] bg-surface overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-white/[0.06]">
            {[
              { label: 'MIN', value: stats.min },
              { label: 'AVG', value: stats.avg },
              { label: 'MAX', value: stats.max },
              { label: 'PB', value: stats.pb },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1 py-3 px-2">
                <span className="font-ui uppercase" style={{ fontSize: '8px', letterSpacing: '0.14em', color: 'rgba(0,212,255,0.5)' }}>
                  {label}
                </span>
                <span
                  className="font-mono font-bold leading-none"
                  style={{ fontSize: '16px', color: value != null ? trackerColor : 'rgba(255,255,255,0.15)' }}
                >
                  {value != null ? formatValue(value, fieldType, unit) : '—'}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.05] px-4 py-2 text-center">
            <span className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.08em', color: 'rgba(168,85,247,0.6)' }}>
              {stats.trackedCount} of {stats.totalCount} days tracked
            </span>
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-2">
          {stats.streak > 0 ? (
            <>
              <span style={{ fontSize: '16px' }}>🔥</span>
              <span className="font-display-heading text-textPrimary" style={{ fontSize: '14px' }}>
                {stats.streak}-day streak
              </span>
            </>
          ) : (
            <span className="font-ui" style={{ fontSize: '12px', color: 'rgba(168,85,247,0.5)' }}>— no streak</span>
          )}
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-surface p-3">
          {/* Chart toggle pills */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowMA(!showMA)}
                className="rounded-full px-2.5 py-0.5 font-ui uppercase transition-all"
                style={{
                  fontSize: '8px',
                  letterSpacing: '0.12em',
                  background: showMA ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.05)',
                  border: `1px solid ${showMA ? 'rgba(168,85,247,0.4)' : 'rgba(168,85,247,0.12)'}`,
                  color: showMA ? '#a855f7' : 'rgba(168,85,247,0.45)',
                }}
              >
                MA
              </button>
              {preset !== '90D' && preset !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'daily' ? 'weekly' : 'daily')}
                  className="rounded-full px-2.5 py-0.5 font-ui uppercase transition-all"
                  style={{
                    fontSize: '8px',
                    letterSpacing: '0.12em',
                    background: viewMode === 'weekly' ? 'rgba(0,212,255,0.12)' : 'rgba(0,212,255,0.04)',
                    border: `1px solid ${viewMode === 'weekly' ? 'rgba(0,212,255,0.35)' : 'rgba(0,212,255,0.1)'}`,
                    color: viewMode === 'weekly' ? '#00d4ff' : 'rgba(0,212,255,0.4)',
                  }}
                >
                  {viewMode === 'weekly' ? 'W' : 'D'}/W
                </button>
              )}
            </div>
            {(preset === '90D' || preset === 'ALL') && (
              <span className="font-ui" style={{ fontSize: '8px', letterSpacing: '0.08em', color: 'rgba(0,212,255,0.4)' }}>
                Weekly view (90D+)
              </span>
            )}
          </div>

          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, chartMax * 1.1 || 1]} />
              <Tooltip
                content={<CustomTooltip fieldType={fieldType} unit={unit} color={trackerColor} />}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              {target != null && (
                <ReferenceLine
                  y={target}
                  stroke="rgba(255,255,255,0.25)"
                  strokeDasharray="4 3"
                  label={{ value: 'Goal', position: 'insideTopRight', fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                />
              )}
              <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={24}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.value != null ? trackerColor : 'rgba(255,255,255,0.04)'}
                    opacity={entry.value != null ? 0.85 : 1}
                  />
                ))}
              </Bar>
              {showMA && (
                <Line
                  dataKey="movingAvg"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Day-by-day list */}
        <div className="flex flex-col gap-2 pb-24">
          <span className="font-ui uppercase px-1" style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(0,212,255,0.5)' }}>
            History
          </span>

          {listItems.length === 0 && (
            <div className="rounded-2xl border border-white/5 bg-surface py-10 text-center">
              <p className="font-ui text-textMuted" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>No data in this period</p>
            </div>
          )}

          {listItems.map(point => {
            const hasData = point.value != null
            const formattedDate = formatDate(point.date)

            if (widget.type === 'tracker_latest') {
              return (
                <div key={point.date} className="rounded-2xl border border-white/[0.06] bg-surface px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-ui" style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(0,212,255,0.5)' }}>
                      {formattedDate}
                    </span>
                    <span className="font-mono font-semibold" style={{ fontSize: '13px', color: trackerColor }}>
                      {point.count ?? 0} entries
                    </span>
                  </div>
                  {point.logs && point.logs.length > 0 && (
                    <div className="flex flex-col gap-1 border-t border-white/[0.04] pt-2">
                      {point.logs.map(log => (
                        <div key={log.id} className="flex items-start gap-2">
                          <span className="font-ui shrink-0" style={{ fontSize: '9px', color: 'rgba(168,85,247,0.5)', minWidth: 56 }}>
                            {formatTime(log.logged_at)}
                          </span>
                          <span className="font-ui text-textMuted truncate" style={{ fontSize: '9px' }}>
                            {Object.entries(log.fields)
                              .filter(([, v]) => v != null && v !== '')
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(' · ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            if (widget.type === 'field_latest') {
              return (
                <div key={point.date} className="rounded-2xl border border-white/[0.06] bg-surface px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-ui" style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(0,212,255,0.5)' }}>
                      {formattedDate}
                    </span>
                    <span
                      className="font-mono font-semibold"
                      style={{ fontSize: '13px', color: hasData ? trackerColor : 'rgba(255,255,255,0.2)' }}
                    >
                      {hasData ? formatValue(point.value!, fieldType, unit) : '—'}
                    </span>
                  </div>
                  {point.logs && point.logs.length > 0 && (
                    <div className="flex flex-col gap-1 border-t border-white/[0.04] pt-1">
                      {point.logs.map(log => {
                        const rawVal = widget.field_id ? log.fields[widget.field_id] : null
                        const val = typeof rawVal === 'number' ? rawVal : null
                        return (
                          <div key={log.id} className="flex items-center justify-between">
                            <span className="font-ui" style={{ fontSize: '9px', color: 'rgba(168,85,247,0.5)' }}>
                              {formatTime(log.logged_at)}
                            </span>
                            <span className="font-mono" style={{ fontSize: '11px', color: val != null ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }}>
                              {val != null ? formatValue(val, fieldType, unit) : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // Aggregate types
            return (
              <div key={point.date} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-surface px-4 py-3">
                <span className="font-ui" style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(0,212,255,0.5)' }}>
                  {formattedDate}
                </span>
                <div className="flex items-center gap-2">
                  {point.count != null && point.count > 0 && (
                    <span className="font-ui" style={{ fontSize: '9px', color: 'rgba(168,85,247,0.5)' }}>
                      {point.count} entries
                    </span>
                  )}
                  <span
                    className="font-mono font-semibold"
                    style={{ fontSize: '13px', color: hasData ? trackerColor : 'rgba(255,255,255,0.2)' }}
                  >
                    {hasData ? formatValue(point.value!, fieldType, unit) : '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
