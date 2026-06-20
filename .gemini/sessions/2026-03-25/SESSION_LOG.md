# Session Log — 2026-03-25

## Build History

| Time | Build | Result | Notes |
|------|-------|--------|-------|
| 14:35 | `npm run build` | EXIT 0 — 25 routes | V8 fixes verified |

## Test Results

(To be filled in as tests run)

## Work Log

### V8 Execution
- **SC1 (Duration Format)**: ActionCard `editableFields` init — HRS fields now format decimal hours as HH:MM
- **SC2 (Disappearing Fields)**: LogEntryCard `startEdit()` — number/rating fields use raw value, not `formatFieldValue`
- **SC3 (Confirmed Persistence)**: ChatInterface — use `data.message.id` (real DB UUID) instead of fake `mod-${Date.now()}`
- **Build result**: EXIT 0, zero errors
- **TECHNICAL_LOG_V8.md**: Created in project root

## V9–V12 Continuation Builds (2026-03-26)

### Build History

| # | Version | Build Result | Notes |
|---|---------|-------------|-------|
| 2 | V9 (final) | ✅ PASS (exit 0, 20 routes) | SC3 index match, loading.tsx skeleton |
| 3 | V10 | ✅ PASS (exit 0) | SC3 confirmed persistence FIXED, schema field order FIXED, duplicate guard rewritten, revalidatePath fix |
| 4 | V11 | ✅ PASS (exit 0) | Duplicate guard re-fixed, revalidatePath(/trackers) added, chat TTL cleanup rewritten, duration string parser gated to time fields |
| 5 | V12 | ✅ PASS (exit 0) | Cleanup sync before fetch, deleted IDs filtered from sidebar, stale sessions no longer show |

### Test Results (V10–V12)

| Issue | Result | Notes |
|-------|--------|-------|
| SC3 — Confirmed persistence | ✅ PASS | Card stays green after refresh |
| Schema field order mismatch | ✅ PASS | ActionCard reflects rearranged schema |
| Duplicate log on re-confirm | ✅ PASS | Duplicate guard uses cardIndex check |
| Logs missing in tracker view | ✅ PASS | Added revalidatePath('/trackers') |
| Second food entry blocked | ✅ PASS | Multiple entries per tracker per day work |
| Text fields corrupted | ✅ PASS | Duration parser gated to time fields only |
| Stale sessions in sidebar | ✅ PASS | Cleanup runs sync before fetch |

### Work Log (V9–V12)

**V9 Fixes:**
- SC3 persistence: Index-based matching via `cardIndex` prop
- Navigation latency: Created `loading.tsx` skeleton
- Files: ActionCard, ChatInterface, chat.ts, loading.tsx

**V10 Fixes:**
- Schema field mismatch: `editableFields` iterates fieldLabels for full schema
- Duplicate guard rewritten: checks `messageId + cardIndex` confirmed status only
- Added `revalidatePath('/trackers', 'layout')`
- Files: chat.ts, chat-cleanup.ts, ActionCard.tsx

**V11 Fixes:**
- Duplicate log prevention: message-specific confirmation check
- Logs missing fix: revalidatePath added to tracker view
- Chat TTL completely rewritten: TTL-based deletion for untitled sessions
- Text field corruption fixed: duration parser gated to time fields only
- Files: chat.ts, chat-cleanup.ts, actions.ts

**V12 Fixes:**
- Stale sessions: cleanup returns deleted IDs, filtered from sidebar before render
- Files: chat-cleanup.ts, chat.ts

See `TECHNICAL_LOG_V9.md` for full details.

## Next Steps

Ready for 2026-03-26 bug intake. User testing has identified new issues not related to previous fixes.
