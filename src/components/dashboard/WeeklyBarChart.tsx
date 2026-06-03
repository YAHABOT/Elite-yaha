'use client'

import { useState } from 'react'
import type { DayScore } from '@/lib/db/dashboard-data'

type Props = {
  dayScores: DayScore[]  // 30 values, oldest→newest
}

type Mode = 'rolling' | 'this_week' | 'last_week'
type RollingN = 3 | 7 | 14 | 30

function getBarColor(score: number, hasTargets: boolean, isToday: boolean): string {
  if (!hasTargets) return isToday ? 'rgba(100,116,139,0.8)' : 'rgba(100,116,139,0.35)'
  if (score <= 0) return 'rgba(255,255,255,0.05)'
  const base = score >= 80 ? '#00d4ff' : score >= 60 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  return isToday ? base : `${base}99`
}

function getWeekSlice(dayScores: DayScore[], offsetWeeks: number): DayScore[] {
  const today = new Date()
  const dow = today.getDay()
  const mondayOffset = (dow === 0 ? -6 : 1 - dow) + offsetWeeks * 7
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)

  const result: DayScore[] = []
  const hasTargets = dayScores[0]?.hasTargets ?? false
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const found = dayScores.find(ds => ds.date === dateStr)
    const label = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    result.push(found ?? { date: dateStr, label, score: 0, logCount: 0, hasTargets })
  }
  return result
}

/** "D" for same month as first visible date, "D/M" for cross-month entries */
function getBarLabel(dateStr: string, firstDateStr: string): string {
  if (!dateStr || !firstDateStr) return ''
  const [, m, d] = dateStr.split('-')
  const [, fm] = firstDateStr.split('-')
  const day = parseInt(d, 10)
  return m !== fm ? `${day}/${parseInt(m, 10)}` : String(day)
}

export function WeeklyBarChart({ dayScores }: Props): React.ReactElement {
  const [mode, setMode] = useState<Mode>('rolling')
  const [rollingN, setRollingN] = useState<RollingN>(7)

  const displayScores: DayScore[] =
    mode === 'this_week' ? getWeekSlice(dayScores, 0) :
    mode === 'last_week' ? getWeekSlice(dayScores, -1) :
    dayScores.slice(-rollingN)

  const hasTargets = displayScores.some(d => d.hasTargets)
  const maxVal = hasTargets ? 100 : Math.max(...displayScores.map(d => d.logCount), 1)
  const firstDateStr = displayScores[0]?.date ?? ''

  const tabBase = 'font-ui rounded-full px-2 py-0.5 transition-all duration-200'
  const tabActive = `${tabBase} bg-white/10 text-textPrimary`
  const tabInactive = `${tabBase} text-textMuted/40 hover:text-textMuted/60`

  return (
    <div
      className="rounded-2xl border bg-surface p-4 backdrop-blur-sm"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div className="mb-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="font-ui uppercase" style={{ fontSize: '9px', letterSpacing: '0.16em', color: 'rgba(148,163,184,0.45)' }}>
            {hasTargets ? 'Target Completion' : 'Logs Per Day'}
          </span>
          <div className="flex items-center gap-0.5" style={{ fontSize: '9px', letterSpacing: '0.07em' }}>
            <button type="button" onClick={() => setMode('rolling')} className={mode === 'rolling' ? tabActive : tabInactive}>Rolling</button>
            <button type="button" onClick={() => setMode('this_week')} className={mode === 'this_week' ? tabActive : tabInactive}>This Wk</button>
            <button type="button" onClick={() => setMode('last_week')} className={mode === 'last_week' ? tabActive : tabInactive}>Last Wk</button>
          </div>
        </div>
        {mode === 'rolling' && (
          <div className="flex items-center gap-0.5" style={{ fontSize: '9px', letterSpacing: '0.07em' }}>
            {([3, 7, 14, 30] as RollingN[]).map(n => (
              <button key={n} type="button" onClick={() => setRollingN(n)} className={rollingN === n ? tabActive : tabInactive}>{n}d</button>
            ))}
          </div>
        )}
      </div>

      {/* Bars — relative wrapper so dashed line can sit at the top */}
      <div className="relative">
        {/* Dashed 100% target line */}
        {hasTargets && (
          <div className="absolute left-0 right-0 top-0 flex items-center pointer-events-none" style={{ zIndex: 1 }}>
            <div
              className="flex-1"
              style={{
                height: '1px',
                backgroundImage: 'repeating-linear-gradient(to right,rgba(0,212,255,0.45) 0,rgba(0,212,255,0.45) 4px,transparent 4px,transparent 9px)',
              }}
            />
            <span className="ml-1.5 flex-shrink-0 font-ui" style={{ fontSize: '7px', letterSpacing: '0.12em', color: 'rgba(0,212,255,0.75)' }}>
              TARGET 100
            </span>
          </div>
        )}

        {/* Bars row — paddingTop reserves space so 100% bars never reach the dashed line label */}
        <div className="flex items-end gap-px" style={{ height: '52px', paddingTop: '14px' }}>
          {displayScores.map((ds, i) => {
            const val = hasTargets ? ds.score : ds.logCount
            const heightPct = maxVal > 0 ? (val / maxVal) * 100 : 0
            const isToday = ds.label === 'TODAY'
            const barColor = getBarColor(ds.score, ds.hasTargets, isToday)

            return (
              <div key={ds.date ?? i} className="flex flex-1 items-end justify-center" style={{ height: '48px' }}>
                <div
                  className="transition-all duration-700"
                  style={{
                    width: '68%',
                    minWidth: '3px',
                    height: `${Math.max(heightPct, val > 0 ? 8 : 2)}%`,
                    background: val > 0 ? barColor : 'rgba(255,255,255,0.05)',
                    borderRadius: '4px 4px 3px 3px',
                    boxShadow: isToday && val > 0 ? `0 0 10px ${barColor}90, 0 2px 4px ${barColor}30` : undefined,
                    opacity: isToday ? 1 : 0.82,
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Date labels row */}
        <div className="flex gap-px mt-1">
          {displayScores.map((ds, i) => {
            const isToday = ds.label === 'TODAY'
            const label = firstDateStr ? getBarLabel(ds.date ?? '', firstDateStr) : String(i + 1)
            return (
              <div key={`lbl-${ds.date ?? i}`} className="flex flex-1 justify-center">
                <span
                  className="font-ui leading-none"
                  style={{
                    fontSize: '6.5px',
                    color: isToday ? '#94a3b8' : 'rgba(100,116,139,0.45)',
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
