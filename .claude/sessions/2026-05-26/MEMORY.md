# MEMORY.md — Agent Config Index (Session 2026-05-26)

**Loaded:** 2026-05-26 @ session start
**Status:** Cached — all agents reference these, NO RE-READS

---

## Coding Agent Config (Fast-tracked)

**Model:** `claude-sonnet-4-6` (speed + Next.js expertise)

**Critical Rules:**
- Before ANY code: Read skill file + scoped rules in `src/[folder]/claude.md`
- TypeScript strict: no `any`, explicit return types
- Data access: `src/lib/db/[domain].ts` — auth in DAL with `getUser()`
- Server Actions: `src/app/actions/[domain].ts` — return `{error}|{success}`
- Route Handlers: `src/app/api/[endpoint]/route.ts` — webhooks + external APIs
- Tracker terminology: Always **tracker**, never "container"
- Build artifact checklist: UI visible? Migration applied? Routes resolve? Env vars set?

**Output Format:**
```
## Verdict: PASS | BLOCKED

## Findings (max 5 bullets)
- [info] src/path/file.ts:line — what was done

## Files Changed (paths only)
- src/path/file.ts (created/modified)
```

**Validation BEFORE returning:**
```bash
npm run lint    # zero errors
npm run build   # must compile
```

---

## Code Reviewer Config (Sonnet quality, fast validation)

**Model:** `claude-sonnet-4-6` (pattern matching + logic verification)

**Review Scope:** Only files in "Files Changed" section — do not read entire codebase

**Checklist (blocks on FAIL):**
- ✅ External calls have try/catch (Supabase, Gemini, Telegram)
- ✅ Auth verified in DAL (`getUser()` before any query)
- ✅ `revalidatePath()` after Server Action mutations
- ✅ No dead code, TypeScript strict, tracker terminology
- ✅ No N+1 queries, no blocking I/O in render path
- ✅ Functions < 40 lines, no magic strings
- ✅ OLED theme only (`bg-surface`, `border-border`, no `bg-white`)

**Severity:**
- `[high]` = functional bug, auth bypass, data loss → Always FAIL
- `[medium]` = performance, missing error handling → FAIL if > 1
- `[low]` = style, naming → PASS WITH NOTES
- `[info]` = observation → PASS

**Output Format:**
```
## Verdict: PASS | PASS WITH NOTES | FAIL

## Findings (max 5 bullets)
- [high/medium/low] src/file:line — description

## Files Reviewed
- src/path/file.ts
```

---

## QA Agent Config (Test-driven validation)

**Model:** `claude-sonnet-4-6` (reliable test generation)

**Test Stack:** Vitest + React Testing Library

**Coverage Required (per feature):**
1. Happy path — valid input → expected output + DB state
2. Auth failure — unauthenticated → 401/error
3. Invalid input — malformed data → clear error (not 500)
4. Edge case — empty list, zero value, missing optional field

**Test File Structure:**
```
src/__tests__/
├── lib/db/[domain].test.ts    # DAL unit tests
├── api/[endpoint].test.ts     # Route Handler tests
├── components/[Name].test.tsx # Component render tests
└── actions/[domain].test.ts   # Server Action tests
```

**Output Format:**
```
## Verdict: PASS | FAIL

## Test Results
- ✅ 25/25 tests passed
- Coverage: Happy path, auth, invalid input, edge cases

## Failed Tests (if any)
- [FAIL] src/__tests__/lib/db/trackers.test.ts:line — error message

## New Tests Added
- src/__tests__/api/chat.test.ts (25 tests)
```

---

## Session Enforcement Rules (MANDATORY — Prevents Context Loss)

**GATE Sequence (non-negotiable):**
1. **GATE 1: Task Spec** — Clear task definition before agent dispatch
2. **GATE 2: Build → CR → QA** — Sequence locked, no skips
3. **GATE 3: Explicit Context** — Sub-agent prompts state WHY (phase blocker, etc.)
4. **GATE 4: Commit Before QA** — Code must be committed BEFORE QA runs
5. **GATE 5: Carry-Over Tasks** — Incomplete work documented with status before session end
6. **GATE 6: Applied Learning** — Recurring bugs fixed in CLAUDE.md (date: YYYY-MM-DD)

**Session Closure Checklist:**
- [ ] All Carry-Over Tasks documented with status (EXECUTING/DEFERRED/COMPLETE)
- [ ] All agent signatures include timestamp ([CA | HH:MM], [CR | HH:MM], [QA | HH:MM])
- [ ] technical_log_v[N].md created by Coding Agent (audit trail)
- [ ] Code Review verdict documented (PASS/PASS WITH NOTES/FAIL)
- [ ] QA results documented (PASS/FAIL with test count)
- [ ] Session end status explicit: "BUILD COMPLETE" or "UNRESOLVED: [task]"

**Why This Prevents Context Loss:**
- Sessions don't end mid-work → no orphaned state
- Carry-Over Tasks explicitly documented → next session knows what's pending
- Timestamps + agent signatures → audit trail prevents "who did what"
- technical_log_v[N].md ownership → Coding Agent accountable for creating it
- CR + QA sequence locked → work is verified before deployment

---

## Token Efficiency Pattern (Active)

**Thinking Phase:** Use assigned model (Sonnet/Opus) for analysis
**Writing Phase:** Switch to Haiku when writing TECHNICAL_LOG/SESSION_LOG findings (output tokens cost 5x)
**Analysis Phase:** Switch back to Sonnet if more analysis needed

Example workflow:
1. Coding Agent: Sonnet → implements feature
2. Coding Agent: switch to Haiku → writes technical_log_v[N].md
3. Code Reviewer: Sonnet → analyzes changes
4. Code Reviewer: switch to Haiku → writes findings

---

## Critical Discovery: Why Sessions Lost Context (2026-05-24 → 2026-05-25)

**Failure Point:** Sessions ended without explicit closure

**Cascade:**
1. 2026-05-24: Code deployed BEFORE QA (GATE 2 violated)
2. 2026-05-25: Started without Carry-Over Tasks section (GATE 5 violated)
3. 2026-05-25: Build ended mid-progress, no closure documented
4. 2026-05-26: Session had to re-establish what was pending = "forgetting" problem

**Fix Applied:** This SESSION_LOG.md includes mandatory Carry-Over Tasks section. Next session will NOT have to rediscover state.

---

## How This Session Operates

1. ✅ SESSION_LOG.md created with Carry-Over Tasks documented
2. ✅ MEMORY.md cached (this file) — agents reference it, no re-reads
3. 🔄 Carry-Over Tasks must be RESOLVED before new work dispatches
4. 🔄 Build status check (npm run build) in progress
5. Then: Code Review (CT-2) → QA Testing (CT-4) → User Requests
6. Before session end: Update SESSION_LOG with completion status

---

**Session Start Time:** 2026-05-26 08:30 UTC
**Carry-Over Priority:** CT-1 (Build Status), CT-2 (React Error Verification), CT-3 (Gemini Streaming Test)
