'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
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
  const [newChatCounter, setNewChatCounter] = useState<number>(0)
  const [initialRoutineId, setInitialRoutineId] = useState<string | null>(null)
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null)
  
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  // Minimize chat on page navigation
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])



  // 5-minute inactivity timeout
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (!isOpen) {
      inactivityTimerRef.current = setTimeout(() => {
        setSessionId('new')
        setSession(null)
        setMessages([])
        setRoutine(null)
        setInitialRoutineId(null)
        setInitialPrompt(null)
        setNewChatCounter(prev => prev + 1)
      }, 5 * 60 * 1000)
    } else {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    }
    return () => { if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current) }
  }, [isOpen])

  useEffect(() => {
    console.log('[FloatingChat] Subscribing to chatEvents')
    const unsub = chatEvents.subscribe((payload) => {
      console.log('[FloatingChat] Event received payload:', payload, 'current isOpen:', isOpen)
      if (payload.action === 'minimize') {
        console.log('[FloatingChat] Minimizing chat: setting isOpen to false')
        setIsOpen(false)
      } else {
        console.log('[FloatingChat] Opening chat: setting isOpen to true')
        setIsOpen(true)
        if (payload.sessionId) {
          if (payload.sessionId === 'new') {
            setSessionId('new')
            setSession(null)
            setMessages([])
            setRoutine(null)
            setInitialRoutineId(null)
            setInitialPrompt(payload.initialPrompt ?? null)
            setNewChatCounter(prev => prev + 1)
          } else {
            setSessionId(payload.sessionId)
          }
        }
        if (payload.initialRoutineId) setInitialRoutineId(payload.initialRoutineId)
      }
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
      if (sessionId === 'new') {
        setSession(null)
        setMessages([])
        if (initialRoutineId) {
          setIsLoading(true)
          fetch(`/api/routines/${initialRoutineId}`)
            .then(res => {
              if (res.ok) return res.json()
              throw new Error('Failed to fetch routine')
            })
            .then(rout => {
              setRoutine(rout)
              setIsLoading(false)
            })
            .catch(() => {
              setRoutine(null)
              setIsLoading(false)
            })
        } else {
          setRoutine(null)
          setIsLoading(false)
        }
        return
      }
      setIsLoading(true)
      fetchChatSessionDataAction(sessionId).then(data => {
        setSession(data.session)
        setMessages(data.messages)
        setRoutine(data.routine)
        setIsLoading(false)
      })
    }
  }, [sessionId, isOpen, initialRoutineId])

  const [pos, setPos] = useState({ x: -1, y: -1 })
  const isDraggingRef = useRef(false)
  const dragOffset = useRef({ ox: 0, oy: 0 })
  const hasMoved = useRef(false)

  const startPos = useRef({ x: 0, y: 0 })
  
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
      setPos(clamp(window.innerWidth - CHIP_SIZE - 16, window.innerHeight / 2 - CHIP_SIZE / 2))
      const onResize = () => setPos(prev => clamp(prev.x, prev.y))
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }
  }, [])

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragOffset.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y }
    startPos.current = { x: e.clientX, y: e.clientY }
    hasMoved.current = false
    isDraggingRef.current = true
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isDraggingRef.current) return
    const dist = Math.hypot(e.clientX - startPos.current.x, e.clientY - startPos.current.y)
    if (dist > 5) {
      hasMoved.current = true
    }
    setPos(clamp(e.clientX - dragOffset.current.ox, e.clientY - dragOffset.current.oy))
  }

  function onPointerUp() {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    if (!hasMoved.current) {
      setIsOpen(prev => !prev)
    }
  }

  if (pos.x === -1) return null

  return (
    <>
      <button 
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ left: pos.x, top: pos.y }}
        className="fixed z-[60] p-3 rounded-full bg-nutrition text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 transition-[transform,background-color,box-shadow] duration-200 touch-none opacity-100 pointer-events-auto"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      <div className={`fixed inset-x-0 top-0 bottom-[calc(62px+env(safe-area-inset-bottom,0px))] z-[40] md:bottom-4 md:top-4 md:right-4 md:left-auto md:w-[450px] bg-background/95 backdrop-blur-xl md:rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100 pointer-events-auto translate-y-0' : 'opacity-0 scale-95 pointer-events-none translate-y-8'}`}>
      
      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-nutrition" />
          </div>
        ) : (
          <ChatInterface
            key={sessionId === 'new' ? `new-${newChatCounter}` : sessionId}
            sessionId={sessionId}
            session={session}
            sessions={sessions}
            initialMessages={messages}
            initialRoutine={routine}
            initialRoutineId={initialRoutineId}
            initialPrompt={initialPrompt ?? undefined}
            onSessionSelect={(id) => setSessionId(id)}
            onNewChat={() => {
              setSessionId('new')
              setSession(null)
              setMessages([])
              setRoutine(null)
              setInitialRoutineId(null)
              setInitialPrompt(null)
              setNewChatCounter(prev => prev + 1)
            }}
            onSessionsChange={setSessions}
            initialAgentId={null}
          />
        )}
      </div>
    </div>
    </>
  )
}
