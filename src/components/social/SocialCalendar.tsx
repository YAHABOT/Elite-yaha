'use client'

import React, { useState } from 'react'
import { ContentScheduleItem } from '@/lib/db/social'
import { Calendar, Instagram, Film, BookOpen, Clock, AlertTriangle, CheckCircle, Info, X } from 'lucide-react'

type Props = {
  initialItems: ContentScheduleItem[]
}

export function SocialCalendar({ initialItems }: Props): React.ReactElement {
  const [selectedItem, setSelectedItem] = useState<ContentScheduleItem | null>(null)
  
  // July 2026 Starts on Wednesday (day index 3, if Sunday is 0)
  // Let's align with Mon-Sun grid: Wednesday is 3rd day (Mon=0, Tue=1, Wed=2)
  const daysInJuly = 31
  const emptyStartSlots = 2 // Mon, Tue are empty slots
  
  const calendarDays = Array.from({ length: daysInJuly }, (_, i) => i + 1)
  const totalSlots = Array(emptyStartSlots).fill(null).concat(calendarDays)

  // Map dates 'YYYY-MM-DD' to items
  const getItemsForDay = (day: number) => {
    const dateStr = `2026-07-${String(day).padStart(2, '0')}`
    return initialItems.filter(item => {
      // Handle date parsing safely (extracting YYYY-MM-DD)
      const itemDate = new Date(item.date).toISOString().split('T')[0]
      return itemDate === dateStr
    })
  }

  const getPlatformStyle = (platform: string) => {
    switch (platform) {
      case 'Instagram':
        return 'bg-gradient-to-r from-pink-500/20 to-violet-500/20 border-pink-500/30 text-pink-400 hover:from-pink-500/30 hover:to-violet-500/30'
      case 'TikTok':
        return 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border-cyan-500/30 text-cyan-400 hover:from-cyan-500/30 hover:to-emerald-500/30'
      case 'Substack':
        return 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400 hover:from-amber-500/30 hover:to-orange-500/30'
      default:
        return 'bg-white/5 border-white/10 text-white/70'
    }
  }

  const getPlatformIcon = (platform: string, size = 12) => {
    switch (platform) {
      case 'Instagram':
        return <Instagram size={size} className="shrink-0" />
      case 'TikTok':
        return <Film size={size} className="shrink-0" />
      case 'Substack':
        return <BookOpen size={size} className="shrink-0" />
      default:
        return <Calendar size={size} className="shrink-0" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Published':
        return <CheckCircle size={14} className="text-emerald-400" />
      case 'Edited':
        return <Clock size={14} className="text-cyan-400" />
      case 'Assets Received':
        return <Info size={14} className="text-blue-400" />
      case 'Assets Requested':
        return <AlertTriangle size={14} className="text-amber-400" />
      default:
        return <Clock size={14} className="text-white/40" />
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-2 py-6 md:p-6 text-white min-h-[85vh]">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-wider bg-gradient-to-r from-white via-white to-cyan-400 bg-clip-text text-transparent uppercase">
            Social Posting Calendar
          </h1>
          <p className="text-white/50 text-xs md:text-sm mt-1">
            July 1st – July 7th launch window schedule. Click on any item to view scripts and required assets.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs bg-slate-950/60 border border-white/5 rounded-xl p-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/30 border border-cyan-400/40" />
            <span className="text-white/60">TikTok</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500/30 border border-pink-400/40" />
            <span className="text-white/60">Instagram</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/30 border border-amber-400/40" />
            <span className="text-white/60">Substack</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-slate-950/75 border-b border-white/5 py-4 px-4">
          <div className="text-sm font-black tracking-widest text-center text-white/90 uppercase">
            📅 July 2026
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-white/5 bg-slate-950/40 text-center py-2.5 text-[10px] md:text-xs font-black tracking-wider text-white/40 uppercase">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
          <div>Sun</div>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-[120px] md:auto-rows-[140px]">
          {totalSlots.map((day, idx) => {
            if (day === null) {
              return (
                <div 
                  key={`empty-${idx}`} 
                  className="border-r border-b border-white/5 bg-slate-950/20 last:border-r-0"
                />
              )
            }

            const dayItems = getItemsForDay(day)
            const isHighlightRange = day >= 1 && day <= 7

            return (
              <div
                key={`day-${day}`}
                className={`border-r border-b border-white/5 p-1.5 md:p-3 flex flex-col justify-between last:border-r-0 group transition-all relative ${
                  isHighlightRange 
                    ? 'bg-cyan-500/[0.01] hover:bg-white/[0.02]' 
                    : 'bg-slate-950/10 opacity-30 pointer-events-none'
                }`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] md:text-xs font-bold leading-none ${
                    isHighlightRange ? 'text-white/80 group-hover:text-white' : 'text-white/20'
                  }`}>
                    {day}
                  </span>
                  {dayItems.length > 0 && (
                    <span className="text-[9px] bg-white/5 border border-white/5 text-white/40 px-1 rounded scale-90 md:scale-100">
                      {dayItems.length} post{dayItems.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Items container */}
                <div className="flex-1 flex flex-col justify-end gap-1 mt-1.5 overflow-hidden">
                  {dayItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`w-full text-left text-[9px] md:text-[10px] font-medium py-1 px-1.5 rounded-lg border flex items-center gap-1 transition-all truncate shrink-0 ${getPlatformStyle(
                        item.platform
                      )}`}
                    >
                      {getPlatformIcon(item.platform, 10)}
                      <span className="truncate">{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal Detail Overlay */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all">
          <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-950/60 border-b border-white/5 p-4 md:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border ${getPlatformStyle(selectedItem.platform)}`}>
                  {getPlatformIcon(selectedItem.platform, 18)}
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-white/40 flex items-center gap-2">
                    <span>{selectedItem.platform}</span>
                    <span>•</span>
                    <span className="text-cyan-400">{selectedItem.pillar}</span>
                  </div>
                  <h3 className="text-base md:text-lg font-black text-white mt-0.5">
                    {selectedItem.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6 overflow-y-auto space-y-5 text-sm leading-relaxed flex-1 scrollbar-thin">
              {/* Vitals and details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                <div>
                  <div className="text-[10px] text-white/40 uppercase font-black tracking-widest">Post Date</div>
                  <div className="text-xs font-bold mt-1 text-white/80">
                    {new Date(selectedItem.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase font-black tracking-widest">Workflow Status</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {getStatusIcon(selectedItem.status)}
                    <span className="text-xs font-bold text-white/80">{selectedItem.status}</span>
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <div className="text-[10px] text-white/40 uppercase font-black tracking-widest font-mono">Pillar Category</div>
                  <div className="text-xs font-bold mt-1 text-cyan-400">{selectedItem.pillar}</div>
                </div>
              </div>

              {/* Hook (if applicable) */}
              {selectedItem.hook && selectedItem.hook !== 'N/A - Email Newsletter' && (
                <div className="space-y-1.5">
                  <h4 className="text-xs uppercase font-black tracking-widest text-pink-400">⚡ 3-Second Hook</h4>
                  <div className="bg-pink-500/5 border border-pink-500/20 p-3 rounded-xl text-xs md:text-sm font-bold italic text-pink-200">
                    &quot;{selectedItem.hook}&quot;
                  </div>
                </div>
              )}

              {/* Script / Content Details */}
              <div className="space-y-1.5">
                <h4 className="text-xs uppercase font-black tracking-widest text-cyan-400">📝 Script / Content Concept</h4>
                <div className="bg-slate-950/30 border border-white/5 p-4 rounded-xl text-xs md:text-sm text-white/80 whitespace-pre-wrap font-medium">
                  {selectedItem.script_details}
                </div>
              </div>

              {/* Assets Required */}
              {selectedItem.assets_needed && (
                <div className="space-y-1.5">
                  <h4 className="text-xs uppercase font-black tracking-widest text-amber-400">📸 Raw Assets Required From You</h4>
                  <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl text-xs md:text-sm text-amber-200 font-bold">
                    {selectedItem.assets_needed}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950/60 border-t border-white/5 p-4 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setSelectedItem(null)}
                className="bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
