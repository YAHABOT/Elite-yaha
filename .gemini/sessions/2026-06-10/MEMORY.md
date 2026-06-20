# MEMORY.md — Session 2026-06-10
**Loaded:** 2026-06-10 (retroactively cached mid-session)
**Status:** Cached — all agents reference these, no re-reads

---

## Agent Config Index

### Coding Agent Config
- **Model:** `claude-sonnet-4-6`
- **Before writing code:** Read assigned skill file → read pattern reference → restate task in one sentence
- **Rules auto-discovery:** Load folder-level `claude.md` files naturally as you work
- **Checklist:** TypeScript strict (no `any`) · explicit return types · RLS respected · no hardcoded secrets · `revalidatePath()` after mutations · error handling at every external call
- **Output efficiency:** Use Haiku when writing TECHNICAL_LOG, back to Sonnet for analysis

### Code Reviewer Config
- **Model:** `claude-sonnet-4-6`
- **Scope:** Only files listed in "Files Changed" — not full codebase
- **Blocks on FAIL:** Missing try/catch · auth not verified · no `revalidatePath()` · TypeScript `any` · "container" terminology · dead code
- **Verdict format:** PASS | PASS WITH NOTES | FAIL

### QA Agent Config
- **Model:** `claude-sonnet-4-6`
- **Framework:** Vitest + React Testing Library
- **Coverage:** Happy path + edge cases + error states
- **Output efficiency:** Haiku for writing test results

### Research Agent Config
- **Model:** `claude-sonnet-4-6`
- **Output:** Structured research report only — never writes code
- **Format:** Findings → Recommendation → Sources

### Security Reviewer Config
- **Model:** `claude-opus-4-6` (expensive — ON-DEMAND ONLY)
- **Scope:** OWASP Top 10 · auth · secrets · Telegram webhook validation
- **When:** Only when explicitly requested, not after every build

### HR Agent Config
- **Models:** Haiku (read) → Sonnet (analyze) → Haiku (report/apply)
- **Budget cap:** 20% of session budget — strict
- **When:** Only when user says "Run HR Agent" or requests performance audit

---

## Session State

### Current focus
Interactive guide / onboarding system — research complete, building pending user approval.

### Deployed this session
- `/settings/guide` — static guide page (2 sections: home screen + tracker creation)
- `SettingsForm.tsx` — Help & Guide entry point (purple BookOpen row)

### Pending
- Floating chip + bottom sheet checklist (6-step interactive onboarding)
- User needs to confirm: step order, progressive unlock timing, GIF assets
