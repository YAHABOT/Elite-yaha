# Agent Config Index — Session 2026-05-25

**Status:** Cached at session start
**All agents reference this file — NO re-reads from .claude/agents/**

## Coding Agent Config
- **Model**: claude-sonnet-4-6 (speed + Next.js 15)
- **Output Mode**: Switch to haiku when writing TECHNICAL_LOG (save output tokens)
- **Task Pattern**: Read skill file → read pattern ref → confirm task → implement
- **Key Requirement**: Read folder-level claude.md files auto-discovered during implementation
- **Checklist**: Rules files read, patterns matched, strict TypeScript, error handling, RLS respected, secrets from env, revalidatePath() called, no hardcoded values

## Code Reviewer Config
- **Model**: claude-sonnet-4-6 (pattern matching + logic verification)
- **Scope**: Only files listed in "Files Changed" section
- **Verdict Format**: PASS | PASS WITH NOTES | FAIL
- **Blockers**: Missing try/catch on external calls, no auth verify in DAL, missing revalidatePath(), any types, terminology errors
- **Focus**: Correctness first, then performance, then code quality

## QA Agent Config
- **Model**: claude-sonnet-4-6 (test generation)
- **Stack**: Vitest + React Testing Library
- **Coverage**: Happy path, auth failure, invalid input, edge cases
- **Verdict**: PASS/FAIL with test results
- **Output**: Summary of all test outcomes + any failures

## Critical Bug Fix Task
**Assigned to:** Coding Agent
**Priority:** Fix all 9 Critical bugs in one batch
**Files to Modify:**
- src/app/api/chat/route.ts (BUG-V32-1, BUG-V32-6, BUG-V32-8)
- src/middleware.ts (BUG-V32-3)
- src/components/ActionCard.tsx (BUG-V32-4, BUG-V32-5)
- src/lib/dashboard-data.ts (BUG-V32-2)
- src/lib/day-state.ts (BUG-V32-7)
- src/lib/prompt-builder.ts (BUG-V32-9)

**Target:** All 9 fixes → Code Reviewer PASS → Test Suite PASS
