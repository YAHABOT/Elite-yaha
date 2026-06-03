'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import type { Summary, SummaryType } from '@/types/summary'

function formatPeriod(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const sStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  const eStr = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  return `${sStr} – ${eStr}`
}

function getScoreColor(score?: number): string {
  if (!score) return 'rgba(148,163,184,0.4)'
  if (score >= 80) return '#00d4ff'
  if (score >= 60) return '#10b981'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function getScoreLabel(score?: number): string | null {
  if (!score) return null
  if (score >= 90) return 'EXCELLENT'
  if (score >= 80) return 'GREAT'
  if (score >= 60) return 'GOOD'
  if (score >= 40) return 'FAIR'
  return 'LOW'
}

type ReportProps = { summary: Summary }

function FullReport({ summary }: ReportProps): React.ReactElement {
  const { content } = summary
  const scoreColor = getScoreColor(content.score)
  const scoreLabel = getScoreLabel(content.score)
  const metricPairs = content.metrics.reduce<Array<typeof content.metrics>>((acc, _, i) => {
    if (i % 2 === 0) acc.push(content.metrics.slice(i, i + 2))
    return acc
  }, [])

  return (
    <div className="flex flex-col gap-5 pb-24">
      {/* Score ring */}
      {content.score !== undefined && (
        <div
          className="flex items-center gap-5 rounded-2xl border p-5"
          style={{ borderColor: `${scoreColor}30`, background: `linear-gradient(135deg, ${scoreColor}10, #0A0A0A 65%)` }}
        >
          <div className="relative flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <circle
                cx="40" cy="40" r="32"
                fill="none" stroke={scoreColor} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${(content.score / 100) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`}
                transform="rotate(-90 40 40)"
                style={{ filter: `drop-shadow(0 0 6px ${scoreColor}60)`, transition: 'stroke-dasharray 0.9s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono font-black leading-none" style={{ fontSize: '22px', color: scoreColor }}>{content.score}</span>
              <span className="font-ui" style={{ fontSize: '7px', letterSpacing: '0.10em', color: `${scoreColor}80` }}>/ 100</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {scoreLabel && (
              <span className="self-start rounded-full px-2.5 py-0.5 font-ui uppercase" style={{ fontSize: '8px', letterSpacing: '0.15em', background: `${scoreColor}20`, border: `1px solid ${scoreColor}44`, color: scoreColor }}>
                {scoreLabel}
              </span>
            )}
            <span className="font-display-heading text-xl text-textPrimary leading-none">{content.score} / 100</span>
          </div>
        </div>
      )}

      {/* Coach summary */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="font-ui uppercase mb-3" style={{ fontSize: '8px', letterSpacing: '0.18em', color: 'rgba(148,163,184,0.4)' }}>
          COACH SUMMARY
        </p>
        <p className="font-display-heading text-sm text-textPrimary leading-relaxed">{content.coachSummary}</p>
      </div>

      {/* Metrics grid */}
      {content.metrics.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="font-ui uppercase" style={{ fontSize: '8px', letterSpacing: '0.18em', color: 'rgba(148,163,184,0.4)' }}>
              METRICS
            </p>
          </div>
          {metricPairs.map((pair, ri) => (
            <div key={ri} className="grid grid-cols-2 border-t border-white/[0.04]">
              {pair.map((m, ci) => (
                <div
                  key={ci}
                  className={`flex flex-col gap-1 p-4 ${ci === 1 ? 'border-l border-white/[0.04]' : ''}`}
                >
                  <p className="font-ui uppercase text-textMuted/40" style={{ fontSize: '7.5px', letterSpacing: '0.14em' }}>{m.label}</p>
                  <p className="font-mono font-bold text-textPrimary" style={{ fontSize: '18px' }}>
                    {m.value}{m.unit ? <span className="font-ui text-xs text-textMuted/50 ml-1">{m.unit}</span> : null}
                  </p>
                  {m.delta && (
                    <p className="font-ui" style={{ fontSize: '8px', letterSpacing: '0.08em', color: m.delta.startsWith('+') ? '#10b981' : m.delta.startsWith('-') ? '#ef4444' : 'rgba(148,163,184,0.4)' }}>
                      {m.delta} vs prev
                    </p>
                  )}
                </div>
              ))}
              {pair.length === 1 && <div className="border-l border-white/[0.04]" />}
            </div>
          ))}
        </div>
      )}

      {/* Highlights */}
      {content.highlights.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="font-ui uppercase mb-3" style={{ fontSize: '8px', letterSpacing: '0.18em', color: 'rgba(148,163,184,0.4)' }}>
            HIGHLIGHTS
          </p>
          <ul className="space-y-2">
            {content.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-[#00d4ff]/60" />
                <span className="font-display-heading text-sm text-textPrimary">{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

type Props = {
  summaries: Summary[]
  type: SummaryType
}

export function SummaryReportView({ summaries, type }: Props): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(summaries[0]?.id ?? null)
  const selected = summaries.find(s => s.id === selectedId)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Link
          href="/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-textMuted transition-all hover:border-white/20 hover:text-textPrimary"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="font-ui uppercase" style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(148,163,184,0.4)' }}>
            {type === 'weekly' ? 'WEEKLY' : 'MONTHLY'} SUMMARIES
          </p>
          <h1 className="font-display-heading text-base text-textPrimary leading-tight">
            {selected ? formatPeriod(selected.period_start, selected.period_end) : 'AI Reports'}
          </h1>
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center px-6">
          <p className="font-ui text-textMuted/40 uppercase" style={{ fontSize: '9px', letterSpacing: '0.14em' }}>No summaries yet</p>
          <p className="font-display-heading text-sm text-textMuted/60">
            Enable {type} summaries in{' '}
            <Link href="/settings/summaries" className="text-[#00d4ff]/70 hover:text-[#00d4ff]">Settings → AI Summaries</Link>
            {' '}to start receiving AI reports.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-0 px-4">
          {/* Period selector list */}
          <div className="flex flex-col gap-2 pb-4">
            {summaries.map((s, i) => {
              const isSelected = s.id === selectedId
              const scoreColor = getScoreColor(s.content.score)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : s.id)}
                  className="flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all"
                  style={{
                    borderColor: isSelected ? `${scoreColor}40` : 'rgba(255,255,255,0.06)',
                    background: isSelected ? `${scoreColor}08` : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-display-heading text-sm text-textPrimary leading-tight">
                        {formatPeriod(s.period_start, s.period_end)}
                      </span>
                      {i === 0 && (
                        <span className="rounded-full px-2 py-0.5 font-ui uppercase" style={{ fontSize: '7px', letterSpacing: '0.12em', background: 'rgba(0,212,255,0.10)', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff' }}>
                          LATEST
                        </span>
                      )}
                    </div>
                    <span className="font-ui text-textMuted/40" style={{ fontSize: '8px', letterSpacing: '0.08em' }}>
                      Generated {new Date(s.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.content.score !== undefined && (
                      <span className="font-mono font-bold" style={{ fontSize: '16px', color: scoreColor }}>
                        {s.content.score}
                      </span>
                    )}
                    {isSelected
                      ? <ChevronUp className="h-4 w-4 text-textMuted/40" />
                      : <ChevronDown className="h-4 w-4 text-textMuted/40" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Expanded report */}
          {selected && <FullReport summary={selected} />}
        </div>
      )}
    </div>
  )
}
