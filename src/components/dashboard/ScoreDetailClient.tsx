'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import type { DayDetail, TargetDetail } from '@/app/(app)/(content)/dashboard/score/page'

const TRACKER_COLORS: Record<string, string> = {
  nutrition: '#10b981',
  sleep: '#3b82f6',
  workout: '#f97316',
  mood: '#a855f7',
  water: '#06b6d4',
  custom: '#6B7280',
}

function getColor(trackerType: string): string {
  return TRACKER_COLORS[trackerType] ?? '#6B7280'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'EXCELLENT'
  if (score >= 80) return 'GREAT'
  if (score >= 60) return 'GOOD'
  if (score >= 40) return 'FAIR'
  return 'LOW'
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#00d4ff'
  if (score >= 60) return '#10b981'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

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

type DayBarProps = {
  day: DayDetail
  isSelected: boolean
  onClick: () => void
}

function DayBar({ day, isSelected, onClick }: DayBarProps): React.ReactElement {
  // Always derive the score color — only meaningful for days with targets set
  const scoreColor = day.hasTargets ? getScoreColor(day.score) : null
  const heightPct = day.hasTargets ? Math.max(day.score, 4) : Math.min(day.logCount * 10, 100)

  // Selected: full brightness gradient + glow
  // Past day with targets: show score color at ~40% opacity so history is readable at a glance
  // Past day without targets: dim grey
  const barBackground = isSelected
    ? (scoreColor ? `linear-gradient(180deg, ${scoreColor}, ${scoreColor}99)` : 'rgba(255,255,255,0.12)')
    : (scoreColor ? `${scoreColor}44` : 'rgba(255,255,255,0.08)')

  const barGlow = isSelected && scoreColor ? `0 0 8px ${scoreColor}60` : 'none'

  const labelColor = isSelected
    ? (scoreColor ?? 'rgba(148,163,184,0.6)')
    : (scoreColor ? `${scoreColor}70` : 'rgba(148,163,184,0.25)')

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 px-1 transition-opacity"
      style={{ minWidth: '32px' }}
    >
      <div className="flex h-16 w-4 items-end justify-center">
        <div
          className="w-full rounded-full transition-all duration-300"
          style={{
            height: `${heightPct}%`,
            background: barBackground,
            boxShadow: barGlow,
          }}
        />
      </div>
      <span
        className="font-ui leading-none"
        style={{
          fontSize: '7px',
          letterSpacing: '0.10em',
          color: labelColor,
          fontWeight: isSelected ? 700 : 400,
        }}
      >
        {day.label === 'TODAY' ? 'NOW' : day.label}
      </span>
    </button>
  )
}

type TargetRowProps = {
  target: TargetDetail
}

