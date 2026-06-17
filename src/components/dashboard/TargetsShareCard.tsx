'use client'

import { forwardRef } from 'react'
import type { TargetDetail } from '@/app/(app)/(content)/dashboard/score/page'

const F_DISPLAY = 'var(--font-orbitron), monospace'
const F_UI      = 'var(--font-audiowide), system-ui, sans-serif'
const F_MONO    = 'var(--font-share-mono), ui-monospace, monospace'
const F_SANS    = 'var(--font-inter), system-ui, sans-serif'

const TRACKER_COLORS: Record<string, string> = {
  nutrition: '#10b981',
  sleep:     '#3b82f6',
  workout:   '#f97316',
  mood:      '#a855f7',
  water:     '#06b6d4',
  custom:    '#6B7280',
}

function getColor(type: string): string {
  return TRACKER_COLORS[type] ?? '#6B7280'
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#00d4ff'
  if (score >= 60) return '#10b981'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'EXCELLENT'
  if (score >= 80) return 'GREAT'
  if (score >= 60) return 'GOOD'
  if (score >= 40) return 'FAIR'
  return 'LOW'
}

function formatDuration(seconds: number): string {
  const total = Math.round(Math.abs(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m`
}

function fmtVal(val: number, fieldType?: string, unit?: string): string {
  if (fieldType === 'duration') return formatDuration(val)
  const rounded = Math.round(val * 10) / 10
  const str = Number.isInteger(rounded) ? String(Math.round(val)) : rounded.toFixed(1)
  return unit ? `${str} ${unit}` : str
}

function formatShareDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  const mon = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${weekday} · ${day} ${mon} ${year}`.toUpperCase()
}

type Props = {
  date: string
  score: number
  targets: TargetDetail[]
  hasTargets: boolean
}

export const TargetsShareCard = forwardRef<HTMLDivElement, Props>(({ date, score, targets, hasTargets }, ref) => {
  const scoreColor = hasTargets ? getScoreColor(score) : '#334155'
  const scoreLabel = hasTargets ? getScoreLabel(score) : null
  const r = 44
  const circ = 2 * Math.PI * r
  const pct = hasTargets ? Math.min(score, 100) : 0
  const dash = (pct / 100) * circ

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: '0',
        width: '540px',
        height: '960px',
        backgroundColor: '#0b1a28',
        display: 'flex',
        flexDirection: 'column',
        padding: '26px 22px 18px',
        overflow: 'hidden',
        fontFamily: F_SANS,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontFamily: F_UI, fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#2a5a70', marginBottom: '5px' }}>
          Daily Targets
        </div>
        <div style={{ fontFamily: F_DISPLAY, fontWeight: 900, fontSize: '20px', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1.2, marginBottom: '7px' }}>
          Powered by YAHA
        </div>
        <div style={{ fontFamily: F_UI, fontSize: '10px', color: '#00d4ff', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '3px' }}>
          {formatShareDate(date)}
        </div>
        <div style={{ fontFamily: F_SANS, fontSize: '9px', color: '#1e3a4a' }}>
          The tracker that evolves with you
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '14px 0' }} />

      {/* Score card */}
      <div style={{
        background: '#152e47',
        border: `1px solid ${scoreColor}33`,
        borderTop: `2px solid ${scoreColor}`,
        borderRadius: '16px',
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}>
        {/* Ring — score number ONLY inside, nothing duplicated outside */}
        <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
            {hasTargets && (
              <circle
                cx="48" cy="48" r={r}
                fill="none"
                stroke={scoreColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                transform="rotate(-90 48 48)"
                style={{ filter: `drop-shadow(0 0 8px ${scoreColor}70)` }}
              />
            )}
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '96px', height: '96px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: F_MONO, fontSize: '26px', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
              {hasTargets ? score : '--'}
            </span>
            <span style={{ fontFamily: F_UI, fontSize: '7px', letterSpacing: '0.08em', color: `${scoreColor}70`, marginTop: '2px' }}>
              / 100
            </span>
          </div>
        </div>

        {/* Right side: label + targets count + bar */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {scoreLabel && (
            <div style={{
              alignSelf: 'flex-start',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontFamily: F_UI,
              fontSize: '9px',
              letterSpacing: '0.15em',
              background: `${scoreColor}22`,
              border: `1px solid ${scoreColor}44`,
              color: scoreColor,
            }}>
              {scoreLabel}
            </div>
          )}
          <span style={{ fontFamily: F_DISPLAY, fontWeight: 900, fontSize: '13px', color: '#e2e8f0', letterSpacing: '0.05em' }}>
            {targets.length} target{targets.length !== 1 ? 's' : ''} tracked
          </span>
          {hasTargets && (
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${scoreColor}80, ${scoreColor})`,
                borderRadius: '9999px',
                boxShadow: `0 0 6px ${scoreColor}60`,
              }} />
            </div>
          )}
        </div>
      </div>

      {/* Section label */}
      <div style={{ fontFamily: F_UI, fontSize: '8px', letterSpacing: '3px', textTransform: 'uppercase', color: '#2a5a70', margin: '14px 0 10px', flexShrink: 0 }}>
        Individual Targets
      </div>

      {/* Target rows */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0, overflow: 'hidden' }}>
        {targets.map(target => {
          const color = getColor(target.trackerType)
          const isComplete = target.pct >= 100
          const isBelow = target.direction === 'below'
          const isOver = isBelow && target.actual > target.targetValue
          const barColor = isComplete ? '#10b981' : isOver ? '#ef4444' : color
          const pctClamped = Math.min(target.pct, 100)

          return (
            <div key={target.id} style={{
              background: `${color}08`,
              border: `1px solid ${color}22`,
              borderRadius: '12px',
              padding: '10px 14px',
              boxSizing: 'border-box',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                <div>
                  <div style={{ fontFamily: F_UI, fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', color: `${color}80`, marginBottom: '2px' }}>
                    {target.trackerName}
                  </div>
                  <div style={{ fontFamily: F_DISPLAY, fontSize: '11px', fontWeight: 700, color: '#e2e8f0' }}>
                    {target.fieldLabel}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                  <div style={{ fontFamily: F_MONO, fontSize: '16px', color: barColor, letterSpacing: '0.03em', lineHeight: 1 }}>
                    {fmtVal(target.actual, target.fieldType, target.unit)}
                  </div>
                  <div style={{ fontFamily: F_UI, fontSize: '7px', letterSpacing: '0.06em', color: 'rgba(42,90,112,0.8)', marginTop: '2px' }}>
                    {isBelow ? '<=' : '>='} {fmtVal(target.targetValue, target.fieldType, target.unit)}
                  </div>
                </div>
              </div>
              <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${pctClamped}%`,
                  height: '100%',
                  borderRadius: '9999px',
                  background: isComplete
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : isOver
                    ? 'linear-gradient(90deg, #ef444499, #ef4444)'
                    : `linear-gradient(90deg, ${color}99, ${color})`,
                  boxShadow: isComplete ? '0 0 4px rgba(16,185,129,0.5)' : `0 0 3px ${color}60`,
                }} />
              </div>
              <div style={{ marginTop: '4px', fontFamily: F_UI, fontSize: '7px', letterSpacing: '0.06em', color: isComplete ? '#10b98180' : isOver ? 'rgba(239,68,68,0.5)' : 'rgba(42,90,112,0.6)' }}>
                {isComplete ? '+ Goal reached' : isOver ? 'Over limit' : `${target.pct}% complete`}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '12px', flexShrink: 0 }}>
        <div style={{ fontFamily: F_DISPLAY, fontWeight: 900, fontSize: '10px', color: '#00d4ff', letterSpacing: '4px', textTransform: 'uppercase' }}>YAHA</div>
        <div style={{ fontFamily: F_UI, fontSize: '7px', color: '#1e3a4a', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '3px' }}>Your data · Your evolution</div>
      </div>
    </div>
  )
})

TargetsShareCard.displayName = 'TargetsShareCard'
