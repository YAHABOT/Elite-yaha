# Technical Log — Build 2: Logic Fixes + LLM Intelligence
**Date:** 2026-04-26
**Branch:** claude/trusting-satoshi-b6a06e

---

## Verdict
[CA | 21:25] PASS — All Build 2 items resolved. 437 tests passing. 5 pre-existing failures in start-day-guard.test.ts (unchanged from Build 1).

---

## Summary

Build 2 targeted 9 items across LLM prompt quality, timestamp accuracy, and UI field rendering. 7 were already implemented in Build 1 / prior session. 2 required new code changes in this build.

---

## New Code Changes (This Build)

### src/app/actions/chat.ts — Line 42
**7:00 PM Timestamp Regression Fix**

Before:
```typescript
: new Date(logDateStr + 'T12:00:00Z').toISOString() // backdated: use noon UTC to avoid day-boundary issues
```
After:
```typescript
: `${logDateStr}T${now.toISOString().split('T')[1]}` // backdated: use current wall-clock time on target date
```

Root cause: `T12:00:00Z` = noon UTC = 7:00 PM in UTC-7 timezones. Prior attempt (previous agent) correctly identified the code path but claimed there was "no hardcoded 7:00 PM" — this was wrong. Noon UTC is the source. Fix: use the current UTC time component on the backdated calendar date, matching exact wall-clock behavior for same-day entries.

### src/components/chat/ActionCard.tsx — Lines 211, 389
**Text Field Width Fix**

Added `isStringValue` detection to both `ActionCard` and `UpdateDataCardComponent`:
```typescript
const isStringValue = typeof value === 'string' && value !== '' && isNaN(Number(value)) && !String(value).match(/^\d{2}:\d{2}$/)
const isLarge = isTextField || isStringValue || String(value || '').length > 15 || (fieldLabel.length ?? 0) > 16
```

Before: Only fields with keyword labels (`name`, `item`, `notes`, `description`) or long values got `col-span-full`. String values like "Great" (from SELECT fields) rendered in a narrow 150px cell.

After: Any non-numeric, non-time string value automatically expands to full width via `col-span-full`.

---

## Pre-Existing (Confirmed During Discovery)

| Item | File | Status |
|------|------|--------|
| Historical context regex expansion | src/app/api/chat/route.ts:308-325 | ✅ Done (prior session) |
| YES/NO field prompt refinement | src/lib/ai/prompt-builder.ts:365-375 | ✅ Done (prior session) |
| Field ID de-obfuscation | src/lib/ai/prompt-builder.ts:57-79 | ✅ Done (prior session) |
| Native macro totaling | src/app/api/chat/route.ts:410-444 | ✅ Done (prior session) |
| LLM persona separation | src/lib/ai/prompt-builder.ts:260, 381 | ✅ Done (prior session) — separate prompts for chat vs routine |
| Anti-hallucination rules audit | src/lib/ai/prompt-builder.ts:146-161 | ✅ 9-rule audit complete |
| Routing default fix | src/app/page.tsx | ✅ redirect('/chat') |

---

## Tests
- **437 passing** (all prior suites unchanged)
- **5 pre-existing failures** in start-day-guard.test.ts — message string mismatch, unrelated to this build
- `npm run lint` — warnings only (unused vars in test files), no errors

---

## Bugs Fixed
- 7:00 PM timestamp regression: backdated entries no longer show 7pm in UTC-7 timezones
- Text field width: SELECT field values and other non-numeric strings now span full card width

---

## Code Review — Round 1

**[CR | 14:42] FAIL** — 2 blocking issues:

### Issue 1 [HIGH] — `updateLogAction` UPDATE missing user_id filter
`src/app/actions/chat.ts:178` — The `.update()` call only filtered by `.eq('id', card.logId)`. Ownership was verified via read-before-write (tracker check + log check), but the mutation itself had no user_id guard. Defense-in-depth requires the DAL mutation to carry its own ownership constraint independent of the preceding checks.

### Issue 2 [MEDIUM] — UPDATE_DATA fields bypass sanitizeFields
`src/lib/ai/actions.ts:76` — `validateUpdateDataCard` accepted fields as `Record<string, unknown>` without per-value validation. `sanitizeFields` was only called on `LOG_DATA` cards in `route.ts`. AI-supplied field values for UPDATE_DATA (e.g. objects, injection payloads) wrote directly to `tracker_logs.fields` JSONB.

### Fixes Applied (CA | 21:32)

**src/app/actions/chat.ts:**
- Added `import { sanitizeFields } from '@/lib/ai/actions'`
- Added `import type { SchemaField } from '@/types/tracker'`
- Changed tracker select from `'id'` to `'id, schema'`
- Added `sanitizeFields(card.fields, trackerSchema)` call before field merge
- Added `.eq('user_id', user.id)` to UPDATE query

**Post-fix:** 437 tests passing | lint clean | no regressions

## Code Review — Round 2

**[CR | 14:52] PASS** — both fixes verified:
- `.eq('user_id', user.id)` confirmed on UPDATE query
- `sanitizeFields` confirmed called on `card.fields` before merge, `tracker.schema` null-guarded with `?? []`
- All read layers (tracker SELECT + log SELECT) also have `user_id` filters — full ownership chain intact
- No regressions, no new issues
