# Session Log — 2026-06-17

## Carry-In from 2026-06-15/16

1. **Agent Forge date bug** — logs to previous day, root cause unknown. `activeAgent` branch in `route.ts` ~line 723
2. **Auto-expire stale day sessions** (safety net)
3. **Guide sections 3–6** in `/settings/guide`
4. **GIF assets for onboarding steps 1–10**
5. **Vercel git integration** — still broken, manual `vercel deploy --prod` required
6. **Onboarding steps 3–11 content review** — in progress

---

## Tasks This Session

### T1 — Remove Target Completion section from dashboard
**Status:** ✅ DEPLOYED

**Files changed:**
- `src/components/dashboard/DashboardClient.tsx` — Removed `WeeklyBarChart` import, `DayScore` type import, `dayScores` prop, `showBarChart` state, localStorage `bc` lines, and the entire Target Completion JSX block
- `src/components/dashboard/DashboardContent.tsx` — Removed `computeDailyScores` import, `dayScores` variable computation, `dayScores={dayScores}` prop

---

### T2 — Fix "New Chat" button inactive in hamburger sidebar
**Status:** ✅ DEPLOYED

**Root cause:** T2 from Jun 15 changed the bottom nav chat tab to always navigate to `/chat/new`. Users landing there first would open the hamburger sidebar and tap "New Chat" — but `router.push('/chat/new')` is a no-op in Next.js 15 when already on that route. Sidebar closed, nothing else happened.

**Fix:** `src/components/chat/ChatSidebar.tsx` — Added `usePathname` import; `handleNewChat` now checks `pathname === '/chat/new'` and calls `router.refresh()` instead of `router.push` when already on the new chat page.

---

### T3 — Deploy pending Jun 15 fixes (SC1 image exception + SC2 Yes/No)
**Status:** ✅ DEPLOYED (session start — carried from previous context)

**Files changed (carried from Jun 15):**
- `src/lib/ai/prompt-builder.ts` — YES_NO_FIELD_RULE rewritten to override SELECT_FIELD_VALIDATION_RULE, accept "no"/"No"/"NO" case-insensitively, never emit "That's not in the list". EX12 rule updated: image-only messages during routine steps are data to extract, not triggers for re-asking.

---

### T4 — Journal Sidebar: Calendar View
**Status:** ✅ DEPLOYED

Replaced the flat logged-dates list in the journal hamburger sidebar with an interactive calendar.

**Design decisions (iterated via mockup):**
- No dots — brightness contrast only: logged days cyan `#06b6d4`, empty days dark purple `#1C1030`
- Today: filled cyan circle
- Tapping month label opens year overview (all 12 months, logged days bright/empty days dim)
- Year view: prev/next year arrows + X to close; tap any month to navigate to it
- Inter font + full OLED token set for app consistency

**Files changed:**
- `src/components/journal/JournalCalendar.tsx` — new component: month grid + year overlay, self-contained state, `loggedDates: string[]` + `selectedDate` + `today` + `onSelectDate` props
- `src/components/journal/DayView.tsx` — replaced `dateList` variable + `formatSidebarDate` helper with `<JournalCalendar>` in both mobile drawer and desktop sidebar; drawer panel gets `relative overflow-hidden` for year overlay absolute positioning
- `src/app/(app)/journal/page.tsx` — bumped `getLoggedDates` limit from 90 → 365 for full year coverage

---

### T5 — Fix file upload rejecting .doc files for some users
**Status:** ✅ DEPLOYED

