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
  const useGrid = correlations.length > 2
  const leftPair  = correlations.filter((_, i) => i % 2 === 0)
  const rightPair = correlations.filter((_, i) => i % 2 !== 0)

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
          Daily Overview
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
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '12px 0' }} />

      {/* Tracker grid — auto-height, no stretching */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridAutoRows: 'auto',
        alignContent: 'start',
        gap: '8px',
        minHeight: 0,
      }}>
        {trackers.map((tracker, i) => {
          const color = TRACKER_COLORS[tracker.type] ?? TRACKER_COLORS.custom
          const isLast = i === trackers.length - 1
          const isOdd  = trackers.length % 2 !== 0
          const fields = tracker.fields.slice(0, 6)

          // Pair fields into rows of 2
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
                padding: '12px 13px',
                position: 'relative',
                overflow: 'hidden',
                gridColumn: (isLast && isOdd) ? '1 / -1' : undefined,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.025) 0%, transparent 55%)', pointerEvents: 'none' }} />

              {/* Tracker label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontFamily: F_UI, fontSize: '7.5px', letterSpacing: '2px', textTransform: 'uppercase', color }}>{tracker.name}</span>
              </div>

              {/* Field rows — compact, no empty space */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rows.map(([left, right], ri) => (
                  <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px' }}>
                    <div>
                      <div style={{ fontFamily: F_SANS, fontSize: '7px', color: '#2a5a70', marginBottom: '2px' }}>{left.label}</div>
                      <div style={{ fontFamily: F_MONO, fontSize: left.isKey ? '15px' : '11px', color: left.isKey ? color : '#b8cad8', letterSpacing: '0.03em', lineHeight: 1.15, wordBreak: 'break-word' }}>
                        {left.value}
                      </div>
                    </div>
                    {right && (
                      <div>
                        <div style={{ fontFamily: F_SANS, fontSize: '7px', color: '#2a5a70', marginBottom: '2px' }}>{right.label}</div>
                        <div style={{ fontFamily: F_MONO, fontSize: right.isKey ? '15px' : '11px', color: right.isKey ? color : '#b8cad8', letterSpacing: '0.03em', lineHeight: 1.15, wordBreak: 'break-word' }}>
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

      {/* Correlations */}
      {correlations.length > 0 && (
        <div style={{
          background: '#152e47',
          border: '1px solid rgba(0,212,255,0.12)',
          borderTop: '2px solid #00d4ff',
          borderRadius: '14px',
          padding: '11px 14px',
          marginTop: '8px',
          flexShrink: 0,
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '9px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00d4ff' }} />
            <span style={{ fontFamily: F_UI, fontSize: '7.5px', letterSpacing: '2px', textTransform: 'uppercase', color: '#00d4ff' }}>Correlations</span>
          </div>

          {useGrid ? (
            <div style={{ display: 'flex' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leftPair.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontFamily: F_SANS, fontSize: '9px', color: '#4a7a9b', flex: 1 }}>{c.name}</span>
                    <span style={{ fontFamily: F_MONO, fontSize: '11px', color: c.value === '---' ? '#2a5a70' : '#00d4ff', letterSpacing: '0.04em', flexShrink: 0 }}>{c.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 12px' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rightPair.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontFamily: F_SANS, fontSize: '9px', color: '#4a7a9b', flex: 1 }}>{c.name}</span>
                    <span style={{ fontFamily: F_MONO, fontSize: '11px', color: c.value === '---' ? '#2a5a70' : '#00d4ff', letterSpacing: '0.04em', flexShrink: 0 }}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {correlations.map((c, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: i > 0 ? '7px' : '0',
                  paddingBottom: i < correlations.length - 1 ? '7px' : '0',
                  borderBottom: i < correlations.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{ fontFamily: F_SANS, fontSize: '10px', color: '#4a7a9b' }}>{c.name}</span>
                  <span style={{ fontFamily: F_MONO, fontSize: '12px', color: c.value === '---' ? '#2a5a70' : '#00d4ff', letterSpacing: '0.04em' }}>{c.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '12px', flexShrink: 0 }}>
        <div style={{ fontFamily: F_DISPLAY, fontWeight: 900, fontSize: '10px', color: '#00d4ff', letterSpacing: '4px', textTransform: 'uppercase' }}>YAHA</div>
        <div style={{ fontFamily: F_UI, fontSize: '7px', color: '#1e3a4a', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '3px' }}>Your data · Your evolution</div>
      </div>
    </div>
  )
})

JournalShareCard.displayName = 'JournalShareCard'
