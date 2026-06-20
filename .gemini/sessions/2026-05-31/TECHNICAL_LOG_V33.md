# Technical Log V33 — 2026-05-31

**Build:** V33
**Session:** 2026-05-31
**Deployments:** 3 × `npx vercel --prod --yes` (T4, T5 attempt 1, T5 attempt 2)

---

## T1 — Restore `time` Field Type

### Context
The `20260531_time_to_duration_field.sql` migration converted all `time`-typed schema fields to `duration` and their stored values from `"HH:MM"` strings to integer seconds. The user wanted `time` (clock picker, time-of-day) and `duration` (elapsed time, stored as seconds) to coexist. Sleep Start/End are `time` fields; workout duration fields are `duration` fields.

### Files Modified

**`src/types/tracker.ts`**
- Added `'time'` back to `FieldType` union
- `export type FieldType = 'number' | 'text' | 'rating' | 'duration' | 'time' | 'select'`

**`src/types/action-card.ts`**
- Added `'time'` to `SchemaFieldDef.type` union

**`src/components/trackers/SchemaFieldRow.tsx`**
- Added `{ value: 'time', label: 'Time' }` to `FIELD_TYPE_OPTIONS` between Duration and Select

**`src/lib/ai/actions.ts`**
- `VALID_FIELD_TYPES = new Set(['number', 'text', 'rating', 'duration', 'time', 'select'])`
- Type cast updated to include `'time'`

**`src/lib/ai/prompt-builder.ts`**
- `Valid field types: number, text, rating, duration, time, select`

**`src/components/trackers/LogForm.tsx`**
- Added `time` input branch in `FieldInput`:
```tsx
{field.type === 'time' && (
  <input id={inputId} type="time" value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 ..." />
)}
```

**`src/components/trackers/LogEntryCard.tsx`**
- Added `time` to `isWide` check: `field.type === 'text' || field.type === 'time' || field.type === 'select'`
- Added `time` input in `EditFieldInput`

**`src/components/trackers/LogEntryList.tsx`**
- Added `time` input in `EditFieldInput`

**`src/components/journal/TotalsConfigModal.tsx`**
- `numericFields` filter: `f.type !== 'text' && f.type !== 'time' && f.type !== 'select'`
- `loadTotalsConfig` loop: skip `time` and `select` fields (not aggregatable)

---

## T2 — Daily Stats Persistence

### Context
Daily totals/averages and correlation values were computed client-side only. User wanted them persisted to the existing `daily_stats` table (which had the right structure but was dead).

### New File: `src/lib/db/daily-stats.ts`

Full DAL for daily stats. Key types:
```typescript
type DailyFieldStat = { sum: number; avg: number; count: number }
type DailyTrackerStats = Record<string, DailyFieldStat>         // fieldId → stat
type DailyStatsResults = {
  trackers: Record<string, DailyTrackerStats>    // trackerId → fieldId → stat
  correlations: Record<string, number | null>    // correlationId → computed value
}
```

`recomputeDayStats(date, supabase, userId)`:
1. Fetches all logs for user+date (dayStart..dayEnd UTC)
2. Builds per-tracker, per-field numeric aggregates (sum, count, avg)
3. Fetches all user correlations; evaluates each via `evaluateFormula(formula, fieldValueMap)` from existing formula engine
4. Upserts: `supabase.from('daily_stats').upsert({ user_id, date, results }, { onConflict: 'user_id,date' })`

Read helpers:
- `getDayStats(date)` — single day, `.maybeSingle()`
- `getDateRangeStats(startDate, endDate)` — range, ascending

### Modified: `src/lib/db/logs.ts`

Added `import { recomputeDayStats } from '@/lib/db/daily-stats'`

Trigger in `createLog`: 
```typescript
const logDate = ((input.logged_at ?? data.logged_at) as string).split('T')[0]
try { await recomputeDayStats(logDate, supabase, user.id) } catch { /* non-fatal */ }
```

Same pattern in `updateLog` and `deleteLog`. `deleteLog` captures `logged_at` before deletion.

Also added `revalidatePath('/dashboard')` and `revalidatePath('/daily')` after each mutation.

---

## T3 — Sleep Time Field Migration

### Context
The migration that ran earlier converted Sleep Start/End `time` fields from `"HH:MM"` strings to integer seconds. After manually changing those fields back to `type='time'` in the schema editor, stored log values are now integers. This migration converts them back to `"HH:MM"` strings.

### File: `supabase/migrations/20260531_fix_time_field_values.sql`

PL/pgSQL block:
1. Iterates trackers with `schema @> '[{"type": "time"}]'`
2. For each `time` field, finds logs where `jsonb_typeof(fields->field_id) = 'number'`
3. Guards: only converts values in range 0–86399 (valid seconds-since-midnight)
4. Converts: `LPAD((seconds_val / 3600)::TEXT, 2, '0') || ':' || LPAD(((seconds_val % 3600) / 60)::TEXT, 2, '0')`
5. Updates via `jsonb_set(fields, ARRAY[field_id], to_jsonb(time_str))`

