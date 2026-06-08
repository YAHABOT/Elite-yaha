# Technical Log v1 — Session 2026-06-04 (continuation)
**Tasks:** T46, T47, T48, T49
**Status:** ✓ COMPLETE — deployed to production
**Build:** `yaha-flame.vercel.app` — deployment `dpl_HsMjbxtTHFgt1hgKkoBRXzDJudKT`

---

## T46 — "This Week" Sparkline Bar Count Fix

### Problem
`field_total` and `field_average` widgets with `period='this_week'` always rendered 7 sparkline bars regardless of how far into the week it was. On a Monday, 7 bars showed Mon + 6 ghost bars. On a Thursday, bars were mislabelled / wrong dates.

### Root Cause
`src/app/(app)/(content)/dashboard/page.tsx` hardcoded:
```typescript
const sparkDays = Math.min(w.days ?? 7, 7)  // always resolves to 7
```
instead of using the existing `getSparklineDays(w)` helper which returns the correct day count (1–7) based on `this_week`, `last_week`, or N-day period.

The `computeDailyPointsFromLogs` function also had no `startDate` parameter, so it always counted backwards from today — wrong for `this_week` (should count forward from Monday).

### Fix — `src/lib/db/dashboard-data.ts`
Added optional `startDate?: Date` parameter to `computeDailyPointsFromLogs`:
```typescript
export function computeDailyPointsFromLogs(
  logs: TrackerLog[],
  trackerId: string,
  fieldId: string,
  aggregation: 'average' | 'total',
  nDays: number,
  startDate?: Date   // ← NEW
): number[] {
  for (let i = 0; i < nDays; i++) {
    let d: Date
    if (startDate) {
      d = new Date(startDate)
      d.setDate(startDate.getDate() + i)  // forward from Monday
    } else {
      d = new Date()
      d.setDate(d.getDate() - (nDays - 1 - i))  // backward from today (legacy)
    }
    // ...
  }
}
```

### Fix — `src/app/(app)/(content)/dashboard/page.tsx`
```typescript
// BEFORE
const sparkDays = Math.min(w.days ?? 7, 7)
val.trend = computeDailyPointsFromLogs(nDayLogs, w.tracker_id, w.field_id, agg, sparkDays)

// AFTER
const sparkDays = getSparklineDays(w)         // period-aware count
const sparkStart = getSparklineStartDate(w)   // Monday for this_week / last Monday for last_week
val.trend = computeDailyPointsFromLogs(nDayLogs, w.tracker_id, w.field_id, agg, sparkDays, sparkStart)
```

---

## T47 — Admin Insights Large Expansion

### Features

#### 1. Hide Users from Roster
Added per-card X button and section-level show/hide toggle.

**InsightsDashboard.tsx state:**
```typescript
const [hiddenUserIds, setHiddenUserIds] = useState<Set<string>>(new Set())
const [showHidden, setShowHidden] = useState(false)
const visibleUsers = showHidden ? userProfiles : userProfiles.filter(u => !hiddenUserIds.has(u.id))
```
X button toggles the user ID in/out of `hiddenUserIds`. When `hiddenCount > 0`, an Eye/EyeOff toggle appears in the section header.

#### 2. Recent Activity: Who + What Columns
Grid changed from 4 columns to 5: event badge | user email | tracker | logged fields | timestamp.

**`user_email` resolution** (`analytics.ts`):
- Added `userEmailMap` built from the existing `authUsers` array: `Map<userId, email>`
- Enriched `recentRes.data` with `user_email: userEmailMap.get(e.user_id) ?? '(no email)'`

**`loggedContent` per event type** (InsightsDashboard):
```typescript
const loggedContent = (() => {
  if (event.event_type === 'action_card_confirmed') {
    const fields = event.metadata?.ai_fields_total_names as string[] | undefined
    return fields?.length > 0 ? fields.slice(0, 4).join(', ') + (fields.length > 4 ? ` +${n}` : '') : null
  }
  if (event.event_type === 'routine_completed') return routineName ? `Completed: ${routineName}` : null
  if (event.event_type === 'routine_step_skipped') {
    const step = event.metadata?.step_name as string | undefined
    return step ? `Skipped: ${step}` : routineName ?? null
  }
  return null
})()
```

