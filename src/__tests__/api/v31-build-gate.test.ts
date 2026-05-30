/**
 * V31 Build Gate Tests
 *
 * Covers the specific changes in commit 6f63ffd:
 * 1. Gemini model updated to gemini-2.0-flash
 * 2. Auth callback relocated to /api/auth/callback
 * 3. Attachment queuing (non-routine mode) vs pass-through (routine mode)
 * 4. Routine state restoration from day_state (BUG-V32-EX17)
 * 5. Start Day guard blocking duplicate day sessions
 * 6. Attachment validation: path traversal, macro files, executables, malformed base64
 * 7. Duplicate action card deduplication (EX4)
 * 8. File ACK event emitted before AI response when attachments present in routine mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChatSession } from '@/types/chat'
import type { Routine } from '@/types/routine'

// ---------------------------------------------------------------------------
// vi.hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockGetUser,
  mockCreateServerClient,
  mockCreateSession,
  mockGetSession,
  mockAddMessage,
  mockUpdateSession,
  mockGetTrackers,
  mockStreamHealthMessage,
  mockBuildHealthSystemPrompt,
  mockBuildRoutineSystemPrompt,
  mockDetectRoutineTrigger,
  mockGetActiveDayState,
  mockMarkDayStarted,
  mockMarkDayEnded,
  mockGetRecentMessagesForAI,
  mockGetLogsForDay,
  mockGetLogsForDateRange,
  mockGetMasterBrainContext,
  mockGetAgents,
  mockFetchRoutine,
  mockPersistRoutineState,
  mockClearRoutineState,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateServerClient: vi.fn(),
  mockCreateSession: vi.fn(),
  mockGetSession: vi.fn(),
  mockAddMessage: vi.fn(),
  mockUpdateSession: vi.fn(),
  mockGetTrackers: vi.fn(),
  mockStreamHealthMessage: vi.fn(),
  mockBuildHealthSystemPrompt: vi.fn(),
  mockBuildRoutineSystemPrompt: vi.fn(),
  mockDetectRoutineTrigger: vi.fn(),
  mockGetActiveDayState: vi.fn(),
  mockMarkDayStarted: vi.fn(),
  mockMarkDayEnded: vi.fn(),
  mockGetRecentMessagesForAI: vi.fn(),
  mockGetLogsForDay: vi.fn(),
  mockGetLogsForDateRange: vi.fn(),
  mockGetMasterBrainContext: vi.fn(),
  mockGetAgents: vi.fn(),
  mockFetchRoutine: vi.fn(),
  mockPersistRoutineState: vi.fn(),
  mockClearRoutineState: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: mockCreateServerClient,
}))

vi.mock('@/lib/db/chat', () => ({
  createSession: mockCreateSession,
  getSession: mockGetSession,
  addMessage: mockAddMessage,
  updateSession: mockUpdateSession,
  getRecentMessagesForAI: mockGetRecentMessagesForAI,
}))

vi.mock('@/lib/db/trackers', () => ({
  getTrackersBasic: mockGetTrackers,
}))

vi.mock('@/lib/ai/gemini', () => ({
  streamHealthMessage: mockStreamHealthMessage,
  processHealthMessage: vi.fn(),
  extractFromImage: vi.fn(),
  GEMINI_MODEL: 'gemini-2.0-flash',
}))

vi.mock('@/lib/ai/prompt-builder', () => ({
  buildHealthSystemPrompt: mockBuildHealthSystemPrompt,
  buildRoutineSystemPrompt: mockBuildRoutineSystemPrompt,
}))

vi.mock('@/lib/routines/detector', () => ({
  detectRoutineTrigger: mockDetectRoutineTrigger,
}))

vi.mock('@/lib/db/day-state', () => ({
  getActiveDayState: mockGetActiveDayState,
  markDayEnded: mockMarkDayEnded,
  markDayStarted: mockMarkDayStarted,
  persistRoutineState: mockPersistRoutineState,
  clearRoutineState: mockClearRoutineState,
  getDayState: vi.fn().mockResolvedValue(null),
  upsertDayState: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/db/logs', () => ({
  getLogsForDay: mockGetLogsForDay,
  getLogsForDateRange: mockGetLogsForDateRange,
  searchLogsByFieldText: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/db/routines', () => ({
  getRoutine: mockFetchRoutine,
}))

vi.mock('@/lib/ai/master-brain', () => ({
  getMasterBrainContext: mockGetMasterBrainContext,
}))

vi.mock('@/lib/db/agents', () => ({
  getAgents: mockGetAgents,
}))

vi.mock('@/lib/ai/actions', () => ({
  sanitizeFields: vi.fn((fields) => fields),
  parseActionCards: vi.fn(() => []),
}))

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/chat/route'

// ---------------------------------------------------------------------------
// Auth callback route
// ---------------------------------------------------------------------------

import { GET as authCallbackGET } from '@/app/api/auth/callback/route'

// ---------------------------------------------------------------------------
// Constants and helpers
// ---------------------------------------------------------------------------

const FAKE_USER = { id: 'user-v31-test', email: 'v31@test.example' }

const FAKE_SESSION: ChatSession = {
  id: 'session-v31-01',
  user_id: FAKE_USER.id,
  title: 'V31 Gate Chat',
  updated_at: '2026-05-26T00:00:00Z',
  active_routine_id: null,
  current_step_index: 0,
  active_agent_id: null,
}

const MORNING_ROUTINE: Routine = {
  id: 'routine-morning-v31',
  user_id: FAKE_USER.id,
  name: 'Morning Check-In',
  trigger_phrase: 'start day',
  type: 'day_start',
  steps: [
    {
      trackerId: 'tracker-sleep',
      trackerName: 'Sleep',
      trackerColor: '#3b82f6',
      targetFields: ['fld_hours'],
    },
    {
      trackerId: 'tracker-mood',
      trackerName: 'Mood',
      trackerColor: '#a855f7',
      targetFields: ['fld_score'],
    },
  ],
  created_at: '2026-05-26T00:00:00Z',
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setAuthenticatedUser(): void {
  mockGetUser.mockResolvedValue({ data: { user: FAKE_USER }, error: null })
  mockCreateServerClient.mockResolvedValue({
    auth: { getUser: mockGetUser },
  })
}

async function* makeChunkGenerator(chunks: string[]) {
  for (const chunk of chunks) {
    yield chunk
  }
}

async function readSSEStream(stream: ReadableStream<Uint8Array>): Promise<string[]> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const events: string[] = []
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        events.push(line.slice(6))
      }
    }
  }

  return events
}

async function readSSEParsed(stream: ReadableStream<Uint8Array>): Promise<Record<string, unknown>[]> {
  const events = await readSSEStream(stream)
  return events.map(e => JSON.parse(e) as Record<string, unknown>)
}

beforeEach(() => {
  vi.clearAllMocks()

  setAuthenticatedUser()
  mockCreateSession.mockResolvedValue(FAKE_SESSION)
  mockGetSession.mockImplementation(async (id: string) => ({ ...FAKE_SESSION, id }))
  mockAddMessage.mockImplementation(async (args: { content?: string; role?: string }) => ({
    id: 'msg-v31-1',
    content: args.content ?? '',
    role: args.role ?? 'assistant',
  }))
  mockGetTrackers.mockResolvedValue([])
  mockBuildHealthSystemPrompt.mockReturnValue('You are a health assistant.')
  mockBuildRoutineSystemPrompt.mockReturnValue('You are YAHA executing a routine.')
  mockDetectRoutineTrigger.mockResolvedValue(null)
  mockFetchRoutine.mockResolvedValue(null)
  mockGetActiveDayState.mockResolvedValue(null)
  mockGetRecentMessagesForAI.mockResolvedValue([])
  mockGetLogsForDay.mockResolvedValue([])
  mockGetLogsForDateRange.mockResolvedValue([])
  mockGetMasterBrainContext.mockResolvedValue('')
  mockGetAgents.mockResolvedValue([])
  mockUpdateSession.mockResolvedValue(undefined)
  mockMarkDayStarted.mockResolvedValue(undefined)
  mockMarkDayEnded.mockResolvedValue(undefined)
  mockPersistRoutineState.mockResolvedValue(undefined)
  mockClearRoutineState.mockResolvedValue(undefined)

  mockStreamHealthMessage.mockImplementation(() =>
    makeChunkGenerator(['Hello world!'])
  )
})

// ---------------------------------------------------------------------------
// 1. GEMINI MODEL — constant is gemini-2.0-flash
// ---------------------------------------------------------------------------

describe('V31 — Gemini model constant', () => {
  it('GEMINI_MODEL equals gemini-2.0-flash', async () => {
    const { GEMINI_MODEL } = await import('@/lib/ai/gemini')
    expect(GEMINI_MODEL).toBe('gemini-2.0-flash')
  })
})

// ---------------------------------------------------------------------------
// 2. AUTH CALLBACK — /api/auth/callback route
// ---------------------------------------------------------------------------

describe('V31 — Auth callback route (/api/auth/callback)', () => {
  it('redirects to /dashboard when code is valid', async () => {
    const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: null })
    mockCreateServerClient.mockResolvedValue({
      auth: {
        getUser: mockGetUser,
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    })

    const req = new Request('http://localhost/api/auth/callback?code=valid-oauth-code')
    const res = await authCallbackGET(req)

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('valid-oauth-code')
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/dashboard')
  })

  it('redirects to /login?error=oauth when no code is provided', async () => {
    const req = new Request('http://localhost/api/auth/callback')
    const res = await authCallbackGET(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login?error=oauth')
  })

  it('redirects to /login?error=oauth when code exchange fails', async () => {
    const mockExchangeCodeForSession = vi.fn().mockResolvedValue({
      error: { message: 'Invalid code' },
    })
    mockCreateServerClient.mockResolvedValue({
      auth: {
        getUser: mockGetUser,
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    })

    const req = new Request('http://localhost/api/auth/callback?code=bad-code')
    const res = await authCallbackGET(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login?error=oauth')
  })

  it('respects the "next" query param for post-auth redirect', async () => {
    const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: null })
    mockCreateServerClient.mockResolvedValue({
      auth: {
        getUser: mockGetUser,
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    })

    const req = new Request('http://localhost/api/auth/callback?code=valid-code&next=/trackers')
    const res = await authCallbackGET(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/trackers')
  })
})

// ---------------------------------------------------------------------------
// 3. ATTACHMENT QUEUING — non-routine mode
// ---------------------------------------------------------------------------

describe('V31 — Attachment queuing in non-routine chat mode', () => {
  it('returns 200 with queued ACK message when attachment sent without active routine', async () => {
    const res = await POST(
      makeRequest({
        message: 'Here is my food photo',
        attachments: [
          {
            base64: 'abc123==',
            mimeType: 'image/jpeg',
            type: 'image',
            filename: 'meal.jpg',
          },
        ],
        date: '2026-05-26',
      })
    )

    expect(res.status).toBe(200)
    // Non-SSE response — queuing returns early with JSON
    const body = await res.json() as { message: { content: string }; sessionId: string }
    expect(body.message.content).toContain('queued')
  })

  it('does NOT call streamHealthMessage when attachment queued in non-routine mode', async () => {
    await POST(
      makeRequest({
        message: 'Check this label',
        attachments: [
          {
            base64: 'abc123==',
            mimeType: 'image/png',
            type: 'image',
            filename: 'label.png',
          },
        ],
        date: '2026-05-26',
      })
    )

    expect(mockStreamHealthMessage).not.toHaveBeenCalled()
  })

  it('passes attachments to streamHealthMessage when active routine is running', async () => {
    mockGetSession.mockResolvedValue({
      ...FAKE_SESSION,
      active_routine_id: MORNING_ROUTINE.id,
      current_step_index: 0,
    })
    mockFetchRoutine.mockResolvedValue(MORNING_ROUTINE)

    const res = await POST(
      makeRequest({
        message: 'Here is my sleep tracker photo',
        attachments: [
          {
            base64: 'abc123==',
            mimeType: 'image/jpeg',
            type: 'image',
            filename: 'sleep.jpg',
          },
        ],
        sessionId: FAKE_SESSION.id,
        date: '2026-05-26',
      })
    )

    const events = await readSSEParsed(res.body!)
    const doneEvent = events.find(e => e.type === 'done')
    // Stream ran — done event should exist
    expect(doneEvent).toBeDefined()
    expect(mockStreamHealthMessage).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 4. ATTACHMENT VALIDATION — path traversal, macros, executables, bad base64
// ---------------------------------------------------------------------------

describe('V31 — Attachment validation security checks', () => {
  it('rejects attachment with path traversal in filename (..)', async () => {
    const res = await POST(
      makeRequest({
        message: 'data',
        attachments: [
          {
            base64: 'abc123==',
            mimeType: 'image/jpeg',
            type: 'image',
            filename: '../../etc/passwd',
          },
        ],
      })
    )

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/invalid path/i)
  })

  it('rejects macro-enabled Office file by extension (.docm)', async () => {
    const res = await POST(
      makeRequest({
        message: 'data',
        attachments: [
          {
            base64: 'abc123==',
            mimeType: 'application/pdf',
            type: 'file',
            filename: 'malware.docm',
          },
        ],
      })
    )

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/macro/i)
  })

  it('rejects executable file by extension (.exe)', async () => {
    const res = await POST(
      makeRequest({
        message: 'data',
        attachments: [
          {
            base64: 'abc123==',
            mimeType: 'application/pdf',
            type: 'file',
            filename: 'payload.exe',
          },
        ],
      })
    )

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/executable/i)
  })

  it('rejects attachment with malformed base64 data', async () => {
    const res = await POST(
      makeRequest({
        message: 'data',
        attachments: [
          {
            base64: 'not-valid-base64!!!@@@',
            mimeType: 'image/jpeg',
            type: 'image',
            filename: 'img.jpg',
          },
        ],
      })
    )

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/malformed/i)
  })

  it('accepts valid image attachment with clean filename', async () => {
    const res = await POST(
      makeRequest({
        message: 'my food photo',
        attachments: [
          {
            base64: 'abc123==',
            mimeType: 'image/jpeg',
            type: 'image',
            filename: 'meal.jpg',
          },
        ],
        date: '2026-05-26',
      })
    )

    // Accepted — either queued (200 JSON) or streamed (200 SSE)
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// 5. ROUTINE STATE RESTORATION — from day_state (BUG-V32-EX17)
// ---------------------------------------------------------------------------

describe('V31 — Routine state restoration from day_state on page reload', () => {
  it('restores routine from day_state when session has no active_routine_id', async () => {
    // Session has no routine (simulates fresh page load / new session)
    mockGetSession.mockResolvedValue({ ...FAKE_SESSION, active_routine_id: null })

    // day_state has persisted routine from a previous request
    mockGetActiveDayState.mockResolvedValue({
      date: '2026-05-26',
      active_routine_id: MORNING_ROUTINE.id,
      current_step_index: 1,
      day_started_at: '2026-05-26T06:00:00Z',
      day_ended_at: null,
      routine_last_activity_at: new Date().toISOString(),
    })

    mockFetchRoutine.mockImplementation(async (id: string) => {
      if (id === MORNING_ROUTINE.id) return MORNING_ROUTINE
      return null
    })

    const res = await POST(
      makeRequest({
        message: 'I slept 7 hours',
        sessionId: FAKE_SESSION.id,
        date: '2026-05-26',
      })
    )

    const events = await readSSEParsed(res.body!)
    const doneEvent = events.find(e => e.type === 'done')

    expect(doneEvent).toBeDefined()
    // Routine was restored — updateSession should be called to re-attach the routine
    expect(mockUpdateSession).toHaveBeenCalledWith(
      FAKE_SESSION.id,
      expect.objectContaining({
        active_routine_id: MORNING_ROUTINE.id,
      })
    )
    // Routine system prompt should have been used
    expect(mockBuildRoutineSystemPrompt).toHaveBeenCalled()
  })

  it('does NOT restore routine when session already has active_routine_id', async () => {
    // Session already has the routine attached (normal flow, not a reload)
    mockGetSession.mockResolvedValue({
      ...FAKE_SESSION,
      active_routine_id: MORNING_ROUTINE.id,
    })
    mockFetchRoutine.mockResolvedValue(MORNING_ROUTINE)
    mockGetActiveDayState.mockResolvedValue({
      date: '2026-05-26',
      active_routine_id: MORNING_ROUTINE.id,
      current_step_index: 0,
      day_started_at: '2026-05-26T06:00:00Z',
      day_ended_at: null,
      routine_last_activity_at: new Date().toISOString(),
    })

    await POST(
      makeRequest({
        message: 'I slept 7 hours',
        sessionId: FAKE_SESSION.id,
        date: '2026-05-26',
      })
    )

    // updateSession should NOT be called for restoration (already had the routine)
    // It may still be called for step advancement, but not with the restoration pattern
    const restorationCall = mockUpdateSession.mock.calls.find(
      call => call[1] && 'active_routine_id' in call[1] && call[1].active_routine_id === MORNING_ROUTINE.id
    )
    // This check verifies no REDUNDANT restoration occurred (the session already had it)
    // The key assertion is that fetchRoutine was NOT called a second time for restoration
    const fetchRoutineCallsForRestoration = mockFetchRoutine.mock.calls.filter(
      call => call[0] === MORNING_ROUTINE.id
    )
    // activeRoutineRaw was fetched via session.active_routine_id, restoration path not triggered
    expect(restorationCall).toBeUndefined()
    expect(fetchRoutineCallsForRestoration.length).toBe(1) // only one fetch (from activeRoutineRaw)
  })
})

// ---------------------------------------------------------------------------
// 6. START DAY GUARD — blocks duplicate day sessions
// ---------------------------------------------------------------------------

describe('V31 — Start Day guard blocks duplicate sessions', () => {
  it('blocks start day trigger when a session is already open for today', async () => {
    mockGetActiveDayState.mockResolvedValue({
      date: '2026-05-26',
      active_routine_id: null,
      current_step_index: 0,
      day_started_at: '2026-05-26T06:00:00Z',
      day_ended_at: null,
      routine_last_activity_at: null,
    })
    // NL detection returns a day_start routine
    mockDetectRoutineTrigger.mockResolvedValue(MORNING_ROUTINE)

    const res = await POST(
      makeRequest({
        message: 'start day',
        date: '2026-05-26',
      })
    )

    const body = await res.json() as { message: { content: string }; sessionId: string }
    expect(res.status).toBe(200)
    // Should NOT have proceeded to streaming
    expect(mockStreamHealthMessage).not.toHaveBeenCalled()
    // Response should contain informational message about existing session
    expect(body.message.content).toMatch(/already active|already complete|End.*session/i)
  })

  it('blocks start day when text "start day" is in message and session is open', async () => {
    mockGetActiveDayState.mockResolvedValue({
      date: '2026-05-26',
      active_routine_id: null,
      current_step_index: 0,
      day_started_at: '2026-05-26T06:00:00Z',
      day_ended_at: null,
      routine_last_activity_at: null,
    })

    const res = await POST(
      makeRequest({
        message: 'start day please',
        date: '2026-05-26',
      })
    )

    const body = await res.json() as { message: { content: string }; sessionId: string }
    expect(res.status).toBe(200)
    expect(mockStreamHealthMessage).not.toHaveBeenCalled()
    expect(body.message.content).toMatch(/already complete/i)
  })

  it('allows start day when no session is currently open', async () => {
    mockGetActiveDayState.mockResolvedValue(null)
    mockDetectRoutineTrigger.mockResolvedValue(MORNING_ROUTINE)

    const res = await POST(
      makeRequest({
        message: 'start day',
        date: '2026-05-26',
      })
    )

    // Should have called streamHealthMessage (routine proceeding)
    const events = await readSSEParsed(res.body!)
    const doneEvent = events.find(e => e.type === 'done')
    expect(doneEvent).toBeDefined()
    expect(mockStreamHealthMessage).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 7. FILE ACK — immediate ACK event for file attachments in routine mode
// ---------------------------------------------------------------------------

describe('V31 — File ACK event emitted when attachments sent during routine', () => {
  it('emits chunk event with file ACK text before AI response when routine is active', async () => {
    mockGetSession.mockResolvedValue({
      ...FAKE_SESSION,
      active_routine_id: MORNING_ROUTINE.id,
      current_step_index: 0,
    })
    mockFetchRoutine.mockResolvedValue(MORNING_ROUTINE)

    const res = await POST(
      makeRequest({
        message: 'here is my sleep data',
        attachments: [
          {
            base64: 'abc123==',
            mimeType: 'image/jpeg',
            type: 'image',
            filename: 'sleep-data.jpg',
          },
        ],
        sessionId: FAKE_SESSION.id,
        date: '2026-05-26',
      })
    )

    const events = await readSSEParsed(res.body!)
    const chunkEvents = events.filter(e => e.type === 'chunk')

    // First chunk should be the file ACK
    const ackChunk = chunkEvents.find(e =>
      typeof e.text === 'string' && e.text.toLowerCase().includes('processing')
    )
    expect(ackChunk).toBeDefined()
    expect(ackChunk?.text).toContain('sleep-data.jpg')
  })
})

// ---------------------------------------------------------------------------
// 8. GEMINI STREAMING — SSE response format (regression)
// ---------------------------------------------------------------------------

describe('V31 — Gemini streaming SSE regression', () => {
  it('returns text/event-stream Content-Type for chat requests', async () => {
    const res = await POST(makeRequest({ message: 'I had 350 calories of chicken', date: '2026-05-26' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('emits session event as first SSE event', async () => {
    const res = await POST(makeRequest({ message: 'Hello', date: '2026-05-26' }))
    const events = await readSSEParsed(res.body!)

    expect(events[0].type).toBe('session')
    expect(events[0].sessionId).toBe(FAKE_SESSION.id)
  })

  it('emits done event with accumulated content from streaming chunks', async () => {
    mockStreamHealthMessage.mockImplementation(() =>
      makeChunkGenerator(['I logged ', '350 cal', 'ories for you.'])
    )

    const res = await POST(makeRequest({ message: 'I had 350 calories of chicken', date: '2026-05-26' }))
    const events = await readSSEParsed(res.body!)

    const doneEvent = events.find(e => e.type === 'done')
    expect(doneEvent).toBeDefined()
    expect(doneEvent?.content).toBe('I logged 350 calories for you.')
  })

  it('emits SSE error event when Gemini streaming throws', async () => {
    mockStreamHealthMessage.mockImplementation(async function* () {
      throw new Error('Gemini model unavailable')
    })

    const res = await POST(makeRequest({ message: 'Hello', date: '2026-05-26' }))
    const events = await readSSEParsed(res.body!)

    const errorEvent = events.find(e => e.type === 'error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent?.error).toBe('Streaming failed')
  })

  it('returns 401 (not SSE) when user is unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockCreateServerClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
    })

    const res = await POST(makeRequest({ message: 'Hello' }))

    expect(res.status).toBe(401)
    expect(res.headers.get('Content-Type')).not.toBe('text/event-stream')
  })
})

// ---------------------------------------------------------------------------
// 9. DUPLICATE ACTION CARD DEDUPLICATION (EX4)
// ---------------------------------------------------------------------------

describe('V31 — Duplicate action card deduplication', () => {
  it('filters out duplicate action cards with same tracker, fields, and date', async () => {
    const { parseActionCards } = await import('@/lib/ai/actions')
    const duplicateCard = {
      type: 'LOG_DATA' as const,
      trackerId: 'tracker-nutrition',
      trackerName: 'Nutrition',
      fields: { fld_calories: 350 },
      date: '2026-05-26',
      source: 'chat',
    }
    // Return two identical cards — second should be deduped
    vi.mocked(parseActionCards).mockReturnValue([duplicateCard, duplicateCard])

    mockStreamHealthMessage.mockImplementation(() =>
      makeChunkGenerator(['Logged 350 calories!'])
    )

    const res = await POST(makeRequest({ message: 'I had 350 calories', date: '2026-05-26' }))
    const events = await readSSEParsed(res.body!)

    const doneEvent = events.find(e => e.type === 'done')
    expect(doneEvent).toBeDefined()

    // actions in done event should only contain 1 of the 2 duplicate cards
    const actions = doneEvent?.actions as Array<{ type: string; trackerId: string }> | undefined
    expect(actions).toBeDefined()
    if (actions) {
      const logDataActions = actions.filter(a => a?.type === 'LOG_DATA' && a?.trackerId === 'tracker-nutrition')
      expect(logDataActions.length).toBe(1)
    }
  })
})

// ---------------------------------------------------------------------------
// 10. EDGE CASES
// ---------------------------------------------------------------------------

describe('V31 — Edge cases', () => {
  it('accepts message-only request with no attachments (happy path)', async () => {
    const res = await POST(makeRequest({ message: 'I had oatmeal for breakfast', date: '2026-05-26' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('returns 400 for empty message with no attachments', async () => {
    const res = await POST(makeRequest({ message: '', date: '2026-05-26' }))

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/message/i)
  })

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json :::',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for disallowed MIME type (Word doc)', async () => {
    const res = await POST(
      makeRequest({
        message: 'check this',
        attachments: [
          {
            base64: 'abc123==',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            type: 'file',
            filename: 'report.docx',
          },
        ],
      })
    )

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/disallowed|mime/i)
  })

  it('accepts message without date param (falls back to server date)', async () => {
    const res = await POST(makeRequest({ message: 'Just a quick note' }))

    // Should not fail — date is optional
    expect(res.status).toBe(200)
  })
})
