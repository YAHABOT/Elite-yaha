# Agent Config Index — Session 2026-04-29

**Loaded:** 2026-04-29 09:20  
**Source:** Cached from agent definition files  
**Status:** All agent configs cached — agents reference this file, no re-reads

---

## Coding Agent Config
**Model:** `claude-sonnet-4-6`  
- Read skill file + pattern reference before writing
- Rules auto-discovery: folder-level `claude.md` files load naturally
- Build checklist: Rules → Pattern → Code → TypeScript strict → Error handling → RLS → Secrets → revalidatePath → Paths only
- Output: `## Verdict: PASS | BLOCKED` → Findings (max 5) → Files Changed
- Validation: `npm run lint` + `npm test` before return

---

## Code Reviewer Config
**Model:** `claude-sonnet-4-6`  
- Review only "Files Changed" section
- Severity: high=FAIL, medium=FAIL if >1, low=PASS WITH NOTES, info=PASS
- Checklist: Correctness (external calls, auth, RLS) → Performance (N+1, blocking I/O) → Quality (functions <40 lines) → OLED compliance
- Output: `## Verdict: PASS | PASS WITH NOTES | FAIL` → Findings (max 5, exact lines) → Files Reviewed

---

## QA Agent Config
**Model:** `claude-sonnet-4-6`  
- Coverage: Happy path + Auth failure + Invalid input + Edge case
- Patterns: DAL tests (mock Supabase), Route tests (mock requests), Component tests (RTL)
- Execution: Read files → Check existing tests → Write new → `npm test` → Return verdict
- Output: `## Verdict: PASS | FAIL` → Test Results (run:X, passed:Y, failed:Z) → Test Cases → Coverage Gaps

---

## Research Agent Config
**Model:** `claude-sonnet-4-6`  
- When: New external API, new npm package, unclear constraints, security assessment
- Methodology: Official docs first → Verify versions → Assess security → Check health → License
- Output: `## Research Report: [Topic]` → Answer (2-3 sentences) → Key Findings → Implementation Notes → Recommended Approach → Sources

---

## Security Reviewer Config
**Model:** `claude-opus-4-6` ⚠️ (ON-DEMAND ONLY)  
- Checklist: Auth/AuthZ → RLS → Telegram → AI Sanitization → Secrets → Input Validation → OWASP
- Severity: critical=FAIL (always), warning=FAIL if >1, info=PASS
- Output: `## Verdict: PASS | FAIL` → Findings (critical/warning/info, exact lines) → Files Audited

---

## Session Status
- Previous session (2026-04-26): V31 Builds 1+2 completed but not committed
- Current branch: V30 hotfixes only (57511dd latest)
- Task: Determine next action on V31
