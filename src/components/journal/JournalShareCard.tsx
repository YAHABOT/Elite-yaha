'use client'

import { forwardRef } from 'react'

const F_DISPLAY = 'var(--font-orbitron), monospace'
const F_UI = 'var(--font-audiowide), system-ui, sans-serif'
const F_MONO = 'var(--font-share-mono), ui-monospace, monospace'
const F_SANS = 'var(--font-inter), system-ui, sans-serif'

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
        padding: '28px 22px 20px',
        overflow: 'hidden',
        fontFamily: F_SANS,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontFamily: F_UI, fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: '#2a5a70', marginBottom: '6px' }}>
          Daily Overview
        </div>
        <div style={{ fontFamily: F_DISPLAY, fontWeight: 900, fontSize: '22px', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1.2, marginBottom: '8px' }}>
          Powered by YAHA
        </div>
        <div style={{ fontFamily: F_UI, fontSize: '11px', color: '#00d4ff', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
          {formatShareDate(date)}
        </div>
        <div style={{ fontFamily: F_SANS, fontSize: '10px', color: '#1e3a4a' }}>
          The tracker that evolves with you
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '14px 0' }} />

      {/* Tracker grid — fills remaining space */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridAutoRows: '1fr',
        gap: '10px',
        minHeight: 0,
        alignContent: 'stretch',
      }}>
        {trackers.map((tracker, i) => {
          const color = TRACKER_COLORS[tracker.type] ?? TRACKER_COLORS.custom
          const isLast = i === trackers.length - 1
          const isOdd  = trackers.length % 2 !== 0
          return (
            <div
              key={i}
              style={{
                background: '#152e47',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px',
                padding: '14px',
                position: 'relative',
                overflow: 'hidden',
                gridColumn: (isLast && isOdd) ? '1 / -1' : undefined,
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', flexShrink: 0 }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontFamily: F_UI, fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase', color }}>{tracker.name}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px', flex: 1 }}>
                {tracker.fields.slice(0, 4).map((field, fi) => (
                  <div key={fi}>
                    <div style={{ fontFamily: F_SANS, fontSize: '8px', color: '#2a5a70', marginBottom: '3px' }}>{field.label}</div>
                    <div style={{ fontFamily: F_MONO, fontSize: field.isKey ? '16px' : '12px', color: field.isKey ? color : '#b8cad8', letterSpacing: '0.04em', lineHeight: 1 }}>
                      {field.value}
                    </div>
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
          padding: '13px 15px',
          marginTop: '10px',
          flexShrink: 0,
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d4ff' }} />
            <span style={{ fontFamily: F_UI, fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase', color: '#00d4ff' }}>Correlations</span>
          </div>

          {useGrid ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 0, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {leftPair.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ fontFamily: F_SANS, fontSize: '9px', color: '#4a7a9b', flex: 1, lineHeight: 1.3 }}>{c.name}</span>
                    <span style={{ fontFamily: F_MONO, fontSize: '11px', color: '#00d4ff', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{c.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch', margin: '0 12px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {rightPair.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ fontFamily: F_SANS, fontSize: '9px', color: '#4a7a9b', flex: 1, lineHeight: 1.3 }}>{c.name}</span>
                    <span style={{ fontFamily: F_MONO, fontSize: '11px', color: '#00d4ff', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{c.value}</span>
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
                  padding: '6px 0',
                  borderBottom: i < correlations.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{ fontFamily: F_SANS, fontSize: '10px', color: '#4a7a9b' }}>{c.name}</span>
                  <span style={{ fontFamily: F_MONO, fontSize: '12px', color: '#00d4ff', letterSpacing: '0.04em' }}>{c.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '14px', flexShrink: 0 }}>
        <div style={{ fontFamily: F_DISPLAY, fontWeight: 900, fontSize: '11px', color: '#00d4ff', letterSpacing: '4px', textTransform: 'uppercase' }}>YAHA</div>
        <div style={{ fontFamily: F_UI, fontSize: '7px', color: '#1e3a4a', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '3px' }}>Your data · Your evolution</div>
      </div>
    </div>
  )
})

JournalShareCard.displayName = 'JournalShareCard'