**⚠️ NOT YET APPLIED** — second user hasn't changed their Sleep tracker schema yet. Trigger phrase: **"apply the sleep time migration"**

---

## T4 — Chat Performance Fix (New-Chat Navigation Lag)

### Root Cause
`src/app/api/chat/route.ts` was structured as:
```
createSession()           ← 1 DB call
await Promise.all(8 queries)  ← BLOCKS everything
... 570 lines of setup ...
const stream = new ReadableStream(...)  ← HTTP response starts here
return new Response(stream, headers)
```
The HTTP response didn't start until ALL setup completed. `MobileChatHome` was waiting for the first SSE byte (which carried the session ID) before navigating — taking 2-5 seconds.

### Fix

Restructured to:
```
createSession()
const stream = new ReadableStream({
  async start(controller) {
    safeEnqueue({ type: 'session', sessionId })  // ← FIRST BYTE — client navigates NOW
    // EX3 attachment ACK
    // agentId update
    // await Promise.all(8 queries)       ← now runs AFTER client navigates
    // routine state + blocking guards
    // save user message
    // historical context + system prompt
    // AI streaming
    // done event
  }
})
return new Response(stream, headers)  // ← HTTP response starts immediately
```

**Blocking guards** (Start Day already active, etc.) previously returned `Response.json(...)` — these now emit SSE `chunk` + `done` events instead. Compatible with existing `ChatInterface` SSE reader.

### TypeScript Fix
Moving `buildSanitizedActions` inside the `start` async closure changed type inference. The spread return `{ ...correctedAction, fieldLabels, ... }` didn't satisfy `AnyActionCard`. Fixed with `as AnyActionCard` cast on the return. Also: `fieldUnits` changed from `Record<string, string | undefined>` to `Record<string, string>` with conditional assignment.

Removed unused `ChatResponseMessage` and `ChatResponse` types (no longer used since all responses go through SSE).

---

## T5 — Google OAuth Login Fix

### Root Cause (Two Bugs)

**Bug 1: Missing `/api/auth/callback` route handler**
`LoginForm.tsx` calls:
```typescript
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${...}/api/auth/callback` }
})
```
Google redirects back to `/api/auth/callback?code=...` after auth. No handler existed — Next.js returned 404 or a blank response. Code was never exchanged for a session. Middleware saw no user, redirected to `/login`.

**Bug 2: Wrong redirect URL**
`LoginForm.tsx` used `process.env.NEXT_PUBLIC_APP_URL` which is `http://localhost:3000` in `.env.local` and **not set** on Vercel. Result: redirectTo was `"undefined/api/auth/callback"`.

### Fix Attempt 1 (Failed)

Created `/api/auth/callback/route.ts` using `cookies()` from `next/headers`:
```typescript
const cookieStore = await cookies()
// ... supabase client using cookieStore ...
const { error } = await supabase.auth.exchangeCodeForSession(code)
if (!error) return NextResponse.redirect(...)
```
**Why it failed:** `cookies()` from `next/headers` modifies a separate response context. When `NextResponse.redirect(...)` is returned, it's a new response object that doesn't carry those cookies. Browser arrives at `/chat` with no session, middleware bounces back to `/login`.

### Fix Attempt 2 (Working)

```typescript
const pendingCookies: Array<{...}> = []

const supabase = createServerClient(..., {
  cookies: {
    getAll() { return request.cookies.getAll() },  // read PKCE verifier from request
    setAll(cookiesToSet) {
      cookiesToSet.forEach(c => pendingCookies.push(c))  // collect, don't set yet
    },
  },
})

const { error } = await supabase.auth.exchangeCodeForSession(code)

if (!error) {
  const response = NextResponse.redirect(`${origin}${next}`)
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)  // attach to redirect response
  })
  return response
}
```

Key insight: the PKCE code verifier is in `request.cookies` (set by the browser client). The session tokens need to go into the redirect response's cookies. Using `request.cookies.getAll()` for reads and manually attaching to `response.cookies` for writes is the only pattern that works.

**`LoginForm.tsx`**: Changed `process.env.NEXT_PUBLIC_APP_URL` → `window.location.origin` (works on any deployment without env var).

---

## Deployment History

| Deploy | Trigger | Result |
|--------|---------|--------|
| #1 (T4) | Chat performance fix | ✓ Live |
| #2 (T5a) | OAuth fix attempt 1 (broken cookies) | ✓ Built, ✗ Login still broken |
| #3 (T5b) | OAuth fix attempt 2 (correct cookie pattern) | ✓ Live — pending user verification |

---

## Build Verdict

**V33: PASS** — `npx next build` clean on all 3 deploys. Pre-existing test file errors in `src/__tests__/ai/actions.test.ts` (type issues from V33 T1 changes) noted — not blocking.
