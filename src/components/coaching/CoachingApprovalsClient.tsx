'use client'

import { useState, useTransition, useRef } from 'react'
import { Check, ClipboardList, Send, Calendar, Lock, CheckCircle2, AlertCircle, ChevronDown, ArrowLeft, Clock } from 'lucide-react'
import { submitWorkoutOverhaulApprovalAction } from '@/app/actions/coaching'
import { MarkdownBlock } from '@/components/chat/MarkdownBlock'
import confetti from 'canvas-confetti'

interface CoachingApprovalsClientProps {
  initialApproval: { status: string; feedback: string } | null
  userAlias: string
}

export function CoachingApprovalsClient({ initialApproval, userAlias }: CoachingApprovalsClientProps) {
  const [status, setStatus] = useState(initialApproval?.status || 'Pending')
  const [feedback, setFeedback] = useState(initialApproval?.feedback || '')
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isVioletta = userAlias.toLowerCase().includes('violet') || userAlias.toLowerCase().includes('viola')
  const isApproved = status === 'Approved'
  const isApprovedBut = status === 'Approved-But'

  const proposalWorkouts = [
    {
      dayLabel: 'Tue Jun 30',
      title: 'Open Gym: Sled Overload & Compromised Run Block (5 total exercises)',
      content: `*   **A. Overloaded Sled Push & Pull (Tactical Division of Labor)**:
    *   *Setup*: Sled loaded to **172 kg** push / **123 kg** pull (Overload training weight for the team).
    *   *Sled Push*: 4 rounds of 50m (4 × 12.5m). Armaan drives first 35m (focus: choppy steps, low stance), Violetta takes final 15m to complete.
    *   *Sled Pull*: 4 rounds of 50m (4 × 12.5m). Armaan pulls first 35m (lean-back power stance), Violetta pulls final 15m.
*   **B. Strength-Endurance Density Block (12-Min AMRAP)**:
    *   12 Double Kettlebell Front Squats (2×20kg Armaan, 2×12kg Violetta)
    *   40m Heavy Farmer Carry (2×24kg for both)
    *   10 Hanging Knee Raises
*   **C. 🏃 Compromised Running Intervals**:
    *   Immediately after the AMRAP, run **2 km total** together as:
        *   **Lap 1**: 500m Run (~4:45/km) + 20 Air Squats
        *   **Lap 2**: 500m Run (~4:45/km) + 15 Push-ups
        *   **Lap 3**: 500m Run (~4:45/km) + 20 Walking Lunges (10/leg)
        *   **Lap 4**: 500m Run (~4:45/km, final kick)`
    },
    {
      dayLabel: 'Thu Jul 2',
      title: 'Open Gym: High-Volume Erg Engine & Wall Ball Durability (5 total exercises)',
      content: `*   **A. Erg Pacing Intervals (Compromised Engine)**:
    *   4 Rounds (Both working simultaneously):
        *   Row: 750m (Armaan target split: 1:52/500m, Violetta target split: 1:58/500m)
        *   SkiErg: 750m (Armaan target split: 1:55/500m, Violetta target split: 2:02/500m)
        *   *Rest*: 90 seconds between rounds. Focus on nasal-only breathing recovery.
*   **B. Compromised Bodyweight Block**:
    *   3 Rounds of: 15 Burpee Broad Jumps (step-up technique from floor to conserve heart rate) + 15 KB Swings (24kg Armaan, 16kg Violetta).
*   **C. Partner Wall Ball Finisher (The 100-Rep Race Split)**:
    *   **100 reps total** @ 6kg. Alternating sets of **10 reps** (IGO-UGO format).
    *   *Rules*: The ball cannot touch the floor. If it drops, both perform a 5-burpee team penalty before resuming. Target height: 3.0m for Armaan, 2.75m for Violetta.`
    },
    {
      dayLabel: 'Tue Jul 7',
      title: 'Open Gym: Peak Strength-Endurance Sled Overload (6 total exercises)',
      content: `*   **A. Maximal Overloaded Sled Block**:
    *   *Setup*: Sled loaded to **172 kg** push / **123 kg** pull (Overload training weight for the team).
    *   *Set 1-4*: 50m Sled Push (4 × 12.5m). Armaan drives first 35m, Violetta takes final 15m. Rest 2 mins between sets. Armaan focus on abdominal bracing and continuous breathing (no Valsalva) to protect healing pelvic floor.
    *   *Set 5-8*: 50m Sled Pull (4 × 12.5m). Armaan pulls first 35m, Violetta pulls final 15m. Rest 2 mins between sets.
*   **B. Compromised Carry Complex**:
    *   4 Rounds for Quality: 50m Sandbag Bearhug Carry (20kg bag) + 50m Farmer Carry (2×24kg) + 15 DB Bench Press (2×20kg Armaan, 2×12kg Violetta).
*   **C. 🏃 Leg-Pump Compromised Run**:
    *   Immediately run **2.5 km** together: First 1.5km conversational Zone 2 (~5:45/km) to clear lactate, then accelerate to race pace (~4:45/km) for the final 1km.`
    },
    {
      dayLabel: 'Thu Jul 9',
      title: 'Open Gym: Hyrox Station Medley & Wall Ball Pacing (6 total exercises)',
      content: `*   **A. Hyrox Station Medley (Timed Circuit - 2 Rounds)**:
    *   Perform 2 rounds of the continuous block (rest 4 mins between rounds; target under 15 mins/round):
        *   1,000m Row (Armaan 550m, Violetta 450m)
        *   50m Burpee Broad Jumps (IGO-UGO alternating every 5 jumps)
        *   200m Farmer Carry (2×24kg, switch every 50m)
        *   80 Wall Balls @ 6kg (Alternating sets of 10 reps; Armaan 3.0m target, Violetta 2.75m target)
*   **B. Core Stability Finisher**:
    *   3 Rounds of: 45s Weighted Plank (10kg plate on back) + 15 Hanging Knee Raises (slow 3-sec negative) + 12 DB Renegade Rows (no hip twisting).`
    },
    {
      dayLabel: 'Tue Jul 14',
      title: 'Open Gym: Peak Sled & Compromised Run Sharpener (6 total exercises)',
      content: `*   **A. Peak Overloaded Sled Drive**:
    *   *Sled Push*: 6 rounds × 50m @ **172 kg** (Overload training weight for the team). Armaan drives first 35m, Violetta takes final 15m. Rest 2 mins.
    *   *Sled Pull*: 6 rounds × 50m @ **123 kg** (Overload training weight for the team). Armaan pulls first 35m, Violetta pulls final 15m. Rest 2 mins.
*   **B. Strength Auxiliary Set**:
    *   3 Sets of: 10 Barbell Roman Deadlifts (hamstring focus, neutral spine) + 10 strict Pull-ups (Armaan) / DB Rows (Violetta) + 12 Push-ups.
*   **C. 🏃 The 3km Compromised Run Block**:
    *   Immediately run **3 km continuous** together: Km 1 @ 5:15 pace (Zone 3 clearance), Km 2 @ 4:45 pace (Race Pace), Km 3 @ 4:30 pace (Speed Threshold).`
    },
    {
      dayLabel: 'Thu Jul 16',
      title: 'Open Gym: Mini Race Simulation & Wall Ball Target (5 total station types)',
      content: `*   *Execute the following continuous circuit (Record total time; Target: Under 28 minutes)*:
    1.  **1km Run** (together, Violetta leading, target 4:45–5:00/km)
    2.  *Transition*: **1,000m SkiErg** (split: Armaan 600m, Violetta 400m)
    3.  *Transition*: **1km Run** (together, target 4:45–5:00/km)
    4.  *Transition*: **50m Sled Push** @ **152 kg** (race weight; Armaan drives 35m, Violetta takes final 15m)
    5.  *Transition*: **1km Run** (together, target 4:45–5:00/km)
    6.  *Transition*: **50m Sled Pull** @ **103 kg** (race weight; Armaan pulls 35m, Violetta pulls final 15m)
    7.  *Transition*: **100 Wall Balls** @ 6kg (alternating sets of 10; Armaan 3.0m, Violetta 2.75m)
    *   *Cool Down*: 10 mins easy walk, foam roll, and static hamstring stretching.`
    }
  ]

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    })
  }

  const handleApprove = () => {
    setErrorMsg(null)
    startTransition(async () => {
      try {
        const res = await submitWorkoutOverhaulApprovalAction('Approved', '')
        if (res.success) {
          setStatus('Approved')
          setFeedback('')
          triggerConfetti()
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to submit approval.')
      }
    })
  }

  const handleApproveButSubmit = () => {
    if (!feedback.trim()) {
      setErrorMsg('Please enter your suggested changes in the text box.')
      return
    }
    setErrorMsg(null)
    startTransition(async () => {
      try {
        const res = await submitWorkoutOverhaulApprovalAction('Approved-But', feedback)
        if (res.success) {
          setStatus('Approved-But')
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to submit feedback.')
      }
    })
  }

  const handleTagClick = (tag: string) => {
    const textToInsert = feedback.length > 0 && !feedback.endsWith('\n') 
      ? `\n[${tag}]: ` 
      : `[${tag}]: `
    
    setFeedback(prev => prev + textToInsert)
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.selectionStart = textareaRef.current.value.length
        textareaRef.current.selectionEnd = textareaRef.current.value.length
      }
    }, 50)
  }

  // PORTAL INDEX VIEW (LIST OF ALL PROPOSALS)
  if (selectedProposalId === null) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto px-4 py-6 pb-20">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.04] bg-[#050C1A]/40 p-6 md:p-8 backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 rounded-full bg-cyan-500/5 blur-3xl" />
          <div className="flex items-center gap-3">
            <ClipboardList className="text-cyan-400" size={24} />
            <div>
              <h1 className="text-lg md:text-xl font-black text-white uppercase tracking-wider">
                Coaching Approvals Portal
              </h1>
              <p className="text-xs text-white/50 mt-0.5 uppercase tracking-wider font-mono">
                Select a proposal to review, approve or request edits
              </p>
            </div>
          </div>
        </div>

        {/* Proposals List */}
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400">
            Active Proposals
          </h2>

          {/* Card: Workout Overhaul */}
          <button
            onClick={() => setSelectedProposalId('workout-overhaul')}
            className="w-full text-left rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05] p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
          >
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Openbox overhaul (30-06 to 16-07-26)
                </span>
                {isApproved ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold uppercase tracking-wider">
                    Live
                  </span>
                ) : isApprovedBut ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-mono font-bold uppercase tracking-wider">
                    Feedback Sent
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10 text-[9px] font-mono font-bold uppercase tracking-wider animate-pulse">
                    Awaiting Review
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40 leading-relaxed font-sans">
                Overhaul of Phase 2 Open Gym functional strength programming to introduce loaded sled overload intervals (172kg push/123kg pull), machine engines, and partner wall ball targets.
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-end md:self-auto text-xs font-black uppercase tracking-wider text-cyan-400 font-mono">
              Review Proposal <ChevronDown size={14} className="-rotate-90 text-cyan-400" />
            </div>
          </button>
        </div>

        {/* Historical Proposals */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-white/30">
            History & Resolved updates
          </h2>

          <button
            onClick={() => setSelectedProposalId('nutrition-targets')}
            className="w-full text-left rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group opacity-85"
          >
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white/70 group-hover:text-cyan-300 transition-colors">
                  Post-Workout Nutrition Targets (28-06-26)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold uppercase tracking-wider">
                  Resolved
                </span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed font-sans">
                Adjustment of post-workout target glycogen replenishment requirements (reduced to 80g carbs/40g protein for Armaan, and 60g carbs/30g protein for Violetta).
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-end md:self-auto text-xs font-black uppercase tracking-wider text-cyan-400 font-mono">
              View History <ChevronDown size={14} className="-rotate-90 text-cyan-400" />
            </div>
          </button>
        </div>
      </div>
    )
  }

  // DETAILED NUTRITION PROPOSAL VIEW
  if (selectedProposalId === 'nutrition-targets') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto px-4 py-6 pb-20">
        {/* Back Button */}
        <div>
          <button
            onClick={() => setSelectedProposalId(null)}
            className="flex items-center gap-2 text-xs font-mono text-white/40 hover:text-white/80 transition-colors uppercase font-bold"
          >
            <ArrowLeft size={14} /> Back to Approvals Portal
          </button>
        </div>

        {/* Header */}
        <div className="rounded-2xl border border-white/[0.04] bg-white/2 p-5 md:p-6 space-y-4">
          <p className="text-sm md:text-base font-medium text-white/90 leading-relaxed font-sans font-medium">
            Hello Violetta and Armaan, here are the details of the post-workout nutrition targets recalibration.
          </p>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-white/40">Proposal Status:</span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
              <CheckCircle2 size={12} /> Resolved & Active
            </span>
          </div>
        </div>

        {/* Nutrition Card */}
        <div className="rounded-3xl border border-white/[0.04] bg-[#050C1A]/20 backdrop-blur-xl overflow-hidden p-6 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-3 font-mono">
            Approved Target Calibrations
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Armaan */}
            <div className="p-4 rounded-2xl border border-white/5 bg-white/2 space-y-2">
              <span className="text-xs font-black uppercase text-white/70 font-mono tracking-wider">Armaan (Target Post-Workout)</span>
              <div className="space-y-1 text-xs text-white/60 leading-relaxed">
                <p>• Carbs: <b>80.0g</b> (Glycogen replenishment target)</p>
                <p>• Protein: <b>40.0g</b> (Muscle repair & synthesis)</p>
                <p>• Timing: Consume immediately within 2 hours post-workout</p>
              </div>
            </div>

            {/* Violetta */}
            <div className="p-4 rounded-2xl border border-white/5 bg-white/2 space-y-2">
              <span className="text-xs font-black uppercase text-white/70 font-mono tracking-wider">Violetta (Target Post-Workout)</span>
              <div className="space-y-1 text-xs text-white/60 leading-relaxed">
                <p>• Carbs: <b>60.0g</b> (Glycogen replenishment target)</p>
                <p>• Protein: <b>30.0g</b> (Muscle repair & synthesis)</p>
                <p>• Timing: Consume immediately within 2 hours post-workout</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-white/60 leading-relaxed font-sans">
             <h4 className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">Rationale:</h4>
             <p>
               The previous 150g post-workout carb target was excessively high, resulting in digestive discomfort and inefficient glycogen absorption rates. Calibrating to 80g/60g provides an optimal ratio of carbs to protein (2:1) that matches the mixed doubles cardiovascular output while safeguarding gastrointestinal stability.
             </p>
          </div>
        </div>

        {/* Lock state */}
        <div className="rounded-2xl border border-white/[0.04] bg-white/2 p-6 flex items-start gap-3 opacity-80">
          <Lock size={16} className="text-white/30 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-white/70">
              Historical Proposal Locked
            </p>
            <p className="text-[10px] text-white/40 leading-relaxed font-sans">
              This proposal was finalized, signed off, and pushed live on June 28, 2026. Nutritional targets are calibrated on the backend platform trackers.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // DETAILED PROPOSAL REVIEW VIEW
  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6 pb-20">
      {/* Back Button */}
      <div>
        <button
          onClick={() => setSelectedProposalId(null)}
          className="flex items-center gap-2 text-xs font-mono text-white/40 hover:text-white/80 transition-colors uppercase font-bold"
        >
          <ArrowLeft size={14} /> Back to Approvals Portal
        </button>
      </div>

      {/* Greeting and Header */}
      <div className="rounded-2xl border border-white/[0.04] bg-white/2 p-5 md:p-6 space-y-4">
        {isVioletta ? (
          <p className="text-sm md:text-base font-medium text-white/90 leading-relaxed font-sans">
            Hello Violetta, after considering the current workout plan, here is my proposal to overhaul your open box workouts for upcoming 3 weeks.
          </p>
        ) : (
          <p className="text-sm md:text-base font-medium text-white/90 leading-relaxed font-sans">
            Hello Armaan, here is the proposal sent to Violetta to overhaul the open gym workouts for the upcoming 3 weeks.
          </p>
        )}

        {/* Current Status Badge */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-white/40">Proposal Status:</span>
          {isApproved ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
              <CheckCircle2 size={12} /> Approved (Workouts Live!)
            </span>
          ) : isApprovedBut ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider">
              <AlertCircle size={12} /> Approved With Changes
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-white/60 border border-white/10 font-bold uppercase tracking-wider animate-pulse">
              Awaiting Violetta&apos;s Review
            </span>
          )}
        </div>
      </div>

      {/* Proposal Card */}
      <div className="rounded-3xl border border-white/[0.04] bg-[#050C1A]/20 backdrop-blur-xl overflow-hidden">
        <div className="border-b border-white/5 bg-white/3 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400">
            Openbox overhaul (30-06 to 16-07-26)
          </h3>
          <span className="text-[10px] font-mono text-white/30 uppercase">
            3-Week Target Overload
          </span>
        </div>

        <div className="p-4 space-y-4">
          {proposalWorkouts.map((workout, index) => (
            <details key={index} className="group border border-white/5 bg-white/2 rounded-2xl overflow-hidden transition-all duration-300">
              <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 select-none list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <Calendar size={14} className="text-cyan-400 shrink-0" />
                  <span className="font-mono text-[10px] font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-cyan-300 shrink-0">
                    {workout.dayLabel}
                  </span>
                  <span className="text-xs font-bold text-white/90 truncate max-w-[200px] md:max-w-md">
                    {workout.title}
                  </span>
                </div>
                <ChevronDown size={14} className="text-white/40 group-open:rotate-180 transition-transform shrink-0" />
              </summary>
              <div className="p-4 border-t border-white/5 bg-black/20 text-xs text-white/70 leading-relaxed font-sans prose prose-invert max-w-none">
                <MarkdownBlock content={workout.content} />
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Action / Input Card (Only editable for Violetta) */}
      <div className="rounded-2xl border border-white/[0.04] bg-white/2 p-6 space-y-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/80">
          Decide & Action
        </h3>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {isVioletta ? (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleApprove}
                disabled={isPending || isApproved}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  isApproved
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-cyan-400 text-black hover:shadow-[0_0_15px_rgba(34,211,238,0.25)] hover:bg-cyan-300 disabled:opacity-50'
                }`}
              >
                <Check size={16} />
                {isApproved ? 'Approved & Updated!' : 'Approve Workout Overhaul'}
              </button>
            </div>

            {/* Approved But Section */}
            <div className="border-t border-white/5 pt-6 space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase tracking-wider text-white/70">
                  Approved, But:
                </span>
                <span className="text-[10px] text-white/40 font-sans">
                  Select a day tag to insert it and write your requested modifications below:
                </span>
              </div>

              {/* Tag List */}
              <div className="flex flex-wrap gap-2">
                {proposalWorkouts.map((w, index) => (
                  <button
                    key={index}
                    onClick={() => handleTagClick(w.dayLabel)}
                    disabled={isPending || isApproved}
                    className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/10 hover:border-white/15 text-[10px] font-mono font-bold text-white/80 transition-all active:scale-95 disabled:opacity-55"
                  >
                    +{w.dayLabel}
                  </button>
                ))}
              </div>

              {/* Text Box */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  disabled={isPending || isApproved}
                  placeholder="e.g. [Tue Jun 30]: Reduce the compromised running intervals slightly. For Armaan, increase sled push weight to 180kg..."
                  className="w-full min-h-[120px] p-4 rounded-xl border border-white/10 bg-black/40 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/50 transition-all font-sans leading-relaxed disabled:opacity-50"
                />
              </div>

              {/* Submit Feedback */}
              <div className="flex justify-end">
                <button
                  onClick={handleApproveButSubmit}
                  disabled={isPending || isApproved || !feedback.trim()}
                  className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-xs font-black uppercase tracking-wider text-white transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={12} />
                  Submit Changes
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* View Only for Armaan */
          <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] flex items-start gap-3">
            <Lock size={16} className="text-white/30 mt-0.5 shrink-0" />
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-white/70">
                Action Restricted to Violetta
              </p>
              <p className="text-[10px] text-white/40 leading-relaxed font-sans">
                As the Mixed Doubles pacemaker and athlete receiving these program adaptations, Violetta has sole signature authority to approve this overhaul. 
              </p>
              {isApprovedBut && (
                <div className="mt-3 p-3 rounded-lg border border-white/5 bg-black/20 space-y-1.5">
                  <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase">
                    Violetta&apos;s Submitted Feedback:
                  </span>
                  <p className="text-xs text-white/70 font-mono whitespace-pre-wrap">
                    {feedback}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
