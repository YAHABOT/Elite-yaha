'use client'

import { useState, useMemo } from 'react'
import { Target, Award, ShieldAlert, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react'
import { MarkdownBlock } from '@/components/chat/MarkdownBlock'
import { MacrocyclePhase, PrescribedWorkout } from '@/app/actions/coaching'

type TabType = 'plan' | 'macrocycle' | 'calendar'

interface ValenciaPrepClientProps {
  phases: MacrocyclePhase[]
  workouts: PrescribedWorkout[]
}

export function ValenciaPrepClient({ phases, workouts }: ValenciaPrepClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('plan')
  
  // Calendar states
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 5, 1)) // Defaults to June 2026 (Phase 2 start/return month)
  const [selectedWorkout, setSelectedWorkout] = useState<PrescribedWorkout | null>(null)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const monthName = currentDate.toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  // Map workouts by date for fast lookup: YYYY-MM-DD -> PrescribedWorkout[]
  const workoutsByDate = useMemo(() => {
    const map: Record<string, PrescribedWorkout[]> = {}
    workouts.forEach(w => {
      if (!map[w.date]) {
        map[w.date] = []
      }
      map[w.date].push(w)
    })
    return map
  }, [workouts])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    // Get the first day of the month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
    // Day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // Adjust to make Monday = 0
    let startDayOfWeek = firstDayOfMonth.getDay() - 1
    if (startDayOfWeek === -1) startDayOfWeek = 6 // Sunday is index 6

    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = []

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDay = totalDaysInPrevMonth - i
      const prevMonthObj = new Date(currentYear, currentMonth - 1, prevDay)
      const dateStr = prevMonthObj.toISOString().split('T')[0]
      days.push({
        dateStr,
        dayNum: prevDay,
        isCurrentMonth: false,
        isToday: false,
      })
    }

    // Current month days
    const todayStr = new Date().toISOString().split('T')[0]
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateObj = new Date(currentYear, currentMonth, i)
      // Format as YYYY-MM-DD using local timezone calculation to avoid UTC offsets shifting the day
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      })
    }

    // Next month padding to fill grid
    const remainingSlots = 42 - days.length // 6 weeks grid
    for (let i = 1; i <= remainingSlots; i++) {
      const nextMonthObj = new Date(currentYear, currentMonth + 1, i)
      const dateStr = nextMonthObj.toISOString().split('T')[0]
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: false,
      })
    }

    return days
  }, [currentYear, currentMonth])

  const getSessionBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'group class':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'running':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'open gym':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'rest':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      default:
        return 'bg-white/5 text-white/60 border-white/10'
    }
  }

  const getSessionDotColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'group class':
        return 'bg-purple-400'
      case 'running':
        return 'bg-cyan-400'
      case 'open gym':
        return 'bg-amber-400'
      case 'rest':
        return 'bg-emerald-400'
      default:
        return 'bg-white/40'
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6 pb-20">
      {/* Premium Valencia Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.04] bg-[#050C1A]/40 p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-black tracking-widest uppercase mb-1">
              <Award size={14} />
              Pre-Valencia Campaign
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
              Valencia Oct 2026
            </h1>
            <p className="text-xs text-white/50 mt-1 uppercase tracking-wider font-mono">
              Mixed Doubles Target Finish: Sub-60 Minutes
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <span className="px-3.5 py-1.5 rounded-full border border-white/5 bg-white/2 text-[10px] font-black uppercase tracking-widest text-white/60">
              🗓️ Oct 17, 2026
            </span>
            <span className="px-3.5 py-1.5 rounded-full border border-white/5 bg-white/2 text-[10px] font-black uppercase tracking-widest text-white/60">
              👥 Armaan & Violetta
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/5 p-1 rounded-2xl bg-white/3 max-w-lg">
        {(['plan', 'macrocycle', 'calendar'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === tab
                ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                : 'text-white/50 hover:text-white hover:bg-white/2'
            }`}
          >
            {tab === 'plan' ? 'Overall Plan' : tab === 'macrocycle' ? 'Macrocycle' : 'Calendar View'}
          </button>
        ))}
      </div>

      {/* Tab 1: Overall Plan */}
      {activeTab === 'plan' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid md:grid-cols-2 gap-6">
            {/* The Target Card */}
            <div className="rounded-2xl border border-white/[0.04] bg-white/3 p-5 space-y-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <Target size={18} />
                <h3 className="text-xs font-black uppercase tracking-widest">Valencia Sub-60 Mission</h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                This campaign outlines the path to a sub-60 minute Mixed Doubles finish. Our pacing, workouts, and functional conditioning are reverse-engineered to hit target splits of **4:00–4:15 /km running pace** and under **27:00 total station time**.
              </p>
            </div>

            {/* Campaign Metrics */}
            <div className="rounded-2xl border border-white/[0.04] bg-white/3 p-5 space-y-3 font-mono">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Race splits / metrics</div>
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                <span className="text-white/50">RUN SPLIT (8x1km)</span>
                <span className="text-white font-bold">4:00–4:15 /km</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                <span className="text-white/50">STATIONS (TOTAL)</span>
                <span className="text-white font-bold">~27:00–28:00</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-1">
                <span className="text-white/50">TRANSITIONS</span>
                <span className="text-white font-bold">&lt; 2:00 Total</span>
              </div>
            </div>
          </div>

          {/* Core Constraints */}
          <div className="rounded-2xl border border-cyan-500/10 bg-cyan-950/5 p-5 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <ShieldAlert size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest">Ongoing Sub-60 Tactical Rules</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 text-xs leading-relaxed text-white/70">
              <div className="border-l-2 border-cyan-400/30 pl-3.5 space-y-1">
                <span className="font-extrabold text-white uppercase block">1. Sled Division of Labor</span>
                <p>Armaan executes 65–70% of Sled Push and Pull volume to protect Violetta&apos;s legs and prevent redlining.</p>
              </div>
              
              <div className="border-l-2 border-cyan-400/30 pl-3.5 space-y-1">
                <span className="font-extrabold text-white uppercase block">2. Pacing Lead</span>
                <p>Violetta acts as the primary pacemaker on the runs. Armaan locks onto her shoulder and matches her cadence.</p>
              </div>

              <div className="border-l-2 border-cyan-400/30 pl-3.5 space-y-1">
                <span className="font-extrabold text-white uppercase block">3. Wall Ball Splitting</span>
                <p>Divide the 100 Wall Balls into short, rapid partner-alternating sets (e.g. IGO-UGO sets of 10 or 15 reps).</p>
              </div>

              <div className="border-l-2 border-cyan-400/30 pl-3.5 space-y-1">
                <span className="font-extrabold text-white uppercase block">4. Over-Load Sled Target</span>
                <p>Training uses over-loaded sleds due to turf friction: Sled Push @ 172 kg and Sled Pull @ 123 kg.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Macrocycle Phases */}
      {activeTab === 'macrocycle' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="space-y-6 relative before:absolute before:inset-y-1 before:left-3.5 before:w-px before:bg-white/5">
            {phases.map((phase, idx) => {
              // Custom colors matching macrocycle_calendar.md
              let color = 'bg-cyan-500'
              let border = 'border-cyan-500/20'
              if (idx === 0) { color = 'bg-emerald-500'; border = 'border-emerald-500/20' }
              if (idx === 1) { color = 'bg-amber-500'; border = 'border-amber-500/20' }
              if (idx === 2) { color = 'bg-orange-500'; border = 'border-orange-500/20' }
              if (idx === 3) { color = 'bg-red-500'; border = 'border-red-500/20' }
              if (idx === 4) { color = 'bg-purple-500'; border = 'border-purple-500/20' }

              const formattedStart = new Date(phase.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              const formattedEnd = new Date(phase.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

              return (
                <div key={phase.id} className="relative pl-10 group">
                  {/* Timeline point */}
                  <span className={`absolute left-1.5 top-2.5 w-4 h-4 rounded-full ${color} ring-4 ring-black border border-white/10 group-hover:scale-110 transition-transform`} />
                  
                  <div className={`rounded-2xl border ${border} bg-[#050C1A]/10 p-5 space-y-3 backdrop-blur-sm`}>
                    <div className="flex flex-wrap justify-between items-start gap-2 border-b border-white/5 pb-2.5">
                      <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                        {phase.phase_name}
                      </h4>
                      <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest bg-white/2 border border-white/5 px-2.5 py-1 rounded-md">
                        {formattedStart} - {formattedEnd}
                      </span>
                    </div>
                    <div className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap font-sans">
                      <MarkdownBlock content={phase.primary_focus} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Calendar View */}
      {activeTab === 'calendar' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between bg-white/3 border border-white/5 px-5 py-4 rounded-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400">
              {monthName}
            </h3>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={prevMonth} 
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-white transition-all active:scale-95"
                aria-label="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={nextMonth} 
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-white transition-all active:scale-95"
                aria-label="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="rounded-3xl border border-white/5 bg-[#050C1A]/20 backdrop-blur-xl overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-white/5 bg-white/3 text-[9px] font-black text-white/40 uppercase tracking-widest text-center py-2.5">
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
              <div>Sun</div>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 bg-white/[0.01]">
              {calendarDays.map((day, idx) => {
                const dayWorkouts = workoutsByDate[day.dateStr] || []
                const isClickable = dayWorkouts.length > 0

                return (
                  <div
                    key={idx}
                    onClick={() => isClickable && setSelectedWorkout(dayWorkouts[0])}
                    className={`min-h-[75px] p-2 border-r border-b border-white/5 transition-all relative flex flex-col justify-between ${
                      day.isCurrentMonth ? 'text-white' : 'text-white/20'
                    } ${isClickable ? 'cursor-pointer hover:bg-white/[0.03]' : ''} ${
                      day.isToday ? 'bg-cyan-500/5' : ''
                    }`}
                  >
                    {/* Day number */}
                    <span className={`text-[10px] font-mono font-bold self-start px-1.5 py-0.5 rounded-md ${
                      day.isToday ? 'bg-cyan-400 text-black font-black' : ''
                    }`}>
                      {day.dayNum}
                    </span>

                    {/* Workout indicators */}
                    <div className="space-y-1 mt-2">
                      {dayWorkouts.map((w, wIdx) => (
                        <div key={wIdx} className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getSessionDotColor(w.session_type)}`} />
                          <span className="hidden md:inline text-[9px] font-extrabold uppercase tracking-wider truncate max-w-full text-white/70">
                            {w.session_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Legend */}
          <div className="flex flex-wrap gap-4 px-4 py-2 border border-white/5 rounded-2xl bg-white/1 font-mono text-[9px] uppercase tracking-wider text-white/55">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Group Class
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Running
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Open Gym
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Rest Day
            </div>
          </div>
        </div>
      )}

      {/* Workout Detail Modal/Drawer Overlay */}
      {selectedWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div onClick={() => setSelectedWorkout(null)} className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#050C1A] border border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <span className={`text-[9px] border font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${getSessionBadgeColor(selectedWorkout.session_type)}`}>
                  {selectedWorkout.session_type}
                </span>
                <span className="text-[10px] font-mono text-white/40 ml-2">
                  {new Date(selectedWorkout.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <button 
                onClick={() => setSelectedWorkout(null)} 
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto py-5 space-y-4 text-sm text-white/80 leading-relaxed font-sans scrollbar-thin">
              <div className="flex items-center gap-4 text-xs font-mono text-white/50 border-b border-white/5 pb-3">
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-cyan-400" />
                  <span>Session: {selectedWorkout.session_time}</span>
                </div>
                <div>Phase: {selectedWorkout.phase}</div>
                <div>Status: {selectedWorkout.status}</div>
              </div>
              
              <div className="prose prose-invert max-w-none text-white/80">
                <MarkdownBlock content={selectedWorkout.workout_details} />
              </div>
            </div>
            
            {/* Footer */}
            <div className="border-t border-white/5 pt-4 flex justify-end">
              <button
                onClick={() => setSelectedWorkout(null)}
                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider text-white border border-white/5 hover:border-white/10 active:scale-95 transition-all"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
