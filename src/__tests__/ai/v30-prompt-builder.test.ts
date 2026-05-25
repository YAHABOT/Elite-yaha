/**
 * V30 — B4 + B5: prompt-builder new behaviors
 *
 * B4: buildDaySummary uses tracker names (not UUIDs) via trackers param
 * B5: YES_NO_FIELD_RULE present in routine prompt
 * B4: historicalContext injected as HISTORICAL DATA section
 * B4: buildHistoricalSection budget truncation
 */

import { describe, it, expect } from 'vitest'
import { buildHealthSystemPrompt, buildRoutineSystemPrompt } from '@/lib/ai/prompt-builder'
import type { Tracker } from '@/types/tracker'
import type { Routine } from '@/types/routine'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_TRACKER: Tracker = {
  id: 'tracker-nutrition-uuid',
  user_id: 'user-abc',
  name: 'Nutrition',
  type: 'nutrition',
  color: '#10b981',
  schema: [
    { fieldId: 'fld_001', label: 'Calories', type: 'number', unit: 'kcal' },
  ],
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

const FAKE_ROUTINE: Routine = {
  id: 'routine-1',
  user_id: 'user-abc',
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
  created_at: '2026-03-11T00:00:00Z',
}

// ---------------------------------------------------------------------------
// B4: buildDaySummary uses tracker names, not UUIDs
// ---------------------------------------------------------------------------

describe('buildHealthSystemPrompt — B4: buildDaySummary uses tracker names', () => {
  it('shows tracker name in day summary when matching tracker is provided', () => {
    const dayLogs = [
      {
        tracker_id: 'tracker-nutrition-uuid',
        fields: { fld_001: 500 },
        logged_at: '2026-04-01T12:00:00.000Z',
      },
    ]

    const result = buildHealthSystemPrompt({
      trackers: [FAKE_TRACKER],
      date: '2026-04-01',
      dayLogs,
    })

    // Tracker name should appear in day summary, not the raw UUID
    expect(result).toContain('Nutrition')
    expect(result).not.toContain('tracker-nutrition-uuid — fld_001')
  })

  it('falls back to tracker UUID when no matching tracker found', () => {
    const dayLogs = [
      {
        tracker_id: 'some-unknown-uuid',
        fields: { fld_001: 300 },
        logged_at: '2026-04-01T08:00:00.000Z',
      },
    ]

    const result = buildHealthSystemPrompt({
      trackers: [],
      date: '2026-04-01',
      dayLogs,
    })

    // Falls back to UUID when tracker not found
    expect(result).toContain('some-unknown-uuid')
  })

  it('shows "No entries logged yet" when dayLogs is empty', () => {
    const result = buildHealthSystemPrompt({
      trackers: [FAKE_TRACKER],
      date: '2026-04-01',
      dayLogs: [],
    })

    expect(result).toContain('No entries logged yet for today')
  })
})

// ---------------------------------------------------------------------------
// B4: historicalContext injected into prompt
// ---------------------------------------------------------------------------

describe('buildHealthSystemPrompt — B4: historicalContext injection', () => {
  it('includes HISTORICAL DATA section when historicalContext is provided', () => {
    const historicalContext = [
      {
        tracker_name: 'Nutrition',
        fields: { fld_001: 400 },
        logged_at: '2026-03-31T12:00:00.000Z',
      },
    ]

    const result = buildHealthSystemPrompt({
      trackers: [FAKE_TRACKER],
      date: '2026-04-01',
      historicalContext,
    })

    expect(result).toContain('## HISTORICAL DATA')
    expect(result).toContain('Nutrition')
  })

  it('shows "No logs found" message when historicalContext is empty array', () => {
    const result = buildHealthSystemPrompt({
      trackers: [FAKE_TRACKER],
      date: '2026-04-01',
      historicalContext: [],
    })

    expect(result).toContain('## HISTORICAL DATA')
    expect(result).toContain('No logs found for the requested period')
  })

  it('omits HISTORICAL DATA section when historicalContext is undefined', () => {
    const result = buildHealthSystemPrompt({
      trackers: [FAKE_TRACKER],
      date: '2026-04-01',
      // historicalContext not provided
    })

    expect(result).not.toContain('## HISTORICAL DATA')
  })

  it('groups historical logs by date in the output', () => {
    const historicalContext = [
      {
        tracker_name: 'Nutrition',
        fields: { fld_001: 400 },
        logged_at: '2026-03-31T12:00:00.000Z',
      },
      {
        tracker_name: 'Sleep',
        fields: { fld_010: 7.5 },
        logged_at: '2026-03-30T08:00:00.000Z',
      },
    ]

    const result = buildHealthSystemPrompt({
      trackers: [FAKE_TRACKER],
      date: '2026-04-01',
      historicalContext,
    })

    // Both dates should appear as section headers
    expect(result).toContain('### 2026-03-31')
    expect(result).toContain('### 2026-03-30')
  })

  it('respects 800-token budget — very long historical data is truncated', () => {
    // Create many logs that would exceed 800*4=3200 chars
    const manyLogs = Array.from({ length: 100 }, (_, i) => ({
      tracker_name: 'Nutrition',
      fields: { fld_item: `A very long food item name that has lots of text: item-${i}` },
      logged_at: `2026-03-${String(i % 28 + 1).padStart(2, '0')}T12:00:00.000Z`,
    }))

    const result = buildHealthSystemPrompt({
      trackers: [FAKE_TRACKER],
      date: '2026-04-01',
      historicalContext: manyLogs,
    })

    // Should contain HISTORICAL DATA but be within reasonable bounds
    expect(result).toContain('## HISTORICAL DATA')
    // The historical section should be present but truncated (not 100 entries)
    const historicalSection = result.split('## HISTORICAL DATA')[1] ?? ''
    // Count occurrences of the tracker name in the historical section
    const entryCount = (historicalSection.match(/item-\d+/g) ?? []).length
    expect(entryCount).toBeLessThan(100)
  })
})

// ---------------------------------------------------------------------------
// B5: YES_NO_FIELD_RULE present in routine prompt
// ---------------------------------------------------------------------------

describe('buildRoutineSystemPrompt — B5: YES_NO_FIELD_RULE', () => {
  it('includes the YES/NO FIELD RULE in routine system prompt', () => {
    const result = buildRoutineSystemPrompt(FAKE_ROUTINE, [FAKE_TRACKER])

    expect(result).toContain('YES/NO (BOOLEAN) FIELD RULE')
  })

  it('clarifies that "no" is a data response, not a skip', () => {
    const result = buildRoutineSystemPrompt(FAKE_ROUTINE, [FAKE_TRACKER])

    expect(result).toContain('"no"')
    expect(result).toContain('Log the field as "No"')
  })

  it('lists explicit skip phrases in the rule (not "no" or "nope")', () => {
    const result = buildRoutineSystemPrompt(FAKE_ROUTINE, [FAKE_TRACKER])

    // Should list skip as explicit skip intent
    expect(result).toContain('"skip"')
    expect(result).toContain('Skip this ENTIRE step')
  })
})

// ---------------------------------------------------------------------------
// B4: actualDate vs date distinction in prompt
// ---------------------------------------------------------------------------

describe('buildHealthSystemPrompt — B4: actualDate for relative date arithmetic', () => {
  it('includes both active logging date and actual current date', () => {
    const result = buildHealthSystemPrompt({
      trackers: [],
      date: '2026-03-07',
      actualDate: '2026-04-01',
    })

    expect(result).toContain('2026-03-07')
    expect(result).toContain('2026-04-01')
  })

  it('uses date as actualDate fallback when actualDate is not provided', () => {
    const result = buildHealthSystemPrompt({
      trackers: [],
      date: '2026-04-01',
      // no actualDate
    })

    // Both TODAY and ACTUAL_TODAY should be 2026-04-01
    const count = (result.match(/2026-04-01/g) ?? []).length
    expect(count).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// B3 / B6: Correlator label (verified via DayView component test)
// These are tested in DayView.test.tsx — here we just verify prompt sanity
// ---------------------------------------------------------------------------

describe('buildRoutineSystemPrompt — routine step sequence marker', () => {
  it('marks the current step with "YOU ARE HERE"', () => {
    const result = buildRoutineSystemPrompt(FAKE_ROUTINE, [FAKE_TRACKER], 0)
    expect(result).toContain('YOU ARE HERE')
  })
})
