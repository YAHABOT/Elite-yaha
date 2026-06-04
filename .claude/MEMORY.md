# MEMORY.md — Agent Config Index
**Loaded:** 2026-05-27 (session start) | **Status:** Cached ✓

All agents reference these configs — NO re-reads during session.

---

## Coding Agent Config
**Model:** claude-sonnet-4-6 (primary), haiku (for TECHNICAL_LOG output)
**Key Requirements:**
- Read scoped rules from folder-level `claude.md` before writing
- TypeScript strict, explicit return types, no `any`
- Error handling on all external calls (Supabase, Gemini, Telegram)
- Auth verified in DAL (`getUser()` before any query)
- `revalidatePath()` after Server Action mutations
- No hardcoded secrets — all `process.env.*`
- Never return file contents — paths only
- Tracker terminology only (not "container")

**Output Format:** Verdict (PASS|BLOCKED) + max 5 findings + Files Changed (paths only)

---

## Code Reviewer Config
**Model:** claude-sonnet-4-6
**Review Checklist:**
- All external calls have try/catch
- Error messages are meaningful
- Auth verified in DAL (getUser before query)
- revalidatePath() called after mutations
- No dead code
- TS strict, no `any`, explicit types
- No N+1 queries
- No blocking I/O in render
- Gemini calls debounced (not every keystroke)
- Functions < 40 lines
- OLED theme compliance (no white/gray-*, use design tokens)

**Severity Levels:** [high] = FAIL, [medium] = FAIL if > 1, [low] = PASS WITH NOTES, [info] = PASS

**Output Format:** Verdict (PASS|PASS WITH NOTES|FAIL) + max 5 findings + Files Reviewed

---

## QA Agent Config
**Model:** claude-sonnet-4-6
**Test Stack:** Vitest + React Testing Library
**Coverage Required:** Happy path + Auth failure + Invalid input + Edge case (per feature)
**Test Patterns:** DAL unit tests (mock Supabase), Route Handler tests, Component tests, Server Action tests

**Execution:** Read files → check existing tests → write new tests → `npm test` → report results

**Output Format:** Verdict (PASS|FAIL) + Test Results + Test Cases (pass/fail) + Coverage Gaps + Files Tested

---

## Research Agent Config
**Model:** claude-sonnet-4-6
**When Called:** New API integration, new npm package, unclear constraints, security surface assessment
**Methodology:**
1. Check official docs first
2. Verify current versions
3. Assess security surface (auth, rate limits, CVEs)
4. Check package health (last release, downloads, issues)
5. Note licensing

**Output Format:** Research Report + Answer + Key Findings + Implementation Notes + Recommended Approach + Sources

---

## Security Reviewer Config
**Model:** claude-opus-4-6 (CRITICAL: must upgrade to opus)
**Audit Checklist:**
- getUser() in every DAL function
- User ID from Supabase, never request body
- RLS enabled on every table
- Telegram secret token validated EVERY request
- Sender username vs TELEGRAM_ALLOWED_HANDLES
- AI output validated before DB write
- No hardcoded secrets
- Server-side requests never use user-controlled URLs
- OWASP Top 10 compliance

**Severity:** [critical] = FAIL (no exceptions), [warning] = FAIL if > 1

**Output Format:** Verdict (PASS|FAIL) + max 5 findings + Files Audited
