'use client'

import React from 'react'
import { Activity, Target, Brain, ArrowRight, Zap, CheckCircle2, XCircle } from 'lucide-react'

type ReadinessData = {
  date: string
  readiness_score: number | null
  readiness_color: string | null
  reasoning: string | null
  workout_tracking_prompt: string | null
  post_workout_verdict: string | null
  carb_compliance_score: number | null
}

export default function CoachingDashboard({
  readinessData
}: {
  userId: string
  readinessData: ReadinessData | null
}) {
  if (!readinessData) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
        <Target className="w-12 h-12 text-white/20 mb-4" />
        <h2 className="text-xl font-black text-white/50 uppercase tracking-widest">No Coaching Data</h2>
        <p className="text-sm text-white/40 mt-2">Waiting for your first AI Readiness Briefing.</p>
      </div>
    )
  }

  const colorMap: Record<string, { bg: string; text: string; glow: string; border: string }> = {
    GREEN: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      glow: 'shadow-[0_0_30px_rgba(52,211,153,0.3)]',
      border: 'border-emerald-500/30'
    },
    YELLOW: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      glow: 'shadow-[0_0_30px_rgba(250,204,21,0.3)]',
      border: 'border-yellow-500/30'
    },
    RED: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      glow: 'shadow-[0_0_30px_rgba(248,113,113,0.3)]',
      border: 'border-red-500/30'
    }
  }

  const theme = colorMap[readinessData.readiness_color?.toUpperCase() || 'YELLOW'] || colorMap['YELLOW']
  const score = readinessData.readiness_score || 0
  const carbs = readinessData.carb_compliance_score !== null ? Math.round(readinessData.carb_compliance_score * 100) : null

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-8 max-w-2xl mx-auto w-full pt-6 px-4">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Elite Coaching</h1>
          <p className="text-sm text-white/50 font-medium">{new Date(readinessData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
          <Brain className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Hero Score Card */}
      <div className={`relative overflow-hidden rounded-3xl border ${theme.border} ${theme.bg} ${theme.glow} p-6 backdrop-blur-xl transition-all duration-500`}>
        <div className="absolute top-0 right-0 p-32 bg-white/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase mb-2">Daily Readiness</span>
          <div className="flex items-baseline justify-center gap-1">
            <span className={`text-6xl font-black tracking-tighter ${theme.text}`}>{score}</span>
            <span className={`text-2xl font-bold ${theme.text} opacity-60`}>%</span>
          </div>
          <div className={`mt-2 px-3 py-1 rounded-full border ${theme.border} bg-black/20 backdrop-blur-md`}>
            <span className={`text-xs font-black tracking-wider uppercase ${theme.text}`}>
              {readinessData.readiness_color} ZONE
            </span>
          </div>
        </div>
      </div>

      {/* AI Reasoning */}
      {readinessData.reasoning && (
        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-black tracking-widest text-white/70 uppercase">AI Analysis</h3>
          </div>
          <p className="text-sm text-white/80 leading-relaxed font-medium">
            {readinessData.reasoning}
          </p>
        </div>
      )}

      {/* Workout Tracking Prompt */}
      {readinessData.workout_tracking_prompt && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 backdrop-blur-md shadow-[0_0_15px_rgba(59,130,246,0.1)]">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-black tracking-widest text-blue-400/90 uppercase">Action Required</h3>
          </div>
          <p className="text-sm text-blue-100/90 leading-relaxed font-medium">
            {readinessData.workout_tracking_prompt}
          </p>
          <button className="mt-4 w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 text-sm font-bold text-white shadow-lg shadow-blue-500/25">
            Log Workout <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Post Workout Verdict */}
      {readinessData.post_workout_verdict && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Zap className="w-5 h-5 text-orange-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Yesterday&apos;s Verdict</h2>
          </div>
          
          <div className="rounded-2xl border border-white/[0.05] bg-[#0A0A0A] p-5 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
            
            {carbs !== null && (
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/[0.05]">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Carb Compliance</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black ${carbs >= 90 ? 'text-emerald-400' : carbs >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {carbs}%
                  </span>
                  {carbs >= 90 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                </div>
              </div>
            )}
            
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
              {readinessData.post_workout_verdict}
            </p>
          </div>
        </div>
      )}
      
    </div>
  )
}
