'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatInterface } from './ChatInterface'
import { chatEvents } from '@/lib/events/chatEvents'
import { MessageCircle, X, Loader2 } from 'lucide-react'
import { fetchChatSessionsAction, fetchChatSessionDataAction } from '@/app/actions/floatingChat'
import type { ChatSession, ChatMessage } from '@/types/chat'
import type { Routine } from '@/types/routine'

const CHIP_SIZE = 46

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string>('new')
  const [initialRoutineId, setInitialRoutineId] = useState<string | null>(null)
  
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const unsub = chatEvents.subscribe((payload) => {
      setIsOpen(true)
      if (payload.sessionId) setSessionId(payload.sessionId)
      if (payload.initialRoutineId) setInitialRoutineId(payload.initialRoutineId)
    })
    return unsub
  }, [])

  // Load sessions when opened
  useEffect(() => {
    if (isOpen) {
      fetchChatSessionsAction().then(setSessions)
    }
  }, [isOpen])

  // Load session data when sessionId changes and it's open
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      fetchChatSessionDataAction(sessionId).then(data => {
        setSession(data.session)
        setMessages(data.messages)
        setRoutine(data.routine)
        setIsLoading(false)
      })
    }
  }, [sessionId, isOpen])

  const [pos, setPos] = useState({ x: -1, y: -1 })
  const isDraggingRef = useRef(false)
  const dragOffset = useRef({ ox: 0, oy: 0 })
  const hasMoved = useRef(false)

  function clamp(x: number, y: number) {
    if (typeof window === 'undefined') return { x, y }
    const maxX = window.innerWidth - CHIP_SIZE - 8
    const maxY = window.innerHeight - CHIP_SIZE - 8
    return {
      x: Math.max(8, Math.min(x, maxX)),
      y: Math.max(8, Math.min(y, maxY)),
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPos(clamp(window.innerWidth - CHIP_SIZE - 16, window.innerHeight - CHIP_SIZE - 80))
      const onResize = () => setPos(prev => clamp(prev.x, prev.y))
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }
  }, [])

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragOffset.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y }
    hasMoved.current = false
    isDraggingRef.current = true
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isDraggingRef.current) return
    hasMoved.current = true
    setPos(clamp(e.clientX - dragOffset.current.ox, e.clientY - dragOffset.current.oy))
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    if (!hasMoved.current) {
      setIsOpen(true)
    }
  }

  if (!isOpen) {
    if (pos.x === -1) return null
    return (
      <button 
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ left: pos.x, top: pos.y }}
        className="fixed z-[60] p-3 rounded-full bg-nutrition text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform touch-none"
      >
        <MessageCircle size={22} />
      </button>
    )
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(62px+env(safe-area-inset-bottom,0px))] z-[40] md:bottom-4 md:top-4 md:right-4 md:left-auto md:w-[450px] bg-background/95 backdrop-blur-xl md:rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-right-full duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
        <div className="font-bold text-white flex items-center gap-2">
          <MessageCircle size={18} className="text-nutrition" />
          Yaha AI
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-textMuted hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-nutrition" />
          </div>
        ) : (
          <ChatInterface
            sessionId={sessionId}
            session={session}
            sessions={sessions}
            initialMessages={messages}
            initialRoutine={routine}
            initialAgentId={null}
          />
        )}
      </div>
    </div>
  )
}
