'use client'

import { useState, useRef } from 'react'

type Props = {
  images: string[]
  alt: string
  FallbackIcon: React.ElementType
}

const SWIPE_THRESHOLD = 40 // px needed to trigger slide change

export function StepCarousel({ images, alt, FallbackIcon }: Props): React.ReactElement {
  const [index, setIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const isDragging = useRef(false)
  const startX = useRef(0)

  const total = images.length
  const hasSingle = total === 1
  const hasMultiple = total > 1

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!hasMultiple) return
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    startX.current = e.clientX
    setDragOffset(0)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return
    setDragOffset(e.clientX - startX.current)
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return
    isDragging.current = false
    const delta = e.clientX - startX.current
    setDragOffset(0)

    if (delta < -SWIPE_THRESHOLD && index < total - 1) {
      setIndex((i) => i + 1)
    } else if (delta > SWIPE_THRESHOLD && index > 0) {
      setIndex((i) => i - 1)
    }
  }

  // Placeholder
  if (total === 0) {
    return (
      <div className="rounded-xl overflow-hidden bg-[#050505] border border-[#1E1E1E] aspect-[9/16] max-h-[420px] flex flex-col items-center justify-center gap-2 text-[#1E1E1E]">
        <FallbackIcon className="h-10 w-10" />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
          Screenshot coming soon
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Slide window */}
      <div
        className="rounded-xl overflow-hidden bg-[#050505] border border-[#1E1E1E] aspect-[9/16] max-h-[420px] relative select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: hasMultiple ? 'pan-y' : 'auto', cursor: hasMultiple ? 'grab' : 'default' }}
      >
        {/* Slides track */}
        <div
          className="flex h-full"
          style={{
            width: `${total * 100}%`,
            transform: `translateX(calc(${-index * (100 / total)}% + ${dragOffset}px))`,
            transition: isDragging.current ? 'none' : 'transform 250ms ease',
          }}
        >
          {images.map((src, i) => (
            <div
              key={i}
              className="h-full shrink-0"
              style={{ width: `${100 / total}%` }}
            >
              <img
                src={src}
                alt={`${alt} — ${i + 1} of ${total}`}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Chevron buttons on desktop (hidden on touch) */}
        {hasMultiple && (
          <>
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/60 border border-[#1E1E1E] flex items-center justify-center text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors md:flex hidden"
                aria-label="Previous"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {index < total - 1 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/60 border border-[#1E1E1E] flex items-center justify-center text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors md:flex hidden"
                aria-label="Next"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Dot indicators — only when multiple */}
      {hasMultiple && (
        <div className="flex items-center justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="transition-all duration-200"
              style={{
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === index ? '#a855f7' : 'rgba(168,85,247,0.25)',
              }}
            />
          ))}
        </div>
      )}

      {/* Slide counter — subtle, only when multiple */}
      {hasMultiple && !hasSingle && (
        <p className="text-center text-[11px] text-[#a855f7] font-bold">
          {index + 1} / {total}
        </p>
      )}
    </div>
  )
}
