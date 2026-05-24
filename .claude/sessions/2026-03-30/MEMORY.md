# MEMORY — 2026-03-30 Session

## Agent Config Index
**Loaded:** 2026-03-30 07:00 (session start)
**Status:** Cached — all agents reference these, no re-reads

### Coding Agent Config
- **Model:** `claude-sonnet-4-6`
- **Focus:** Next.js 15 App Router implementation, TypeScript strict
- **Pattern:** Read rules + skills before coding, validate with `npm run lint && npm run build`
- **Output:** PASS verdict with files changed (paths only, no content)
- **Key rule:** No file contents returned to orchestrator — paths only

### Code Reviewer Config
- **Model:** `claude-sonnet-4-6`
- **Approach:** 0-context code review (no task description, just code)
- **Checklist:** Correctness (auth, error handling, TS strict), Performance, Code Quality, OLED theme
- **Verdict:** PASS | PASS WITH NOTES | FAIL
- **Key rule:** Be direct. Reference exact lines. Never rewrite code.

### QA Agent Config
- **Model:** `claude-sonnet-4-6`
- **Focus:** Vitest + React Testing Library, happy path + error cases + edge cases
- **Coverage:** Auth failure, invalid input, zero/empty values, boundaries
- **Verdict:** PASS | FAIL (no partial PASS)
- **Key rule:** Never declare PASS with failing test

### Research Agent Config
- **Model:** `claude-sonnet-4-6`
- **Focus:** Official docs first, verify current versions, assess security surface
- **Output:** Structured research report only (no code)
- **Key rule:** No code. Current information only. Flag risks clearly.

### Security Reviewer Config
- **Model:** `claude-opus-4-6` ⚠️ **REQUIRES OPUS** (not Sonnet)
- **Focus:** OWASP Top 10, auth flows, secrets, Telegram webhook validation
- **Checklist:** Auth & authz, RLS, Telegram webhook, AI sanitization, secrets, input validation
- **Verdict:** PASS | FAIL
- **Key rule:** One [critical] = FAIL. Never suggest workarounds.

---

## V25 Test Results Summary
- **4 PASS:** TC-01, TC-10, TC-11, TC-12
- **1 CRITICAL FAIL:** TC-09 (chat/journal header scroll — intermittent)
- **4 DEFERRED:** TC-02, TC-03, TC-07, TC-08 (require End Day flow)
- **2 LOGIC ERRORS:** TC-04, TC-05 (relative date interpretation backwards)
- **1 PROCESS ERROR:** TC-06 (End Day enforcement missing)
- **1 CRITICAL BUG:** Routine refresh state corruption

### Critical Issues Found
1. **Relative date logic backwards** — "yesterday" on March 31 should log to March 30 (actual yesterday), not session date
2. **End Day not enforced** — system must prevent Start Day while active session exists, even if End Day routine not running
3. **Chat/Journal header scroll** — intermittent issue (sometimes sticky, sometimes scrolls)
4. **Routine refresh corruption** — page refresh during routine re-triggers trigger phrase, confuses AI

### User Requests (V26)
- Add page refresh confirmation modal (prevent accidental refresh during scroll)
- Add "Confirm on page refresh" toggle to settings
- Fix scroll regression (investigate V23-V25 CSS changes)
- Fix routine state persistence across page reloads

---

## Session Notes
- User tested manually: "log sleep for yesterday" (correct), "log sleep for 4 days ago" (correct)
- These worked in neutral state, suggesting logic error only manifests in active session state
- Scroll issue is intermittent — may be race condition, not consistent regression
