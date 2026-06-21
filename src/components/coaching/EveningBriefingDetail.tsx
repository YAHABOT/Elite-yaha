'use client'

import { useState } from 'react'
import type { EveningBriefingDetail, ReadinessColor } from '@/app/actions/coaching'
import {
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  Utensils,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { MarkdownBlock } from '@/components/chat/MarkdownBlock'

// ── Helpers ──────────────────────────────────────────────────────────────────
function replaceColorEmojis(text: string): string {
  if (!text) return ''
  return text
    .replace(/\(YELLOW\)/gi, '🟡')
    .replace(/\(GREEN\)/gi, '🟢')
    .replace(/\(RED\)/gi, '🔴')
}

function parseBulletPoints(markdown: string) {
  if (!markdown) return []
  const lines = markdown.split('\n')
  const bullets: { title: string; content: string }[] = []
  
  for (const line of lines) {
    let trimmed = line.trim()
    if (!trimmed) continue
    
    let isBullet = false
    if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
      trimmed = trimmed.substring(1).trim()
      isBullet = true
    } else if (trimmed.startsWith('**')) {
      isBullet = true
    }
    
    if (isBullet) {
      const match = trimmed.match(/^\*\*(.*?)(?::)?\*\*(?::)?(.*)$/)
      if (match) {
        bullets.push({
          title: match[1].trim(),
          content: match[2].trim(),
        })
      } else {
        bullets.push({
          title: '',
          content: trimmed,
        })
      }
    } else {
      if (bullets.length > 0) {
        bullets[bullets.length - 1].content += '\n' + trimmed
      } else {
        bullets.push({
          title: '',
          content: trimmed,
        })
      }
    }
  }
  return bullets
}

function readinessColorClass(color: ReadinessColor | null): string {
  if (color === 'GREEN') return 'text-emerald-400'
  if (color === 'RED') return 'text-red-400'
  return 'text-amber-400'
}

function readinessDotClass(color: ReadinessColor | null): string {
  if (color === 'GREEN') return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
  if (color === 'RED') return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
  return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
}

function strainColorClass(strain: number | null): string {
  if (!strain) return 'text-white/40'
  if (strain >= 14.0) return 'text-purple-400'
  if (strain >= 8.0) return 'text-indigo-400'
  return 'text-sky-400'
}

function strainLabel(strain: number | null): string {
  if (!strain) return 'N/A'
  if (strain >= 14.0) return 'HIGH'
  if (strain >= 8.0) return 'MODERATE'
  return 'LOW'
}

