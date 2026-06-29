'use client'

import { useState, useCallback } from 'react'
import type { MorningBriefingDetail, ReadinessColor } from '@/app/actions/coaching'
import {
  CheckCircle2,
  XCircle,
  Utensils,
  Brain,
  Zap,
  Target,
  Timer,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Activity,
  Dumbbell,
  Pill,
  Moon,
  Flame,
} from 'lucide-react'
import { MarkdownBlock } from '@/components/chat/MarkdownBlock'
import { chatEvents } from '@/lib/events/chatEvents'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  let inDetails = false
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inDetails && bullets.length > 0) {
        bullets[bullets.length - 1].content += '\n' + line
      }
      continue
    }
    
    // Track details block state to avoid breaking list items inside <details>
    if (trimmed.toLowerCase().startsWith('<details')) {
      inDetails = true
    } else if (trimmed.toLowerCase().startsWith('</details')) {
      inDetails = false
    }
    
    // Check if it's a top-level bullet point (starts with * or - and has at most 2 spaces of indentation)
    const isTopLevelBullet = !inDetails && /^\s{0,2}[\*\-]\s+/.test(line)
    // Also support lines that start with bold title: **Title:**
    const isBoldTitleLine = !inDetails && trimmed.startsWith('**') && trimmed.includes('**') && !isTopLevelBullet
    
    if (isTopLevelBullet) {
      const strippedLine = line.replace(/^\s*[\*\-]\s+/, '').trim()
      const match = strippedLine.match(/^\*\*(.*?)\*\*(?::)?(.*)$/)
      if (match) {
        bullets.push({
          title: match[1].trim(),
          content: match[2].trim(),
        })
      } else {
        bullets.push({
          title: '',
          content: strippedLine,
        })
      }
    } else if (isBoldTitleLine) {
      const match = trimmed.match(/^\*\*(.*?)\*\*(?::)?(.*)$/)
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
        bullets[bullets.length - 1].content += '\n' + line
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

function readinessGradient(color: ReadinessColor | null): string {
  if (color === 'GREEN') return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30'
  if (color === 'RED') return 'from-red-500/20 to-red-500/5 border-red-500/30'
  return 'from-amber-500/20 to-amber-500/5 border-amber-500/30'
}

function readinessTextColor(color: ReadinessColor | null): string {
  if (color === 'GREEN') return 'text-emerald-400'
  if (color === 'RED') return 'text-red-400'
  return 'text-amber-400'
}

function readinessLabel(color: ReadinessColor | null): string {
  if (color === 'GREEN') return 'GO'
  if (color === 'RED') return 'CAUTION'
  return 'MODERATE'
}


function SectionCard({
  icon,
  title,
  children,
  accentColor = 'text-cyan-400',
  borderColor = 'border-cyan-400/20',
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 border border-white/10 text-[10px] uppercase tracking-widest text-white/60 hover:text-white/90 transition-all active:scale-95"
    >
      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy Prompt'}
    </button>
  )
}

function TrackingPromptCard({
  label,
  text,
  isPm = false,
}: {
  label: string
  text: string
  isPm?: boolean
}) {
  const [open, setOpen] = useState(false)
  const accentColor = isPm ? 'text-primary' : 'text-cyan-400'
  const borderColor = isPm ? 'border-primary/20' : 'border-cyan-400/20'
  const bgColor = isPm ? 'bg-primary/5' : 'bg-cyan-400/5'
  const buttonBgColor = isPm ? 'bg-primary hover:bg-primary/90 text-primary-foreground font-black' : 'bg-cyan-500 hover:bg-cyan-600 text-black font-black'

  const handleStartTracking = () => {
    chatEvents.openChat({
      action: 'open',
      sessionId: 'new',
      initialPrompt: text,
    })
  }

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-5 space-y-4`}>
      <div className="flex items-center gap-2">
        <Timer size={15} className={accentColor} />
        <span className={`text-xs font-black tracking-widest uppercase ${accentColor}`}>
          {label}
        </span>
      </div>
      
      <p className="text-xs text-white/70 leading-relaxed">
        Press below to start the guided {isPm ? 'PM' : 'live'} workout tracking with your YAHA assistant. At the end of the workout, it will help you log it to your live workout tracker.
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          onClick={handleStartTracking}
          className={`px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-2 ${buttonBgColor}`}
        >
          <Activity size={14} className={isPm ? 'text-primary-foreground' : 'text-black'} />
          Start live tracking with YAHA
        </button>

        <button
          onClick={() => setOpen(o => !o)}
          className="px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white/80 transition-all flex items-center gap-1.5"
        >
          {open ? 'Hide Prompt Details' : 'View Prompt Details'}
        </button>
      </div>

      {open && (
        <div className={`mt-4 pt-4 border-t ${borderColor} text-xs font-mono text-white/50 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto rounded-xl bg-black/40 p-4 border border-white/5`}>
          <div className="flex justify-end mb-3">
            <CopyButton text={text} />
          </div>
          {text}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MorningBriefingDetail({ brief }: { brief: MorningBriefingDetail }) {
  const [metricsOpen, setMetricsOpen] = useState(false)

  const colorClass = readinessTextColor(brief.readinessColor)
  const gradient = readinessGradient(brief.readinessColor)

  // Compliance icon: detect failure keywords in the text
  const complianceFailed =
    brief.accountabilityComplianceCheck?.toLowerCase().includes('missed') ||
    brief.accountabilityComplianceCheck?.toLowerCase().includes('not completed') ||
    brief.accountabilityComplianceCheck?.toLowerCase().includes('skipped') ||
    brief.accountabilityComplianceCheck?.toLowerCase().includes('❌') ||
    false

  // 15 advanced metrics — only render if at least one is non-null
  const advancedMetrics: { label: string; longForm: string; value: number | null }[] = [
    { label: 'DBI', longForm: 'Digestive Burden Index', value: brief.digestiveBurdenIndex },
    { label: 'DRC', longForm: 'Digestive Recovery Clearance', value: brief.digestiveRecoveryClearance },
    { label: 'ABI', longForm: 'Autonomic Balance Index', value: brief.autonomicBalanceIndex },
    { label: 'ARE', longForm: 'Active Recovery Efficiency', value: brief.activeRecoveryEfficiency },
    { label: 'ARCI', longForm: 'Active Recovery Catalyst Index', value: brief.activeRecoveryCatalystIndex },
    { label: 'SE', longForm: 'Sleep Efficiency', value: brief.sleepEfficiency },
    { label: 'ASI-HRV', longForm: 'Alcohol Sensitivity Index (HRV)', value: brief.asiHrv },
    { label: 'ASI-REC', longForm: 'Alcohol Sensitivity Index (Recovery)', value: brief.asiRecovery },
    { label: 'ASI-RHR', longForm: 'Alcohol Sensitivity Index (RHR)', value: brief.asiRhr },
    { label: 'HTR-HRV', longForm: 'HRV Training Readiness (HRV)', value: brief.htrHrv },
    { label: 'HTR-REC', longForm: 'HRV Training Readiness (Recovery)', value: brief.htrRecovery },
    { label: 'SER', longForm: 'Sleep Extension Response', value: brief.sleepExtensionResponse },
    { label: 'SRD', longForm: 'Sickness Recovery Deficit', value: brief.sicknessRecoveryDeficit },
    { label: 'SSR', longForm: 'Soreness-to-Strain Ratio', value: brief.sorenessToStrainRatio },
    { label: 'TST', longForm: 'Training Strain Tolerance', value: brief.trainingStrainTolerance },
  ]

  const hasAdvancedMetrics = advancedMetrics.some(m => m.value != null)

  // ── Custom Section Renderers ───────────────────────────────────────────────

  const renderComplianceContent = () => {
    if (!brief.accountabilityComplianceCheck) return null
    const bullets = parseBulletPoints(brief.accountabilityComplianceCheck)
    
    return (
      <div className="space-y-4">
        {bullets.map((b, idx) => {
          const titleLower = b.title.toLowerCase()
          const isCollapsible = 
            titleLower.includes('verdict compliance') || 
            titleLower.includes('verdict') || 
            titleLower.includes('cns fatigue') || 
            titleLower.includes('cns (central nervous system) fatigue')
          
          if (isCollapsible) {
            return (
              <details key={idx} className="group border border-white/5 bg-white/2 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
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

  const renderNutritionContent = () => {
    if (!brief.previousDayNutritionAnalysis) return null
    const bullets = parseBulletPoints(brief.previousDayNutritionAnalysis)
    
    return (
      <div className="space-y-4">
        {bullets.map((b, idx) => {
          const titleLower = b.title.toLowerCase()
          const isCollapsible = 
            titleLower.includes('daily nutrition') || 
            titleLower.includes('meal analysis') || 
            titleLower.includes('nutrition analysis') || 
            titleLower.includes('food quality') || 
            titleLower.includes('nocturnal load check') ||
            titleLower.includes('nocturnal')
          
          if (isCollapsible) {
            return (
              <details key={idx} className="group border border-white/5 bg-white/2 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
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

  const renderReadinessReasoningContent = () => {
    if (!brief.readinessReasoning) return null
    const bullets = parseBulletPoints(brief.readinessReasoning)
    
    return (
      <div className="space-y-4">
        {bullets.map((b, idx) => {
          let title = b.title
          const titleLower = title.toLowerCase()
          if (
            titleLower.includes('cns reasoning') || 
            titleLower.includes('readiness reasoning') ||
            (titleLower.includes('cns') && titleLower.includes('reasoning'))
          ) {
            title = 'Readiness Reasoning'
          }
          
          const newTitleLower = title.toLowerCase()
          const isCollapsible = newTitleLower.includes('readiness reasoning')
          
          if (isCollapsible) {
            return (
              <details key={idx} className="group border border-white/5 bg-white/2 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors bg-white/2 select-none hover:bg-white/5">
                  <strong className="font-extrabold text-white text-xs uppercase tracking-wider">
                    {title}
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
              {title && (
                <strong className="font-extrabold text-white text-xs uppercase tracking-wider block">
                  {title}
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

  const renderFuelingContent = () => {
    if (!brief.preWorkoutFueling) return null
    
    const actualCarbs = brief.actualCarbsPre ?? 0
    const targetCarbs = brief.targetCarbsPre ?? 0
    let fuelingHeader = ''
    if (brief.sessionType === 'Rest Day' || !brief.targetCarbsPre) {
      fuelingHeader = 'N/A - Rest Day'
    } else if (actualCarbs >= targetCarbs) {
      fuelingHeader = `${actualCarbs}g / ${targetCarbs}g carbs consumed (Fully Fueled!)`
    } else {
      fuelingHeader = `${actualCarbs}g / ${targetCarbs}g carbs consumed (${Number((targetCarbs - actualCarbs).toFixed(1))}g more to go)`
    }
    
    return (
      <div className="space-y-4">
        <div className="font-extrabold text-white text-sm tracking-wide">
          {fuelingHeader}
        </div>
        <details className="group border border-white/5 bg-white/2 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors bg-white/2 select-none hover:bg-white/5">
            <strong className="font-extrabold text-white text-xs uppercase tracking-wider">
              Detailed Breakdown
            </strong>
            <span className="transition-transform duration-200 group-open:rotate-180 text-white/40">
              <ChevronDown size={14} />
            </span>
          </summary>
          <div className="px-3 py-3 border-t border-white/5 text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
            <MarkdownBlock content={replaceColorEmojis(brief.preWorkoutFueling)} />
          </div>
        </details>
      </div>
    )
  }

  const renderStandardContent = (text: string | null) => {
    if (!text) return null
    const bullets = parseBulletPoints(text)
    
    return (
      <div className="space-y-4">
        {bullets.map((b, idx) => (
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
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-4">
      {/* ── Date header ──────────────────────────────────────────────────────── */}
      <div className="text-xs font-mono text-textMuted tracking-wider uppercase">
        {brief.date.toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>

      {/* ── Readiness Score — hero card ───────────────────────────────────────*/}
      <div className={`rounded-2xl bg-gradient-to-br ${gradient} border p-5`}>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">
            Readiness Score
          </p>
          <p className={`text-5xl font-black tabular-nums ${colorClass}`}>
            {brief.readinessScore != null ? `${brief.readinessScore}%` : '—'}
          </p>
          <p className={`text-xs font-bold tracking-widest mt-1 ${colorClass} opacity-80`}>
            {readinessLabel(brief.readinessColor)} · {brief.sessionType}
          </p>
        </div>
      </div>

      {/* ── Metrics Summary Panel ─────────────────────────────────────────────*/}
      {(() => {
        const sleepFields = [
          brief.sleepScore != null && `Sleep Score: ${brief.sleepScore}`,
          brief.energyScore != null && `Energy Score: ${brief.energyScore}`,
          brief.hrv != null && `HRV: ${brief.hrv} ms`,
          brief.rhr != null && `RHR: ${brief.rhr} bpm`,
          brief.sleepDuration != null && `Actual Sleep: ${brief.sleepDuration}`,
        ].filter(Boolean) as string[]

        const foodFields = [
          brief.nutritionCals != null && `Calories: ${brief.nutritionCals} kcal`,
          brief.nutritionProtein != null && `Protein: ${brief.nutritionProtein}g`,
          brief.nutritionCarbs != null && `Carbs: ${brief.nutritionCarbs}g`,
          brief.nutritionFat != null && `Fat: ${brief.nutritionFat}g`,
        ].filter(Boolean) as string[]

        const overviewFields = [
          brief.stepsYesterday != null && `Steps: ${brief.stepsYesterday.toLocaleString()}`,
          brief.activeCals != null && `Active Calories: ${brief.activeCals} kcal`,
          brief.totalCalsYesterday != null && `Total Calories: ${brief.totalCalsYesterday.toLocaleString()} kcal`,
          brief.distanceActiveYesterday != null && `Active Distance: ${brief.distanceActiveYesterday.toFixed(2)} km`,
          brief.lastKnownWeight != null && `Last Known Weight: ${brief.lastKnownWeight.toFixed(1)} kg`,
        ].filter(Boolean) as string[]

        const supplementFields = brief.supplements.filter(Boolean)

        const hasAnyMetrics = sleepFields.length > 0 || foodFields.length > 0 || overviewFields.length > 0 || supplementFields.length > 0

        if (!hasAnyMetrics) return null

        return (
          <div className="space-y-4 rounded-2xl bg-white/3 border border-white/5 p-4">
            {/* Sleep & Biometrics */}
            {sleepFields.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1.5 font-mono">
                  <Moon size={11} className="text-cyan-400" /> Sleep &amp; Biometrics
                </p>
                <p className="text-sm font-semibold text-white/90 leading-relaxed">
                  {sleepFields.join('  |  ')}
                </p>
              </div>
            )}

            {/* Food */}
            {foodFields.length > 0 && (
              <div className="space-y-1 pt-3 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1.5 font-mono">
                  <Flame size={11} className="text-orange-400" /> Yesterday&apos;s Food
                </p>
                <p className="text-sm font-semibold text-white/90 leading-relaxed">
                  {foodFields.join('  |  ')}
                </p>
              </div>
            )}

            {/* Overview */}
            {overviewFields.length > 0 && (
              <div className="space-y-1 pt-3 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1.5 font-mono">
                  <Activity size={11} className="text-emerald-400" /> Overview
                </p>
                <p className="text-sm font-semibold text-white/90 leading-relaxed">
                  {overviewFields.join('  |  ')}
                </p>
              </div>
            )}

            {/* Supplements */}
            {supplementFields.length > 0 && (
              <div className="space-y-1 pt-3 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1.5 font-mono">
                  <Pill size={11} className="text-fuchsia-400" /> Supplements Check
                </p>
                <p className="text-sm font-semibold text-white/90 leading-relaxed">
                  {supplementFields.join('  |  ')}
                </p>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Advanced Recovery Metrics — collapsed accordion ───────────────────*/}
      {hasAdvancedMetrics && (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <button
            onClick={() => setMetricsOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/3 hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2 text-xs font-black tracking-widest uppercase text-white/60">
              <Zap size={13} className="text-amber-400" />
              Advanced Recovery Metrics
            </span>
            {metricsOpen ? (
              <ChevronUp size={14} className="text-white/40" />
            ) : (
              <ChevronDown size={14} className="text-white/40" />
            )}
          </button>

          {metricsOpen && (
            <div className="divide-y divide-white/5">
              {advancedMetrics
                .filter(m => m.value != null)
                .map(m => (
                  <div key={m.label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-white/50">
                      <span className="text-white/80 font-semibold">{m.label}</span>{' '}
                      <span className="text-white/35">({m.longForm})</span>
                    </span>
                    <span className="text-sm font-bold text-white/80 tabular-nums">
                      {m.value!.toFixed(1)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Divider ───────────────────────────────────────────────────────────*/}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-[10px] uppercase tracking-widest text-white/30">
            Written Briefing
          </span>
        </div>
      </div>

      {/* ── Accountability & Compliance ──────────────────────────────────────*/}
      {brief.accountabilityComplianceCheck && (
        <SectionCard
          icon={
            complianceFailed ? (
              <XCircle size={15} className="text-red-400" />
            ) : (
              <CheckCircle2 size={15} className="text-emerald-400" />
            )
          }
          title="Accountability & Compliance"
          accentColor={complianceFailed ? 'text-red-400' : 'text-emerald-400'}
          borderColor={complianceFailed ? 'border-red-400/20' : 'border-emerald-400/20'}
        >
          {renderComplianceContent()}
        </SectionCard>
      )}

      {/* ── Nutrition Analysis ───────────────────────────────────────────────*/}
      {brief.previousDayNutritionAnalysis && (
        <SectionCard
          icon={<Utensils size={15} />}
          title="Nutrition Analysis"
          accentColor="text-orange-400"
          borderColor="border-orange-400/20"
        >
          {renderNutritionContent()}
        </SectionCard>
      )}

      {/* ── Readiness Reasoning ──────────────────────────────────────────────*/}
      {brief.readinessReasoning && (
        <SectionCard
          icon={<Brain size={15} />}
          title="Readiness Reasoning"
          accentColor="text-violet-400"
          borderColor="border-violet-400/20"
        >
          {renderReadinessReasoningContent()}
        </SectionCard>
      )}

      {/* ── Coach's Briefing divider ──────────────────────────────────────────*/}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-[10px] uppercase tracking-widest text-cyan-400/60">
            Coach&apos;s Briefing
          </span>
        </div>
      </div>

      {/* ── Pre-Workout Fueling ──────────────────────────────────────────────*/}
      {brief.preWorkoutFueling && (
        <SectionCard
          icon={<Zap size={15} />}
          title="Pre-Workout Fueling"
          accentColor="text-cyan-400"
          borderColor="border-cyan-400/20"
        >
          {renderFuelingContent()}
        </SectionCard>
      )}

      {/* ── Elite Technique Focus ────────────────────────────────────────────*/}
      {brief.eliteTechniqueFocus && (
        <SectionCard
          icon={<Target size={15} />}
          title="Elite Technique Focus"
          accentColor="text-fuchsia-400"
          borderColor="border-fuchsia-400/20"
        >
          {renderStandardContent(brief.eliteTechniqueFocus)}
        </SectionCard>
      )}

      {/* ── Pacing Strategy ──────────────────────────────────────────────────*/}
      {brief.pacingStrategy && (
        <SectionCard
          icon={<Dumbbell size={15} />}
          title="Pacing Strategy"
          accentColor="text-sky-400"
          borderColor="border-sky-400/20"
        >
          {renderStandardContent(brief.pacingStrategy)}
        </SectionCard>
      )}

      {/* ── Tracking Prompts (collapsed, copy always visible) ────────────────*/}
      {brief.workoutTrackingPrompt1 && (
        <TrackingPromptCard
          label="AM Workout Tracking Prompt"
          text={brief.workoutTrackingPrompt1}
          isPm={false}
        />
      )}

      {brief.workoutTrackingPrompt2 && (
        <TrackingPromptCard
          label="PM Workout Tracking Prompt"
          text={brief.workoutTrackingPrompt2}
          isPm={true}
        />
      )}
    </div>
  )
}
