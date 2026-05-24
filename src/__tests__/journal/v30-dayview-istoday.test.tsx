/**
 * V30 — B3: isToday strict equality test
 * V30 — B6: "Correlator" label (was "Correlate")
 *
 * B3: isToday = date === today (strict equality, not >=)
 *   - Past date → isToday = false → forward navigation button NOT disabled
 *   - Future date → isToday = false → forward navigation button NOT disabled
 *   - Today → isToday = true → forward navigation button IS disabled
 *
 * B6: "Correlator" label appears on the button (not "Correlate")
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DayView } from '@/components/journal/DayView'
import type { Tracker } from '@/types/tracker'

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const I = ({ className }: { className?: string }) => <span className={className} />
  return { ChevronLeft: I, ChevronRight: I, GitBranch: I, Eye: I, Plus: I, Menu: I, X: I }
})

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock CorrelationCard and CorrelatorModal to avoid deep dependency trees
vi.mock('@/components/journal/CorrelationCard', () => ({
  CorrelationCard: () => null,
}))

vi.mock('@/components/journal/CorrelatorModal', () => ({
  CorrelatorModal: () => <div data-testid="correlator-modal" />,
}))

// We need to control what getLocalDateStr() returns.
// DayView.tsx calls new Date() inside getLocalDateStr() to get TODAY.
// We pin the system clock to a known date to make isToday predictable.

const MOCKED_TODAY = '2026-04-09'

// Override Date so getLocalDateStr() returns MOCKED_TODAY
const OriginalDate = globalThis.Date
class MockDate extends OriginalDate {
  constructor(...args: ConstructorParameters<typeof Date>) {
    if (args.length === 0) {
      super('2026-04-09T12:00:00.000Z')
    } else {
      // @ts-expect-error spread
      super(...args)
    }
  }
  static now() {
    return new OriginalDate('2026-04-09T12:00:00.000Z').getTime()
  }
}

const FAKE_TRACKER: Tracker = {
  id: 'tracker-001',
  user_id: 'user-abc',
  name: 'Nutrition',
  type: 'nutrition',
  color: '#10b981',
  schema: [{ fieldId: 'fld_001', label: 'Calories', type: 'number', unit: 'kcal' }],
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

function renderDayView(date: string) {
  return render(
    <DayView
      date={date}
      trackers={[FAKE_TRACKER]}
      logs={[]}
      loggedDates={[date]}
      correlations={[]}
    />
  )
}

describe('DayView — B3: isToday strict equality', () => {
  beforeEach(() => {
    // Install mock Date
    globalThis.Date = MockDate as unknown as DateConstructor
  })

  afterEach(() => {
    // Restore original Date
    globalThis.Date = OriginalDate
  })

  it('disables the forward navigation button when viewing today', () => {
    renderDayView(MOCKED_TODAY) // exactly today

    // The ChevronRight button has disabled prop when isToday is true
    const buttons = screen.getAllByRole('button')
    // Find the forward (right) navigation button — it comes after the left button
    // We look for disabled button among navigation buttons
    const disabledButtons = buttons.filter(b => b.hasAttribute('disabled'))
    expect(disabledButtons.length).toBeGreaterThan(0)
  })

  it('does NOT disable the forward navigation button for a past date', () => {
    renderDayView('2026-04-08') // yesterday

    const buttons = screen.getAllByRole('button')
    const disabledButtons = buttons.filter(b => b.hasAttribute('disabled'))
    // No nav button should be disabled for a past date
    expect(disabledButtons.length).toBe(0)
  })

  it('does NOT disable the forward navigation button for a future date', () => {
    renderDayView('2026-04-10') // tomorrow

    const buttons = screen.getAllByRole('button')
    const disabledButtons = buttons.filter(b => b.hasAttribute('disabled'))
    // No nav button should be disabled for a future date
    expect(disabledButtons.length).toBe(0)
  })

  it('shows "TODAY" badge in sidebar only for today, not for past date', () => {
    renderDayView(MOCKED_TODAY)

    // The sidebar shows a "Today" badge for the current date
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('does not show "TODAY" badge in sidebar when viewing a past date', () => {
    renderDayView('2026-04-08')

    // Sidebar shows logged dates; "Today" badge only appears if today is in allDates
    // Since MOCKED_TODAY is not in loggedDates (we passed '2026-04-08') and
    // date !== today, today is not injected
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
  })
})

describe('DayView — B6: Correlator label', () => {
  it('renders "Correlator" button label (not "Correlate")', () => {
    renderDayView(MOCKED_TODAY)

    // The desktop button (hidden on mobile via CSS but still in DOM)
    const correlatorButtons = screen.getAllByText('Correlator')
    expect(correlatorButtons.length).toBeGreaterThan(0)
  })

  it('does NOT render any button labeled "Correlate" (old label)', () => {
    renderDayView(MOCKED_TODAY)

    expect(screen.queryByText('Correlate')).not.toBeInTheDocument()
  })
})
