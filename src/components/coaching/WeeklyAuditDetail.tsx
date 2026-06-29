'use client'

import { useState } from 'react'
import type { WeeklyAuditDetail } from '@/app/actions/coaching'
import {
  Trophy,
  AlertCircle,
  CheckCircle2,
  Moon,
  Activity,
  Flame,
  Dumbbell,
  Scale,
  Footprints,
  ChevronDown,
  ChevronUp,
  Heart,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { MarkdownBlock } from '@/components/chat/MarkdownBlock'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNetCalorie(val: number | null): string {
  if (val === null) return 'N/A'
  const sign = val >= 0 ? '+' : ''
  return `${sign}${Math.round(val).toLocaleString()} kcal`
}

function scoreColorClass(score: number | null): string {
  if (score === null) return 'text-textMuted border-white/10'
  if (score >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
  if (score >= 70) return 'text-amber-400 border-amber-500/30 bg-amber-500/5'
  return 'text-red-400 border-red-500/30 bg-red-500/5'
}

function scoreBackground(score: number | null): string {
  if (score === null) return 'bg-white/5'
  if (score >= 85) return 'bg-emerald-500/10'
  if (score >= 70) return 'bg-amber-500/10'
  return 'bg-red-500/10'
}

function scoreLabel(score: number | null): string {
  if (score === null) return 'N/A'
  if (score >= 90) return 'ELITE'
  if (score >= 80) return 'EXCELLENT'
  if (score >= 70) return 'OPTIMAL'
  return 'ATTENTION REQUIRED'
}

// ── Components ────────────────────────────────────────────────────────────────

interface WeeklyAuditDetailProps {
  audit: WeeklyAuditDetail
}

export function WeeklyAuditDetail({ audit }: WeeklyAuditDetailProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    redFlags: true,
    positives: true,
    averages: false,
    advancedRecovery: true,
    deepDives: true,
    phasePivot: true,
  })

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Format Dates
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="space-y-6">
      {/* Title / Header */}
      <div className="flex flex-col items-center text-center p-6 rounded-3xl bg-gradient-to-b from-white/5 to-white/0 border border-white/5 backdrop-blur-xl">
        <span className="text-[10px] font-black tracking-widest text-primary uppercase mb-2">
          WEEKLY PERFORMANCE AUDIT
        </span>
        <h2 className="text-xl font-bold text-white mb-1">
          {formatDate(audit.weekStartDate)} &ndash; {formatDate(audit.weekEndDate)}
        </h2>
        <span className="text-xs text-textMuted font-mono">Athlete Profile: {audit.athleteName}</span>

        {/* Circular / Large Score Badge */}
        {audit.weeklyScore !== null && (
          <div className="mt-6 flex flex-col items-center">
            <div className={`w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center ${scoreColorClass(audit.weeklyScore)} shadow-lg shadow-black/40 relative overflow-hidden`}>
              {/* Background Glow */}
              <div className={`absolute inset-0 opacity-20 blur-xl ${scoreBackground(audit.weeklyScore)}`} />
              
              <Trophy size={20} className="mb-0.5 opacity-80" />
              <span className="text-3xl font-black font-mono leading-none tracking-tight">
                {audit.weeklyScore}
              </span>
              <span className="text-[8px] font-bold tracking-widest uppercase opacity-60 mt-1">
                SCORE
              </span>
            </div>
            <span className={`text-[10px] font-black tracking-widest uppercase mt-3 px-3 py-1 rounded-full border border-white/5 ${scoreColorClass(audit.weeklyScore)}`}>
              {scoreLabel(audit.weeklyScore)}
            </span>
          </div>
        )}
      </div>

      {/* 1. Red Flags Section */}
      {audit.redFlagsMarkdown && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
          <button
            onClick={() => toggleSection('redFlags')}
            className="w-full flex items-center justify-between px-5 py-4 text-left border-b border-red-500/10 focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-xs font-black tracking-widest uppercase text-red-400">
                RED FLAGS / WORKOUT FRICTIONS
              </span>
            </div>
            {openSections.redFlags ? (
              <ChevronUp size={16} className="text-red-400/60" />
            ) : (
              <ChevronDown size={16} className="text-red-400/60" />
            )}
          </button>
          {openSections.redFlags && (
            <div className="px-5 py-4 text-sm text-white/80 report-content leading-relaxed">
              <MarkdownBlock content={audit.redFlagsMarkdown} />
            </div>
          )}
        </div>
      )}

      {/* 2. Positives Section */}
      {audit.positivesMarkdown && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
          <button
            onClick={() => toggleSection('positives')}
            className="w-full flex items-center justify-between px-5 py-4 text-left border-b border-emerald-500/10 focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-xs font-black tracking-widest uppercase text-emerald-400">
                POSITIVES / WHAT WENT WELL
              </span>
            </div>
            {openSections.positives ? (
              <ChevronUp size={16} className="text-emerald-400/60" />
            ) : (
              <ChevronDown size={16} className="text-emerald-400/60" />
            )}
          </button>
          {openSections.positives && (
            <div className="px-5 py-4 text-sm text-white/80 report-content leading-relaxed">
              <MarkdownBlock content={audit.positivesMarkdown} />
            </div>
          )}
        </div>
      )}

      {/* 3. Averages Cards Grid */}
      <div className="rounded-2xl border border-white/5 bg-white/3 overflow-hidden">
        <button
          onClick={() => toggleSection('averages')}
          className="w-full flex items-center justify-between px-5 py-4 text-left border-b border-white/5 focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <Activity size={16} className="text-cyan-400" />
            <span className="text-xs font-black tracking-widest uppercase text-cyan-400">
              WEEKLY METRICS AVERAGES
            </span>
          </div>
          {openSections.averages ? (
            <ChevronUp size={16} className="text-white/40" />
          ) : (
            <ChevronDown size={16} className="text-white/40" />
          )}
        </button>

        {openSections.averages && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Net Calorie Balance */}
            {audit.totalNetCalorieBalance !== null && (
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col col-span-2 sm:col-span-3">
                <span className="text-[9px] font-bold text-primary tracking-wider uppercase mb-1">
                  Total Net Calorie Balance (TEF Built-in)
                </span>
                <span className="text-lg font-bold text-white font-mono">
                  {formatNetCalorie(audit.totalNetCalorieBalance)}
                </span>
                <span className="text-[10px] text-textMuted mt-1">
                  Calculates Calories In &minus; Active Burn &minus; Thermic Effect of Food (TEF) over tracked days.
                </span>
              </div>
            )}

            {/* Calories In */}
            {audit.avgKcal !== null && (
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/2 flex flex-col">
                <span className="text-[9px] font-bold text-textMuted tracking-wider uppercase mb-1">
                  Avg Daily Calories
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {Math.round(audit.avgKcal).toLocaleString()} kcal
                </span>
              </div>
            )}

            {/* Protein */}
            {audit.avgProtein !== null && (
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/2 flex flex-col">
                <span className="text-[9px] font-bold text-textMuted tracking-wider uppercase mb-1">
                  Avg Daily Protein
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {audit.avgProtein.toFixed(1)}g
                </span>
              </div>
            )}

            {/* Carbs */}
            {audit.avgCarbs !== null && (
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/2 flex flex-col">
                <span className="text-[9px] font-bold text-textMuted tracking-wider uppercase mb-1">
                  Avg Daily Carbs
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {audit.avgCarbs.toFixed(1)}g
                </span>
              </div>
            )}

            {/* Sleep Score */}
            {audit.avgSleepScore !== null && (
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/2 flex flex-col">
                <span className="text-[9px] font-bold text-textMuted tracking-wider uppercase mb-1">
                  Avg Sleep Score
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {audit.avgSleepScore.toFixed(1)}%
                </span>
              </div>
            )}

            {/* HRV */}
            {audit.avgHrv !== null && (
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/2 flex flex-col">
                <span className="text-[9px] font-bold text-textMuted tracking-wider uppercase mb-1">
                  Avg HRV
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {audit.avgHrv.toFixed(1)} ms
                </span>
              </div>
            )}

            {/* RHR */}
            {audit.avgRhr !== null && (
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/2 flex flex-col">
                <span className="text-[9px] font-bold text-textMuted tracking-wider uppercase mb-1">
                  Avg RHR
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {audit.avgRhr.toFixed(1)} bpm
                </span>
              </div>
            )}

            {/* Weight */}
            {audit.avgWeight !== null && (
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/2 flex flex-col">
                <span className="text-[9px] font-bold text-textMuted tracking-wider uppercase mb-1">
                  Avg Body Weight
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {audit.avgWeight.toFixed(2)} kg
                </span>
              </div>
            )}

            {/* Total Steps */}
            {audit.avgSteps !== null && (
              <div className="p-3.5 rounded-xl border border-white/5 bg-white/2 flex flex-col">
                <span className="text-[9px] font-bold text-textMuted tracking-wider uppercase mb-1">
                  Avg Daily Steps
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {audit.avgSteps.toLocaleString()}
                </span>
              </div>
            )}

            {/* Total Workouts */}
            <div className="p-3.5 rounded-xl border border-white/5 bg-white/2 flex flex-col">
              <span className="text-[9px] font-bold text-textMuted tracking-wider uppercase mb-1">
                Workout Sessions
              </span>
              <span className="text-base font-bold text-white font-mono">
                {audit.totalSessions || 0}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Advanced Autonomic Recovery Profile */}
      {audit.advancedRecoveryMarkdown && (
        <div className="rounded-2xl border border-white/5 bg-white/3 overflow-hidden">
          <button
            onClick={() => toggleSection('advancedRecovery')}
            className="w-full flex items-center justify-between px-5 py-4 text-left border-b border-white/5 focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <Zap size={16} className="text-primary" />
              <span className="text-xs font-black tracking-widest uppercase text-primary">
                ADVANCED AUTONOMIC RECOVERY
              </span>
            </div>
            {openSections.advancedRecovery ? (
              <ChevronUp size={16} className="text-white/40" />
            ) : (
              <ChevronDown size={16} className="text-white/40" />
            )}
          </button>
          {openSections.advancedRecovery && (
            <div className="px-5 py-4 text-sm text-white/80 report-content leading-relaxed prose-li:my-1">
              <MarkdownBlock content={audit.advancedRecoveryMarkdown} />
            </div>
          )}
        </div>
      )}

      {/* 5. Athlete Deep Dives */}
      {audit.athleteDeepDivesMarkdown && (
        <div className="rounded-2xl border border-white/5 bg-white/3 overflow-hidden">
          <button
            onClick={() => toggleSection('deepDives')}
            className="w-full flex items-center justify-between px-5 py-4 text-left border-b border-white/5 focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <Heart size={16} className="text-rose-400" />
              <span className="text-xs font-black tracking-widest uppercase text-rose-400">
                ATHLETE DEEP DIVES
              </span>
            </div>
            {openSections.deepDives ? (
              <ChevronUp size={16} className="text-white/40" />
            ) : (
              <ChevronDown size={16} className="text-white/40" />
            )}
          </button>
          {openSections.deepDives && (
            <div className="px-5 py-4 text-sm text-white/80 report-content leading-relaxed">
              <MarkdownBlock content={audit.athleteDeepDivesMarkdown} />
            </div>
          )}
        </div>
      )}

      {/* 6. Phase Pivot Section */}
      {audit.phasePivotFixesMarkdown && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
          <button
            onClick={() => toggleSection('phasePivot')}
            className="w-full flex items-center justify-between px-5 py-4 text-left border-b border-primary/10 focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={16} className="text-primary" />
              <span className="text-xs font-black tracking-widest uppercase text-primary">
                PHASE PIVOT &amp; PROTOCOL FIXES
              </span>
            </div>
            {openSections.phasePivot ? (
              <ChevronUp size={16} className="text-primary/60" />
            ) : (
              <ChevronDown size={16} className="text-primary/60" />
            )}
          </button>
          {openSections.phasePivot && (
            <div className="px-5 py-4 text-sm text-white/80 report-content leading-relaxed">
              <MarkdownBlock content={audit.phasePivotFixesMarkdown} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
