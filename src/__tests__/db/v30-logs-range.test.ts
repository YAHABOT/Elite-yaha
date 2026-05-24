/**
 * V30 — B4: getLogsForDateRange + searchLogsByFieldText tests
 *
 * These are new DB functions added in V30 to support historical intent
 * detection in chat/route.ts. They accept an explicit supabaseClient
 * (not createServerClient) and a trackers array for name mapping.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock setup -----------------------------------------------------------

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

type QueryResult = { data: unknown; error: { message: string } | null }
type ChainableBuilder = Record<string, ReturnType<typeof vi.fn>> & {
  _result: QueryResult
  then: ReturnType<typeof vi.fn>
}

function createQueryBuilder(): ChainableBuilder {
  const builder = {} as ChainableBuilder
  builder._result = { data: null, error: null }
  builder.select = vi.fn(() => builder)
  builder.insert = vi.fn(() => builder)
  builder.update = vi.fn(() => builder)
  builder.delete = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  builder.lte = vi.fn(() => builder)
  builder.lt = vi.fn(() => builder)
  builder.ilike = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.single = vi.fn(() => builder)
  builder.range = vi.fn(() => builder)
  builder.limit = vi.fn(() => builder)
  builder.then = vi.fn((resolve: (v: QueryResult) => void) => resolve(builder._result))
  return builder
}

let queryBuilder = createQueryBuilder()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

// getSafeUser is used by getLogsForDateRange and searchLogsByFieldText
vi.mock('@/lib/supabase/auth', () => ({
  getSafeUser: mockGetUser,
}))

// --- Helpers ---------------------------------------------------------------

const FAKE_USER = { id: 'user-123', email: 'test@example.com' }

function setAuthenticatedUser(): void {
  mockGetUser.mockResolvedValue(FAKE_USER)
}

function setUnauthenticatedUser(): void {
  mockGetUser.mockResolvedValue(null)
}

function setQueryResult(data: unknown, error: { message: string } | null = null): void {
  queryBuilder._result = { data, error }
}

// Build a fake supabase client for functions that accept one directly
function makeFakeSupabase() {
  return {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  } as unknown as import('@supabase/supabase-js').SupabaseClient
}

// --- Import under test (after mocks) ------------------------------------

import { getLogsForDateRange, searchLogsByFieldText } from '@/lib/db/logs'

// --- Tests ----------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  queryBuilder = createQueryBuilder()
  mockFrom.mockReturnValue(queryBuilder)
})

// =========================================================================
// getLogsForDateRange
// =========================================================================

describe('getLogsForDateRange', () => {
  const FAKE_TRACKERS = [
    { id: 'tracker-nutrition', name: 'Nutrition' },
    { id: 'tracker-sleep', name: 'Sleep' },
  ]

  it('throws Unauthorized when user is not authenticated', async () => {
    setUnauthenticatedUser()
    await expect(
      getLogsForDateRange('2026-04-01', '2026-04-07', makeFakeSupabase(), FAKE_TRACKERS)
    ).rejects.toThrow('Unauthorized')
  })

  it('applies gte/lt date range filters with correct ISO boundaries', async () => {
    setAuthenticatedUser()
    setQueryResult([])

    await getLogsForDateRange('2026-04-01', '2026-04-07', makeFakeSupabase(), FAKE_TRACKERS)

    expect(queryBuilder.gte).toHaveBeenCalledWith('logged_at', '2026-04-01T00:00:00.000Z')
    // end date is next day (2026-04-08) exclusive boundary
    expect(queryBuilder.lt).toHaveBeenCalledWith('logged_at', '2026-04-08T00:00:00.000Z')
  })

  it('returns empty array when no logs exist in the date range', async () => {
    setAuthenticatedUser()
    setQueryResult([])

    const result = await getLogsForDateRange(
      '2026-01-01',
      '2026-01-31',
      makeFakeSupabase(),
      FAKE_TRACKERS
    )

    expect(result).toEqual([])
  })

  it('maps tracker UUIDs to tracker names correctly', async () => {
    setAuthenticatedUser()
    const rawLogs = [
      {
        tracker_id: 'tracker-nutrition',
        fields: { fld_001: 500 },
        logged_at: '2026-04-01T12:00:00.000Z',
      },
      {
        tracker_id: 'tracker-sleep',
        fields: { fld_010: 7.5 },
        logged_at: '2026-04-01T08:00:00.000Z',
      },
    ]
    setQueryResult(rawLogs)

    const result = await getLogsForDateRange(
      '2026-04-01',
      '2026-04-01',
      makeFakeSupabase(),
      FAKE_TRACKERS
    )

    expect(result).toHaveLength(2)
    expect(result[0].tracker_name).toBe('Nutrition')
    expect(result[1].tracker_name).toBe('Sleep')
  })

  it('uses "Unknown Tracker" for logs with no matching tracker in the list', async () => {
    setAuthenticatedUser()
    const rawLogs = [
      {
        tracker_id: 'tracker-unknown-uuid',
        fields: { fld_001: 100 },
        logged_at: '2026-04-01T10:00:00.000Z',
      },
    ]
    setQueryResult(rawLogs)

    const result = await getLogsForDateRange(
      '2026-04-01',
      '2026-04-01',
      makeFakeSupabase(),
      FAKE_TRACKERS
    )

    expect(result[0].tracker_name).toBe('Unknown Tracker')
  })

  it('applies a limit of 200 records (HISTORICAL_LOG_LIMIT)', async () => {
    setAuthenticatedUser()
    setQueryResult([])

    await getLogsForDateRange('2026-01-01', '2026-04-01', makeFakeSupabase(), FAKE_TRACKERS)

    expect(queryBuilder.limit).toHaveBeenCalledWith(200)
  })

  it('orders results by logged_at descending', async () => {
    setAuthenticatedUser()
    setQueryResult([])

    await getLogsForDateRange('2026-04-01', '2026-04-07', makeFakeSupabase(), FAKE_TRACKERS)

    expect(queryBuilder.order).toHaveBeenCalledWith('logged_at', { ascending: false })
  })

  it('throws with descriptive message on Supabase error', async () => {
    setAuthenticatedUser()
    setQueryResult(null, { message: 'connection timeout' })

    await expect(
      getLogsForDateRange('2026-04-01', '2026-04-07', makeFakeSupabase(), FAKE_TRACKERS)
    ).rejects.toThrow('Failed to fetch logs for date range: connection timeout')
  })

  it('handles single-day range (same startDate and endDate)', async () => {
    setAuthenticatedUser()
    setQueryResult([])

    await getLogsForDateRange('2026-04-05', '2026-04-05', makeFakeSupabase(), FAKE_TRACKERS)

    expect(queryBuilder.gte).toHaveBeenCalledWith('logged_at', '2026-04-05T00:00:00.000Z')
    // next day = 2026-04-06
    expect(queryBuilder.lt).toHaveBeenCalledWith('logged_at', '2026-04-06T00:00:00.000Z')
  })
})

// =========================================================================
// searchLogsByFieldText
// =========================================================================

describe('searchLogsByFieldText', () => {
  const FAKE_TRACKERS = [
    { id: 'tracker-food', name: 'Food' },
  ]

  it('throws Unauthorized when user is not authenticated', async () => {
    setUnauthenticatedUser()
    await expect(
      searchLogsByFieldText('chicken', makeFakeSupabase(), FAKE_TRACKERS)
    ).rejects.toThrow('Unauthorized')
  })

  it('uses ILIKE pattern for text search in fields::text', async () => {
    setAuthenticatedUser()
    setQueryResult([])

    await searchLogsByFieldText('chicken', makeFakeSupabase(), FAKE_TRACKERS)

    expect(queryBuilder.ilike).toHaveBeenCalledWith('fields::text', '%chicken%')
  })

  it('returns empty array when no logs match the query', async () => {
    setAuthenticatedUser()
    setQueryResult([])

    const result = await searchLogsByFieldText(
      'nonexistent-food-item-xyz',
      makeFakeSupabase(),
      FAKE_TRACKERS
    )

    expect(result).toEqual([])
  })

  it('maps tracker UUIDs to tracker names on results', async () => {
    setAuthenticatedUser()
    const rawLogs = [
      {
        tracker_id: 'tracker-food',
        fields: { fld_item: 'chicken breast', fld_calories: 165 },
        logged_at: '2026-04-01T12:00:00.000Z',
      },
    ]
    setQueryResult(rawLogs)

    const result = await searchLogsByFieldText('chicken', makeFakeSupabase(), FAKE_TRACKERS)

    expect(result).toHaveLength(1)
    expect(result[0].tracker_name).toBe('Food')
    expect(result[0].fields).toEqual({ fld_item: 'chicken breast', fld_calories: 165 })
  })

  it('sanitizes ILIKE special characters to prevent injection', async () => {
    setAuthenticatedUser()
    setQueryResult([])

    // Query with % and _ should be escaped
    await searchLogsByFieldText('50%_chicken', makeFakeSupabase(), FAKE_TRACKERS)

    expect(queryBuilder.ilike).toHaveBeenCalledWith('fields::text', '%50\\%\\_chicken%')
  })

  it('uses default limit of 10 when not specified', async () => {
    setAuthenticatedUser()
    setQueryResult([])

    await searchLogsByFieldText('chicken', makeFakeSupabase(), FAKE_TRACKERS)

    expect(queryBuilder.limit).toHaveBeenCalledWith(10)
  })

  it('uses custom limit when specified', async () => {
    setAuthenticatedUser()
    setQueryResult([])

    await searchLogsByFieldText('chicken', makeFakeSupabase(), FAKE_TRACKERS, 5)

    expect(queryBuilder.limit).toHaveBeenCalledWith(5)
  })

  it('throws with descriptive message on Supabase error', async () => {
    setAuthenticatedUser()
    setQueryResult(null, { message: 'table not found' })

    await expect(
      searchLogsByFieldText('test', makeFakeSupabase(), FAKE_TRACKERS)
    ).rejects.toThrow('Failed to search logs by field text: table not found')
  })
})
