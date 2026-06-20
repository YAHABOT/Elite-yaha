# V27: Auto-End-Day When Physical Date Advances

## Verdict: PASS

### Summary
Implemented automatic session closure when the physical date advances beyond the active session's locked date. This prevents the system from locking indefinitely to a stale date and resolves three related bugs:
- Journal showing wrong "TODAY" (locked to old date)
- "Today" and "yesterday" both resolving to same date
- System locks indefinitely without manual End Day

### Implementation Details

#### File: `src/app/api/chat/route.ts`

**Change location:** Lines 173-182 (after fetching `activeDayState`)

**Logic:**
```typescript
// Auto-end-day when physical date advances past active session date
// This prevents the system from locking indefinitely to an old date
let finalActiveDayState = activeDayState
if (activeDayState && activeDayState.date < today) {
  console.log(`[ChatRoute] Auto-closing stale day session: locked=${activeDayState.date}, physical=${today}`)
  markDayEnded(activeDayState.date).catch(e => console.error('[DayState] auto-close markDayEnded failed:', e))
  finalActiveDayState = null
}
```

**Affected references:**
- Line 182: `const loggingDate = finalActiveDayState?.date ?? today` (was `activeDayState?.date`)
- Line 295: Guard check uses `finalActiveDayState !== null` (was `activeDayState`)
- Line 213: Guard check uses `finalActiveDayState !== null` (was `activeDayState`)

### How It Works

1. **On every chat message**, the route fetches the current active day state (if any)
2. **Date comparison**: If `activeDayState.date < today`, the session is stale
3. **Auto-close**: Call `markDayEnded(activeDayState.date)` to close the old session
4. **State reset**: Set `finalActiveDayState = null` to enter neutral mode
5. **Next message**: System prompts user for date confirmation (normal neutral behavior)

### Test Scenario

**Setup:**
- Physical date = March 31
- Session locked to March 30

**Action:** Send a chat message

**Expected outcome:**
1. Auto-close message in logs: `[ChatRoute] Auto-closing stale day session: locked=2026-03-30, physical=2026-03-31`
2. `markDayEnded('2026-03-30')` executes
3. System enters neutral state
4. Next message from user is processed with `daySessionActive=false`
5. System asks for date confirmation (normal neutral behavior)

### Validation

- [x] `npm run lint` — exits 0 (only pre-existing warnings)
- [x] `npm run build` — completes successfully
- [x] No TypeScript errors
- [x] All guard checks updated to use `finalActiveDayState`

### Files Changed

1. `src/app/api/chat/route.ts` — Added auto-close logic + updated references

### Edge Cases Handled

- **Date string comparison**: Uses ISO-8601 format `YYYY-MM-DD` which sorts correctly lexicographically
- **Concurrent sessions**: Not possible — `markDayEnded` explicitly closes any previously open sessions on new Start Day
- **Logging date resolution**: Falls back to `today` (physical date) once session is closed, correct for neutral state
- **Day state guard**: Both Start Day paths (explicit routineId and detected) now use `finalActiveDayState`

### Related Functions

- `getActiveDayState()` — Fetches currently open session (started but not ended)
- `markDayEnded()` — Closes a session by its locked date
- `buildHealthSystemPrompt()` — Uses `daySessionActive` flag to determine if AI logs to locked date or asks for confirmation

### Logging Output

The auto-close operation logs:
```
[ChatRoute] Auto-closing stale day session: locked={old_date}, physical={current_date}
```

This appears in stdout/stderr and helps with debugging date resolution issues.
