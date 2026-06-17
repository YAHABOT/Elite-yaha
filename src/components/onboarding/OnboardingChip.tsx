'use client'

import { useState, useEffect, useRef } from 'react'
import type { OnboardingState } from '@/lib/db/onboarding'
import type { StepConfig } from './steps'

const STORAGE_KEY = 'yaha_onboarding_chip_pos'
const CHIP_SIZE = 44

type ChipPos = { x: number; y: number }

type Props = {
  state: OnboardingState
  steps: StepConfig[]
  onOpen: () => void
}

function clamp(x: number, y: number): ChipPos {
  const maxX = window.innerWidth - CHIP_SIZE - 4
  const maxY = window.innerHeight - CHIP_SIZE - 4
  return {
    x: Math.max(4, Math.min(x, maxX)),
    y: Math.max(4, Math.min(y, maxY)),
  }
}

function readStoredPos(): ChipPos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ChipPos
  } catch {
    return null
  }
}

function savePos(pos: ChipPos): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
  } catch { /* ignore */ }
}

export function OnboardingChip({ state, steps, onOpen }: Props): React.ReactElement | null {
  const completedCount = state.steps.filter((s) => s.complete).length
  const total = steps.length

  const [pos, setPos] = useState<ChipPos>({ x: -1, y: -1 })
  // Use ref for drag state — avoids stale closure in pointer event handlers
  const isDraggingRef = useRef(false)
  const [isDraggingVisual, setIsDraggingVisual] = useState(false)
  const dragOffset = useRef<{ ox: number; oy: number }>({ ox: 0, oy: 0 })
  const hasMoved = useRef(false)
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  // Initialise from localStorage, clamped to current viewport
  useEffect(() => {
    const stored = readStoredPos()
    if (stored) {
      setPos(clamp(stored.x, stored.y))
    } else {
      setPos(clamp(window.innerWidth - CHIP_SIZE - 16, 80))
    }

    // Re-clamp on resize (e.g. DevTools viewport switch, device rotation)
    function onResize() {
      setPos((prev) => clamp(prev.x, prev.y))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragOffset.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y }
    hasMoved.current = false
    isDraggingRef.current = true
    setIsDraggingVisual(true)
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isDraggingRef.current) return
    hasMoved.current = true
    setPos(clamp(e.clientX - dragOffset.current.ox, e.clientY - dragOffset.current.oy))
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    setIsDraggingVisual(false)
    const finalPos = clamp(e.clientX - dragOffset.current.ox, e.clientY - dragOffset.current.oy)
    setPos(finalPos)
    savePos(finalPos)
    if (!hasMoved.current) {
      onOpenRef.current()
    }
  }

  if (state.dismissed || state.allComplete) return null
  // Don't render until position is initialised
  if (pos.x === -1) return null

  const radius = 18
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? completedCount / total : 0
  const dashOffset = circumference * (1 - progress)

  return (
    <button
      type="button"
      aria-label={`Setup guide — ${completedCount} of ${total} steps complete`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        zIndex: 100,
        cursor: isDraggingVisual ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
      }}
      className="flex items-center justify-center rounded-full bg-[#0A0A0A] border border-[#1E1E1E] shadow-2xl"
    >
      <svg width={CHIP_SIZE} height={CHIP_SIZE} viewBox={`0 0 ${CHIP_SIZE} ${CHIP_SIZE}`} className="absolute inset-0">
        {/* Track */}
        <circle
          cx={CHIP_SIZE / 2}
          cy={CHIP_SIZE / 2}
          r={radius}
          fill="none"
          stroke="#1E1E1E"
          strokeWidth={3}
        />
        {/* Progress fill */}
        <circle
          cx={CHIP_SIZE / 2}
          cy={CHIP_SIZE / 2}
          r={radius}
          fill="none"
          stroke="#06b6d4"
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${CHIP_SIZE / 2} ${CHIP_SIZE / 2})`}
          style={{ transition: isDraggingVisual ? 'none' : 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <span className="relative text-[10px] font-black text-[#F5F5F5] leading-none select-none">
        {completedCount}/{total}
      </span>
    </button>
  )
}
