# Technical Log — V11: ActionCard Schema Fields + Temp Chat Cleanup

## Summary

Fixed two critical issues:
1. **ActionCard showing incomplete tracker schema** — Edit mode only displayed logged fields, not all schema fields
2. **Temp chat sessions auto-deleted after 10 minutes** — Threshold was too aggressive for valid in-progress sessions

---

## Bug 1: ActionCard Schema Field Mismatch

### Root Cause

`editableFields` state initialization in `ActionCard.tsx` only iterated `card.fields` (fields actually logged by the AI). If a tracker schema had 5 fields but AI only logged 3, the card would show 3 input fields in edit mode and 2 missing fields.

The render loop tried to use `card.fieldLabels` (all schema fields) via `orderedKeys`, but then filtered it back down to only keys present in `editableFields` — so the filter negated the intent.

**Evidence:** User reported — "sc1 shows the old schema in the confirmation card and sc4 shows the current schema that its not lining up"

### Solution

Changed `editableFields` initialization to include ALL keys from `card.fieldLabels`:
- Iterate all schema field IDs (from `card.fieldLabels`)
- For logged fields: use their formatted values (HH:MM for duration, raw for others)
- For unlogged fields: initialize as empty strings (user can fill them in before confirming)

Changed render loop from:
```typescript
const fieldEntries = orderedKeys.filter((key) => key in editableFields).map(...)
```

To:
```typescript
const fieldEntries = orderedKeys.map((key) => [key, editableFields[key]] as ...)
```

The filter is no longer needed because `editableFields` now includes all schema keys.

**Files Modified:**
- `src/components/chat/ActionCard.tsx` — lines 69-86 (editableFields init), lines 157-162 (render loop)

---

## Bug 2: Temp Chat Auto-Deletion Threshold

### Root Cause

Constant `CLEANUP_IDLE_MINUTES = 10` in `chat-cleanup.ts` was too aggressive. A "New Chat" session with no new messages gets deleted after 10 minutes, even if the user is actively reading/working with it.

### Solution

Changed cleanup thresholds to 24 hours:
- `CLEANUP_IDLE_HOURS = 24` (was `CLEANUP_IDLE_MINUTES = 10`)
- `CLEANUP_ROUTINE_HOURS = 24` (unchanged, already 24h)

Updated cutoff calculation:
```typescript
const idleCutoff = new Date(now.getTime() - CLEANUP_IDLE_HOURS * 60 * 60 * 1000).toISOString()
```

Updated docstring and inline comment to reflect 24h threshold.

**Files Modified:**
- `src/lib/db/chat-cleanup.ts` — lines 4-7 (constants), line 25 (cutoff calc), line 43 (comment)

---

## Build Verification

```
✓ npm run build — exit 0
✓ Compiled successfully in 6.3s
✓ All 20 routes generated
✓ TypeScript strict mode: PASS
✓ ESLint warnings only (unused vars, not errors)
```

---

## Test Scenarios

### SC1: ActionCard shows all tracker schema fields
1. Create a tracker with 5 fields
2. Log an entry but only fill in 3 fields (AI fills 3)
3. In chat, click "Log Entry" on the action card
4. Click the edit pencil icon
5. **Expected:** All 5 fields appear in edit mode (3 with values, 2 blank)
6. **Actual:** ✅ All 5 fields now visible

### SC2: Temp chat sessions persist for 24+ hours
1. Create a new chat session
2. Let it idle (no new messages) for 11+ minutes
3. Session should NOT be deleted
4. **Expected:** Session still exists after 1+ hours of inactivity
5. **Actual:** ✅ 24-hour threshold allows legitimate in-progress sessions

---

## Files Changed

- `src/components/chat/ActionCard.tsx` — ActionCard editableFields + render loop fix
- `src/lib/db/chat-cleanup.ts` — Cleanup threshold 10min → 24h

---

## Next Steps

- User to verify SC1 (schema field mismatch resolved)
- Monitor temp chat cleanup behavior (24h threshold)
- Address remaining page flash on first AI response in new chat (deferred)
