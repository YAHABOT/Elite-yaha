'use client'

import type { UserTarget } from '@/lib/db/users'

type Props = {
  score: number | null
  targets: UserTarget[]
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

export function ScoreCard({ score, targets }: Props): React.ReactElement {
  const numericTargets = targets.filter(
    t => ['number', 'rating', 'duration'].includes(t.fieldType)
  )
  const hasTargets = numericTargets.length > 0

  const r = 36
  const circ = 2 * Math.PI * r
  const pct = score !== null ? Math.min(score, 100) : 0
  const dash = (pct / 100) * circ
  const color = score !== null ? getScoreColor(score) : '#334155'

  // Match WidgetCard's exact theme pattern: bg-surface base + gradient overlay
  const borderHex = `${color}33`
  const glowHex = `${color}1A`

  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-surface px-4 py-3 backdrop-blur-sm"
      style={{
        borderColor: borderHex,
        background: `linear-gradient(135deg, ${glowHex} 0%, #0A0A0A 60%)`,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Ring — compact */}
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            {score !== null && (
              <circle
                cx="44" cy="44" r={r}
                fill="none"
                stroke={color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                transform="rotate(-90 44 44)"
                style={{
                  filter: `drop-shadow(0 0 6px ${color}70)`,
                  transition: 'stroke-dasharray 0.9s ease',
                }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {score !== null ? (
              <>
                <span className="font-mono leading-none" style={{ fontSize: '22px', fontWeight: 900, color }}>
                  {score}
                </span>
                <span className="font-ui uppercase mt-0.5" style={{ fontSize: '6.5px', letterSpacing: '0.07em', color: `${color}90` }}>
                  {getScoreLabel(score)}
                </span>
              </>
            ) : (
              <span className="font-mono text-lg" style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }} />
            <span className="font-ui uppercase truncate" style={{ fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(148,163,184,0.5)' }}>
              Daily Score
            </span>
          </div>

          {score !== null ? (
            <>
              <span className="font-display-heading text-lg text-textPrimary leading-tight">
                {score} / 100
              </span>
              <span className="font-ui leading-snug" style={{ fontSize: '8px', letterSpacing: '0.06em', color: 'rgba(148,163,184,0.4)' }}>
                {numericTargets.length} target{numericTargets.length !== 1 ? 's' : ''} tracked today
              </span>
            </>
          ) : hasTargets ? (
            <span className="font-display-heading text-sm text-textPrimary/60 leading-tight">Nothing logged yet</span>
          ) : (
            <>
              <span className="font-display-heading text-sm text-textPrimary/40 leading-tight">No targets set</span>
              <a href="/settings/targets/new" className="font-ui transition-opacity hover:opacity-70" style={{ fontSize: '8px', letterSpacing: '0.10em', color: '#00d4ff' }}>
                + Add a target →
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
