# MEMORY.md — Session 2026-06-11
**Status:** Cached at session start

---

## Agent Config Index

### Coding Agent — `claude-sonnet-4-6`
- Read skill file + pattern ref before writing any code
- Rules auto-discovery: load folder-level `claude.md` as you work
- TypeScript strict: no `any`, explicit return types, RLS respected, no hardcoded secrets
- `revalidatePath()` after every mutation
- Switch to Haiku when writing TECHNICAL_LOG (output token savings)

### Code Reviewer — `claude-sonnet-4-6`
- Read only files listed in "Files Changed" — not full codebase
- FAIL triggers: missing try/catch, no auth verify, no `revalidatePath()`, `any` types, "container" terminology
- Verdict: PASS | PASS WITH NOTES | FAIL

### QA Agent — `claude-sonnet-4-6`
- Vitest + React Testing Library
- Happy path + edge cases + error states
- Haiku for writing results

### Research Agent — `claude-sonnet-4-6`
- Structured report only — never writes code
- Format: Findings → Recommendation → Sources

### Security Reviewer — `claude-opus-4-6` — ON-DEMAND ONLY
- OWASP Top 10, auth, secrets, Telegram webhook
- Only when explicitly requested

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | Main chat SSE stream — `loggingDate`, routine/agent routing, action card enrichment |
| `src/lib/ai/prompt-builder.ts` | Gemini system prompt — `FOOD_BANK_SAVE_RULE`, `GLOBAL_ANTI_HALLUCINATION_RULES` |
| `src/components/dashboard/DashboardContent.tsx` | Sparkline computation, `trendDayOffset`, `hasTodayFieldData` |
| `src/components/dashboard/WidgetCard.tsx` | `getDayLabels(n, offset)`, `formatDurationShort`, `Sparkline` component |
| `src/lib/db/dashboard-data.ts` | `computeWidgetValueOptimized` — avg denominator, window shifting |
| `src/components/routines/RoutineForm.tsx` | Day Start warning modal — `showDayStartWarning` state |
| `src/components/chat/ActionCard.tsx` | `UpdateDataCardComponent` — duration conversion, field enrichment |
| `src/app/actions/chat.ts` | `updateLogAction` — `upsertScoreForDate` after update |
| `src/types/action-card.ts` | `ActionCard`, `UpdateDataCard`, `AnyActionCard` types |
| `src/app/(app)/(content)/settings/guide/page.tsx` | Static how-to guide |
| `src/components/settings/SettingsForm.tsx` | Settings page — Help & Guide link |

---

## Active Known Issues

| Issue | Status | File |
|-------|--------|------|
| Agent Forge logs to previous day | ⚠️ Unresolved | `route.ts` `activeAgent` branch ~line 723 |
| No auto-expiry for stuck day sessions | ⚠️ Unresolved | `route.ts` + `day_state` table |

---

## Session State

**Current focus:** Interactive onboarding checklist — plan ready, 5 questions need answers before build.
**Plan location:** `2026-06-10/INTERACTIVE_GUIDE_PLAN.md`
