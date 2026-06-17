'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  X,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronRight,
  Smartphone,
  LayoutGrid,
  MessageCircle,
  BookOpen,
  TrendingUp,
  Repeat,
  Target,
  Utensils,
  Bot,
  LayoutDashboard,
  UserCircle,
} from 'lucide-react'
import type { OnboardingState } from '@/lib/db/onboarding'
import type { StepConfig } from './steps'
import { StepCarousel } from './StepCarousel'

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="text-[#F5F5F5] font-bold">{part}</strong>
      : part
  )
}

// Map string icon names → Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  Smartphone,
  LayoutGrid,
  MessageCircle,
  BookOpen,
  TrendingUp,
  Repeat,
  Target,
  Utensils,
  Bot,
  LayoutDashboard,
  UserCircle,
}

type Props = {
  state: OnboardingState
  steps: StepConfig[]
  onClose: () => void
  onMarkDone: (id: import('@/lib/db/onboarding').OnboardingStepId) => Promise<void>
  onDismiss: () => Promise<void>
}

export function OnboardingSheet({ state, steps, onClose, onMarkDone, onDismiss }: Props): React.ReactElement {
  const completedCount = state.steps.filter((s) => s.complete).length
  const total = steps.length
  const progressPct = total > 0 ? (completedCount / total) * 100 : 0

  // Find first unlocked incomplete step
  const firstActiveIndex = state.steps.findIndex(
    (s) => s.unlocked && !s.complete
  )

  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    completedCount === 0 ? null : (firstActiveIndex >= 0 ? firstActiveIndex : null)
  )
  const [welcomeOpen, setWelcomeOpen] = useState(completedCount === 0)
  const [mounted, setMounted] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Trigger slide-in animation
    requestAnimationFrame(() => setMounted(true))
  }, [])

  function getStepStatus(index: number) {
    const s = state.steps[index]
    if (!s) return 'locked'
    if (s.complete) return 'complete'
    if (!s.unlocked) return 'locked'
    return 'active'
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#0A0A0A] border-t border-x border-[#1E1E1E] shadow-2xl"
        style={{
          transform: mounted ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#1E1E1E]" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 border-b border-[#1E1E1E]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-[#F5F5F5] tracking-tight">Setup Guide</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#121212] border border-[#1E1E1E] text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#A1A1AA]">{completedCount} of {total} complete</span>
            <span className="text-xs font-bold text-[#06b6d4]">{Math.round(progressPct)}%</span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-[#1E1E1E] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#06b6d4]"
              style={{
                width: `${progressPct}%`,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Welcome card */}
        <div className="px-4 pt-3 pb-1">
          <div className="rounded-2xl border border-[#1E1E1E] bg-[#121212] overflow-hidden">
            <button
              type="button"
              onClick={() => setWelcomeOpen((v) => !v)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#06b6d4]/10">
                <span className="text-base">👋</span>
              </div>
              <p className="flex-1 text-sm font-bold text-[#F5F5F5]">Welcome to YAHA</p>
              {welcomeOpen
                ? <ChevronDown className="h-4 w-4 shrink-0 text-[#A1A1AA]" />
                : <ChevronRight className="h-4 w-4 shrink-0 text-[#A1A1AA]/40" />}
            </button>
            {welcomeOpen && (
              <div className="px-4 pb-4 space-y-4">
                <p className="step-desc-text text-xs font-medium leading-relaxed">
                  Welcome to YAHA — the world&apos;s only tracker that evolves with you. This is a brief setup guide that will help you navigate your way around the app.
                </p>
                <button
                  type="button"
                  onClick={() => { setWelcomeOpen(false); setExpandedIndex(0) }}
                  className="w-full rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/30 px-4 py-3 text-sm font-bold text-[#06b6d4] hover:bg-[#06b6d4]/20 transition-colors"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="px-4 py-3 space-y-2">
          {steps.map((stepConfig, index) => {
            const status = getStepStatus(index)
            const isExpanded = expandedIndex === index && status !== 'locked'
            const isFirstActive = index === firstActiveIndex
            const Icon = ICON_MAP[stepConfig.icon] ?? LayoutGrid

            return (
              <div
                key={stepConfig.id}
                className={[
                  'rounded-2xl border transition-all duration-200',
                  status === 'complete'
                    ? 'border-[#1E1E1E] bg-[#0A0A0A] opacity-60'
                    : status === 'locked'
                    ? 'border-[#1E1E1E] bg-[#0A0A0A] opacity-40'
                    : isFirstActive
                    ? 'border-l-2 border-l-[#06b6d4] border-t-[#1E1E1E] border-r-[#1E1E1E] border-b-[#1E1E1E] bg-[#121212]'
                    : 'border-[#1E1E1E] bg-[#121212]',
                ].join(' ')}
              >
                {/* Collapsed row */}
                <button
                  type="button"
                  onClick={() => {
                    if (status !== 'locked') {
                      setExpandedIndex(expandedIndex === index ? null : index)
                    }
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  disabled={status === 'locked'}
                >
                  <div
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                      status === 'complete'
                        ? 'bg-[#06b6d4]/10'
                        : status === 'locked'
                        ? 'bg-[#1E1E1E]'
                        : 'bg-[#06b6d4]/10',
                    ].join(' ')}
                  >
                    {status === 'complete' ? (
                      <CheckCircle2 className="h-4 w-4 text-[#06b6d4]" />
                    ) : status === 'locked' ? (
                      <Lock className="h-3.5 w-3.5 text-[#A1A1AA]/40" />
                    ) : (
                      <Icon className="h-4 w-4 text-[#06b6d4]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={[
                        'text-sm font-bold leading-snug truncate',
                        status === 'locked' || status === 'complete'
                          ? 'text-[#A1A1AA]'
                          : 'text-[#F5F5F5]',
                      ].join(' ')}
                    >
                      {stepConfig.shortTitle}
                    </p>
                  </div>

                  {status !== 'locked' && (
                    isExpanded
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-[#A1A1AA]" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-[#A1A1AA]/40" />
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    {/* Title + description — always above media */}
                    <div>
                      <p className="text-sm font-bold text-[#F5F5F5] mb-1.5">{stepConfig.title}</p>
                      <div className="space-y-2">
                        {stepConfig.description.split('\n\n').map((para, i) => (
                          <p key={i} className="step-desc-text text-xs font-medium leading-relaxed">{renderBold(para)}</p>
                        ))}
                      </div>
                    </div>

                    {/* Platform steps or screenshot carousel */}
                    {stepConfig.platforms && stepConfig.platforms.length > 0 ? (
                      <div className="space-y-3">
                        {stepConfig.platforms.map((platform) => (
                          <div key={platform.name} className="rounded-xl bg-[#050505] border border-[#1E1E1E] p-3">
                            <div className="flex items-center gap-2 mb-2.5">
                              <p className="text-xs font-bold text-[#F5F5F5]">{platform.name}</p>
                              <span className="text-[10px] text-[#A1A1AA] bg-[#1E1E1E] px-2 py-0.5 rounded-full">{platform.note}</span>
                            </div>
                            <ol className="space-y-2">
                              {platform.steps.map((step, i) => (
                                <li key={i} className="flex gap-2.5 items-start">
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#06b6d4]/10 text-[10px] font-bold text-[#06b6d4]">
                                    {i + 1}
                                  </span>
                                  <p className="text-xs text-[#A1A1AA] leading-relaxed">{renderBold(step)}</p>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    ) : stepConfig.screenshots.length > 0 ? (
                      <div className="flex justify-center">
                        <div className="w-full max-w-[260px]">
                          <StepCarousel
                            images={stepConfig.screenshots}
                            alt={stepConfig.title}
                            FallbackIcon={Icon}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* CTA */}
                    {stepConfig.ctaLabel && stepConfig.ctaHref && (
                      <div className="space-y-2">
                        <div className={stepConfig.cta2Label ? 'flex gap-2' : ''}>
                          <Link
                            href={stepConfig.ctaHref}
                            onClick={onClose}
                            className="flex items-center justify-center w-full rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/30 px-4 py-3 text-sm font-bold text-[#06b6d4] hover:bg-[#06b6d4]/20 transition-colors"
                          >
                            {stepConfig.ctaLabel}
                          </Link>
                          {stepConfig.cta2Label && stepConfig.cta2Href && (
                            <Link
                              href={stepConfig.cta2Href}
                              onClick={onClose}
                              className="flex items-center justify-center w-full rounded-xl bg-[#121212] border border-[#1E1E1E] px-4 py-3 text-sm font-bold text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-[#F5F5F5]/20 transition-colors"
                            >
                              {stepConfig.cta2Label}
                            </Link>
                          )}
                        </div>
                        {stepConfig.ctaNote && (
                          <p className="text-center text-[10px] text-[#A1A1AA]/50 leading-relaxed px-2">
                            {stepConfig.ctaNote}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Manual / optional completion buttons — only when not yet complete */}
                    {status !== 'complete' && stepConfig.completionType === 'manual' && (
                      <button
                        type="button"
                        onClick={() => void onMarkDone(stepConfig.id)}
                        className="w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3 text-sm font-bold text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-[#F5F5F5]/20 transition-colors"
                      >
                        Mark as done
                      </button>
                    )}

                    {status !== 'complete' && stepConfig.completionType === 'optional' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void onMarkDone(stepConfig.id)}
                          className="flex-1 rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3 text-sm font-bold text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-[#F5F5F5]/20 transition-colors"
                        >
                          Mark as done
                        </button>
                        <button
                          type="button"
                          onClick={() => void onMarkDone(stepConfig.id)}
                          className="flex-1 rounded-xl border border-[#1E1E1E] bg-transparent px-4 py-3 text-sm font-bold text-[#A1A1AA]/50 hover:text-[#A1A1AA] transition-colors"
                        >
                          Skip for now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-5 border-t border-[#1E1E1E] flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => void onDismiss()}
            className="text-xs text-[#A1A1AA]/50 hover:text-[#A1A1AA] transition-colors font-medium"
          >
            Dismiss guide
          </button>
          <p className="text-[10px] text-[#A1A1AA]/30 text-center">
            You can restore this from Settings → Help & Guide
          </p>
        </div>
      </div>
    </>
  )
}
