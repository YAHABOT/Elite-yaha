# Agent Config Index — Cached 2026-05-24 08:45
**Status:** All 5 agent configs loaded. All subsequent agent dispatches reference this file (no re-reads).

---

## Coding Agent Config
**Model:** `claude-sonnet-4-6` (code) → switch to `claude-haiku-4-5` when writing TECHNICAL_LOG (output token savings)  
**Before Code:** Read task-referenced skill file + pattern reference file + folder-level `src/*/claude.md` rules  
**Implementation:** Next.js 15 + TypeScript strict + Supabase auth in DAL + no hardcoded secrets  
**Validation:** `npm run lint` + `npm test` before return  
**Output Format:** Verdict (PASS/BLOCKED) | max 5 findings (concise) | Files Changed (paths only, no content)  
**Toolkit:** Server Actions in `src/app/actions/`, Route Handlers in `src/app/api/`, DAL in `src/lib/db/`, components default Server unless `'use client'` justified  
**Key Rule:** Tracker terminology only (never "container"). `revalidatePath()` after mutations. RLS never bypassed.

---

## Code Reviewer Config
**Model:** `claude-sonnet-4-6`  
**Scope:** Review ONLY files in Coding Agent's "Files Changed" list (do not read full codebase)  
**Severity Levels:**
- `[high]` — Functional bug / auth bypass / data loss → Always FAIL
- `[medium]` — Performance / missing error handling → FAIL if >1 
- `[low]` — Style / naming → PASS WITH NOTES
- `[info]` — Observation → PASS  

**Checklist (blocks on FAIL):**
- Correctness: All external calls have try/catch, auth verified in DAL, `revalidatePath()` called, no TypeScript `any`, tracker terminology
- Performance: No N+1, specific columns not `select('*')`, blocking I/O before render, Gemini debounced, subscriptions have cleanup
- Code Quality: Functions <40 lines, no magic strings, named exports, imports grouped, Server Components default
- OLED: No `bg-white`/`bg-gray-*`/`text-black` — only OLED tokens

**Output Format:** Verdict (PASS | PASS WITH NOTES | FAIL) | max 5 findings with file:line refs | Files Reviewed  
**Rule:** One [high] finding = FAIL. Be direct, never rewrite code, reference rules files when unsure.

---

## QA Agent Config
**Model:** `claude-sonnet-4-6`  
**Stack:** Vitest + React Testing Library for unit/integration/API tests  
**Coverage Requirements:** Happy path + Auth failure + Invalid input + 1 edge case  
**Test Patterns:** Mock Supabase with `vi.mock`, mock API responses, test file structure in `src/__tests__/`  
**Execution:** Read files from CR "Files Changed", check `src/__tests__/` for gaps, write missing tests, `npm test`, capture output  
**Output Format:** Verdict (PASS | FAIL) | Test Results (Tests run / Passed / Failed) | Test Cases (each with [PASS]/[FAIL] status) | Coverage Gaps | Files Tested  
**Rule:** NEVER declare PASS with failing test. NEVER skip tests for PASS. Failing test = FAIL verdict.

---

## Research Agent Config
**Model:** `claude-sonnet-4-6`  
**When Called:** New external API, npm package eval, unclear constraints, security surface assessment  
**Methodology:** Official docs first → verify versions → assess security → check package health → note licensing  
**Output Format:** Research Report | Answer (2-3 sentences) | Key Findings (Version / Limit / Auth / Cost / Risk) | Implementation Notes | Recommended Approach | Sources  
**Rule:** No code. Be specific (exact rate limits, not vague "has limits"). Flag risks (unmaintained, CVE, deprecation).

---

## Security Reviewer Config (On-Demand Only)
**Model:** `claude-opus-4-6` (MUST switch to opus before audit — this is the only agent that needs Opus)  
**Audit Scope:**
- Auth & Authz: getUser() in DAL, user_id from Supabase (never body/params), session via cookies, middleware refresh-only
- RLS: Every table enabled, policies use auth.uid() = user_id, no .select() bypass
- Telegram: X-Telegram-Bot-Api-Secret-Token validated every request, TELEGRAM_ALLOWED_HANDLES whitelist, files from Telegram CDN only
- AI Output: Parsed + validated before DB write, numeric bounds checked, duration conversion (>24h → minutes→hours), unknown fields stripped, no raw HTML render
- Secrets: No hardcoded keys, all `process.env.`, no console.log of env vars, .env.local in .gitignore
- Input: Server-side validation (not just client), file size/mimeType checked, no path traversal, no eval()
- OWASP: Access Control / Cryptographic Failures / Injection / Misconfiguration / Auth / SSRF

**Output Format:** Verdict (PASS | FAIL) | max 5 findings with severity tags [critical]/[warning]/[info] | Files Audited  
**Rule:** One [critical] = FAIL (no exceptions). >1 [warning] = FAIL. Never suggest workarounds; report exact fix. Reference `.claude/rules/security.md` when unsure.

---

## Session Workflow Reference
**Order:** CA (Code) → CR (Review) → IF FAIL: loop back to CA | IF PASS: proceed to QA → QA (Test) → IF FAIL: loop back to CA | IF PASS: Deploy  
**Compressed Signatures:** `[CA | HH:MM]` / `[CR | HH:MM]` / `[QA | HH:MM]` / `[RA | HH:MM]` / `[SR | HH:MM]`  
**Token Efficiency:** Agent configs cached here (done). SESSION_LOG uses compressed format. All agents reference MEMORY.md (no re-reads). CA/CR/QA use output-token downgrade (Sonnet think → Haiku write).

---
