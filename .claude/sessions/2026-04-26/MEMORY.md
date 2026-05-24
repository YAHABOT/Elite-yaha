# Session Memory — 2026-04-26

## Agent Config Index
**Loaded:** 2026-04-26 17:40 (session start)
**Status:** Cached — all agents reference these, no re-reads

---

### Coding Agent Config
- **Model**: `claude-sonnet-4-6` (start session with `/model sonnet`)
- **Output efficiency**: Switch to `/model haiku` when writing TECHNICAL_LOG (formatting phase)
- **Before coding**: Read assigned skill file + pattern reference file + folder-level `claude.md` rules
- **Core patterns**:
  - Data access: `src/lib/db/[domain].ts` (one function per operation, auth via `getUser()`)
  - Server Actions: `src/app/actions/[domain].ts` (use server, return `{error}|{success}`)
  - Route Handlers: `src/app/api/[endpoint]/route.ts` (webhooks, external APIs)
  - Pages: `src/app/(app)/[route]/page.tsx` (Server Components, server-side data fetch)
  - Components: `src/components/[feature]/Name.tsx` (Server by default, Client if justified)
  - Types: `src/types/[domain].ts` (shared TypeScript)
- **Critical**: Always say **tracker**, never "container"
- **Validation**: `npm run lint && npm test` must pass before return
- **Output format**: Verdict + Findings (max 5 bullets) + Files Changed (paths only)

---

### Code Reviewer Config
- **Model**: `claude-sonnet-4-6` (pattern matching, logic verification)
- **Scope**: Review only files in "Files Changed" section from coding-agent output
- **Checklist**: Correctness (blocks on FAIL) → Performance → Code Quality → OLED Compliance
- **Severity levels**: [high] = FAIL (functional bug, auth bypass, data loss) | [medium] = FAIL if >1 | [low] = PASS WITH NOTES | [info] = PASS
- **Rules**: Be direct, reference exact lines, never rewrite code, one FAIL = verdict FAIL
- **Output format**: Verdict + Findings (max 5) + Files Reviewed

---

### QA Agent Config
- **Model**: `claude-sonnet-4-6` (test generation, log analysis)
- **Gate**: DO NOT BEGIN until SESSION_LOG contains `[CR | HH:MM] PASS`
- **Test stack**: Vitest + React Testing Library + Supabase client
- **Coverage**: Happy path + Auth failure + Invalid input + Edge case per feature
- **Test locations**: `src/__tests__/lib/`, `src/__tests__/api/`, `src/__tests__/components/`, `src/__tests__/actions/`
- **TCS file**: Create `TCS_v[N].md` in session folder with test cases (Results column blank until manual test)
- **Output format**: Verdict + Test Results + Test Cases + Coverage Gaps + Files Tested
- **Critical rule**: Never declare PASS with a failing test

---

### Research Agent Config
- **Model**: `claude-sonnet-4-6` (web research, API analysis, package evaluation)
- **When called**: New API integration | Package evaluation | Unclear constraints | Security surface assessment
- **Method**: Official docs first → Verify versions → Assess security → Check package health → Note licensing
- **DO NOT research**: Next.js 15, Supabase, Gemini 2.5 Flash, Tailwind CSS v4, Vitest (already decided)
- **Output format**: Research Report + Answer + Key Findings + Implementation Notes + Recommended Approach + Sources
- **Critical rule**: No code, current info only, flag risks, one report per topic

---

### Security Reviewer Config
- **Model**: `claude-opus-4-6` (deep reasoning for vulnerability detection)
- **When called**: On-demand security audits (explicitly requested) — NOT in standard workflow
- **Scope**: Auth & Authorization → RLS → Telegram Webhook → AI Output Sanitization → Secrets → Input Validation → OWASP Top 10
- **Severity**: [critical] = FAIL (no exceptions) | [warning] = FAIL if >1 | [info] = context
- **Output format**: Verdict + Findings (max 5) + Files Audited
- **Critical rule**: One [critical] = FAIL, never suggest workarounds, report exact fix needed

---

## Session Start Checklist
- [x] Read all agent configs → cached above
- [x] Check yesterday's SESSION_LOG → clean start (no unfinished work)
- [ ] Create initial SESSION_LOG.md
- [ ] Ready for task assignment
