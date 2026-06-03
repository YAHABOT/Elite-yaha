export const maxDuration = 60 // extend Vercel function timeout for AI streaming

import { createServerClient } from '@/lib/supabase/server'
import { createSession, getSession, addMessage, updateSession, getRecentMessagesForAI } from '@/lib/db/chat'
import { getTrackersBasic } from '@/lib/db/trackers'
import { getLogsForDay, getLogsForDateRange, searchLogsByFieldText } from '@/lib/db/logs'
import type { TrackerLogWithName } from '@/lib/db/logs'
import { getRoutine as fetchRoutine } from '@/lib/db/routines'
import { streamHealthMessage } from '@/lib/ai/gemini'
import { sanitizeFields, parseActionCards } from '@/lib/ai/actions'
import { buildHealthSystemPrompt, buildRoutineSystemPrompt } from '@/lib/ai/prompt-builder'
import { detectRoutineTrigger } from '@/lib/routines/detector'
import { markDayStarted, markDayEnded, getActiveDayState, persistRoutineState, clearRoutineState } from '@/lib/db/day-state'
import { getMasterBrainContext } from '@/lib/ai/master-brain'
import type { ChatAttachment, ChatInput, AnyActionCard } from '@/types/action-card'
import type { ChatSession } from '@/types/chat'
import type { Routine } from '@/types/routine'
import type { Agent } from '@/types/agent'

const MAX_MESSAGE_LENGTH = 4000

function extractSearchKeyword(message: string): string | null {
  let text = message
  // Strip conversation starters
  text = text.replace(/^(okay|ok|right|alright|so|hey)[,\s]*/gi, '')
  // Strip time expressions
  text = text.replace(/\b(last\s+(week|month|year|\d+\s+days?)|yesterday|today|this\s+week|\d+\s+days?\s+ago|in\s+[a-z]+\s+\d{4})\b/gi, '')
  // Strip command/search verb phrases (including "tell me", "give me", "list all")
  text = text.replace(/\b(tell\s+me(\s+about)?(\s+all)?|give\s+me(\s+all)?|list(\s+all)?(\s+my)?|find\s+(all\s+)?|search(\s+(my|for|through))?(\s+records?)?|show\s+me(\s+all)?|pull\s+(up|out)(\s+(my|all))?|have\s+i\s+(ever\s+)?(logged?|tracked?|eaten?|had|ate)|do\s+i\s+have|all\s+(my\s+)?(logs?|records?|entries))\b/gi, '')
  // Strip "that I had/ate/logged" relative clauses
  text = text.replace(/\b(that|which)\s+i\s+(had|ate|logged?|tracked?|consumed|eaten)\b/gi, '')
  // Strip filler words (added ate, consumed, about, with)
  text = text.replace(/\b(i|i've|my|the|in|of|for|from|with|about|that|a|an|some|any|all|logs?|records?|history|database|entries?|ever|previously|logged?|tracked?|recorded?|eaten?|had|ate|consumed|okay|ok|meal\s+notes?|notes?)\b/gi, '')
  // Clean punctuation and whitespace
  text = text.replace(/[?.,!]/g, '').replace(/\s+/g, ' ').trim()
  // Normalise plurals — "protein bowls" → "protein bowl", "bars" → "bar"
  // Strip trailing 's' so ILIKE matches both singular and plural stored values
  if (text.endsWith('s') && text.length > 3) {
    text = text.slice(0, -1)
  }
  return text.length >= 2 ? text : null
}

// Must stay in sync with ALLOWED_MIME_TYPES in src/lib/ai/gemini.ts — only accept types Gemini can process.
// Office formats (docx/xlsx/xls) are removed because Gemini's inlineData API does not support them.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/flac',
  'audio/aac',
  'application/pdf',
  'application/json',
  'text/plain',
  'text/csv',
])

type ChatRequestBody = {
  message?: string
  sessionId?: string
  routineId?: string
  attachments?: Array<{
    base64: string
    mimeType: string
    type: 'image' | 'audio' | 'file'
    filename?: string
  }>
  date?: string
  agentId?: string
}


function validateAttachments(
  rawAttachments: ChatRequestBody['attachments']
): ChatAttachment[] | undefined {
  if (!rawAttachments || rawAttachments.length === 0) return undefined

  for (const attachment of rawAttachments) {
    if (!ALLOWED_MIME_TYPES.has(attachment.mimeType)) {
      throw new Error(`Disallowed attachment MIME type: ${attachment.mimeType}`)
    }

    // BUG-V32-EX3: Validate base64 encoding before processing
    if (!attachment.base64 || typeof attachment.base64 !== 'string') {
      throw new Error('Attachment base64 data is missing or invalid')
    }

    // Validate base64 format (should only contain valid base64 characters)
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(attachment.base64)) {
      throw new Error('Attachment base64 data is malformed — contains invalid characters')
    }

    // BUG-V32-EX1: Validate filename if provided (prevent path traversal and macro attacks)
    if (attachment.filename) {
      // Reject filenames with path traversal attempts
      if (attachment.filename.includes('..') || attachment.filename.includes('/') || attachment.filename.includes('\\')) {
        throw new Error('Filename contains invalid path characters')
      }
      // Reject Office files with macro extensions
      if (attachment.filename.match(/\.(docm|xlsm|pptm|xltm)$/i)) {
        throw new Error('Macro-enabled Office files are not supported')
      }
      // Reject executables
      if (attachment.filename.match(/\.(exe|bat|cmd|sh|com|scr)$/i)) {
        throw new Error('Executable files are not allowed')
      }
    }
  }

  return rawAttachments as ChatAttachment[]
}

