'use client'

import { useState, useEffect } from 'react'
import type { OnboardingState, OnboardingStepId, StepStatus } from '@/lib/db/onboarding'
import type { StepConfig } from './steps'
import { OnboardingChip } from './OnboardingChip'
import { OnboardingSheet } from './OnboardingSheet'
import { OnboardingComplete } from './OnboardingComplete'
import { markOnboardingStep, dismissOnboarding } from '@/app/actions/onboarding'

type Props = {
  initialState: OnboardingState
  steps: StepConfig[]
}

export function OnboardingRoot({ initialState, steps }: Props): React.ReactElement | null {
  const [state, setState] = useState<OnboardingState>(initialState)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [showComplete, setShowComplete] = useState(false)

  // Watch for allComplete transition
  const prevAllComplete = initialState.allComplete
  useEffect(() => {
    if (!prevAllComplete && state.allComplete) {
      setShowComplete(true)
      setIsSheetOpen(false)
    }
  }, [state.allComplete, prevAllComplete])

  async function handleMarkDone(id: OnboardingStepId): Promise<void> {
    // Optimistic update — all steps already unlocked, just flip complete
    setState((prev) => {
      const updatedSteps = prev.steps.map((s): StepStatus =>
        s.id === id ? { ...s, complete: true } : s
      )
      const allComplete = updatedSteps.every((s) => s.complete)
      return { ...prev, steps: updatedSteps, allComplete }
    })

    await markOnboardingStep(id)
  }

  async function handleDismiss(): Promise<void> {
    setState((prev) => ({ ...prev, dismissed: true }))
    setIsSheetOpen(false)
    await dismissOnboarding()
  }

  return (
    <>
      <OnboardingChip
        state={state}
        steps={steps}
        onOpen={() => setIsSheetOpen(true)}
      />

      {isSheetOpen && (
        <OnboardingSheet
          state={state}
          steps={steps}
          onClose={() => setIsSheetOpen(false)}
          onMarkDone={handleMarkDone}
          onDismiss={handleDismiss}
        />
      )}

      {showComplete && (
        <OnboardingComplete
          onDone={() => setShowComplete(false)}
        />
      )}
    </>
  )
}
