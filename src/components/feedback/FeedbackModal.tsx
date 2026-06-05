'use client'

import { useState, useEffect, useCallback } from 'react'
import { checkFeedbackEligibility, submitFeedback } from '@/app/actions/feedback'

type FeedbackResponse = 'very_helpful' | 'helpful_needs_work' | 'not_helpful'

const SESSION_DISMISSED_KEY = 'yaha_feedback_dismissed'

type ResponseOption = {
  value: FeedbackResponse
  label: string
  emoji: string
  activeBorder: string
  activeBg: string
  activeText: string
}

const RESPONSE_OPTIONS: ResponseOption[] = [
  {
    value: 'very_helpful',
    label: 'Very helpful',
    emoji: '🙌',
    activeBorder: 'border-[#10b981]',
    activeBg: 'bg-[#10b981]/10',
    activeText: 'text-[#10b981]',
  },
  {
    value: 'helpful_needs_work',
    label: 'Helpful, but needs work',
    emoji: '🔧',
    activeBorder: 'border-[#f59e0b]',
    activeBg: 'bg-[#f59e0b]/10',
    activeText: 'text-[#f59e0b]',
  },
  {
    value: 'not_helpful',
    label: 'Not helpful',
    emoji: '😕',
    activeBorder: 'border-[#ef4444]',
    activeBg: 'bg-[#ef4444]/10',
    activeText: 'text-[#ef4444]',
  },
]

export function FeedbackModal(): React.ReactElement | null {
  const [visible, setVisible] = useState(false)
  const [selected, setSelected] = useState<FeedbackResponse | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [thanked, setThanked] = useState(false)

  const tryShow = useCallback(async () => {
    // Already dismissed this session
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_DISMISSED_KEY)) return
    // Already visible
    if (visible) return

    const { eligible } = await checkFeedbackEligibility()
    if (eligible) {
      setVisible(true)
    }
  }, [visible])

  // Mount timer: show after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      void tryShow()
    }, 4000)
    return () => clearTimeout(timer)
  }, [tryShow])

  // Event trigger: show immediately when a log is confirmed
  useEffect(() => {
    function handleLogConfirmed() {
      void tryShow()
    }
    window.addEventListener('yaha:log-confirmed', handleLogConfirmed)
    return () => window.removeEventListener('yaha:log-confirmed', handleLogConfirmed)
  }, [tryShow])

  function handleDismiss() {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, '1')
    setVisible(false)
  }

  async function handleSubmit() {
    if (!selected) return
    setSubmitting(true)
    const result = await submitFeedback(selected, comment || undefined)
    setSubmitting(false)

    if (result.error) {
      // Still close gracefully — don't surface internal errors to users
      setVisible(false)
      return
    }

    setThanked(true)
    setTimeout(() => setVisible(false), 2000)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-[380px] rounded-3xl border border-white/10 bg-[#0A0A0A] shadow-2xl animate-in fade-in zoom-in-95 duration-300"
        style={{ padding: '24px' }}
      >
        {thanked ? (
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <span className="text-3xl">🙏</span>
            <p className="text-base font-bold text-textPrimary">Thanks for the feedback!</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-60 mb-1">
                Quick question 👋
              </p>
              <h2 className="text-lg font-black text-textPrimary leading-tight">
                Are you finding YAHA useful?
              </h2>
            </div>

            {/* Response options */}
            <div className="flex flex-col gap-2 mb-4">
              {RESPONSE_OPTIONS.map((opt) => {
                const isActive = selected === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelected(opt.value)}
                    className={[
                      'w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-150',
                      'flex items-center gap-3',
                      isActive
                        ? `${opt.activeBorder} ${opt.activeBg} ${opt.activeText}`
                        : 'border-white/10 bg-white/[0.03] text-textPrimary hover:bg-white/[0.06]',
                    ].join(' ')}
                  >
                    <span className="text-base leading-none">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Optional comment */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything else you'd like to share?"
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-textPrimary placeholder:text-textMuted/50 resize-none outline-none focus:border-white/20 transition-colors mb-4"
            />

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className={[
                  'flex-1 rounded-xl py-3 text-sm font-black transition-all duration-150',
                  selected && !submitting
                    ? 'bg-[#10b981] text-white hover:bg-[#0d9e6e] shadow-[0_0_16px_rgba(16,185,129,0.3)]'
                    : 'bg-white/5 text-textMuted cursor-not-allowed',
                ].join(' ')}
              >
                {submitting ? 'Sending…' : 'Submit'}
              </button>
              <button
                onClick={handleDismiss}
                className="text-xs text-textMuted hover:text-textPrimary transition-colors py-3 px-2 whitespace-nowrap"
              >
                Maybe later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
