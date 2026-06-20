# MEMORY.md — Session 2026-06-15

## Agent Config Index
**Loaded:** 2026-06-15 (session start)
**Status:** Cached — all agents reference these, no re-reads

---

### Coding Agent Config
- **Model:** `claude-sonnet-4-6` (Haiku for writing TECHNICAL_LOG)
- **Before coding:** Read skill file + pattern reference file, restate task in 1 sentence
- **Rules auto-discovery:** Load folder-level `claude.md` in `src/components/`, `src/lib/db/`, `src/app/api/`
- **Checklist:** TypeScript strict (no `any`) · RLS respected · revalidatePath() after mutations · no hardcoded secrets
- **Output:** PASS/BLOCKED verdict + max 5 bullet findings + file paths only (no content)
- **Build Artifact:** UI visible · migration applied · route resolves · env vars set
- **Validation:** `npm run lint && npm test` before returning

### Code Reviewer Config
- **Model:** `claude-sonnet-4-6`
- **Scope:** Only files in coding-agent's "Files Changed" — no full codebase reads
- **Severity:** [high] → always FAIL · [medium] > 1 → FAIL · [low] → PASS WITH NOTES · [info] → PASS
- **Blocks on:** auth bypass · missing try/catch · revalidatePath missing · TypeScript `any` · "container" terminology · OLED violations (bg-white, bg-gray-*, text-black)
- **Output:** PASS/PASS WITH NOTES/FAIL + max 5 bullets with file:line refs

### QA Agent Config
- **Model:** `claude-sonnet-4-6`
- **Stack:** Vitest + React Testing Library
- **Required coverage:** happy path · auth failure · invalid input · 1 edge case
- **Never:** declare PASS with failing test · skip tests · mock integration behaviors
- **Output:** PASS/FAIL + test counts + per-case results + coverage gaps

### Research Agent Config
- **Model:** `claude-sonnet-4-6`
- **When called:** new external API · new npm package · unclear rate limits/auth · security surface
- **Do NOT research:** Next.js 15 · Supabase · Gemini · Tailwind · Vitest (already decided)
- **Output:** Research Report with Answer + Key Findings (version/limit/auth/cost/risk) + Implementation Notes + Recommended Approach + Sources
- **Never writes code** — report only

### Security Reviewer Config
- **Model:** `claude-opus-4-6` (ON-DEMAND ONLY — expensive)
- **When:** User explicitly requests security audit, or after [critical] finding
- **Checklist:** getUser() in every DAL · user_id from auth not body · RLS on all tables · Telegram secret token validation · Gemini output sanitized · no hardcoded secrets · OWASP Top 10
- **One [critical] = FAIL, no exceptions**

---

## Carry-In Items (from 2026-06-14)

1. **Agent Forge date bug** — `activeAgent` branch in `route.ts` ~line 723, logs to previous day
2. **Auto-expire stale day sessions** — safety net feature, not started
3. **Guide sections 3–6** — `/settings/guide`, not started
4. **GIF assets for onboarding steps 1–10** — not started
5. **Vercel git integration broken** — use `vercel deploy --prod` directly
6. **Settings → Targets** — verify inline target creation from correlator modal appears in list