function TargetRow({ target }: TargetRowProps): React.ReactElement {
  const color = getColor(target.trackerType)
  const isComplete = target.pct >= 100
  const isBelow = target.direction === 'below'
  const isOver = isBelow && target.actual > target.targetValue
  const displayColor = isComplete ? '#10b981' : isOver ? '#ef4444' : color

  const subRight = isComplete
    ? null
    : isOver
    ? `${formatValue(target.actual - target.targetValue, target.fieldType, target.unit)} over`
    : `${formatValue(target.targetValue - target.actual, target.fieldType, target.unit)} to go`

  return (
    <div className="flex flex-col gap-2 rounded-2xl border px-4 py-3" style={{ borderColor: `${color}22`, background: `${color}08` }}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="font-ui uppercase" style={{ fontSize: '8px', letterSpacing: '0.14em', color: `${color}80` }}>
            {target.trackerName}
          </span>
          <span className="font-display-heading text-sm text-textPrimary leading-tight">
            {target.fieldLabel}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span
            className="font-mono font-bold leading-none"
            style={{ fontSize: '18px', color: displayColor }}
          >
            {formatValue(target.actual, target.fieldType, target.unit)}
          </span>
          <span className="font-ui" style={{ fontSize: '8px', letterSpacing: '0.08em', color: 'rgba(148,163,184,0.4)' }}>
            {isBelow ? '≤' : '≥'} {formatValue(target.targetValue, target.fieldType, target.unit)}
          </span>
        </div>
      </div>

      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${target.pct}%`,
              background: isComplete
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : isOver
                ? 'linear-gradient(90deg, #ef444499, #ef4444)'
                : `linear-gradient(90deg, ${color}99, ${color})`,
              boxShadow: isComplete ? '0 0 6px rgba(16,185,129,0.5)' : isOver ? '0 0 4px rgba(239,68,68,0.5)' : `0 0 4px ${color}60`,
            }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-ui" style={{ fontSize: '7.5px', letterSpacing: '0.08em', color: 'rgba(148,163,184,0.3)' }}>
            {isComplete ? '✓ Goal reached' : `${target.pct}% complete`}
          </span>
          {!isComplete && subRight && (
            <span className="font-ui" style={{ fontSize: '7.5px', letterSpacing: '0.06em', color: isOver ? 'rgba(239,68,68,0.5)' : 'rgba(148,163,184,0.25)' }}>
              {subRight}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

type Props = {
  dayDetails: DayDetail[]
}

export function ScoreDetailClient({ dayDetails }: Props): React.ReactElement {
  const todayIndex = dayDetails.length - 1
  const [selectedIndex, setSelectedIndex] = useState(todayIndex)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [])

  const selected = dayDetails[selectedIndex]
  const scoreColor = selected ? getScoreColor(selected.score) : '#334155'
  const scoreLabel = selected?.hasTargets ? getScoreLabel(selected.score) : null

  const r = 40
  const circ = 2 * Math.PI * r
  const pct = selected?.hasTargets ? Math.min(selected.score, 100) : 0
  const dash = (pct / 100) * circ

  const displayDate = selectedIndex === todayIndex
    ? 'TODAY'
    : selected
      ? new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()
      : ''

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link
          href="/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-textMuted transition-all hover:border-white/20 hover:text-textPrimary"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <p className="font-ui uppercase" style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(148,163,184,0.4)' }}>
            DAILY SCORE
          </p>
          <h1 className="font-display-heading text-base text-textPrimary leading-tight">
            {displayDate}
          </h1>
        </div>
        <Link
          href="/settings/targets"
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-textMuted transition-all hover:border-white/20 hover:text-textPrimary"
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.12em' }}>MANAGE TARGETS</span>
        </Link>
      </div>

      {/* Day bar chart — horizontal scroll */}
      <div
        ref={scrollRef}
        className="flex items-end gap-0 overflow-x-auto px-4 pt-3 pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {dayDetails.map((day, i) => (
          <DayBar
            key={day.date}
            day={day}
            isSelected={i === selectedIndex}
            onClick={() => setSelectedIndex(i)}
          />
        ))}
      </div>

      {/* Score section */}
      {selected && (
        <div className="flex flex-col gap-4 px-4">
          {/* Main score card */}
          <div
            className="relative overflow-hidden rounded-2xl border p-5"
            style={{
              borderColor: `${scoreColor}33`,
              background: `linear-gradient(135deg, ${scoreColor}12 0%, #0A0A0A 65%)`,
            }}
          >
            <div className="flex items-center gap-5">
              {/* Ring */}
              <div className="relative flex-shrink-0">
                <svg width="96" height="96" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                  {selected.hasTargets && (
                    <circle
                      cx="48" cy="48" r={r}
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${dash} ${circ}`}
                      transform="rotate(-90 48 48)"
                      style={{
                        filter: `drop-shadow(0 0 8px ${scoreColor}70)`,
                        transition: 'stroke-dasharray 0.9s ease',
                      }}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <span
                    className="font-mono leading-none"
                    style={{ fontSize: '28px', fontWeight: 900, color: scoreColor }}
                  >
                    {selected.hasTargets ? selected.score : selected.logCount}
                  </span>
                  {selected.hasTargets && (
                    <span className="font-ui uppercase" style={{ fontSize: '8px', letterSpacing: '0.10em', color: `${scoreColor}80` }}>
                      / 100
                    </span>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                {scoreLabel && (
                  <div
                    className="self-start rounded-full px-2.5 py-0.5 font-ui uppercase"
                    style={{
                      fontSize: '9px',
                      letterSpacing: '0.15em',
                      background: `${scoreColor}22`,
                      border: `1px solid ${scoreColor}44`,
                      color: scoreColor,
                    }}
                  >
                    {scoreLabel}
                  </div>
                )}
                <div>
                  <span className="font-display-heading text-2xl text-textPrimary leading-none">
                    {selected.hasTargets ? `${selected.score} / 100` : `${selected.logCount} logs`}
                  </span>
                </div>
                <span className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.06em', color: 'rgba(148,163,184,0.4)' }}>
                  {selected.hasTargets
                    ? `${selected.targets.length} target${selected.targets.length !== 1 ? 's' : ''} tracked`
                    : 'No targets set'}
                </span>

                {/* Overall progress bar */}
                {selected.hasTargets && (
                  <div className="mt-1">
                    <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${selected.score}%`,
                          background: `linear-gradient(90deg, ${scoreColor}80, ${scoreColor})`,
                          boxShadow: `0 0 6px ${scoreColor}60`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Individual targets */}
          {selected.hasTargets && selected.targets.length > 0 && (
            <div className="flex flex-col gap-3 pb-24">
              <span className="font-ui uppercase px-1" style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(148,163,184,0.35)' }}>
                Individual Targets
              </span>
              {selected.targets.map(target => (
                <TargetRow key={target.id} target={target} />
              ))}
            </div>
          )}

          {!selected.hasTargets && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] py-12 text-center">
              <p className="font-ui text-textMuted/40 uppercase" style={{ fontSize: '9px', letterSpacing: '0.14em' }}>No targets set</p>
              <Link
                href="/settings/targets/new"
                className="font-ui transition-opacity hover:opacity-70"
                style={{ fontSize: '10px', letterSpacing: '0.10em', color: '#00d4ff' }}
              >
                + Add a target →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
