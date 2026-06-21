'use client'

import { Sunrise, Moon, ArrowRight } from 'lucide-react'
import type { Routine } from '@/types/routine'
import { chatEvents } from '@/lib/events/chatEvents'

type Props = {
  routine: Routine
  type: 'day_start' | 'day_end'
}

export function RoutineBanner({ routine, type }: Props): React.ReactElement {
  const isDayStart = type === 'day_start'

  if (isDayStart) {
    return (
      <div className="relative overflow-hidden rounded-3xl p-6 backdrop-blur-sm"
        style={{ border: '1px solid rgba(245,158,11,0.22)', background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(234,179,8,0.04), transparent)', boxShadow: '0 0 40px rgba(245,158,11,0.08)' }}>
        {/* Ambient glow blob */}
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full blur-2xl" style={{ background: 'rgba(245,158,11,0.12)' }} />
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl p-2.5" style={{ border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.12)', boxShadow: '0 0 20px rgba(245,158,11,0.15)' }}>
            <Sunrise className="h-6 w-6" style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h2 className="font-display-heading text-sm text-textPrimary">{routine.name}</h2>
            <p className="mt-0.5 font-ui text-textMuted" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>
              Start strong — your morning protocol is ready
            </p>
          </div>
        </div>
        <button
          onClick={() => chatEvents.openChat({ sessionId: 'new', initialRoutineId: routine.id })}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-ui transition-all duration-300"
          style={{
            fontSize: '11px', letterSpacing: '0.14em',
            border: '1px solid rgba(245,158,11,0.30)',
            background: 'rgba(245,158,11,0.10)',
            color: '#f59e0b',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'rgba(245,158,11,0.22)'
            el.style.borderColor = 'rgba(245,158,11,0.50)'
            el.style.boxShadow = '0 0 24px rgba(245,158,11,0.18)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'rgba(245,158,11,0.10)'
            el.style.borderColor = 'rgba(245,158,11,0.30)'
            el.style.boxShadow = ''
          }}
        >
          Start Day
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 backdrop-blur-sm"
      style={{ border: '1px solid rgba(99,102,241,0.22)', background: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(168,85,247,0.04), transparent)', boxShadow: '0 0 40px rgba(99,102,241,0.08)' }}>
      {/* Ambient glow blob */}
      <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full blur-2xl" style={{ background: 'rgba(168,85,247,0.12)' }} />
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl p-2.5" style={{ border: '1px solid rgba(168,85,247,0.25)', background: 'rgba(168,85,247,0.10)', boxShadow: '0 0 20px rgba(168,85,247,0.15)' }}>
          <Moon className="h-6 w-6" style={{ color: '#a855f7' }} />
        </div>
        <div>
          <h2 className="font-display-heading text-sm text-textPrimary">{routine.name}</h2>
          <p className="mt-0.5 font-ui text-textMuted" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>
            Wind down — reflect and close out your day
          </p>
        </div>
      </div>
      <button
        onClick={() => chatEvents.openChat({ sessionId: 'new', initialRoutineId: routine.id })}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-ui transition-all duration-300"
        style={{
          fontSize: '11px', letterSpacing: '0.14em',
          border: '1px solid rgba(168,85,247,0.28)',
          background: 'rgba(168,85,247,0.08)',
          color: '#a855f7',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'rgba(168,85,247,0.20)'
          el.style.borderColor = 'rgba(168,85,247,0.48)'
          el.style.boxShadow = '0 0 24px rgba(168,85,247,0.18)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'rgba(168,85,247,0.08)'
          el.style.borderColor = 'rgba(168,85,247,0.28)'
          el.style.boxShadow = ''
        }}
      >
        End Day
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
