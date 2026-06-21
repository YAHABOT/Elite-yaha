import Link from 'next/link'
import type { TimelineItem, ReadinessColor } from '@/app/actions/coaching'
import { ChevronRight } from 'lucide-react'

function ReadinessDot({ color }: { color: ReadinessColor | null | undefined }) {
  if (!color) return null
  const map: Record<ReadinessColor, string> = {
    GREEN: 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]',
    YELLOW: 'bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.5)]',
    RED: 'bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.5)]',
  }
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${map[color]}`}
      aria-label={`Readiness: ${color}`}
    />
  )
}

export function TimelineCard({ item }: { item: TimelineItem }) {
  // Theme styling based on type
  let typeColor = 'text-cyan-400'
  let borderColor = 'border-cyan-400/20'
  let bgGradient = 'from-cyan-400/5'

  if (item.type === 'evening_briefing') {
    typeColor = 'text-primary'
    borderColor = 'border-primary/20'
    bgGradient = 'from-primary/5'
  } else if (item.type === 'weekly_audit') {
    typeColor = 'text-[#FFD700]'
    borderColor = 'border-[#FFD700]/20'
    bgGradient = 'from-[#FFD700]/5'
  } else if (item.type === 'medical_report') {
    typeColor = 'text-red-400'
    borderColor = 'border-red-400/20'
    bgGradient = 'from-red-400/5'
  }

  const isMorning = item.type === 'morning_briefing'

  return (
    <Link href={`/coaching/report/${item.type}/${item.id}`}>
      <div className="flex gap-4 group">
        {/* Timeline Line & Timestamp */}
        <div className="flex flex-col items-center w-12 shrink-0">
          <div className="text-xs font-mono text-textMuted tracking-wider mb-2">
            {item.timestamp}
          </div>
          <div className="w-[1px] flex-1 bg-white/10 group-hover:bg-white/20 transition-colors" />
        </div>

        {/* Card Content */}
        <div
          className={`flex-1 mb-6 rounded-2xl bg-gradient-to-br ${bgGradient} to-transparent border border-white/5 hover:${borderColor} transition-colors overflow-hidden`}
        >
          <div className="p-4">
            {/* Header row: type label + readiness dot (morning only) + tags */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`text-xs font-black tracking-widest uppercase ${typeColor}`}>
                {item.title}
              </span>

              {isMorning && item.readinessColor && (
                <ReadinessDot color={item.readinessColor} />
              )}

              {!isMorning && (
                <div className="flex gap-2 ml-auto">
                  {item.tags.slice(0, 2).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] uppercase tracking-wider text-textMuted border border-white/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Preview text */}
            <div className="pr-6 relative">
              {isMorning && item.readinessScore != null ? (
                // Structured 2-line preview for morning briefings
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-white/80">
                    Readiness Score:{' '}
                    <span
                      className={
                        item.readinessColor === 'GREEN'
                          ? 'text-emerald-400'
                          : item.readinessColor === 'RED'
                          ? 'text-red-400'
                          : 'text-amber-400'
                      }
                    >
                      {item.readinessScore}%
                    </span>
                  </p>
                  <p className="text-xs text-white/50">
                    Today: {item.sessionType ?? 'Training Day'}
                  </p>
                </div>
              ) : (
                // Fallback: prose preview for all other types
                <p className="text-sm text-white/70 italic leading-relaxed line-clamp-2">
                  {item.preview}
                </p>
              )}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-white/50 transition-colors">
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