#### 3. Tracker Field Breakdown in Expanded View
Added `TrackerFieldStat[]` to `TrackerStat`:
```typescript
type TrackerFieldStat = {
  fieldId: string; label: string; type: string; count: number
}
```

**Data pipeline** (`analytics.ts`):
- `allTrackersRes` query now includes `schema` column
- New `fieldLogsRes` query: `tracker_logs` for last 30 days (limited 10k rows)
- Per-user, per-tracker, per-field log counts built into a nested Map:
  `Map<userId, Map<trackerId:fieldId, count>>`
- Each `TrackerStat.fields` populated from tracker schema with 30d counts

**Rendered** as a `border-l-2` indented list under each tracker bar in the expanded breakdown.

#### 4. Widget Types per User
- `widgetsRes` query: `widgets.select('user_id, type')`
- `widgetsByUser`: `Map<userId, {type, count}[]>` built via reduce
- Added `widgetTypes: { type: string; count: number }[]` to `UserProfile`
- Rendered as cyan chips in expanded breakdown: "field total ×2"

#### 5. Global Top Logged Fields Section
- `fieldCountGlobal` map built across all users from `fieldLogsRes`
- Resolves `fieldLabel` + `trackerName` from schema metadata
- Sorted by count descending, top 12 rendered above User Roster
- Color-coded by rank: top 3 = cyan, next 3 = purple, rest = grey

---

## T48 — Correlator Widget VALUE Fix

### Problem
"Calorie Balance This Week" widget: VALUE=3957 Kcal but sparkline bars (Mon 225, Tue 272, Wed 572, Thu 0) summed to ~1069.

### Root Cause — Confirmed via DB Query
Formula: `intake_tracker:fld_calories - burn_tracker:fld_calories`

The `correlator` case in `computeWidgetValueOptimized` called:
```typescript
const correlatorLogs = filterByPeriod(nDayLogs, widget)  // Mon–Thu logs
const fieldMap = buildFieldValueMap(correlatorLogs)        // sums ALL values
const result = evaluateFormula(correlation.formula, fieldMap)
```

`buildFieldValueMap` sums every numeric value for each `trackerId:fieldId` key across all logs. Thursday (Jun 4) had 8 intake logs (~2887 kcal) but **no burn log**. So:
- `fieldMap[intake_key]` = Mon+Tue+Wed+Thu intake = ~3957 kcal
- `fieldMap[burn_key]` = Mon+Tue+Wed burn only = ~2888 kcal (no Thursday)
- `evaluateFormula` = 3957 − 2888 = 3957 ← wrong (burn was actually missing for Thu)

The per-day sparkline loop was correct (Thu burn = null → bar = 0), which is why VALUE ≠ sum(bars).

### Fix — `src/lib/db/dashboard-data.ts`
Replaced the `correlator` case VALUE computation:

```typescript
// Always compute per-day loop (drives both sparkline AND value for period widgets)
let cumulativeValue = 0
let hasDayValue = false
const correlatorTrend: number[] = []

for (let i = 0; i < sparkDays; i++) {
  const d = new Date(sparkStart); d.setDate(sparkStart.getDate() + i)
  const dayLogs = nDayLogs.filter(l => l.logged_at.startsWith(d.toISOString().split('T')[0]))
  const dayFieldMap = buildFieldValueMap(dayLogs)
  const dayResult = evaluateFormula(correlation.formula, dayFieldMap)
  const isValid = dayResult !== null && Number.isFinite(dayResult)
  if (isValid) { cumulativeValue += dayResult as number; hasDayValue = true }
  correlatorTrend.push(isValid ? dayResult as number : 0)
}

// Period widgets: VALUE = sum of days where ALL operands were present
// N-day widgets: keep full-period field map (aggregate semantics)
let result: number | null
if (widget.period === 'this_week' || widget.period === 'last_week') {
  result = hasDayValue ? cumulativeValue : null
} else {
  const correlatorLogs = filterByPeriod(nDayLogs, widget)
  const fieldMap = buildFieldValueMap(correlatorLogs)
  result = evaluateFormula(correlation.formula, fieldMap)
}
```

**Result:** Thu bar = 0 (burn missing), VALUE = Mon+Tue+Wed results only (~1069) ✓

---

