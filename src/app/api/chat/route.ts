export const maxDuration = 60 // extend Vercel function timeout for AI streaming

import { createServerClient } from '@/lib/supabase/server'
import { createSession, getSession, addMessage, updateSession, getRecentMessagesForAI } from '@/lib/db/chat'
import { getTrackersBasic } from '@/lib/db/trackers'
import { getLogsForDay, getLogsForDateRange } from '@/lib/db/logs'
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

type ChatResponseMessage = {
  id: string          // Real DB UUID — passed to ActionCard so confirmLogAction can persist confirmed:true
  role: 'assistant'
  content: string
  actions: AnyActionCard[]
}

type ChatResponse = {
  message: ChatResponseMessage
  sessionId: string
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
      getRecentMessagesForAI(session.id, 50, today),
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

    // The authoritative logging date for this request:
    // 1. If a day session is open → use that session's date (even if physical day has changed)
    // 2. Otherwise → use the client-supplied local date (or UTC fallback)
    const loggingDate = finalActiveDayState?.date ?? today

    let activeRoutine: Routine | null = null

    // FIX: BUG-V32-EX17 — Restore routine state from day_state table (survives page reloads)
    // If an active routine is persisted in day_state, restore it to the session
    if (finalActiveDayState?.active_routine_id && !session.active_routine_id) {
      console.log(`[ChatRoute] Restoring routine from day_state: ${finalActiveDayState.active_routine_id}`)
      const restored = await fetchRoutine(finalActiveDayState.active_routine_id)
      if (restored) {
        await updateSession(session.id, {
          active_routine_id: restored.id,
          current_step_index: finalActiveDayState.current_step_index ?? 0,
        })
        session.active_routine_id = restored.id
        session.current_step_index = finalActiveDayState.current_step_index ?? 0
        activeRoutine = restored
      }
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
          console.log(`[ChatRoute] Blocked Start Day — session already active for ${finalActiveDayState.date}`)
          await addMessage({ session_id: session.id, role: 'user', content: message || '', attachments: attachments ?? null })
          const isSameDay = finalActiveDayState.date === today
          const blockMsg = isSameDay
            ? `Your day for ${loggingDate} is already active — you're all set to continue logging.`
            : `Session for ${finalActiveDayState.date} is still active. Complete your End Day routine before starting ${today}. Head to the Dashboard or type your End Day trigger phrase.`
          const savedBlock = await addMessage({ session_id: session.id, role: 'assistant', content: blockMsg, actions: [] })
          return Response.json({
            message: { id: savedBlock.id, role: 'assistant' as const, content: blockMsg, actions: [] },
            sessionId: session.id,
          } satisfies ChatResponse, { status: 200 })
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
        return Response.json({
          message: { id: savedBlock.id, role: 'assistant' as const, content: blockMsg, actions: [] },
          sessionId: session.id,
        } satisfies ChatResponse, { status: 200 })
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
    // Only include image attachments from the 2 most recent messages — older base64
    // blobs add megabytes to every request and are the primary latency driver.
    const recentWithImages = new Set(historyMessages.slice(-2).map(m => m.id))
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
    if (normalizedMsg.includes('start day')) {
      if (finalActiveDayState && finalActiveDayState.day_started_at && !finalActiveDayState.day_ended_at) {
        const msg = await addMessage({
          session_id: session.id,
          role: 'assistant',
          content: `Start day for ${today} already complete. End yesterday's session first.`,
        })
        return Response.json({
          message: {
            id: msg.id,
            role: 'assistant',
            content: msg.content,
            actions: []
          },
          sessionId: session.id
        }, { status: 200 })
      }
    }

    // FIX: During active routines, process attachments normally through Gemini
    // so LOG_DATA actions can be generated for current step advancement.
    // Only queue attachments when NOT in a routine (non-routine chat mode).
    if (!activeRoutine && attachments && attachments.length > 0) {
      console.log(`[ChatRoute] Non-routine chat: ${attachments.length} file(s) queued for processing after current message completes`)
      // Queue the attachment metadata for processing after current message completes
      // Don't process immediately; respond to user that file has been queued
      const queuedMsg = await addMessage({
        session_id: session.id,
        role: 'assistant',
        content: `I've queued your attachment for processing. We'll extract the data after I process your current message.`,
        actions: [],
        attachments: attachments ?? null
      })
      return Response.json({
        message: { id: queuedMsg.id, role: 'assistant' as const, content: queuedMsg.content, actions: [] },
        sessionId: session.id,
      } satisfies ChatResponse, { status: 200 })
    }

    // Save user message
    await addMessage({
      session_id: session.id,
      role: 'user',
      content: message || '',
      attachments: attachments ?? null,
    })

    // Historical intent detection — scans message for date-range / recall patterns
    // and fetches matching logs to inject into the system prompt as HISTORICAL DATA.
    // Only runs for non-routine health chat (routines don't need historical lookups).
    const trackersMini = trackers.map(t => ({ id: t.id, name: t.name }))
    let historicalContext: TrackerLogWithName[] | undefined

    if (!activeRoutine && message) {
      const HISTORICAL_INTENT_PATTERNS = [
        /\byesterday\b/i,
        /\bday\s+before\b/i,
        /\blast\s+(week|month)\b/i,
        /\blast\s+\d+\s+days?\b/i,
        /\bsame\s+\S+\s+from\b/i,
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
      ]
      const hasHistoricalIntent = HISTORICAL_INTENT_PATTERNS.some(p => p.test(message))

      if (hasHistoricalIntent) {
        try {
          // BUG-V32-1 FIX: Limit historical context to TODAY and YESTERDAY ONLY
          // Prevent AI from fabricating data from dates before yesterday
          const actualDateObj = new Date(`${today}T00:00:00.000Z`)
          const getDateStr = (d: Date): string => d.toISOString().split('T')[0]

          const yesterday = new Date(actualDateObj)
          yesterday.setUTCDate(yesterday.getUTCDate() - 1)
          const yesterdayStr = getDateStr(yesterday)

          // Only fetch from yesterday and today — no earlier dates allowed
          historicalContext = await getLogsForDateRange(yesterdayStr, today, supabase, trackersMini)

          console.log(`[ChatRoute] Historical context (TODAY + YESTERDAY): ${historicalContext?.length ?? 0} logs fetched`)
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
      systemPrompt = buildRoutineSystemPrompt(activeRoutine, trackers, session.current_step_index, brainContext, dayLogs, loggingDate, today)
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
      const yahaSection = buildHealthSystemPrompt({ trackers, date: loggingDate, actualDate: today, userContext: brainContext, dayLogs, daySessionActive, historicalContext, sessionMessages: sessionMessagesForContext, attachmentsReceived: attachmentsReceivedList })
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
      systemPrompt = buildHealthSystemPrompt({ trackers, date: loggingDate, actualDate: today, userContext: brainContext, dayLogs, daySessionActive, historicalContext, sessionMessages: sessionMessagesForContext, attachmentsReceived: attachmentsReceivedList })
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

        let actionWithDate = action
        // Only apply date override to LOG_DATA (UPDATE_DATA doesn't have a date field)
        if (action.type === 'LOG_DATA' && action.date && !messageHasExplicitDate) {
          const cardDateMs = new Date(action.date).getTime()
          if (!isNaN(cardDateMs) && (loggingDateMs - cardDateMs) > THIRTY_DAYS_MS) {
            console.log(`[ChatRoute] Date sanity override: card.date=${action.date} → loggingDate=${loggingDate}`)
            actionWithDate = { ...action, date: loggingDate }
          }
        }

        const tracker = trackers.find(t => t.id === actionWithDate.trackerId)
        if (tracker) {
          const schema = tracker.schema
          const fieldLabels: Record<string, string> = {}
          const fieldUnits: Record<string, string> = {}
          const fieldOrder: string[] = []
          schema.forEach(f => {
            fieldLabels[f.fieldId] = f.label
            fieldOrder.push(f.fieldId)
            if (f.unit) fieldUnits[f.fieldId] = f.unit
            if (f.type === 'time' && !f.unit) fieldUnits[f.fieldId] = 'hrs'
          })
          return {
            ...actionWithDate,
            fieldLabels,
            fieldUnits,
            fieldOrder,
            fields: sanitizeFields(actionWithDate.fields, schema)
          }
        }
        return actionWithDate
      }).filter(a => a !== null)
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
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        // Helper: enqueue without throwing when the client has disconnected
        const safeEnqueue = (data: string) => {
          try { controller.enqueue(encoder.encode(data)) } catch { /* client gone */ }
        }

        let fullText = ''

        // Emit session ID immediately so MobileChatHome can navigate to the chat
        // page without waiting for the full AI response (fixes new-chat lag).
        safeEnqueue(`data: ${JSON.stringify({ type: 'session', sessionId: session.id })}\n\n`)

        // EX3 FIX: If file attachments present, send immediate ACK before AI starts processing
        // This prevents the 30s blank-screen delay users see while Gemini processes files
        if (hasAttachments && attachments && attachments.length > 0) {
          const fileNames = attachments.map(a => a.filename || 'unnamed').join(', ')
          safeEnqueue(`data: ${JSON.stringify({ type: 'chunk', text: `Processing your file(s): ${fileNames}...` })}\n\n`)
          console.log(`[ChatRoute] EX3: Sent immediate ACK for ${attachments.length} file(s)`)
        }

        try {
          for await (const chunk of streamHealthMessage(chatInput, systemPrompt, history)) {
            fullText += chunk
            // Forward raw text chunk to the client (best-effort — client may have navigated)
            safeEnqueue(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
          }

          // Full response received — parse actions and persist to DB.
          // This ALWAYS runs, even if the client disconnected after the session event.
          const rawActions = parseActionCards(fullText)
          const sanitizedActions = buildSanitizedActions(rawActions)

          // 4. Advance Routine Step?
          let shouldAutoPromptNextStep = false
          if (activeRoutine) {
            const currentStep = activeRoutine.steps[session.current_step_index]
            const hasLoggedCurrentStep = isSkipIntent
              ? true
              : (currentStep ? sanitizedActions.some(a => a && a.type === 'LOG_DATA' && a.trackerId === currentStep.trackerId) : false)

            if (hasLoggedCurrentStep) {
              const nextStepIndex = session.current_step_index + 1
              if (nextStepIndex >= activeRoutine.steps.length) {
                // FIX: BUG-V32-EX16, BUG-V32-EX21 — Final step completion clears routine state
                // Clear routine state in day_state (prevents looping back to Step 1)
                await clearRoutineState(loggingDate)

                // Also clear from chat_sessions for consistency
                await updateSession(session.id, { active_routine_id: null, current_step_index: 0 })

                if (activeRoutine.type === 'day_end') {
                  // Only mark ended if not already ended (prevent double-end race condition)
                  const dayStateCheck = await getActiveDayState(supabase)
                  if (dayStateCheck && dayStateCheck.date === loggingDate && dayStateCheck.day_ended_at === null) {
                    markDayEnded(loggingDate).catch(e => console.error('[DayState] markDayEnded failed:', e))
                  }
                }
              } else {
                // FIX: BUG-V32-EX6, BUG-V32-EX17 — Persist step index to survive page reloads
                const nextStepIndex_persist = nextStepIndex
                await persistRoutineState(
                  loggingDate,
                  activeRoutine.id,
                  nextStepIndex_persist,
                  {} // Clear step field data when advancing to next step
                )

                // Also update chat_sessions for consistency
                await updateSession(session.id, { current_step_index: nextStepIndex })

                // Flag to auto-prompt the frontend for the next step
                shouldAutoPromptNextStep = true
              }
            }
          }

          // Save model response — capture the returned row to get the real DB UUID
          const assistantMessage = await addMessage({
            session_id: session.id,
            role: 'assistant',
            content: fullText,
            actions: sanitizedActions.filter((a): a is AnyActionCard => a !== null),
          })

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