// ── Components ───────────────────────────────────────────────────────────────
function SectionCard({
  icon,
  title,
  children,
  accentColor = 'text-purple-400',
  borderColor = 'border-purple-500/20',
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  accentColor?: string
  borderColor?: string
}) {
  return (
    <div className={`rounded-2xl bg-white/3 border ${borderColor} overflow-hidden`}>
      <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${borderColor} bg-white/3`}>
        <span className={accentColor}>{icon}</span>
        <span className={`text-xs font-black tracking-widest uppercase ${accentColor}`}>
          {title}
        </span>
      </div>
      <div className="px-4 py-4 text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
        {typeof children === 'string' ? (
          <MarkdownBlock content={replaceColorEmojis(children)} />
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function FuelProgressBar({
  label,
  actual,
  target,
  unit = 'g',
  isProtein = false,
}: {
  label: string
  actual: number | null
  target: number | null
  unit?: string
  isProtein?: boolean
}) {
  const act = actual ?? 0
  const tgt = target ?? 0
  const percent = tgt > 0 ? Math.min(100, Math.round((act / tgt) * 100)) : 0
  const isCompliant = act >= tgt

  const barColor = isCompliant 
    ? 'bg-emerald-500' 
    : isProtein ? 'bg-indigo-500' : 'bg-purple-500'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline text-xs">
        <span className="font-semibold text-white/70">{label}</span>
        <span className="font-mono text-white/50">
          <strong className="text-white font-bold">{act}{unit}</strong> / {tgt}{unit} ({percent}%)
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-white/5 overflow-hidden border border-white/5">
        <div 
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold">
        {isCompliant ? (
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={10} /> Target Met
          </span>
        ) : (
          <span className="text-white/40 flex items-center gap-1">
            <XCircle size={10} /> {tgt - act}g Remaining
          </span>
        )}
      </div>
    </div>
  )
}

export function EveningBriefingDetail({ brief }: { brief: EveningBriefingDetail }) {
  const [logsOpen, setLogsOpen] = useState(false)
  const [foodOpen, setFoodOpen] = useState(false)

  const strainColor = strainColorClass(brief.strainScore)
  const readinessColor = readinessColorClass(brief.recoveryColor)

  const hasWorkouts = brief.workoutLogs.length > 0 || brief.runningLogs.length > 0 || brief.benchmarkLogs.length > 0
  const hasFood = brief.foodLogs.length > 0

  // ── Custom section renderers ───────────────────────────────────────────────

  const renderWorkoutSummaryContent = () => {
    return (
      <div className="space-y-4">
        {/* Collapsed Live Workout Tracker Prompt summary (if exists) */}
        {brief.workoutSummary && (
          <details className="group border border-white/5 bg-white/2 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors bg-white/2 select-none hover:bg-white/5">
              <strong className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Timer size={12} className="text-purple-400" /> Live Tracker Log
              </strong>
              <span className="transition-transform duration-200 group-open:rotate-180 text-white/40">
                <ChevronDown size={14} />
              </span>
            </summary>
            <div className="px-3 py-3 border-t border-white/5 text-xs text-white/70 leading-relaxed whitespace-pre-wrap font-mono">
              {brief.workoutSummary}
            </div>
          </details>
        )}

        {/* AI-Generated Workout Summary parsed bullets */}
        {hasWorkouts && (
          <div className="space-y-4">
            {/* The rest is just standard text block summary or parsed bullets */}
            {brief.workoutLogs.map((wl, idx) => (
              <div key={`w-${idx}`} className="space-y-1">
                <strong className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Dumbbell size={12} className="text-purple-400" /> {wl.session_name || 'Workout'}
                </strong>
                <div className="text-sm text-white/80 leading-relaxed pl-4">
                  Duration: {wl.duration_min} mins | Avg HR: {wl.avg_hr || '—'} bpm | Zone 2: {Math.round(wl.zone2_min)}m | Zone 4: {Math.round(wl.zone4_min)}m
                  {wl.notes && <p className="text-xs text-white/50 italic mt-1">Notes: {wl.notes}</p>}
                </div>
              </div>
            ))}
            {brief.runningLogs.map((rl, idx) => (
              <div key={`r-${idx}`} className="space-y-1">
                <strong className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-purple-400" /> {rl.session_name || 'Running'}
                </strong>
                <div className="text-sm text-white/80 leading-relaxed pl-4">
                  Distance: {rl.distance_km} km | Duration: {rl.duration_min} mins | Pace: {rl.avg_pace_min_km || '—'} /km | Cadence: {rl.avg_cadence || '—'} rpm
                  {rl.notes && <p className="text-xs text-white/50 italic mt-1">Notes: {rl.notes}</p>}
                </div>
              </div>
            ))}
            {brief.benchmarkLogs.map((bl, idx) => (
              <div key={`b-${idx}`} className="space-y-1">
                <strong className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={12} className="text-orange-400" /> Benchmark: {bl.station_name}
                </strong>
                <div className="text-sm text-white/80 leading-relaxed pl-4">
                  Time: {bl.time_seconds}s | Weight: {bl.weight_kg} kg | RPE: {bl.rpe}
                  {bl.notes && <p className="text-xs text-white/50 italic mt-1">Notes: {bl.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderVerdictContent = () => {
    if (!brief.postWorkoutVerdict) return null
    const bullets = parseBulletPoints(brief.postWorkoutVerdict)

    return (
      <div className="space-y-4">
        {bullets.map((b, idx) => {
          const titleLower = b.title.toLowerCase()
          const isCollapsible = titleLower.includes('recovery & sleep protocol') || titleLower.includes('recovery and sleep')

          if (isCollapsible) {
            return (
              <details key={idx} open className="group border border-white/5 bg-white/2 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors bg-white/2 select-none hover:bg-white/5">
                  <strong className="font-extrabold text-white text-xs uppercase tracking-wider">
                    {b.title}
                  </strong>
                  <span className="transition-transform duration-200 group-open:rotate-180 text-white/40">
                    <ChevronDown size={14} />
                  </span>
                </summary>
                <div className="px-3 py-3 border-t border-white/5 text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                  <MarkdownBlock content={replaceColorEmojis(b.content)} />
                </div>
              </details>
            )
          }

          return (
            <div key={idx} className="space-y-1">
              {b.title && (
                <strong className="font-extrabold text-white text-xs uppercase tracking-wider block">
                  {b.title}
                </strong>
              )}
              <div className="text-sm text-white/80 leading-relaxed">
                <MarkdownBlock content={replaceColorEmojis(b.content)} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-4">
      {/* ── Date Header ───────────────────────────────────────────────────────── */}
      <div className="text-xs font-mono text-textMuted tracking-wider uppercase">
        {brief.date.toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>

      {/* ── Strain vs. Readiness Hero Card ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Strain Score */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-900/20 to-purple-900/5 border border-purple-500/30 p-5">
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">
            Workout Strain
          </p>
          <p className={`text-4xl font-black tabular-nums ${strainColor}`}>
            {brief.strainScore != null ? `${brief.strainScore}` : '—'}
          </p>
          <p className="text-[10px] font-bold tracking-widest mt-1 text-white/40 uppercase">
            {strainLabel(brief.strainScore)} INTENSITY
          </p>
        </div>

        {/* Readiness Score */}
        <div className="rounded-2xl bg-gradient-to-br from-white/3 to-white/[0.01] border border-white/10 p-5">
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">
            Morning Readiness
          </p>
          <div className="flex items-center gap-2">
            <p className={`text-4xl font-black tabular-nums text-white`}>
              {brief.recoveryScore != null ? `${brief.recoveryScore}%` : '—'}
            </p>
            {brief.recoveryColor && (
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${readinessDotClass(brief.recoveryColor)}`} />
            )}
          </div>
          <p className={`text-[10px] font-bold tracking-widest mt-1 uppercase ${readinessColor}`}>
            {brief.recoveryColor || 'UNKNOWN'} ZONE
          </p>
        </div>
      </div>

      {/* ── Fueling Progress Bars Card ────────────────────────────────────────── */}
      <SectionCard 
        icon={<Utensils size={14} />} 
        title="Fueling Compliance Assessment" 
        accentColor="text-purple-400"
        borderColor="border-purple-500/20"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pre-Workout Fueling */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
              Pre-Workout Fueling
            </h4>
            <FuelProgressBar 
              label="Pre-Workout Carbs" 
              actual={brief.actualCarbsPre} 
              target={brief.targetCarbsPre} 
            />
            <FuelProgressBar 
              label="Pre-Workout Protein" 
              actual={brief.actualProteinPre} 
              target={brief.targetProteinPre} 
              isProtein
            />
          </div>

          {/* Post-Workout Fueling */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
              Post-Workout Fueling
            </h4>
            <FuelProgressBar 
              label="Post-Workout Carbs" 
              actual={brief.actualCarbsPost} 
              target={brief.targetCarbsPost} 
            />
            <FuelProgressBar 
              label="Post-Workout Protein" 
              actual={brief.actualProteinPost} 
              target={brief.targetProteinPost} 
              isProtein
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Workout Summary Card ──────────────────────────────────────────────── */}
      {hasWorkouts && (
        <SectionCard 
          icon={<Dumbbell size={14} />} 
          title="Workout & Performance Summary" 
          accentColor="text-purple-400"
          borderColor="border-purple-500/20"
        >
          {renderWorkoutSummaryContent()}
        </SectionCard>
      )}

      {/* ── Coach's Verdict Card ──────────────────────────────────────────────── */}
      {brief.postWorkoutVerdict && (
        <SectionCard 
          icon={<Activity size={14} />} 
          title="Coach's Evening Verdict" 
          accentColor="text-purple-400"
          borderColor="border-purple-500/20"
        >
          {renderVerdictContent()}
        </SectionCard>
      )}

      {/* ── Logged Data Accordions ────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Training/Running Logs detail list */}
        {hasWorkouts && (
          <div className="rounded-2xl border border-white/5 bg-white/2 overflow-hidden">
            <button
              onClick={() => setLogsOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 text-left transition-colors"
            >
              <span className="text-xs font-black tracking-widest uppercase text-white/60 flex items-center gap-2">
                <Dumbbell size={12} className="text-purple-400" /> Today&apos;s Raw Workout Logs ({brief.workoutLogs.length + brief.runningLogs.length + brief.benchmarkLogs.length})
              </span>
              {logsOpen ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
            </button>
            {logsOpen && (
              <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3 text-xs font-mono text-white/70">
                {brief.workoutLogs.map((wl, idx) => (
                  <div key={idx} className="pb-3 border-b border-white/5 last:border-b-0">
                    <p className="font-bold text-white">{wl.session_name || 'Workout'}</p>
                    <p className="mt-1 text-white/50">Logged at {wl.logged_at.split('T')[1].substring(0, 5)}</p>
                    <ul className="mt-2 space-y-1 pl-3 list-disc">
                      <li>Duration: {wl.duration_min} mins</li>
                      <li>Avg HR: {wl.avg_hr} bpm</li>
                      <li>Zone 2: {wl.zone2_min} mins | Zone 4: {wl.zone4_min} mins</li>
                      {wl.notes && <li className="italic">Notes: {wl.notes}</li>}
                    </ul>
                  </div>
                ))}
                {brief.runningLogs.map((rl, idx) => (
                  <div key={idx} className="pb-3 border-b border-white/5 last:border-b-0">
                    <p className="font-bold text-white">{rl.session_name || 'Run'}</p>
                    <p className="mt-1 text-white/50">Logged at {rl.logged_at.split('T')[1].substring(0, 5)}</p>
                    <ul className="mt-2 space-y-1 pl-3 list-disc">
                      <li>Distance: {rl.distance_km} km</li>
                      <li>Duration: {rl.duration_min} mins</li>
                      <li>Pace: {rl.avg_pace_min_km} /km | Cadence: {rl.avg_cadence} rpm</li>
                      {rl.notes && <li className="italic">Notes: {rl.notes}</li>}
                    </ul>
                  </div>
                ))}
                {brief.benchmarkLogs.map((bl, idx) => (
                  <div key={idx} className="pb-3 border-b border-white/5 last:border-b-0">
                    <p className="font-bold text-white">Benchmark: {bl.station_name}</p>
                    <p className="mt-1 text-white/50">Logged at {bl.logged_at.split('T')[1].substring(0, 5)}</p>
                    <ul className="mt-2 space-y-1 pl-3 list-disc">
                      <li>Time: {bl.time_seconds}s</li>
                      <li>Weight: {bl.weight_kg} kg | RPE: {bl.rpe}</li>
                      {bl.notes && <li className="italic">Notes: {bl.notes}</li>}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Food Logs list */}
        {hasFood && (
          <div className="rounded-2xl border border-white/5 bg-white/2 overflow-hidden">
            <button
              onClick={() => setFoodOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 text-left transition-colors"
            >
              <span className="text-xs font-black tracking-widest uppercase text-white/60 flex items-center gap-2">
                <Utensils size={12} className="text-purple-400" /> Today&apos;s Raw Food Logs ({brief.foodLogs.length})
              </span>
              {foodOpen ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
            </button>
            {foodOpen && (
              <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3 text-xs font-mono text-white/70">
                {brief.foodLogs.map((fl, idx) => (
                  <div key={idx} className="pb-2 border-b border-white/5 last:border-b-0 flex justify-between items-start gap-4">
                    <div>
                      <p className="font-bold text-white">{fl.notes || fl.meal_type || 'Food'}</p>
                      <p className="text-[10px] text-white/40 uppercase mt-0.5">{fl.meal_type}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-white">{fl.calories} kcal</p>
                      <p className="text-[10px] text-white/50">C:{fl.carbs_g}g | P:{fl.protein_g}g | F:{fl.fat_g}g</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