## T49 — Recent Activity Tick/Untick Analytics Inclusion

### Feature
Admin can mark individual `usage_events` as excluded from analytics — e.g., an action card the user intentionally dismissed (not an AI failure) that was inflating the dismissed count.

### Migration — `20260604000003_usage_events_exclude_analytics.sql`
```sql
ALTER TABLE usage_events
  ADD COLUMN IF NOT EXISTS excluded_from_analytics BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS usage_events_excluded_idx ON usage_events(excluded_from_analytics);
```
Applied via Supabase MCP ✓

### Server Action — `src/app/actions/analytics.ts`
```typescript
export async function toggleEventExclusion(
  eventId: string,
  currentlyExcluded: boolean
): Promise<{ error?: string }> {
  const user = await getSafeUser()
  if (!user) return { error: 'Unauthorized' }
  if (process.env.ADMIN_EMAIL && user.email !== process.env.ADMIN_EMAIL)
    return { error: 'Forbidden' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('usage_events')
    .update({ excluded_from_analytics: !currentlyExcluded })
    .eq('id', eventId)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}
```
Uses service client to bypass RLS for the UPDATE. User-facing ADMIN_EMAIL guard prevents non-admin access even if they somehow reach the server action.

### Analytics Queries — `src/lib/db/analytics.ts`
Three queries now filter `.eq('excluded_from_analytics', false)` so excluded events don't affect AI accuracy, outcomes pie, or per-tracker accuracy:
- `accuracyRes` — 7d confirmed cards
- `outcomesRes` — 30d confirmed + dismissed
- `trackersRes` — per-tracker confirmed cards

`recentRes` selects `excluded_from_analytics` but shows ALL events (admin needs to see them to manage them).

### UI — `src/components/admin/InsightsDashboard.tsx`

**State:**
```typescript
const [isPending, startTransition] = useTransition()
const [optimisticExcluded, setOptimisticExcluded] = useState<Set<string>>(
  () => new Set(insights.recentEvents.filter(e => e.excluded_from_analytics).map(e => e.id))
)
```

**Toggle handler with optimistic update + revert:**
```typescript
function handleToggleExclusion(eventId: string) {
  const currentlyExcluded = optimisticExcluded.has(eventId)
  setOptimisticExcluded(prev => { /* toggle */ })
  startTransition(async () => {
    const result = await toggleEventExclusion(eventId, currentlyExcluded)
    if (result.error) setOptimisticExcluded(prev => { /* revert */ })
  })
}
```

**Row rendering:**
- Grid: `28px 160px 1fr 1fr 1fr 56px` (toggle | event | who | tracker | what | when)
- `CheckCircle2` (green, 60% opacity) = included in analytics
- `MinusCircle` (red, 70% opacity) = excluded
- Excluded rows: `opacity: 0.55`, red border tint `rgba(239,68,68,0.12)`, red bg `rgba(239,68,68,0.04)`

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/db/dashboard-data.ts` | T46: `startDate` param on `computeDailyPointsFromLogs`; T48: per-day correlator VALUE |
| `src/app/(app)/(content)/dashboard/page.tsx` | T46: `getSparklineDays`/`getSparklineStartDate` for sparkline |
| `src/lib/db/analytics.ts` | T47: `TrackerFieldStat`, `widgetTypes`, `topFields`, `user_email`, `excluded_from_analytics`; T49: filter excluded from accuracy queries |
| `src/components/admin/InsightsDashboard.tsx` | T47: hide users, 5-col activity, field breakdown, widget chips, top fields; T49: tick/untick toggle |
| `src/app/actions/analytics.ts` | T49: `toggleEventExclusion` server action |
| `supabase/migrations/20260604000003_usage_events_exclude_analytics.sql` | T49: `excluded_from_analytics` column |

---

## Build Verification
```
✓ Compiled successfully in 13.8s
✓ Linting and checking validity of types
✓ Generating static pages (26/26)
Warnings: pre-existing only (no-unused-expressions, no-unused-vars) — not introduced by this session
```

## Deployment
- Supabase migration `20260604000003`: applied ✓
- Vercel production: `dpl_HsMjbxtTHFgt1hgKkoBRXzDJudKT` → `yaha-flame.vercel.app` ✓

[CA | session-end] T46–T49 technical log written
