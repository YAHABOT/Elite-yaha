'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Paperclip, Send, X, Bot, Zap, CheckCircle2, Menu, Image as ImageIcon, FileText, Camera } from 'lucide-react'
import { ActionCard, UpdateDataCardComponent } from '@/components/chat/ActionCard'
import { CreateTrackerCard } from '@/components/chat/CreateTrackerCard'
import { AgentSelector } from '@/components/chat/AgentSelector'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import type { ChatMessage, ChatSession } from '@/types/chat'
import type { ChatAttachment } from '@/types/action-card'
import type { Agent } from '@/types/agent'
import type { Routine } from '@/types/routine'
import { getAgentsAction } from '@/app/actions/agents'
import { renameSessionAction } from '@/app/actions/chat'

// Returns YYYY-MM-DD in the user's LOCAL timezone — avoids UTC midnight boundary issues
// where UTC+7 users in the early morning would get yesterday's UTC date as "today".
function getLocalDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MAX_TEXTAREA_ROWS = 6
// Routine trigger TTL: 30 minutes. Prevents re-firing on page reload when the
// routine is still in progress. Legitimate re-starts work after the TTL expires.
const ROUTINE_TRIGGER_TTL_MS = 30 * 60 * 1000
const ACCEPTED_IMAGE_TYPES = 'image/*'
// Gemini inlineData supports images, audio, text, and PDF — Office formats excluded
// Updated to match backend ALLOWED_MIME_TYPES (src/lib/ai/gemini.ts)
const ACCEPTED_FILE_TYPES = '.txt,.pdf,.csv,application/pdf,text/plain,text/csv,image/jpeg,image/png,image/webp,image/gif,audio/ogg,audio/mpeg,audio/mp4,audio/wav,audio/flac,audio/aac'
const ALLOWED_MIME_PREFIXES = ['image/', 'audio/']
const ALLOWED_MIME_EXACT = new Set([
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
])

function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) || ALLOWED_MIME_EXACT.has(mimeType)
}

const MAX_IMAGE_PX = 1280
const IMAGE_QUALITY = 0.8

async function compressImage(file: File): Promise<string> {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_PX / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', IMAGE_QUALITY).split(',')[1]
}

type AttachedFile = {
  file: File
  attachment: ChatAttachment
}

type Props = {
  initialMessages: ChatMessage[]
  sessionId: string
  session: ChatSession | null
  initialRoutine?: Routine | null
  sessions?: ChatSession[]
}