**Root cause:** `ACCEPTED_FILE_TYPES` (HTML input `accept` attr) listed `.doc`, `.docx`, `.xls`, `.xlsx` and their MIME types — so the OS file picker offered them as valid. But `ALLOWED_MIME_EXACT` and the backend Gemini handler both reject all Office formats (Gemini can't process binary Office via inlineData). User who picked a `.doc` file saw "File type not supported: application/msword".

**Fix:** Stripped all Office MIME types from both `ACCEPTED_FILE_TYPES` and `ALLOWED_MIME_EXACT`. Also added `text/markdown` to the allowed set (was in accept string but missing from allowlist).

**Files changed:**
- `src/components/chat/ChatInterface.tsx` — `ACCEPTED_FILE_TYPES` and `ALLOWED_MIME_EXACT` trimmed to only what Gemini actually supports (images, audio, PDF, text/plain, text/csv, text/markdown)

---

### T6 — Share card fixes: footer always visible, html2canvas compat
**Status:** ✅ DEPLOYED

**Issues fixed:**
1. **JournalShareCard footer disappearing** — `flex: 1` spacer was compressing to zero when tracker cards exceeded available height, pushing footer off the 960px canvas. Fixed by pinning footer with `position: absolute; bottom: 22px` and increasing bottom padding to 72px so content never overlaps it.
2. **Gradient overlay** — replaced `inset: 0` with explicit `top/right/bottom/left: 0` (html2canvas doesn't reliably handle `inset` shorthand).
3. **TargetsShareCard ring centering** — replaced `inset: 0` with explicit `top: 0; left: 0; width: 96px; height: 96px` on the score text container.
4. **TargetsShareCard badge sizing** — replaced `display: inline-block; width: fit-content` with `alignSelf: flex-start` (`fit-content` unreliable in html2canvas canvas context).

**Files changed:**
- `src/components/journal/JournalShareCard.tsx`
- `src/components/dashboard/TargetsShareCard.tsx`

---

---

### T7 — Elite Coaching Supabase DB Clone + Live Webhook Sync
**Status:** ✅ DEPLOYED & VERIFIED

**Scope:** Clone YAHA's full DB schema to a new Supabase project (`jwiqwxacxgzpsshtsmsl`) for elite coaching use, seeded with data for Armaan + Violetta only, with live webhook sync for ongoing YAHA activity.

**Key decision — same UUIDs:** Google OAuth re-login to Elite Coaching app matches existing `auth.users` by email → same UUID → all copied data immediately accessible.

**Steps completed:**
1. **Schema copy** — cloned all public tables + RLS to Elite Coaching project via MCP migrations
2. **Auth pre-seeding** — created 2 `auth.users` in Elite Coaching via Admin Auth REST API with exact YAHA UUIDs:
   - `44ef9aae-79d7-4bc9-8eea-7d8a55964813` → armaan1993@gmail.com
   - `4c74333b-18e6-465a-a62a-523a4ad2999b` → violetmikulchik@gmail.com
3. **Data copy** — migrated all rows for those 2 users:
   - 2 users · 13 trackers · 4 routines · 8 correlations · 16 widgets · ~65 food_bank_entries
   - **1,500 tracker_logs** via Python REST API script (200-row batches to stay within token limits)
4. **pg_net triggers on YAHA** — enabled `pg_net` extension; created `notify_elite_sync()` trigger function + 7 triggers on all relevant tables; exception-guarded so sync errors never block YAHA writes
5. **Webhook route** — `src/app/api/elite-sync/route.ts` — validates `x-elite-sync-secret`, filters to 2 target user IDs, upserts to Elite Coaching via `Prefer: resolution=merge-duplicates`
6. **Kill-switch** — `ELITE_SYNC_ENABLED=true` in `.env.local` + Vercel env; set to `false` when EC standalone app is live

**Live verification (queried Elite Coaching `jwiqwxacxgzpsshtsmsl` directly):**
3 webhook entries arrived 12:28–12:29 today after the copy finished:
- Supplements: 10g creatine, 5g magnesium
- Food: Protein Bowl 570 kcal, 72g protein (Armaan)
- Food: Pistachio Protein Bowl 258 kcal, 24g protein (Violetta)

**Files changed:**
- `src/app/api/elite-sync/route.ts` — new file
- `.env.local` — added `ELITE_SYNC_ENABLED`, `ELITE_SUPABASE_SERVICE_ROLE_KEY`, `ELITE_SYNC_WEBHOOK_SECRET`

**YAHA migrations:** `enable_pg_net` · `elite_sync_triggers` · `fix_elite_sync_trigger_net_schema`

**Elite Coaching migrations:** `copy_users_and_trackers` · `copy_routines_correlations_widgets` · `copy_food_bank_entries` · tracker_logs via REST script

---

## Carry-Forward to Next Session

1. **Agent Forge date bug** — `activeAgent` branch `route.ts` ~L723, logs to previous day
2. **Auto-expire stale day sessions** (safety net)
3. **Onboarding steps 8–12 content review** — Routines, Targets, Food Bank, Agents, Dashboard
4. **GIF assets for onboarding steps**
5. **Vercel git integration** — still broken, manual `vercel deploy --prod` required

---

## Commits This Session

| Commit | Description |
|--------|-------------|
| (deploy via vercel CLI) | fix: SC1 image exception + SC2 Yes/No — prompt-builder rules |
| (deploy via vercel CLI) | feat: remove Target Completion section from dashboard |
| (deploy via vercel CLI) | fix: New Chat button no-op when already on /chat/new — use router.refresh() |
| (deploy via vercel CLI) | feat: journal sidebar calendar view — cyan/purple contrast, year overview |
| c37cf2d | fix(chat): remove unsupported Office file types from upload allowlist |
| 2e70289 | fix(share-cards): pin footer absolutely, fix inset/fit-content for html2canvas |
| (vercel CLI + Supabase MCP) | feat: elite coaching DB clone + live webhook sync |
