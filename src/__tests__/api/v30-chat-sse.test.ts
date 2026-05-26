/**
 * V30 — B8: SSE streaming tests
 *
 * The chat route now returns text/event-stream instead of buffered JSON.
 * Tests verify:
 * - Response Content-Type is text/event-stream (not application/json)
 * - Streaming chunks arrive before the full response is complete
 * - Terminal 'done' event carries sessionId, messageId, actions, content
 * - Historical intent triggers DB fetch (B4)
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
  mockSearchLogsByFieldText,
  mockGetMasterBrainContext,
  mockGetAgents,
  mockFetchRoutine,
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
  mockSearchLogsByFieldText: vi.fn(),
  mockGetMasterBrainContext: vi.fn(),
  mockGetAgents: vi.fn(),
  mockFetchRoutine: vi.fn(),
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
  GEMINI_MODEL: 'gemini-3.1-flash-lite-preview',
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
  getDayState: vi.fn().mockResolvedValue(null),
  upsertDayState: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/db/logs', () => ({
  getLogsForDay: mockGetLogsForDay,
  getLogsForDateRange: mockGetLogsForDateRange,
  searchLogsByFieldText: mockSearchLogsByFieldText,
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
// Import under test
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/chat/route'

// ---------------------------------------------------------------------------
// Constants and helpers
// ---------------------------------------------------------------------------

const FAKE_USER = { id: 'user-sse-test', email: 'sse@test.example' }

const FAKE_SESSION: ChatSession = {
  id: 'session-sse-01',
  user_id: FAKE_USER.id,
  title: 'SSE Test Chat',
  updated_at: '2026-04-09T00:00:00Z',
  active_routine_id: null,
  current_step_index: 0,
  active_agent_id: null,
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

// Helper to create an async generator from an array of chunks
async function* makeChunkGenerator(chunks: string[]) {
  for (const chunk of chunks) {
    yield chunk
  }
}

// Helper to read all SSE events from a ReadableStream
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

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()

  setAuthenticatedUser()
  mockCreateSession.mockResolvedValue(FAKE_SESSION)
  mockGetSession.mockImplementation(async (id: string) => ({ ...FAKE_SESSION, id }))
  mockAddMessage.mockResolvedValue({ id: 'msg-sse-1' })
  mockGetTrackers.mockResolvedValue([])
  mockBuildHealthSystemPrompt.mockReturnValue('You are a health assistant.')
  mockBuildRoutineSystemPrompt.mockReturnValue('You are YAHA executing a routine.')
  mockDetectRoutineTrigger.mockResolvedValue(null)
  mockFetchRoutine.mockResolvedValue(null)
  mockGetActiveDayState.mockResolvedValue(null)
  mockGetRecentMessagesForAI.mockResolvedValue([])
  mockGetLogsForDay.mockResolvedValue([])
  mockGetLogsForDateRange.mockResolvedValue([])
  mockSearchLogsByFieldText.mockResolvedValue([])
  mockGetMasterBrainContext.mockResolvedValue('')
  mockGetAgents.mockResolvedValue([])
  mockUpdateSession.mockResolvedValue(undefined)
  mockMarkDayStarted.mockResolvedValue(undefined)
  mockMarkDayEnded.mockResolvedValue(undefined)

  // Default streaming mock: yields two chunks then completes
  mockStreamHealthMessage.mockImplementation(() =>
    makeChunkGenerator(['Hello ', 'world!'])
  )
})

// ---------------------------------------------------------------------------
// B8: SSE Response format
// ---------------------------------------------------------------------------

describe('POST /api/chat — B8: SSE streaming response', () => {
  it('returns Content-Type text/event-stream (not application/json)', async () => {
    const res = await POST(makeRequest({ message: 'Hello', date: '2026-04-09' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('includes Cache-Control: no-cache header', async () => {
    const res = await POST(makeRequest({ message: 'Hello', date: '2026-04-09' }))

    expect(res.headers.get('Cache-Control')).toBe('no-cache')
  })

  it('emits chunk events for each streamed token', async () => {
    mockStreamHealthMessage.mockImplementation(() =>
      makeChunkGenerator(['First ', 'Second ', 'Third'])
    )

    const res = await POST(makeRequest({ message: 'Hello', date: '2026-04-09' }))
    const events = await readSSEStream(res.body!)

    const chunkEvents = events
      .map(e => JSON.parse(e) as { type: string; text?: string })
      .filter(e => e.type === 'chunk')

    expect(chunkEvents).toHaveLength(3)
    expect(chunkEvents[0].text).toBe('First ')
    expect(chunkEvents[1].text).toBe('Second ')
    expect(chunkEvents[2].text).toBe('Third')
  })

  it('emits a done event as the final SSE event with sessionId and messageId', async () => {
    const res = await POST(makeRequest({ message: 'Hello', date: '2026-04-09' }))
    const events = await readSSEStream(res.body!)

    const parsed = events.map(e => JSON.parse(e) as Record<string, unknown>)
    const doneEvent = parsed.find(e => e.type === 'done')

    expect(doneEvent).toBeDefined()
    expect(doneEvent?.sessionId).toBe(FAKE_SESSION.id)
    expect(doneEvent?.messageId).toBe('msg-sse-1')
  })

  it('done event contains accumulated full content from all chunks', async () => {
    mockStreamHealthMessage.mockImplementation(() =>
      makeChunkGenerator(['Hello ', 'world!'])
    )

    const res = await POST(makeRequest({ message: 'Hello', date: '2026-04-09' }))
    const events = await readSSEStream(res.body!)

    const doneEvent = events
      .map(e => JSON.parse(e) as Record<string, unknown>)
      .find(e => e.type === 'done')

    expect(doneEvent?.content).toBe('Hello world!')
  })

  it('chunk events arrive before the done event', async () => {
    mockStreamHealthMessage.mockImplementation(() =>
      makeChunkGenerator(['chunk-1', 'chunk-2'])
    )

    const res = await POST(makeRequest({ message: 'Hello', date: '2026-04-09' }))
    const events = await readSSEStream(res.body!)

    const parsed = events.map(e => JSON.parse(e) as { type: string })
    const types = parsed.map(e => e.type)

    // Session event is sent first, then chunk events, then done
    expect(types[0]).toBe('session')
    expect(types).toContain('chunk')
    expect(types[types.length - 1]).toBe('done')
  })

  it('returns 401 before streaming when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const res = await POST(makeRequest({ message: 'Hello' }))

    expect(res.status).toBe(401)
    // 401 is a plain JSON response, not SSE
    expect(res.headers.get('Content-Type')).not.toBe('text/event-stream')
  })
})

// ---------------------------------------------------------------------------
// B4: Historical intent detection triggers DB fetch
// ---------------------------------------------------------------------------

describe('POST /api/chat — B4: historical intent detection', () => {
  it('calls getLogsForDateRange when message contains "yesterday"', async () => {
    const res = await POST(
      makeRequest({ message: 'What did I eat yesterday?', date: '2026-04-09' })
    )

    // Read stream to completion
    await readSSEStream(res.body!)

    expect(mockGetLogsForDateRange).toHaveBeenCalled()
  })

  it('does NOT call getLogsForDateRange for non-historical message', async () => {
    const res = await POST(
      makeRequest({ message: 'I ate 500 calories of chicken', date: '2026-04-09' })
    )

    await readSSEStream(res.body!)

    expect(mockGetLogsForDateRange).not.toHaveBeenCalled()
    expect(mockSearchLogsByFieldText).not.toHaveBeenCalled()
  })

  it('calls getLogsForDateRange when message contains "last week"', async () => {
    const res = await POST(
      makeRequest({ message: 'Summarize my last week of eating', date: '2026-04-09' })
    )

    await readSSEStream(res.body!)

    expect(mockGetLogsForDateRange).toHaveBeenCalled()
  })

  it('calls getLogsForDateRange when message asks "how was my sleep"', async () => {
    const res = await POST(
      makeRequest({ message: 'how was my sleep this last week', date: '2026-04-09' })
    )

    await readSSEStream(res.body!)

    // "last week" pattern triggers historical lookup
    expect(mockGetLogsForDateRange).toHaveBeenCalled()
  })

  it('does NOT call historical DB functions during routine execution', async () => {
    // Session has an active routine
    mockGetSession.mockResolvedValue({
      ...FAKE_SESSION,
      active_routine_id: 'routine-morning',
    })
    mockFetchRoutine.mockResolvedValue({
      id: 'routine-morning',
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
      ],
      created_at: '2026-04-09T00:00:00Z',
    } as Routine)

    const res = await POST(
      makeRequest({
        message: 'What did I eat yesterday?',
        sessionId: 'existing-session',
        date: '2026-04-09',
      })
    )

    await readSSEStream(res.body!)

    // Historical lookup should be skipped when active routine is running
    expect(mockGetLogsForDateRange).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// B8: SSE error handling
// ---------------------------------------------------------------------------

describe('POST /api/chat — B8: SSE error handling', () => {
  it('emits error SSE event when streamHealthMessage throws', async () => {
    mockStreamHealthMessage.mockImplementation(async function* () {
      throw new Error('Gemini API error')
    })

    const res = await POST(makeRequest({ message: 'Hello', date: '2026-04-09' }))

    // Response headers should still be SSE (error happens inside stream)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')

    const events = await readSSEStream(res.body!)
    const parsed = events.map(e => JSON.parse(e) as { type: string; error?: string })
    const errorEvent = parsed.find(e => e.type === 'error')

    expect(errorEvent).toBeDefined()
    expect(errorEvent?.error).toBe('Streaming failed')
  })
})