export function ChatInterface({ initialMessages, sessionId, session: initialSession, initialRoutine, sessions = [] }: Props): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<ChatSession | null>(initialSession)
  const [agents, setAgents] = useState<Agent[]>([])
  const [activeAgentId, setActiveAgentId] = useState<string | null>(initialSession?.active_agent_id ?? null)
  const [currentRoutine, setCurrentRoutine] = useState<Routine | null>(initialRoutine ?? null)
  // BUG 6 fix: internal session ID state so URL updates don't remount the component
  const [currentSessionId, setCurrentSessionId] = useState<string>(sessionId)
  // BUG 3: mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false)
  // BUG 4: save chat modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false)
  const [saveTitle, setSaveTitle] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)
  // BUG #4 fix: separate auto-prompt delay state from network loading state
  // allows user input during the 600ms auto-advance timeout
  const [isAutoPrompting, setIsAutoPrompting] = useState<boolean>(false)

  // B8: streaming text accumulates here until the [DONE] event arrives
  const [streamingText, setStreamingText] = useState<string>('')

  const [isHydrated, setIsHydrated] = useState<boolean>(false)
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState<boolean>(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileDocInputRef = useRef<HTMLInputElement>(null)
  const fileCameraInputRef = useRef<HTMLInputElement>(null)
  // FIX-4: abort in-flight chat request on unmount to prevent ghost/duplicate responses
  const abortControllerRef = useRef<AbortController | null>(null)
  // Ref to the stop function for the "pending server response" poll (new-chat early navigation)
  const serverPollStopRef = useRef<(() => void) | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const triggerSent = useRef(false)

  // Mark hydrated after first client paint so the messages area doesn't flash unstyled
  useEffect(() => { setIsHydrated(true) }, [])

  // Log Again — detect sessionStorage payload set by LogEntryCard "Log Again" button.
  // Auto-sends a silent message so AI generates a pre-filled action card on arrival.
  useEffect(() => {
    const raw = sessionStorage.getItem('yaha_log_again')
    if (!raw) return
    sessionStorage.removeItem('yaha_log_again')
    try {
      const payload = JSON.parse(raw) as { trackerName: string; fieldSummary: string }
      const autoMessage = `Re-log a ${payload.trackerName} entry for me. Pre-fill the action card with these exact values: ${payload.fieldSummary}. I may want to adjust some values before confirming.`
      // Small delay to let session initialise
      const t = setTimeout(() => {
        void handleSendSilent(autoMessage)
      }, 400)
      return () => clearTimeout(t)
    } catch {
      // corrupt payload — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // NEW-CHAT POLL: When ChatInterface loads with only a user message (no AI response yet),
  // the user navigated here early (from MobileChatHome) while the server was still generating.
  // Poll via router.refresh() until the AI response appears in initialMessages.
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (sessionId === 'new') return
    // Messages are ASC (oldest first). The last item is the most recent.
    const mostRecent = initialMessages[initialMessages.length - 1]

    // AI has already responded (or no messages) — ensure loading is off and bail.
    // This branch runs when router.refresh() brings back the assistant message, which
    // changes initialMessages, re-runs this effect, and we correctly clear loading here.
    if (!mostRecent || mostRecent.role !== 'user') {
      setIsLoading(false) // FIX: clear loading when effect re-runs after AI responds
      return
    }

    // Don't poll for genuinely stale sessions (AI never responded, old message)
    const ageMs = Date.now() - new Date(mostRecent.created_at).getTime()
    if (ageMs > 2 * 60 * 1000) return

    setIsLoading(true)
    let count = 0
    const interval = setInterval(() => {
      count++
      if (count >= 20) { // 60 seconds max — give up
        clearInterval(interval)
        pollingIntervalRef.current = null
        serverPollStopRef.current = null
        setIsLoading(false)
      } else {
        router.refresh() // triggers re-render → initialMessages updates → effect re-runs
      }
    }, 3000)

    pollingIntervalRef.current = interval

    serverPollStopRef.current = () => {
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      serverPollStopRef.current = null
      setIsLoading(false)
    }

    return () => {
      // Cleanup: clear interval when deps change (i.e. initialMessages got new data).
      // Do NOT setIsLoading(false) here — the effect immediately re-runs and will either
      // restart the poll (AI still pending) or call setIsLoading(false) above (AI responded).
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      serverPollStopRef.current = null
    }
  }, [initialMessages, sessionId, router])

  // Sync new assistant messages received from router.refresh() into local state.
  // FIX: Removed the `if (!serverPollStopRef.current) return` guard — the cleanup runs
  // BEFORE this effect fires, which nulls serverPollStopRef. Without the guard, messages
  // are always synced. Loading is cleared by the poll effect re-run or the stop function.
  useEffect(() => {
    setMessages(prev => {
      const existingIds = new Set(prev.map(m => m.id))
      const fresh = initialMessages.filter(m => m.role === 'assistant' && !existingIds.has(m.id))
      if (fresh.length === 0) return prev
      // Stop the poll interval if still running (belt-and-suspenders — effect re-run also stops it)
      const stopFn = serverPollStopRef.current
      if (stopFn) stopFn()
      return [...prev, ...fresh]
    })
  }, [initialMessages]) // dep: only initialMessages (functional update avoids messages dep)

  // Warn before page refresh/close is now handled globally by RefreshGuard in app layout.

  // FIX-4: track mount state to prevent state updates after unmount (e.g. app switch)
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Close attachment menu when clicking outside
  useEffect(() => {
    if (!isAttachMenuOpen) return
    function handleOutsideClick(): void {
      setIsAttachMenuOpen(false)
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [isAttachMenuOpen])

  // Fetch Agents
  useEffect(() => {
    getAgentsAction().then(setAgents)
  }, [])

  // Auto-trigger ritual if routine param is provided.
  // Triple-locked: triggerSent.current (per-instance) + sessionStorage TTL (survives
  // React StrictMode remounts + short navigations) + active_routine_id DB state (survives
  // full page reloads by redirecting to the real session URL).
  useEffect(() => {
    if (triggerSent.current) return
    const routineId = searchParams.get('routine')
    if (!routineId || sessionId !== 'new' || messages.length > 0) return

    // If a routine is already active in the current session state, skip re-trigger.
    // This handles the case where session state was refreshed after initial trigger.
    if (session?.active_routine_id) return

    const storageKey = `yaha_trigger_${routineId}`
    const sessionKey = `yaha_trigger_session_${routineId}`
    const lastTs = sessionStorage.getItem(storageKey)

    // If we previously triggered this routine and have a real session ID stored,
    // redirect to that session so the DB state (active_routine_id, current_step_index)
    // is loaded on next mount — preventing a re-start from step 0.
    const savedSessionId = sessionStorage.getItem(sessionKey)
    if (lastTs && savedSessionId && Date.now() - Number(lastTs) < ROUTINE_TRIGGER_TTL_MS) {
      router.replace(`/chat/${savedSessionId}`)
      return
    }

    // Clear stale session key if TTL expired
    if (!lastTs || Date.now() - Number(lastTs) >= ROUTINE_TRIGGER_TTL_MS) {
      sessionStorage.removeItem(sessionKey)
    }

    triggerSent.current = true
    sessionStorage.setItem(storageKey, String(Date.now()))

    const trigger = currentRoutine?.trigger_phrase || 'start ritual'
    handleSendInternal(trigger, routineId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, sessionId, messages.length, currentRoutine, session?.active_routine_id, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleAgentSelect = async (agentId: string | null) => {
    setActiveAgentId(agentId)
    if (currentSessionId !== 'new') {
      // Update session — /api/chat always returns text/event-stream; use SSE reader
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, agentId: agentId || null, message: "Switching agent...", date: getLocalDateStr() })
      })
      if (!res.ok) return

      let finalSessionId = currentSessionId
      let finalMessageId: string | null = null
      let finalContent = ''
      let finalActions: unknown[] = []

      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6)) as { type: string; messageId?: string; sessionId?: string; content?: string; actions?: unknown[] }
              if (event.type === 'done' && event.messageId) {
                finalMessageId = event.messageId
                finalSessionId = event.sessionId ?? currentSessionId
                finalContent = event.content ?? ''
                finalActions = event.actions ?? []
              }
            } catch { /* ignore parse errors */ }
          }
        }
      } else {
        const data = await res.json()
        finalMessageId = data.message?.id ?? `sw-${Date.now()}`
        finalSessionId = data.sessionId ?? currentSessionId
        finalContent = data.message?.content ?? ''
        finalActions = data.message?.actions ?? []
      }

      if (!isMountedRef.current) return
      if (finalMessageId) {
        setMessages(prev => [...prev, {
          id: finalMessageId!,
          session_id: finalSessionId,
          role: 'assistant' as const,
          content: finalContent,
          actions: finalActions as ChatMessage['actions'],
          attachments: null,
          created_at: new Date().toISOString()
        }])
      }
    }
  }

  // Silent variant — sends a message to the API without adding a visible user bubble.
  // Used by the routine auto-advance flow so the UI doesn't show an awkward hidden prompt.
  // Also refreshes session + routine state so the step badge advances correctly (Fix 5).
  // sessionIdOverride: pass the finalSessionId from the done handler to avoid stale closure
  // capturing currentSessionId='new' on the very first message of a new session.
  async function handleSendSilent(text: string, sessionIdOverride?: string): Promise<void> {
    if (isLoading) return
    setIsLoading(true)
    const sessId = sessionIdOverride ?? currentSessionId
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessId, agentId: activeAgentId, date: getLocalDateStr() }),
        signal: abortControllerRef.current?.signal
      })
      if (!res.ok) return

      // Handle SSE streaming response — stream chunks so the step-N prompt appears
      // progressively instead of all-at-once (also surfaces errors that would otherwise
      // be silently swallowed by the old done-only approach).
      const contentType = res.headers.get('content-type') ?? ''
      let finalSessionId = currentSessionId
      let finalMessageId: string | null = null
      let finalContent = ''
      let finalActions: unknown[] = []

      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6)) as { type: string; text?: string; messageId?: string; sessionId?: string; content?: string; actions?: unknown[] }
              if (event.type === 'chunk' && event.text) {
                // Stream chunks so the step-N prompt appears progressively (not all-at-once)
                setStreamingText(prev => prev + event.text)
              } else if (event.type === 'done' && event.messageId) {
                finalMessageId = event.messageId
                finalSessionId = event.sessionId ?? currentSessionId
                finalContent = event.content ?? ''
                finalActions = event.actions ?? []
                setStreamingText('')
              }
            } catch { /* ignore parse errors */ }
          }
        }
      } else {
        const data = await res.json()
        finalMessageId = data.message?.id ?? `mod-${Date.now()}`
        finalSessionId = data.sessionId
        finalContent = data.message?.content ?? ''
        finalActions = data.message?.actions ?? []
      }

      if (!isMountedRef.current) return
      if (finalMessageId) {
        setMessages((prev) => [...prev, {
          id: finalMessageId!,
          session_id: finalSessionId,
          role: 'assistant' as const,
          content: finalContent,
          actions: finalActions as ChatMessage['actions'],
          created_at: new Date().toISOString()
        }])
      }

      // Refresh session state so the routine step badge reflects the newly advanced step
      // Skip for 'new' sessions (no UUID yet, will be assigned on next message)
      if (finalSessionId && finalSessionId !== 'new') {
        const sessRes = await fetch(`/api/chat/sessions/${finalSessionId}`)
        if (sessRes.ok) {
          const nextSession = await sessRes.json()
          if (!isMountedRef.current) return
          setSession(nextSession)
          if (nextSession.active_routine_id) {
            const routRes = await fetch(`/api/routines/${nextSession.active_routine_id}`)
            if (routRes.ok) {
              if (!isMountedRef.current) return
              setCurrentRoutine(await routRes.json())
            }
          } else {
            setCurrentRoutine(null)
            // Routine completed via silent auto-advance — clear the session storage
            // entry so the next trigger starts fresh rather than redirecting here.
            const routineParam = searchParams.get('routine')
            if (routineParam) {
              sessionStorage.removeItem(`yaha_trigger_${routineParam}`)
              sessionStorage.removeItem(`yaha_trigger_session_${routineParam}`)
            }
          }
        }
      }
    } catch {
      // Silent — don't surface errors from auto-advance
      if (isMountedRef.current) setStreamingText('')
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }

  async function handleSendInternal(text: string, routineId?: string) {
    if (isLoading) return
    setIsLoading(true)

    // User message is optimistic
    const optimisticId = `opt-${Date.now()}`
    const optimistic: ChatMessage = {
      id: optimisticId,
      session_id: currentSessionId,
      role: 'user',
      content: text,
      actions: null,
      created_at: new Date().toISOString()
    }
    setMessages((prev) => [...prev, optimistic])

    // FIX-4: cancel any previous in-flight request; create fresh controller
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Reset streaming state for new request
    setStreamingText('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: currentSessionId, routineId, agentId: activeAgentId, date: getLocalDateStr() }),
        signal: controller.signal,
      })
      if (!res.ok) {
        let errorMessage = 'Failed to initiate ritual'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Server Error (${res.status})`
        }
        throw new Error(errorMessage)
      }

      // B8: Handle SSE streaming response — text tokens arrive incrementally
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // Parse complete SSE lines
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? '' // keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6)
            try {
              const event = JSON.parse(payload) as { type: string; text?: string; messageId?: string; sessionId?: string; actions?: unknown[]; content?: string; error?: string }

              if (event.type === 'chunk' && event.text) {
                // Append chunk to streaming display state
                setStreamingText(prev => prev + event.text)
              } else if (event.type === 'done' && event.messageId) {
                if (!isMountedRef.current) return
                const newMsgId = event.messageId
                const finalSessionId = event.sessionId ?? currentSessionId
                const shouldAutoPromptNextStep = (event as { shouldAutoPromptNextStep?: boolean }).shouldAutoPromptNextStep ?? false
                // Replace streaming placeholder with final persisted message
                setStreamingText('')
                setMessages((prev) => {
                  if (prev.some(m => m.id === newMsgId)) return prev
                  return [...prev, {
                    id: newMsgId,
                    session_id: finalSessionId,
                    role: 'assistant' as const,
                    content: event.content ?? '',
                    actions: (event.actions ?? null) as ChatMessage['actions'],
                    created_at: new Date().toISOString()
                  }]
                })
                if (finalSessionId !== currentSessionId) {
                  setCurrentSessionId(finalSessionId)
                }
                if (routineId && finalSessionId) {
                  sessionStorage.setItem(`yaha_trigger_session_${routineId}`, finalSessionId)
                }
                // Auto-trigger the next routine step prompt if the current step just completed
                if (shouldAutoPromptNextStep && finalSessionId && isMountedRef.current) {
                  // Schedule auto-send of empty message to trigger Step 2 prompt, with a small delay
                  // to allow UI to render the completion message first
                  // BUG #4 fix: Set isAutoPrompting flag to prevent submit button from being blocked
                  // EX6/EX20 FIX: Send 'continue' not '' — empty string causes a 400 (server rejects blank messages)
                  // SC2 FIX: Capture finalSessionId before any re-render — the closure in setTimeout
                  // would otherwise read currentSessionId='new' on the very first message.
                  const capturedSessionId = finalSessionId
                  setIsLoading(false)   // unblock handleSendSilent before the timer fires
                  setIsAutoPrompting(true)
                  setTimeout(() => {
                    if (isMountedRef.current) {
                      void handleSendSilent('continue', capturedSessionId)
                      setIsAutoPrompting(false)
                    }
                  }, 600)
                  // DO NOT return here — let the outer for(;;) reader loop continue to natural end
                }
              } else if (event.type === 'error') {
                throw new Error(event.error ?? 'Streaming error')
              }
            } catch (parseErr) {
              // Ignore malformed SSE lines
              if (parseErr instanceof SyntaxError) continue
              throw parseErr
            }
          }
        }
      } else {
        // Fallback: legacy JSON response
        const data = await res.json()
        if (!isMountedRef.current) return
        const newMsgId = data.message?.id ?? `mod-${Date.now()}`
        setMessages((prev) => {
          if (prev.some(m => m.id === newMsgId)) return prev
          return [...prev, {
            id: newMsgId,
            session_id: data.sessionId,
            role: 'assistant' as const,
            content: data.message.content,
            actions: data.message.actions,
            created_at: new Date().toISOString()
          }]
        })
        if (data.sessionId !== currentSessionId) {
          setCurrentSessionId(data.sessionId)
        }
        if (routineId && data.sessionId) {
          sessionStorage.setItem(`yaha_trigger_session_${routineId}`, data.sessionId)
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return // navigated away
      if (!isMountedRef.current) return
      setStreamingText('')
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (isMountedRef.current) {
        setStreamingText('')
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 24
    const maxHeight = lineHeight * MAX_TEXTAREA_ROWS
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
  }, [input])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const disallowed = files.find((f) => !isAllowedMimeType(f.type))
    if (disallowed) {
      setError(`File type not supported: ${disallowed.type}`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (fileDocInputRef.current) fileDocInputRef.current.value = ''
      if (fileCameraInputRef.current) fileCameraInputRef.current.value = ''
      return
    }

    const converted = await Promise.all(
      files.map(async (file): Promise<AttachedFile> => {
        const isImage = file.type.startsWith('image/')
        let base64: string
        let mimeType: string
        if (isImage) {
          base64 = await compressImage(file)
          mimeType = 'image/jpeg'
        } else {
          base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve((reader.result as string).split(',')[1])
            reader.readAsDataURL(file)
          })
          mimeType = file.type
        }
        return {
          file,
          attachment: {
            type: isImage ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'file',
            base64,
            mimeType,
            filename: file.name
          }
        }
      })
    )

    setAttachedFiles((prev) => [...prev, ...converted])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (fileDocInputRef.current) fileDocInputRef.current.value = ''
    if (fileCameraInputRef.current) fileCameraInputRef.current.value = ''
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed && attachedFiles.length === 0) return
    if (isLoading) return

    // Snapshot attachments before clearing state
    const snapshotAttachments = attachedFiles.map(af => af.attachment)

    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      session_id: currentSessionId,
      role: 'user',
      content: trimmed || (attachedFiles.length > 0 ? '' : '[Empty]'),
      actions: null,
      attachments: snapshotAttachments,
      created_at: new Date().toISOString()
    }

    setMessages((prev) => [...prev, optimistic])
    setInput('')
    setAttachedFiles([])
    setIsLoading(true)

    // FIX-4: cancel any previous in-flight request; create fresh controller
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          sessionId: currentSessionId,
          routineId: session?.active_routine_id,
          agentId: activeAgentId,
          attachments: snapshotAttachments,
          date: getLocalDateStr(),
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        let errorMessage = 'Failed to send message'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Server Error (${res.status})`
        }
        throw new Error(errorMessage)
      }

      // The route returns text/event-stream — detect and handle SSE vs legacy JSON.
      const attachContentType = res.headers.get('content-type') ?? ''
      let attachSessionId = currentSessionId
      let attachMessageId: string | null = null
      let attachContent = ''
      let attachActions: unknown[] = []

      if (attachContentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6)) as { type: string; messageId?: string; sessionId?: string; content?: string; actions?: unknown[] }
              if (event.type === 'done' && event.messageId) {
                attachMessageId = event.messageId
                attachSessionId = event.sessionId ?? currentSessionId
                attachContent = event.content ?? ''
                attachActions = event.actions ?? []
              }
            } catch { /* ignore parse errors */ }
          }
        }
      } else {
        const data = await res.json()
        attachMessageId = data.message?.id ?? `mod-${Date.now()}`
        attachSessionId = data.sessionId
        attachContent = data.message?.content ?? ''
        attachActions = data.message?.actions ?? []
      }

      if (!isMountedRef.current) return
      if (attachMessageId) {
        setMessages((prev) => {
          // FIX-4: deduplicate — skip if this message id already exists in state
          if (prev.some(m => m.id === attachMessageId)) return prev
          return [...prev, {
            id: attachMessageId!,
            session_id: attachSessionId,
            role: 'assistant' as const,
            content: attachContent,
            actions: attachActions as ChatMessage['actions'],
            attachments: null,
            created_at: new Date().toISOString()
          }]
        })
      }

      setAttachedFiles([]) // Clear attachments after success

      // Update session state (routine progress etc.)
      // Skip for 'new' sessions (no UUID yet, will be assigned on next message)
      if (attachSessionId && attachSessionId !== 'new') {
        const sessRes = await fetch(`/api/chat/sessions/${attachSessionId}`)
        if (sessRes.ok) {
          const nextSession = await sessRes.json()
          if (!isMountedRef.current) return
          setSession(nextSession)

          if (nextSession.active_routine_id) {
            const routRes = await fetch(`/api/routines/${nextSession.active_routine_id}`)
            if (routRes.ok) {
              if (!isMountedRef.current) return
              setCurrentRoutine(await routRes.json())
            }
          } else {
            setCurrentRoutine(null)
            // Routine completed — clear the session storage entry so the next start
            // of the same routine creates a fresh session rather than redirecting to
            // this completed one.
            const routineParam = searchParams.get('routine')
            if (routineParam) {
              sessionStorage.removeItem(`yaha_trigger_${routineParam}`)
              sessionStorage.removeItem(`yaha_trigger_session_${routineParam}`)
            }
          }
        }
      }

      // Track the real session UUID in state for subsequent API calls.
      // Do NOT update the URL — Next.js 15 intercepts window.history.replaceState
      // and triggers a full page remount when the path segment changes.
      // The URL stays as /chat/new for the lifetime of this unsaved chat.
      if (attachSessionId !== currentSessionId) {
        setCurrentSessionId(attachSessionId)
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return // navigated away
      if (!isMountedRef.current) return
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }

  // BUG 4: Save Chat handler
  async function handleSaveChat(): Promise<void> {
    if (!saveTitle.trim() || currentSessionId === 'new') return
    setIsSaving(true)
    try {
      const res = await renameSessionAction(currentSessionId, saveTitle.trim())
      if (res.success) {
        setSession(prev => prev ? { ...prev, title: saveTitle.trim() } : prev)
        setIsSaveModalOpen(false)
        setSaveTitle('')
        router.refresh()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const activeAgent = agents.find(a => a.id === activeAgentId)

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background text-foreground">
      {/* BUG 3: Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        // Outer div handles close-on-backdrop-click. pointer-events-none on the visual
        // backdrop prevents iOS Safari from creating a stacking context that traps touches.
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setIsMobileSidebarOpen(false)}>
          {/* Visual backdrop — pointer-events-none so it never intercepts touch events */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none" />
          {/* Sidebar panel — stopPropagation prevents close when clicking inside */}
          <div
            className="absolute left-0 top-0 z-10 h-full w-72 animate-in slide-in-from-left-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <ChatSidebar
              sessions={sessions}
              currentSessionId={currentSessionId}
              onMobileClose={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* BUG 4: Save Chat Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSaveModalOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#0A0A0A] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-1 text-base font-black tracking-tight text-textPrimary">Save Chat</h3>
            <p className="mb-4 text-xs text-textMuted/60">Give this conversation a name to save it permanently.</p>
            <input
              autoFocus
              type="text"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSaveChat()
                if (e.key === 'Escape') setIsSaveModalOpen(false)
              }}
              placeholder="Chat name..."
              className="mb-4 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-textPrimary placeholder-textMuted/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/10"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSaveChat()}
                disabled={isSaving || !saveTitle.trim()}
                className="flex-1 rounded-xl bg-nutrition px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] disabled:opacity-40"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-textMuted transition-colors hover:text-textPrimary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Header — shrink-0 keeps it pinned at top while messages scroll */}
      <div className="shrink-0 bg-card/60 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-textMuted transition-colors hover:bg-white/[0.06] hover:text-textPrimary md:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h2 className="font-display-heading text-base text-textPrimary leading-tight">
              {currentRoutine ? currentRoutine.name.toUpperCase() : activeAgent ? activeAgent.name.toUpperCase() : 'YAHA ASSISTANT'}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${
                currentRoutine ? 'bg-nutrition animate-pulse' : activeAgent ? 'bg-[#a855f7] animate-pulse' : 'bg-[rgba(0,212,255,0.50)]'
              }`} />
              <span className="font-ui text-textMuted/50" style={{ fontSize: '9px', letterSpacing: '0.12em' }}>
                {currentRoutine ? 'RITUAL ACTIVE' : activeAgent ? 'AGENT ACTIVE' : 'LOGGING SESSION'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Chat — shown when session is unnamed */}
          {(!session || session.title === 'New Chat') && currentSessionId !== 'new' && (
            <button
              type="button"
              onClick={() => {
                const suggestion = messages.find(m => m.role === 'user')?.content?.slice(0, 30) ?? 'My Chat'
                setSaveTitle(suggestion)
                setIsSaveModalOpen(true)
              }}
              className="rounded-full px-3 py-1 font-ui transition-all"
              style={{ fontSize: '9px', letterSpacing: '0.12em', border: '1px solid rgba(0,212,255,0.20)', background: 'rgba(0,212,255,0.06)', color: 'rgba(0,212,255,0.70)' }}
            >
              Save
            </button>
          )}

          {session?.active_routine_id && (
            <div className="hidden items-center gap-2 rounded-2xl pl-3 pr-2 py-1.5 md:flex" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.20)' }}>
              <span className="font-ui text-textMuted/60 uppercase truncate max-w-[100px]" style={{ fontSize: '9px', letterSpacing: '0.12em' }}>
                {currentRoutine?.name || 'Ritual'}
              </span>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-nutrition text-black">
                <span className="font-ui" style={{ fontSize: '9px' }}>{session.current_step_index + 1}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages — min-h-0 is critical: without it a flex child won't shrink below content height,
           causing the whole page to scroll instead of just this element */}
      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-y-none flex flex-col px-4 lg:px-12 ${!isHydrated ? 'invisible' : ''}`}>
        {/* Error banner — pinned at top */}
        {error && (
          <div className="mt-4 mb-2 flex items-center justify-between rounded-2xl bg-red-500/[0.08] border border-red-500/20 px-4 py-3 text-sm text-red-300 animate-in slide-in-from-top-2 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Zap className="h-4 w-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="ml-3 shrink-0 text-red-500/50 hover:text-red-400 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Empty state — fills full height, centered */}
        {messages.length === 0 && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5"
              style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(168,85,247,0.08), transparent)', boxShadow: '0 0 40px rgba(0,212,255,0.12)' }}>
              <Bot className="h-9 w-9" style={{ color: 'rgba(0,212,255,0.80)' }} />
            </div>
            <div className="space-y-2">
              <p className="font-display-heading text-sm text-textPrimary/80">YAHA Assistant</p>
              <p className="font-ui text-textMuted max-w-xs leading-relaxed" style={{ fontSize: '10px', letterSpacing: '0.06em' }}>Log health data, start a ritual, or ask anything about your wellbeing.</p>
            </div>
          </div>
        )}

        {/* Spacer — pushes messages down when content is short */}
        {(messages.length > 0 || isLoading) && <div className="flex-1" />}

        <div className="flex flex-col gap-2 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex w-full animate-in fade-in slide-in-from-bottom-3 duration-500 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div data-testid={message.role === 'user' ? 'message-user' : 'message-model'} className={`flex max-w-[78%] flex-col gap-3 lg:max-w-[65%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-4 py-3 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-2xl rounded-br-sm text-[#000d1a] font-medium'
                    : 'rounded-2xl rounded-bl-sm text-textPrimary/90'
                }`}
                style={message.role === 'user' ? {
                  background: 'linear-gradient(135deg, #00d4ff, #0090cc)',
                  boxShadow: '0 4px 20px rgba(0,212,255,0.22)',
                } : {
                  background: '#091424',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <MarkdownText content={message.content.replace(/```json\s*[\s\S]*?```/g, '').trim()} />
              </div>

              {/* Attachments Display */}
              {message.attachments && message.attachments.length > 0 && (
                <div className={`flex flex-wrap gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.attachments.map((attachment, i: number) => {
                    const at = attachment as ChatAttachment
                    if (at.type === 'image') {
                      return (
                        <div key={i} className="relative group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`data:${at.mimeType};base64,${at.base64}`}
                            alt={at.filename || 'Attachment'}
                            className="max-h-60 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        </div>
                      )
                    }
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-bold text-muted-foreground shadow-md">
                        <Paperclip className="h-3 w-3 text-muted-foreground/60" />
                        <span className="max-w-[150px] truncate">{at.filename || 'File'}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {message.actions && message.actions.length > 0 && (
                <div className="mt-1 w-full space-y-3">
                  {message.actions.map((card, idx) => {
                    if (card.type === 'CREATE_TRACKER') {
                      return (
                        <CreateTrackerCard
                          key={idx}
                          card={card}
                          messageId={message.id}
                          cardIndex={idx}
                          onConfirm={() => {
                            setMessages(prev => prev.map(msg => {
                              if (msg.id !== message.id || !msg.actions) return msg
                              const updatedActions = msg.actions.map((a, i) =>
                                i === idx ? { ...a, confirmed: true } : a
                              )
                              return { ...msg, actions: updatedActions }
                            }))
                          }}
                        />
                      )
                    }
                    if (card.type === 'UPDATE_DATA') {
                      return (
                        <UpdateDataCardComponent
                          key={idx}
                          card={card}
                          messageId={message.id}
                          cardIndex={idx}
                          onConfirm={() => {
                            setMessages(prev => prev.map(msg => {
                              if (msg.id !== message.id || !msg.actions) return msg
                              const updatedActions = msg.actions.map((a, i) =>
                                i === idx ? { ...a, confirmed: true } : a
                              )
                              return { ...msg, actions: updatedActions }
                            }))
                          }}
                        />
                      )
                    }
                    return (
                      <ActionCard
                        key={idx}
                        card={card}
                        messageId={message.id}
                        cardIndex={idx}
                        onConfirm={() => {
                          // FIX-5: persist confirmed=true into in-memory messages state so
                          // subsequent renders in the same session don't revert to pending
                          setMessages(prev => prev.map(msg => {
                            if (msg.id !== message.id || !msg.actions) return msg
                            const updatedActions = msg.actions.map((a, i) =>
                              i === idx ? { ...a, confirmed: true } : a
                            )
                            return { ...msg, actions: updatedActions }
                          }))
                        }}
                        // EX6/EX20 FIX: onConfirmed removed — shouldAutoPromptNextStep now sends
                        // 'continue' automatically (600ms after AI response), so this handler
                        // was causing duplicate Step N prompts on every confirm click.
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            {streamingText ? (
              // B8: render partial streaming text as it arrives
              <div className="max-w-[78%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed text-textPrimary/90" style={{ background: '#091424', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="whitespace-pre-wrap">{streamingText}</p>
                <span className="inline-block h-3 w-0.5 animate-pulse ml-0.5 align-bottom" style={{ background: 'rgba(0,212,255,0.60)' }} />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: '#091424', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: 'rgba(0,212,255,0.60)' }} />
                <span className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: 'rgba(0,212,255,0.60)' }} />
                <span className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: 'rgba(0,212,255,0.60)' }} />
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
        </div>{/* end messages wrapper */}
      </div>

      {/* Active Ritual Banner */}
      {session?.active_routine_id && (
        <div className="mx-6 mb-4 flex items-center gap-4 rounded-3xl bg-nutrition/[0.06] border border-nutrition/20 p-4 animate-in slide-in-from-bottom-5 backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.08)]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-nutrition/20 shadow-[0_0_16px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="h-5 w-5 text-nutrition" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-nutrition/70">Active Ritual</p>
            <h4 className="text-sm font-black text-foreground">Step {session.current_step_index + 1} In Progress</h4>
          </div>
          <button
            type="button"
            onClick={async () => {
              setIsLoading(true)
              abortControllerRef.current?.abort()
              const controller = new AbortController()
              abortControllerRef.current = controller
              try {
                const res = await fetch('/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    message: 'skip',
                    sessionId: currentSessionId,
                    routineId: session?.active_routine_id,
                    agentId: activeAgentId,
                    attachments: [],
                    date: getLocalDateStr(),
                  }),
                  signal: controller.signal,
                })
                if (!res.ok) throw new Error('Failed to skip step')
                const attachContentType = res.headers.get('content-type') ?? ''
                if (attachContentType.includes('text/event-stream') && res.body) {
                  const reader = res.body.getReader()
                  const decoder = new TextDecoder()
                  let buffer = ''
                  for (;;) {
                    const { done, value } = await reader.read()
                    if (done) break
                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() ?? ''
                    for (const line of lines) {
                      if (!line.startsWith('data: ')) continue
                      try {
                        const event = JSON.parse(line.slice(6)) as { type: string; sessionId?: string; content?: string }
                        if (event.type === 'done') {
                          if (event.sessionId) setCurrentSessionId(event.sessionId)
                        }
                      } catch { /* ignore parse errors */ }
                    }
                  }
                }
              } catch (e) {
                console.error('Skip failed:', e)
              } finally {
                setIsLoading(false)
              }
            }}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl bg-nutrition/20 hover:bg-nutrition/30 text-nutrition text-xs font-bold uppercase transition-colors disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      )}

      {/* Input — shrink-0 keeps it always visible above mobile bottom nav; no sticky needed inside flex column */}
      <div className="shrink-0 bg-card/60 backdrop-blur-xl border-t border-white/5 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:p-5 lg:px-12">
        <form data-testid="chat-form" onSubmit={handleSubmit} className="relative mx-auto max-w-4xl">
          {/* Image file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          {/* Camera capture input */}
          <input
            ref={fileCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          {/* Document/file input */}
          <input
            ref={fileDocInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="relative flex items-end gap-2 rounded-[28px] bg-white/[0.03] border border-white/[0.08] p-2 pl-3 transition-all duration-300 focus-within:border-[rgba(0,212,255,0.25)] focus-within:bg-white/[0.05] focus-within:shadow-[0_0_24px_rgba(0,212,255,0.08)]">
            <div className="mb-1 flex items-center gap-0.5 relative">
              {/* Attach menu popover */}
              {isAttachMenuOpen && (
                <div className="absolute bottom-11 left-0 z-20 flex flex-col gap-1 rounded-2xl border border-white/10 bg-[#0A0A0A] p-2 shadow-2xl animate-in slide-in-from-bottom-2 duration-150">
                  <button
                    type="button"
                    onClick={() => { setIsAttachMenuOpen(false); fileCameraInputRef.current?.click() }}
                    className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-textPrimary/80 transition-all hover:bg-white/[0.06] hover:text-textPrimary whitespace-nowrap"
                  >
                    <Camera className="h-4 w-4 text-mood shrink-0" />
                    Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAttachMenuOpen(false); fileInputRef.current?.click() }}
                    className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-textPrimary/80 transition-all hover:bg-white/[0.06] hover:text-textPrimary whitespace-nowrap"
                  >
                    <ImageIcon className="h-4 w-4 text-sleep shrink-0" />
                    Photo Library
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAttachMenuOpen(false)
                      // Delay click by one tick — closing the menu triggers a re-render that
                      // can swallow the click event on mobile before the input fires.
                      setTimeout(() => fileDocInputRef.current?.click(), 0)
                    }}
                    className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-textPrimary/80 transition-all hover:bg-white/[0.06] hover:text-textPrimary whitespace-nowrap"
                  >
                    <FileText className="h-4 w-4 text-workout shrink-0" />
                    Attach File
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsAttachMenuOpen(v => !v)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 transition-all duration-200 hover:bg-white/[0.06] hover:text-muted-foreground"
                aria-label="Attach file or image"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <AgentSelector
                agents={agents || []}
                activeAgentId={activeAgentId}
                onSelect={handleAgentSelect}
              />
            </div>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Shift+Enter sends — plain Enter inserts a newline (textarea default)
                if (e.key === 'Enter' && e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              data-testid="message-input"
              placeholder="Log something..."
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none md:text-base resize-none"
            />

            <button
              type="submit"
              disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:shadow-none disabled:scale-100"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #0090cc)', boxShadow: '0 0 16px rgba(0,212,255,0.30)', color: '#000d1a' }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {attachedFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {attachedFiles.map((af, i) => (
                <div key={i} className="flex items-center gap-2 rounded-full border border-nutrition/20 bg-nutrition/[0.06] py-1.5 pl-3 pr-2 text-[11px] font-bold text-nutrition/80 transition-all duration-200">
                  <Paperclip className="h-3 w-3 shrink-0" />
                  <span className="max-w-[150px] truncate">{af.file.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles(f => f.filter((_, idx) => idx !== i))}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-nutrition/20 hover:text-nutrition transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

function MarkdownText({ content }: { content: string }) {
  // Simple markdown-lite renderer for a "premium" feel without a heavy library
  const lines = content.split('\n')

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // Handle Bullet Points
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          const text = line.trim().substring(2)
          return (
            <div key={i} className="flex gap-2.5 pl-1">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-nutrition/60" />
              <span className="leading-relaxed">{renderBold(text)}</span>
            </div>
          )
        }

        // Regular Paragraphs
        return <p key={i} className="leading-relaxed">{renderBold(line)}</p>
      })}
    </div>
  )
}

function renderBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-black text-white">
              {part.slice(2, -2)}
            </strong>
          )
        }
        // Wrap plain text in span to ensure consistent JSX returns
        return (
          <span key={i}>{part}</span>
        )
      })}
    </>
  )
}