export async function POST(req: Request): Promise<Response> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve display name: prefer users.alias, fall back to Google full_name, then 'you'
    const userProfile = await import('@/lib/db/users').then(m => m.getUser(user.id, supabase))
    const userName = userProfile?.alias
      || (user.user_metadata?.full_name as string | undefined)
      || 'you'

    let body: ChatRequestBody
    try {
      body = (await req.json()) as ChatRequestBody
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { message, sessionId, routineId, attachments: rawAttachments, date } = body
    const hasAttachments = Array.isArray(rawAttachments) && rawAttachments.length > 0
    const msgPreview = message ? message.substring(0, 50) : '[image-only]'
    console.log(`[ChatRoute] Request: session=${sessionId}, routine=${routineId}, msg="${msgPreview}..."`)


    if (!hasAttachments && (!message || typeof message !== 'string' || message.trim().length === 0)) {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message && message.length > MAX_MESSAGE_LENGTH) {
      return Response.json(
        { error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      )
    }

    let attachments: ChatAttachment[] | undefined
    try {
      attachments = validateAttachments(rawAttachments)
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : 'Invalid attachment' },
        { status: 400 }
      )
    }

    // Get or create chat session
    let session: ChatSession
    if (sessionId && sessionId !== 'new') {
      try {
        session = await getSession(sessionId)
      } catch {
        return Response.json({ error: 'Session not found' }, { status: 404 })
      }
    } else {
      session = await createSession()
    }

    // START STREAM IMMEDIATELY after session creation.
    // Emitting the session ID as the very first byte lets MobileChatHome navigate
    // to /chat/[id] while the server builds context in the background — eliminating
    // the "waiting for new chat to open" lag that users experienced before.
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        // Helper: enqueue without throwing when the client has disconnected
        const safeEnqueue = (data: string) => {
          try { controller.enqueue(encoder.encode(data)) } catch { /* client gone */ }
        }

        let fullText = ''

        // Emit session ID FIRST — before any DB work — so MobileChatHome can navigate
        // immediately. The server continues building context while the client loads the
        // chat page. This is the primary fix for new-chat navigation lag.
        safeEnqueue(`data: ${JSON.stringify({ type: 'session', sessionId: session.id })}\n\n`)

        // BUG1 FIX: Persist user message immediately after emitting the session event.
        // MobileChatHome navigates to /chat/[id] on receipt of the session event. The chat
        // page calls getRecentMessages — the message must be in the DB by then, otherwise
        // the page loads with empty initialMessages and the NEW-CHAT POLL never fires.
        await addMessage({
          session_id: session.id,
          role: 'user',
          content: message || '',
          attachments: attachments ?? null,
        })

        // EX3 FIX: If file attachments present, send immediate ACK before AI starts processing
        // This prevents the 30s blank-screen delay users see while Gemini processes files
        if (hasAttachments && attachments && attachments.length > 0) {
          const fileNames = attachments.map(a => a.filename || 'unnamed').join(', ')
          safeEnqueue(`data: ${JSON.stringify({ type: 'chunk', text: `Processing your file(s): ${fileNames}...` })}\n\n`)
          console.log(`[ChatRoute] EX3: Sent immediate ACK for ${attachments.length} file(s)`)
        }

        try {
          // Explicit Agent selection from dropdown
          if (body.agentId !== undefined) {
            await updateSession(session.id, { active_agent_id: body.agentId || null })
            session.active_agent_id = body.agentId || null
          }

          // 1. Detect Routine Trigger (Prioritize explicit routineId)
          // FIX-7: run all independent DB fetches in parallel — routine detection,
          // trackers, agents, brain context, chat history, and day logs all fire at once.
          // This eliminates sequential Supabase round-trips that caused >1 min latency.
          // Prefer the client-supplied local date (YYYY-MM-DD in user's timezone).
          // Falls back to UTC server date only if the client didn't send one.
          const today = (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date))
            ? date
            : new Date().toISOString().split('T')[0]

          const activeDayStatePromise = getActiveDayState(supabase)
          const [
            trackers,
            agents,
            brainContext,
            historyMessages,
            dayLogs,
            activeRoutineRaw,
            routineMatchResult,
            activeDayState,
          ] = await Promise.all([
            getTrackersBasic(supabase),
            import('@/lib/db/agents').then(m => m.getAgents()),
            getMasterBrainContext(),
            getRecentMessagesForAI(session.id, 50),
            getLogsForDay(today, supabase),
            // Always try to fetch the currently active routine (null if none)
            session.active_routine_id ? fetchRoutine(session.active_routine_id) : Promise.resolve(null),
            // Run NL routine detection in parallel only when there's no active routine and no explicit id
            (!session.active_routine_id && !routineId && message)
              ? detectRoutineTrigger(message)
              : Promise.resolve(null),
            // Fetch the open day session (started but not ended) — determines default logging date
            activeDayStatePromise,
          ])

          // Sessions stay ACTIVE until the user explicitly ends or skips — NEVER auto-close based on clock.
          // Cross-day continuity is intentional: the active session's date is the authoritative logging date.
          const finalActiveDayState = activeDayState
          console.log(`[ChatRoute DEBUG] finalActiveDayState:`, JSON.stringify({
            date: finalActiveDayState?.date,
            active_routine_id: finalActiveDayState?.active_routine_id,
            current_step_index: finalActiveDayState?.current_step_index,
          }))

          // The authoritative logging date for this request:
          // 1. If a day session is open → use that session's date (even if physical day has changed)
          // 2. Otherwise → use the client-supplied local date (or UTC fallback)
          const loggingDate = finalActiveDayState?.date ?? today

          let activeRoutine: Routine | null = null

          // FIX: BUG-V32-EX17 — Restore routine state from day_state table (survives page reloads)
          // If an active routine is persisted in day_state, restore it to the session
          console.log(`[ChatRoute DEBUG] Checking restoration condition: dayState.active_routine_id=${finalActiveDayState?.active_routine_id}, session.active_routine_id=${session.active_routine_id}`)
          if (finalActiveDayState?.active_routine_id && !session.active_routine_id) {
            console.log(`[ChatRoute] RESTORING routine from day_state: ${finalActiveDayState.active_routine_id}`)
            const restored = await fetchRoutine(finalActiveDayState.active_routine_id)
            console.log(`[ChatRoute DEBUG] fetchRoutine returned:`, restored ? `Routine(${restored.id}, type=${restored.type}, steps=${restored.steps?.length})` : 'NULL')
            if (restored) {
              console.log(`[ChatRoute] Updating session with routine: id=${restored.id}, step=${finalActiveDayState.current_step_index ?? 0}`)
              await updateSession(session.id, {
                active_routine_id: restored.id,
                current_step_index: finalActiveDayState.current_step_index ?? 0,
              })
              session.active_routine_id = restored.id
              session.current_step_index = finalActiveDayState.current_step_index ?? 0
              activeRoutine = restored
              console.log(`[ChatRoute DEBUG] activeRoutine SET: ${activeRoutine.id}`)
            } else {
              console.log(`[ChatRoute ERROR] fetchRoutine failed for ${finalActiveDayState.active_routine_id}`)
            }
          } else {
            console.log(`[ChatRoute DEBUG] Restoration condition FALSE - skipping restoration`)
          }

          // FIX: BUG-V32-EX12 — Timeout recovery (30s inactivity)
          // Allow step resume if last activity was within 30 minutes (allow manual timeout recovery)
          if (activeRoutine && finalActiveDayState?.routine_last_activity_at) {
            const lastActivityTime = new Date(finalActiveDayState.routine_last_activity_at).getTime()
            const nowTime = Date.now()
            const timeoutThresholdMs = 30 * 60 * 1000 // 30 minutes

            const isTimedOut = nowTime - lastActivityTime > timeoutThresholdMs

            if (isTimedOut) {
              // Routine has timed out — allow user to resume or start fresh
              console.log(`[ChatRoute] Routine timed out after ${(nowTime - lastActivityTime) / 1000 / 60} minutes`)
              // Don't auto-resume; let user decide (implicitly resume by continuing, or type a new routine trigger)
            }
          }

          if (activeRoutineRaw) {
            activeRoutine = activeRoutineRaw
          } else if (routineId) {
            // Direct routine hit from Dashboard button
            const routine = await fetchRoutine(routineId)
            if (routine) {
              // Guard: block Start Day if a session is already open
              if (routine.type === 'day_start' && finalActiveDayState !== null) {
                const isSameDay = finalActiveDayState.date === today
                const isRoutineActive = !!finalActiveDayState.active_routine_id
                const isDayEnded = !!finalActiveDayState.day_ended_at

                if (!isSameDay) {
                  // Different day's session is open — must end it first
                  console.log(`[ChatRoute] Blocked Start Day — different day session active: ${finalActiveDayState.date}`)
                  await addMessage({ session_id: session.id, role: 'user', content: message || '', attachments: attachments ?? null })
                  const blockMsg = `Session for ${finalActiveDayState.date} is still active. Complete your End Day routine before starting ${today}. Head to the Dashboard or type your End Day trigger phrase.`
                  const savedBlock = await addMessage({ session_id: session.id, role: 'assistant', content: blockMsg, actions: [] })
                  safeEnqueue(`data: ${JSON.stringify({ type: 'chunk', text: blockMsg })}\n\n`)
                  safeEnqueue(`data: ${JSON.stringify({ type: 'done', messageId: savedBlock.id, sessionId: session.id, actions: [], content: blockMsg, shouldAutoPromptNextStep: false })}\n\n`)
                  return
                }

                if (isDayEnded) {
                  console.log(`[ChatRoute] Blocked Start Day — day already ended for ${loggingDate}`)
                  await addMessage({ session_id: session.id, role: 'user', content: message || '', attachments: attachments ?? null })
                  const blockMsg = `Your day for ${loggingDate} is already complete.`
                  const savedBlock = await addMessage({ session_id: session.id, role: 'assistant', content: blockMsg, actions: [] })
                  safeEnqueue(`data: ${JSON.stringify({ type: 'chunk', text: blockMsg })}\n\n`)
                  safeEnqueue(`data: ${JSON.stringify({ type: 'done', messageId: savedBlock.id, sessionId: session.id, actions: [], content: blockMsg, shouldAutoPromptNextStep: false })}\n\n`)
                  return
                }

                if (isRoutineActive) {
                  console.log(`[ChatRoute] Blocked Start Day — morning routine already in progress`)
                  await addMessage({ session_id: session.id, role: 'user', content: message || '', attachments: attachments ?? null })
                  const blockMsg = `Your morning routine is already in progress — continue where you left off!`
                  const savedBlock = await addMessage({ session_id: session.id, role: 'assistant', content: blockMsg, actions: [] })
                  safeEnqueue(`data: ${JSON.stringify({ type: 'chunk', text: blockMsg })}\n\n`)
                  safeEnqueue(`data: ${JSON.stringify({ type: 'done', messageId: savedBlock.id, sessionId: session.id, actions: [], content: blockMsg, shouldAutoPromptNextStep: false })}\n\n`)
                  return
                }

                // isSameDay + !isDayEnded + !isRoutineActive → orphaned state (day_started_at set but
                // routine never ran — dropped stream, user navigated away). Allow re-trigger.
                console.log(`[ChatRoute] Re-triggering Start Day — orphaned day_state detected, routine never ran`)
              }
              console.log(`[ChatRoute] Activating routine from ID: ${routine.name}`)
              await updateSession(session.id, {
                active_routine_id: routine.id,
                current_step_index: 0
              })
              session.active_routine_id = routine.id
              session.current_step_index = 0
              activeRoutine = routine
              // Start Day: lock the logging date at TRIGGER time (not at completion)
              if (routine.type === 'day_start') {
                markDayStarted(today).catch(e => console.error('[DayState] markDayStarted (trigger) failed:', e))
              }
            }
          } else if (routineMatchResult) {
            const routineMatch = routineMatchResult
            // Guard: block Start Day if a session is already open
            if (routineMatch.type === 'day_start' && finalActiveDayState !== null) {
              console.log(`[ChatRoute] Blocked Start Day — session already active for ${finalActiveDayState.date}`)
              await addMessage({ session_id: session.id, role: 'user', content: message || '', attachments: attachments ?? null })
              const isSameDay = finalActiveDayState.date === today
              const blockMsg = isSameDay
                ? `A session for ${today} is already active. You can continue logging or complete your End Day routine.`
                : `Start day for ${today} already complete. End ${finalActiveDayState.date}'s session first.`
              const savedBlock = await addMessage({ session_id: session.id, role: 'assistant', content: blockMsg, actions: [] })
              safeEnqueue(`data: ${JSON.stringify({ type: 'chunk', text: blockMsg })}\n\n`)
              safeEnqueue(`data: ${JSON.stringify({ type: 'done', messageId: savedBlock.id, sessionId: session.id, actions: [], content: blockMsg, shouldAutoPromptNextStep: false })}\n\n`)
              return
            }
            console.log(`[ChatRoute] Detected routine from text: ${routineMatch.name}`)
            await updateSession(session.id, {
              active_routine_id: routineMatch.id,
              current_step_index: 0
            })
            session.active_routine_id = routineMatch.id
            session.current_step_index = 0
            activeRoutine = routineMatch
            // Start Day: lock the logging date at TRIGGER time (not at completion)
            if (routineMatch.type === 'day_start') {
              markDayStarted(today).catch(e => console.error('[DayState] markDayStarted (trigger) failed:', e))
            }
          }

          // Map history for Gemini — include stored image attachments so follow-up
          // messages like "use the photos I just sent" have the images in context.
          type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } }
          // Include image attachments from the 10 most recent messages — needed so the AI
          // can reassess a food photo if the user challenges the estimates a few prompts later.
          const recentWithImages = new Set(historyMessages.slice(-10).map(m => m.id))
          const history = historyMessages.map(msg => {
            const parts: ContentPart[] = []
            if (msg.content) parts.push({ text: msg.content })
            if (msg.attachments && recentWithImages.has(msg.id)) {
              const attachArr = msg.attachments as Array<{ mimeType: string; base64: string }>
              for (const att of attachArr) {
                parts.push({ inlineData: { mimeType: att.mimeType, data: att.base64 } })
              }
            }
            if (parts.length === 0) parts.push({ text: '' })
            return {
              role: (msg.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
              parts,
            }
          })

          // 2. Detect Agent Switching
          let activeAgent: Agent | null = null
          const normalizedMsg = message ? message.toLowerCase().trim() : ''

          // Check for exit trigger
          if (session.active_agent_id) {
            const currentAgent = agents.find(a => a.id === session.active_agent_id)
            if (currentAgent && normalizedMsg === currentAgent.exit_trigger.toLowerCase()) {
              await updateSession(session.id, { active_agent_id: null })
              session.active_agent_id = null
            } else {
              activeAgent = currentAgent ?? null
            }
          }

          // Check for new agent trigger (even if one is active, allow switching)
          const agentTrigger = agents.find(a => normalizedMsg.includes(a.trigger.toLowerCase()))
          if (agentTrigger) {
            await updateSession(session.id, { active_agent_id: agentTrigger.id })
            session.active_agent_id = agentTrigger.id
            activeAgent = agentTrigger
          }

          // BUG-V32-6 FIX: Enforce Start Day guard — reject starting day if session already open
          // SC3 FIX: Check active_routine_id instead of day_started_at to allow re-trigger when
          // day_state is orphaned (day_started_at set but routine never ran — dropped stream etc.)
          if (normalizedMsg.includes('start day')) {
            if (finalActiveDayState) {
              const isSameDay = finalActiveDayState.date === today
              const isRoutineActive = !!finalActiveDayState.active_routine_id
              const isDayEnded = !!finalActiveDayState.day_ended_at

              if (!isSameDay || isDayEnded || isRoutineActive) {
                const blockMsg = !isSameDay
                  ? `Start day for ${today} — end ${finalActiveDayState.date}'s session first.`
                  : isDayEnded
                    ? `Your day for ${today} is already complete.`
                    : `Your morning routine is already in progress.`
                const msg = await addMessage({
                  session_id: session.id,
                  role: 'assistant',
                  content: blockMsg,
                })
                safeEnqueue(`data: ${JSON.stringify({ type: 'chunk', text: blockMsg })}\n\n`)
                safeEnqueue(`data: ${JSON.stringify({ type: 'done', messageId: msg.id, sessionId: session.id, actions: [], content: blockMsg, shouldAutoPromptNextStep: false })}\n\n`)
                return
              }
              // isSameDay + !isDayEnded + !isRoutineActive → orphaned state, allow re-trigger
            }
          }

          // FIX: Process all attachments immediately through Gemini (both routine and non-routine)
          // This ensures LOG_DATA actions are generated correctly for routine step advancement
          // and attachments are processed without queueing delays in non-routine chat.
          // NOTE: User message is already persisted above (immediately after session event emit).

          // Historical intent detection — scans message for date-range / recall patterns
          // and fetches matching logs to inject into the system prompt as HISTORICAL DATA.
          // Only runs for non-routine health chat (routines don't need historical lookups).
          const trackersMini = trackers.map(t => ({ id: t.id, name: t.name }))
          let historicalContext: TrackerLogWithName[] | undefined

          if (message) {
            const HISTORICAL_INTENT_PATTERNS = [
              /\byesterday\b/i,
              /\bday\s+before\b/i,
              /\bprevious\s+day\b/i,
              /\blast\s+(week|month)\b/i,
              /\blast\s+\d+\s+days?\b/i,
              /\b\d+\s+days?\s+ago\b/i,
              /\blast\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,  // EX15/EX26: "last friday"
              /\bsame\s+.{0,30}(yesterday|last|previous|before)\b/i,  // EX29: "same stats as yesterday"
              /\buse\s+same\b/i,                                        // EX29: "use same stats"
              /\brepeat\s+(last|yesterday|same)\b/i,
              /\bpreviously\b/i,
              /\bwhat\s+did\s+i\b/i,
              /\bcheck\s+my\b/i,
              /\bhow\s+did\s+i\s+do\b/i,
              /\bhow\s+was\s+my\b/i,
              /\bsummar[iy]se?\b/i,
              /\banaly[sz]e?\b/i,
              /\btotals?\s+for\b/i,
              /\bsummary\s+of\b/i,
              /\bwhat\s+about\b/i,
              /\bthat\s+(food|item|meal|drink|snack)\b/i,
              /\btell\s+me\s+(all|what|about)\b/i,                      // EX15/EX26: "tell me all the food I ate"
              /\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i, // "23rd may"
              /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(st|nd|rd|th)?\b/i, // "may 23rd"
              // General search/recall intent — no explicit time reference
              /\bfind\b/i,
              /\bsearch\b/i,
              /\bin (my |the )?(records?|history|logs?|database)\b/i,
              /\bdo i have\b/i,
              /\bhave i (ever |previously )?(logged?|tracked?|recorded?|eaten?|had)\b/i,
              /\bshow me all\b/i,
              /\ball (my |the )?(logs?|records?|entries)\b/i,
              /\bever (eat|ate|had|logged?|tracked?)\b/i,
              /\bpull (up |out )?(my |all )?(records?|logs?|data|entries)\b/i,
            ]
            const hasHistoricalIntent = HISTORICAL_INTENT_PATTERNS.some(p => p.test(message))

            if (hasHistoricalIntent) {
              try {
                // BUG-V32-1 FIX: Parse date range from message intent and query actual DB data.
                // Previously hard-coded to yesterday+today, causing fabrication for any other dates.
                const actualDateObj = new Date(`${today}T00:00:00.000Z`)
                const getDateStr = (d: Date): string => d.toISOString().split('T')[0]

                let rangeStart: string
                let rangeEnd = today
                let isGeneralSearch = false // true only when no explicit time ref — enables keyword filtering

                if (/\blast\s+month\b/i.test(message)) {
                  const d = new Date(actualDateObj)
                  d.setUTCDate(d.getUTCDate() - 30)
                  rangeStart = getDateStr(d)
                } else if (/\blast\s+week\b/i.test(message)) {
                  const d = new Date(actualDateObj)
                  d.setUTCDate(d.getUTCDate() - 7)
                  rangeStart = getDateStr(d)
                } else if (/\blast\s+(\d+)\s+days?\b/i.test(message)) {
                  const match = message.match(/\blast\s+(\d+)\s+days?\b/i)
                  const days = match ? Math.min(parseInt(match[1]), 90) : 7
                  const d = new Date(actualDateObj)
                  d.setUTCDate(d.getUTCDate() - days)
                  rangeStart = getDateStr(d)
                } else if (/\b(\d+)\s+days?\s+ago\b/i.test(message)) {
                  // P2-3.4 FIX: "7 days ago", "3 days ago"
                  const match = message.match(/\b(\d+)\s+days?\s+ago\b/i)
                  const days = match ? Math.min(parseInt(match[1]), 90) : 7
                  const d = new Date(actualDateObj)
                  d.setUTCDate(d.getUTCDate() - days)
                  rangeStart = getDateStr(d)
                } else if (/\blast\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(message)) {
                  // EX15/EX26 FIX: "last friday", "last monday", etc. — find the most recent past occurrence
                  const match = message.match(/\blast\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)
                  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                  const targetDay = match?.[1].toLowerCase() ?? 'friday'
                  const targetDayIndex = dayNames.indexOf(targetDay)
                  const currentDayIndex = actualDateObj.getUTCDay()
                  let daysBack = (currentDayIndex - targetDayIndex + 7) % 7
                  if (daysBack === 0) daysBack = 7 // today is that weekday → go back to previous week
                  const d = new Date(actualDateObj)
                  d.setUTCDate(d.getUTCDate() - daysBack)
                  rangeStart = getDateStr(d)
                  rangeEnd = today // include through today so AI has full recent context
                } else if (
                  /\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b/i.test(message) ||
                  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}(st|nd|rd|th)?\b/i.test(message)
                ) {
                  // EX15/EX26 FIX: Absolute date reference — "23rd may", "may 23rd", "may 23", "23 may"
                  const MONTH_MAP: Record<string, number> = {
                    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
                    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
                  }
                  // Try "day month" format first, then "month day"
                  let dayNum: number | null = null
                  let monthIdx: number | null = null
                  const dayMonthMatch = message.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)
                  const monthDayMatch = message.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})(?:st|nd|rd|th)?/i)
                  if (dayMonthMatch) {
                    dayNum = parseInt(dayMonthMatch[1])
                    monthIdx = MONTH_MAP[dayMonthMatch[2].toLowerCase().slice(0, 3)]
                  } else if (monthDayMatch) {
                    monthIdx = MONTH_MAP[monthDayMatch[1].toLowerCase().slice(0, 3)]
                    dayNum = parseInt(monthDayMatch[2])
                  }
                  if (dayNum !== null && monthIdx !== null) {
                    const targetYear = actualDateObj.getUTCFullYear()
                    const d = new Date(Date.UTC(targetYear, monthIdx, dayNum))
                    // If computed date is in the future, use previous year
                    if (d > actualDateObj) d.setUTCFullYear(targetYear - 1)
                    rangeStart = getDateStr(d)
                    rangeEnd = getDateStr(d) // fetch that specific day only (not a multi-day range)
                  } else {
                    // Fallback to yesterday if parsing fails
                    const d = new Date(actualDateObj)
                    d.setUTCDate(d.getUTCDate() - 1)
                    rangeStart = getDateStr(d)
                  }
                } else if (
                  /\bfind\b/i.test(message) ||
                  /\bsearch\b/i.test(message) ||
                  /\bin (my |the )?(records?|history|logs?|database)\b/i.test(message) ||
                  /\bdo i have\b/i.test(message) ||
                  /\bhave i (ever |previously )?(logged?|tracked?|recorded?|eaten?|had)\b/i.test(message) ||
                  /\bshow me all\b/i.test(message) ||
                  /\ball (my |the )?(logs?|records?|entries)\b/i.test(message) ||
                  /\bever (eat|ate|had|logged?|tracked?)\b/i.test(message) ||
                  /\bpull (up |out )?(my |all )?(records?|logs?|data|entries)\b/i.test(message)
                ) {
                  // General search intent with no specific time — fetch all history
                  // (getLogsForDateRange caps at 200 logs ordered DESC anyway, so this is safe)
                  rangeStart = '2020-01-01'
                  isGeneralSearch = true
                } else {
                  // Default (yesterday, "day before", "same as yesterday", "use same", "tell me all", etc.): yesterday + today
                  const d = new Date(actualDateObj)
                  d.setUTCDate(d.getUTCDate() - 1)
                  rangeStart = getDateStr(d)
                }

                // Keyword search only when there's NO explicit time reference (general searches like
                // "find protein bars ever"). Time-specific queries ("last week", "yesterday") get a
                // full date-range dump so the AI can do semantic matching across all that day's logs.
                const searchKeyword = isGeneralSearch ? extractSearchKeyword(message) : null
                if (searchKeyword) {
                  historicalContext = await searchLogsByFieldText(searchKeyword, supabase, trackersMini, 100, rangeStart, rangeEnd)
                  console.log(`[ChatRoute] Keyword search "${searchKeyword}" (all-time): ${historicalContext?.length ?? 0} logs`)
                } else {
                  historicalContext = await getLogsForDateRange(rangeStart, rangeEnd, supabase, trackersMini)
                  console.log(`[ChatRoute] Date-range fetch (${rangeStart} → ${rangeEnd}): ${historicalContext?.length ?? 0} logs`)
                }
              } catch (err) {
                console.error('[ChatRoute] Historical context fetch failed:', err)
                historicalContext = []
              }
            }
          }

          // 3. Build System Prompt priority
          // daySessionActive: true when an open session exists — AI logs to loggingDate by default
          // daySessionActive: false — neutral state, AI asks user to confirm date
          const daySessionActive = finalActiveDayState !== null
          let systemPrompt: string
          if (activeRoutine) {
            console.log(`[ChatRoute] Using routine prompt: ${activeRoutine.name} (Step ${session.current_step_index + 1})`)
            systemPrompt = buildRoutineSystemPrompt(activeRoutine, trackers, session.current_step_index, brainContext, dayLogs, loggingDate, today, historicalContext, userName, userProfile?.targets ?? undefined)
          } else if (activeAgent) {
            console.log(`[ChatRoute] Using agent prompt: ${activeAgent.name}`)
            const sessionMessagesForContext = historyMessages.map(msg => ({
              role: (msg.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
              content: msg.content || ''
            }))
            const attachmentsReceivedList = attachments
              ? attachments.map(att => ({
                  filename: att.filename || 'unnamed',
                  type: att.type
                }))
              : undefined
            const yahaSection = buildHealthSystemPrompt({ trackers, date: loggingDate, actualDate: today, userContext: brainContext, dayLogs, daySessionActive, historicalContext, sessionMessages: sessionMessagesForContext, attachmentsReceived: attachmentsReceivedList, userName, userTargets: userProfile?.targets ?? undefined, currentMessage: message, hasImageAttachment: attachments?.some(a => a.type.startsWith('image/')) ?? false })
            systemPrompt = `${activeAgent.system_prompt}\n\n---\n## YAHA HEALTH LOGGING CAPABILITIES\n${yahaSection}`
          } else {
            console.log(`[ChatRoute] Using standard health prompt. daySession=${daySessionActive ? loggingDate : 'neutral'}`)
            const sessionMessagesForContext = historyMessages.map(msg => ({
              role: (msg.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
              content: msg.content || ''
            }))
            const attachmentsReceivedList = attachments
              ? attachments.map(att => ({
                  filename: att.filename || 'unnamed',
                  type: att.type
                }))
              : undefined
            systemPrompt = buildHealthSystemPrompt({ trackers, date: loggingDate, actualDate: today, userContext: brainContext, dayLogs, daySessionActive, historicalContext, sessionMessages: sessionMessagesForContext, attachmentsReceived: attachmentsReceivedList, userName, userTargets: userProfile?.targets ?? undefined, currentMessage: message, hasImageAttachment: attachments?.some(a => a.type.startsWith('image/')) ?? false })
          }

          // BUG-V32-8 FIX: Append native macro totaling for nutrition tracker (prevents LLM arithmetic errors)
          const nutritionTracker = trackers.find(t => t.type === 'nutrition')
          if (nutritionTracker && dayLogs && dayLogs.length > 0) {
            // Find nutrition logs for today
            const todayNutritionLogs = dayLogs.filter(l => l.tracker_id === nutritionTracker.id)
            if (todayNutritionLogs.length > 0) {
              // Calculate totals natively in JavaScript
              const totals: Record<string, number> = {}
              const macroFields = ['fld_calories', 'fld_protein', 'fld_carbs', 'fld_fat', 'fld_fiber']

              for (const field of macroFields) {
                let sum = 0
                for (const log of todayNutritionLogs) {
                  const value = log.fields?.[field]
                  if (typeof value === 'number') sum += value
                }
                if (sum > 0) totals[field] = sum
              }

              // Map field IDs to labels for display
              const fieldLabelMap = new Map(
                (nutritionTracker.schema ?? []).map(f => [f.fieldId, { label: f.label, unit: f.unit }])
              )
              const totalsSummary = Object.entries(totals)
                .map(([fieldId, value]) => {
                  const meta = fieldLabelMap.get(fieldId)
                  const label = meta?.label || fieldId
                  const unit = meta?.unit || ''
                  return `- ${label}: ${value}${unit ? ' ' + unit : ''}`
                })
                .join('\n')

              systemPrompt += `\n\n## TODAY'S DAILY TOTALS (Pre-Calculated)\n${totalsSummary}\nNote: These totals have been calculated natively. Always reference these when discussing daily nutrition totals.`
            }
          }

          // Build ChatInput
          const chatInput: ChatInput = {
            text: message || '',
            attachments,
            sessionId: session.id,
            date,
          }

          // Detect whether the user's message contains an explicit date reference.
          // If not, a stale card.date more than 30 days old will be overridden with loggingDate.
          const EXPLICIT_DATE_PATTERNS = [
            /\byesterday\b/i,
            /\b(last|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)\b/i,
            /\b\d{1,2}[\/\-]\d{1,2}\b/,           // e.g. 04/03 or 4-3
            /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/, // e.g. 2026-04-03
            /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i,
            /\b\d+(st|nd|rd|th)\b/i,               // e.g. 3rd, 21st
            /\b\d+\s+(day|week|month|year)s?\s+ago\b/i, // e.g. 2 months ago, 3 weeks ago
            /\btoday\b/i,                           // e.g. log today's weight
          ]
          const messageHasExplicitDate = message
            ? EXPLICIT_DATE_PATTERNS.some(pattern => pattern.test(message))
            : false

          const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
          const loggingDateMs = new Date(loggingDate).getTime()

          // Helper: sanitize raw action cards extracted from Gemini output
          // EX4 FIX: Add idempotency key to detect and prevent duplicate action cards
          function buildSanitizedActions(rawActions: AnyActionCard[]): (AnyActionCard | null)[] {
            const recentActionHashes = new Set<string>()

            return rawActions.map(action => {
              if (action.type !== 'LOG_DATA' && action.type !== 'UPDATE_DATA') return action

              // EX4: Generate idempotency hash for action card
              const idempotencyKey = (() => {
                if (action.type === 'LOG_DATA') {
                  const fieldsStr = JSON.stringify(action.fields || {})
                  const dateStr = action.date || loggingDate
                  return `${action.trackerId}-${fieldsStr}-${dateStr}`
                } else {
                  const fieldsStr = JSON.stringify(action.fields || {})
                  return `${action.trackerId}-${fieldsStr}-update`
                }
              })()

              // Create a hash of the idempotency key
              let hash = 0
              for (let i = 0; i < idempotencyKey.length; i++) {
                const char = idempotencyKey.charCodeAt(i)
                hash = ((hash << 5) - hash) + char
                hash = hash & hash // Convert to 32-bit integer
              }

              if (recentActionHashes.has(String(hash))) {
                console.log(`[ChatRoute] EX4: Duplicate action card detected (hash=${hash}) — skipping`)
                return null
              }

              recentActionHashes.add(String(hash))

              if (action.type === 'LOG_DATA') {
                // Apply date override for stale/missing dates (not when message has explicit date reference)
                const actionWithDate = (() => {
                  if (!messageHasExplicitDate && action.date) {
                    const cardDateMs = new Date(action.date).getTime()
                    if (Math.abs(cardDateMs - loggingDateMs) > THIRTY_DAYS_MS) {
                      return { ...action, date: loggingDate }
                    }
                  }
                  if (!action.date) return { ...action, date: loggingDate }
                  return action
                })()

                // BUG-V32-EX14 FIX: Routine step trackerId hallucination
                // If Gemini wrote the wrong trackerId but correct trackerName, override the UUID
                const matchingTracker = trackers.find(t => t.name === actionWithDate.trackerName)
                const correctedAction = (matchingTracker && matchingTracker.id !== actionWithDate.trackerId)
                  ? { ...actionWithDate, trackerId: matchingTracker.id }
                  : actionWithDate

                const schema = trackers.find(t => t.id === correctedAction.trackerId)?.schema ?? []
                const fieldLabels: Record<string, string> = {}
                const fieldUnits: Record<string, string> = {}
                const fieldOrder: string[] = []
                const fieldDefinitions: Record<string, { fieldId: string; label: string; type: string; unit?: string; selectOptions?: string[]; multiSelect?: boolean }> = {}
                schema.forEach(f => {
                  fieldLabels[f.fieldId] = f.label
                  if (f.unit !== undefined) fieldUnits[f.fieldId] = f.unit
                  fieldOrder.push(f.fieldId)
                  fieldDefinitions[f.fieldId] = {
                    fieldId: f.fieldId,
                    label: f.label,
                    type: f.type,
                    ...(f.unit ? { unit: f.unit } : {}),
                    ...(f.selectOptions ? { selectOptions: f.selectOptions } : {}),
                    ...(f.multiSelect !== undefined ? { multiSelect: f.multiSelect } : {}),
                  }
                })
                return {
                  ...correctedAction,
                  fieldLabels,
                  fieldUnits,
                  fieldOrder,
                  fieldDefinitions,
                  fields: sanitizeFields(correctedAction.fields, schema)
                } as AnyActionCard
              }
              return action
            })
          }

          // Detect skip intent so we do NOT attempt to log a skipped step.
          // IMPORTANT: "no" / "nope" alone must NOT be treated as skip — they are valid
          // boolean field values (the user is logging false for a yes/no field).
          // Only explicit skip phrasing advances without logging.
          const SKIP_KEYWORDS = ['skip', 'pass', 'next step', 'skip this', 'skip that', 'not now']
          const isSkipIntent = message
            ? SKIP_KEYWORDS.some(kw => message.toLowerCase().trim() === kw || message.toLowerCase().includes(kw + ' ') || message.toLowerCase().endsWith(' ' + kw))
            : false

          // 3. Stream Gemini response back to the client via SSE.
          // Text tokens are forwarded immediately as they arrive (B8 fix — eliminates first-token lag).
          // The full text is accumulated server-side so action cards can be parsed from the complete output.
          // Final SSE event carries sessionId, messageId, and sanitized actions.

          console.log(`[ChatRoute DEBUG] About to call streamHealthMessage:`, {
            activeRoutine: activeRoutine ? `${activeRoutine.name}(step ${session.current_step_index + 1}/${activeRoutine.steps.length})` : 'null',
            activeAgent: activeAgent ? activeAgent.name : 'null',
            hasAttachments,
            messageLength: message ? message.length : 0,
            loggingDate,
            systemPromptLength: systemPrompt.length,
          })

          for await (const chunk of streamHealthMessage(chatInput, systemPrompt, history)) {
            fullText += chunk
            // Forward raw text chunk to the client (best-effort — client may have navigated)
            safeEnqueue(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
          }

          console.log(`[ChatRoute DEBUG] streamHealthMessage completed, fullText length: ${fullText.length}`)

          // Full response received — parse actions and persist to DB.
          // This ALWAYS runs, even if the client disconnected after the session event.
          const rawActions = parseActionCards(fullText)
          const sanitizedActions = buildSanitizedActions(rawActions)

          console.log(`[ChatRoute DEBUG] parseActionCards result:`, {
            rawActionsCount: rawActions.length,
            sanitizedActionsCount: sanitizedActions.filter(a => a !== null).length,
            actionTypes: sanitizedActions.map(a => a?.type || 'null'),
            activeRoutine: activeRoutine ? `${activeRoutine.name}(step ${session.current_step_index})` : 'null',
          })

          // 4. Advance Routine Step?
          let shouldAutoPromptNextStep = false
          if (activeRoutine) {
            console.log(`[ChatRoute DEBUG] Evaluating routine advancement:`, {
              routineId: activeRoutine.id,
              routineName: activeRoutine.name,
              currentStepIndex: session.current_step_index,
              totalSteps: activeRoutine.steps.length,
              isSkipIntent,
            })

            const currentStep = activeRoutine.steps[session.current_step_index]
            console.log(`[ChatRoute DEBUG] Current step:`, {
              stepIndex: session.current_step_index,
              step: currentStep ? { trackerName: currentStep.trackerName, trackerId: currentStep.trackerId } : 'null',
            })

            console.log(`[ChatRoute DEBUG] Checking for LOG_DATA action:`, {
              isSkipIntent,
              hasActions: sanitizedActions.length > 0,
              actionTypes: sanitizedActions.map(a => a?.type || 'null'),
              currentStepTrackerId: currentStep?.trackerId || 'null',
            })

            const hasLoggedCurrentStep = isSkipIntent
              ? true
              : (currentStep ? sanitizedActions.some(a => a && a.type === 'LOG_DATA' && a.trackerId === currentStep.trackerId) : false)

            console.log(`[ChatRoute DEBUG] hasLoggedCurrentStep evaluated:`, {
              result: hasLoggedCurrentStep,
              isSkipIntent,
              currentStepExists: !!currentStep,
              matchingLogData: currentStep ? sanitizedActions.filter(a => a && a.type === 'LOG_DATA' && a.trackerId === currentStep.trackerId).length : 0,
            })

            if (hasLoggedCurrentStep) {
              const nextStepIndex = session.current_step_index + 1
              console.log(`[ChatRoute DEBUG] Advancing routine step:`, {
                currentIndex: session.current_step_index,
                nextIndex: nextStepIndex,
                totalSteps: activeRoutine.steps.length,
                isLastStep: nextStepIndex >= activeRoutine.steps.length,
              })

              if (nextStepIndex >= activeRoutine.steps.length) {
                console.log(`[ChatRoute] Routine complete — clearing state`)
                // FIX: BUG-V32-EX16, BUG-V32-EX21 — Final step completion clears routine state
                // Clear routine state in day_state (prevents looping back to Step 1)
                await clearRoutineState(loggingDate)
                console.log(`[ChatRoute DEBUG] clearRoutineState called for date: ${loggingDate}`)

                // Also clear from chat_sessions for consistency
                await updateSession(session.id, { active_routine_id: null, current_step_index: 0 })
                console.log(`[ChatRoute DEBUG] updateSession called - routine cleared from chat_sessions`)

                if (activeRoutine.type === 'day_end') {
                  // Only mark ended if not already ended (prevent double-end race condition)
                  const dayStateCheck = await getActiveDayState(supabase)
                  if (dayStateCheck && dayStateCheck.date === loggingDate && dayStateCheck.day_ended_at === null) {
                    console.log(`[ChatRoute] Marking day ended for date: ${loggingDate}`)
                    markDayEnded(loggingDate).catch(e => console.error('[DayState] markDayEnded failed:', e))
                  } else {
                    console.log(`[ChatRoute DEBUG] Day end already marked or session doesn't match`)
                  }
                }
              } else {
                // FIX: BUG-V32-EX6, BUG-V32-EX17 — Persist step index to survive page reloads
                const nextStepIndex_persist = nextStepIndex
                console.log(`[ChatRoute DEBUG] Calling persistRoutineState:`, {
                  loggingDate,
                  routineId: activeRoutine.id,
                  nextStepIndex: nextStepIndex_persist,
                  routineName: activeRoutine.name,
                })
                await persistRoutineState(
                  loggingDate,
                  activeRoutine.id,
                  nextStepIndex_persist,
                  {} // Clear step field data when advancing to next step
                )
                console.log(`[ChatRoute DEBUG] persistRoutineState completed`)

                // Also update chat_sessions for consistency
                await updateSession(session.id, { current_step_index: nextStepIndex })
                console.log(`[ChatRoute DEBUG] updateSession called - step index updated to ${nextStepIndex}`)

                // Flag to auto-prompt the frontend for the next step
                shouldAutoPromptNextStep = true
              }
            } else {
              console.log(`[ChatRoute DEBUG] hasLoggedCurrentStep is FALSE - routine not advancing`)
            }
          } else {
            console.log(`[ChatRoute DEBUG] No active routine - skipping advancement check`)
          }

          // Save model response — capture the returned row to get the real DB UUID
          let assistantMessage
          try {
            assistantMessage = await addMessage({
              session_id: session.id,
              role: 'assistant',
              content: fullText,
              actions: sanitizedActions.filter((a): a is AnyActionCard => a !== null),
            })
          } catch (persistError) {
            console.error('[ChatRoute] Failed to persist assistant message:', persistError)
            safeEnqueue(`data: ${JSON.stringify({
              type: 'error',
              error: 'Failed to save message to database'
            })}\n\n`)
            safeEnqueue('data: [DONE]\n\n')
            return
          }

          // Send terminal metadata event (best-effort)
          safeEnqueue(`data: ${JSON.stringify({
            type: 'done',
            messageId: assistantMessage.id,
            sessionId: session.id,
            actions: sanitizedActions,
            content: fullText,
            shouldAutoPromptNextStep,
          })}\n\n`)
        } catch (err) {
          console.error('[ChatRoute] Streaming error:', err)
          safeEnqueue(`data: ${JSON.stringify({ type: 'error', error: 'Streaming failed' })}\n\n`)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (e: unknown) {
    console.error('[chat/route] CRITICAL ERROR:', e)

    return Response.json({
      error: 'Internal server error',
    }, { status: 500 })
  }
}
