'use client'

import { useState, useEffect, useMemo } from 'react'
import { TimelineCard } from './TimelineCard'
import type { TimelineItem, TimelineType } from '@/app/actions/coaching'
import { Loader2, Filter } from 'lucide-react'

// Helper to group by date
function groupItemsByDate(items: TimelineItem[]) {
  const groups: Record<string, TimelineItem[]> = {}
  items.forEach(item => {
    // Format: "FRI, 20 FEB"
    const dateStr = item.date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    }).toUpperCase()
    
    if (!groups[dateStr]) {
      groups[dateStr] = []
    }
    groups[dateStr].push(item)
  })
  return groups
}

export function TimelineFeed({ initialItems }: { initialItems: TimelineItem[] }) {
  const [activeFilter, setActiveFilter] = useState<TimelineType | 'all'>('all')

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return initialItems
    return initialItems.filter(i => i.type === activeFilter)
  }, [initialItems, activeFilter])

  const groupedItems = useMemo(() => groupItemsByDate(filteredItems), [filteredItems])
  const dateKeys = Object.keys(groupedItems)

  return (
    <div className="flex flex-col min-h-full">
      {/* Filters */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-white/5 py-3 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-colors ${activeFilter === 'all' ? 'bg-white text-black' : 'bg-white/5 text-textMuted hover:bg-white/10'}`}
          >
            All Updates
          </button>
          <button 
            onClick={() => setActiveFilter('morning_briefing')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-colors ${activeFilter === 'morning_briefing' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-textMuted hover:bg-white/10'}`}
          >
            Morning
          </button>
          <button 
            onClick={() => setActiveFilter('evening_briefing')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-colors ${activeFilter === 'evening_briefing' ? 'bg-primary text-black' : 'bg-white/5 text-textMuted hover:bg-white/10'}`}
          >
            Evening
          </button>
          <button 
            onClick={() => setActiveFilter('weekly_audit')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-colors ${activeFilter === 'weekly_audit' ? 'bg-[#FFD700] text-black' : 'bg-white/5 text-textMuted hover:bg-white/10'}`}
          >
            Weekly
          </button>
          <button 
            onClick={() => setActiveFilter('medical_report')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-colors ${activeFilter === 'medical_report' ? 'bg-red-400 text-black' : 'bg-white/5 text-textMuted hover:bg-white/10'}`}
          >
            Medical
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        {dateKeys.length === 0 ? (
          <div className="text-center py-12 text-white/40 italic">
            No reports found for this filter.
          </div>
        ) : (
          dateKeys.map(dateStr => (
            <div key={dateStr} className="mb-8">
              {/* Date Header */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
                <span className="text-xs font-mono font-bold tracking-widest text-white/70">
                  {dateStr}
                </span>
              </div>
              
              {/* Items for this date */}
              <div className="flex flex-col">
                {groupedItems[dateStr].map(item => (
                  <TimelineCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
