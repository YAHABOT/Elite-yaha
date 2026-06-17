'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'

type Props = {
  onDone: () => void
}

const CONFETTI_COLORS = ['#06b6d4', '#a855f7', '#F5F5F5']

export function OnboardingComplete({ onDone }: Props): React.ReactElement {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))

    confetti({
      origin: { y: 0.6 },
      colors: CONFETTI_COLORS,
      particleCount: 150,
      spread: 70,
      startVelocity: 40,
      decay: 0.9,
      scalar: 1.1,
    })
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-6">
      <div
        className="w-full max-w-sm rounded-3xl border border-[#1E1E1E] bg-[#0A0A0A] p-8 text-center shadow-2xl"
        style={{
          transform: mounted ? 'scale(1)' : 'scale(0.8)',
          opacity: mounted ? 1 : 0,
          transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease',
        }}
      >
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-black text-[#F5F5F5] tracking-tight mb-2">
          You know YAHA!
        </h2>
        <p className="text-sm text-[#A1A1AA] mb-8 leading-relaxed">
          You&apos;ve completed the setup guide. Everything is configured and ready to go.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-2xl bg-[#06b6d4] px-6 py-3.5 text-sm font-black text-[#050505] hover:bg-[#06b6d4]/90 active:scale-[0.98] transition-all duration-150"
        >
          Let&apos;s go →
        </button>
      </div>
    </div>
  )
}
