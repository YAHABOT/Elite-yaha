'use client'

import { forwardRef } from 'react'

const F_DISPLAY = 'var(--font-orbitron), monospace'
const F_UI      = 'var(--font-audiowide), system-ui, sans-serif'
const F_MONO    = 'var(--font-share-mono), ui-monospace, monospace'
const F_SANS    = 'var(--font-inter), system-ui, sans-serif'

const TRACKER_COLORS: Record<string, string> = {
  nutrition: '#00ff9d',
  sleep:     '#a855f7',
  workout:   '#ff6b35',
  mood:      '#ffd700',
  water:     '#00d4ff',
  custom:    '#94a3b8',
}

export type ComputedField = {
  label: string
  value: string
  isKey: boolean
}

export type ComputedTracker = {
  name: string
  type: string
  fields: ComputedField[]
}

export type ComputedCorrelation = {
  name: string
  value: string
}

type Props = {
  date: string
  trackers: ComputedTracker[]
  correlations: ComputedCorrelation[]
}

function formatShareDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  const mon = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${weekday} · ${day} ${mon} ${year}`.toUpperCase()
}

export const JournalShareCard = forwardRef<HTMLDivElement, Props>(({ date, trackers, correlations }, ref) => {
  const corrRows = Math.ceil(correlations.length / 2)

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
        padding: '28px 22px 72px',
        overflow: 'hidden',
        fontFamily: F_SANS,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontFamily: F_UI, fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#2a5a70', marginBottom: '5px', lineHeight: 1 }}>
          Daily Overview
        </div>
        <div style={{ fontFamily: F_DISPLAY, fontWeight: 900, fontSize: '20px', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1.15, marginBottom: '7px' }}>
          Powered by YAHA
        </div>
        <div style={{ fontFamily: F_UI, fontSize: '10px', color: '#00d4ff', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px', lineHeight: 1 }}>
          {formatShareDate(date)}
        </div>
        <div style={{ fontFamily: F_SANS, fontSize: '9px', color: '#2a5a70', lineHeight: 1 }}>
          The tracker that evolves with you
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '14px 0', flexShrink: 0 }} />

      {/* Tracker cards */}
      <div style={{
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridAutoRows: 'auto',
        gap: '8px',
      }}>
        {trackers.map((tracker, i) => {
          const color = TRACKER_COLORS[tracker.type] ?? TRACKER_COLORS.custom
          const isLast = i === trackers.length - 1
          const isOdd  = trackers.length % 2 !== 0
          const fields = tracker.fields.slice(0, 6)

          const rows: [ComputedField, ComputedField | null][] = []
          for (let j = 0; j < fields.length; j += 2) {
            rows.push([fields[j], fields[j + 1] ?? null])
          }

          return (
            <div
              key={i}
              style={{
                background: '#152e47',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px',
                padding: '16px 14px',
                position: 'relative',
                overflow: 'hidden',
                gridColumn: (isLast && isOdd) ? '1 / -1' : undefined,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 50%)', pointerEvents: 'none' }} />

              {/* Tracker label — lineHeight:1 keeps dot + text on same baseline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '11px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontFamily: F_UI, fontSize: '7.5px', letterSpacing: '2px', textTransform: 'uppercase', color, lineHeight: 1 }}>{tracker.name}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {rows.map(([left, right], ri) => (
                  <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
                    <div>
                      <div style={{ fontFamily: F_SANS, fontSize: '7px', color: '#2a5a70', marginBottom: '2px', lineHeight: 1 }}>{left.label}</div>
                      <div style={{ fontFamily: F_MONO, fontSize: left.isKey ? '14px' : '11px', color: left.isKey ? color : '#b8cad8', letterSpacing: '0.02em', lineHeight: 1.2, wordBreak: 'break-word' }}>
                        {left.value}
                      </div>
                    </div>
                    {right && (
                      <div>
                        <div style={{ fontFamily: F_SANS, fontSize: '7px', color: '#2a5a70', marginBottom: '2px', lineHeight: 1 }}>{right.label}</div>
                        <div style={{ fontFamily: F_MONO, fontSize: right.isKey ? '14px' : '11px', color: right.isKey ? color : '#b8cad8', letterSpacing: '0.02em', lineHeight: 1.2, wordBreak: 'break-word' }}>
                          {right.value}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Correlations — sits right under trackers, fixed-height rows */}
      {correlations.length > 0 && (
        <div style={{
          flexShrink: 0,
          background: '#152e47',
          border: '1px solid rgba(0,212,255,0.13)',
          borderTop: '2px solid #00d4ff',
          borderRadius: '14px',
          marginTop: '12px',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}>
          {/* Section label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '13px 16px 10px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00d4ff', flexShrink: 0 }} />
            <span style={{ fontFamily: F_UI, fontSize: '8px', letterSpacing: '3px', textTransform: 'uppercase', color: '#00d4ff', lineHeight: 1 }}>Correlations</span>
          </div>

          {/* Equal fixed-height cells in a 2×N grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: `repeat(${corrRows}, 76px)`,
          }}>
            {correlations.map((c, i) => {
              const isLeft    = i % 2 === 0
              const rowIdx    = Math.floor(i / 2)
              const isLastRow = rowIdx === corrRows - 1
              const isMissing = c.value === '---'
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '0 16px',
                    borderRight:  isLeft    ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    borderBottom: !isLastRow ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  <div style={{ fontFamily: F_SANS, fontSize: '10px', color: '#4a7a9b', marginBottom: '4px', lineHeight: 1 }}>{c.name}</div>
                  <div style={{ fontFamily: F_MONO, fontSize: '19px', fontWeight: 700, color: isMissing ? '#2a5a70' : '#00d4ff', letterSpacing: '0.02em', lineHeight: 1 }}>
                    {c.value}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ height: '12px' }} />
        </div>
      )}

      {/* Footer — absolutely pinned so it's never clipped by content overflow */}
      <div style={{ position: 'absolute', bottom: '22px', left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontFamily: F_DISPLAY, fontWeight: 900, fontSize: '10px', color: '#00d4ff', letterSpacing: '4px', textTransform: 'uppercase', lineHeight: 1 }}>YAHA</div>
        <div style={{ fontFamily: F_UI, fontSize: '7px', color: '#2a5a70', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px', lineHeight: 1 }}>Your data · Your evolution</div>
      </div>
    </div>
  )
})

JournalShareCard.displayName = 'JournalShareCard'
