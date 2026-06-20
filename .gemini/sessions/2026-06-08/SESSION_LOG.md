# Session 2026-06-08

**Status:** ACTIVE
**Branch:** feat/mvp-build
**Previous:** 2026-06-07 CLOSED ✓

---

## Carry-Over from 2026-06-07

| Task | Status | Notes |
|------|--------|-------|
| CT-2.1 | ⏳ Non-blocking | Code review findings from v32 |
| CT-3 | ⏳ Non-blocking | 67 QA test cases pending |
| T26 | ⏳ Deferred | AI Summaries — cron + UI pending |
| T43 | ⏳ Pending | Display brightness — OLED too dark on lesser devices |
| T52-migration | ⚠️ Blocked | Apply `20260605000001_feedback_responses.sql` in Supabase SQL editor |
| T57-cron | ⚠️ Action needed | Set up external cron → `https://yaha-flame.vercel.app/api/warmup` every 5 min |
| T58 | ✅ Resolved | Samsung attach = Samsung My Files category picker (accepted device behaviour) |

---

## Tasks This Session

### [T73] Cross-device bug fixes ✓ COMPLETE

**T73a — "Failed to add target" on lower-spec user device**
- Root cause: `addUserTarget` called `getUser()` which returns `null` when the user has a valid auth session but no row in the `users` table. Threw `'Unauthorized'`, caught as `'Failed to add target'`.
- Fix: check auth via `getSafeUser()` directly; fall back to `user?.targets ?? []` so missing profile row doesn't block the upsert.
- File: `src/lib/db/users.ts`

**T73b — SC3: AGENT MANAGEMENT / ROUTINE MANAGEMENT text overflow**
- Root cause: `tracking-widest` (0.1em letter-spacing) + `text-[11px] uppercase` on ~15-char labels overflowed the `grid-cols-2` button width on narrow screens (~155px each).
- Fix: `tracking-widest` → `tracking-wide`, `text-[11px]` → `text-[10px]`, added `leading-tight text-center` to `DeveloperButton` span.
- File: `src/components/settings/SettingsForm.tsx`

**T73c — SC4: DEPLOY PROTOCOL / ADD TRACKER text overflow on routine form**
- Root cause: same `tracking-widest` issue; ADD TRACKER also had `px-12` (48px padding each side) exceeding available width on small screens.
- Fix: both buttons `tracking-widest` → `tracking-wide`; DEPLOY PROTOCOL `px-4` → `px-3`; ADD TRACKER `px-12` → `px-6`.
- File: `src/components/routines/RoutineForm.tsx`

**T73d — Splash screen: white background + no progress bar on cold start**
- Root cause: `background:#050505` only in CSS stylesheet — not applied until CSS is parsed. On some Android WebViews, the base64 image (31KB) renders before the stylesheet paints, showing white. Progress bar animation lacked `-webkit-` prefixes for older Chrome.
- Fix: inline `style="background:#050505"` on `<html>` and `<body>` tags (paint before CSS); `<meta name="theme-color" content="#050505">`; added `@-webkit-keyframes` + `-webkit-animation`.
- File: `public/splash.html`

---

## Commits This Session

### [T74] Auth callback — users row never created for new sign-ups ✓ COMPLETE
- Root cause: no `on_auth_user_created` DB trigger, and the OAuth callback (`/api/auth/callback`) only exchanged the code and redirected — it never wrote a row to `public.users`. Any user who signed in and went straight to a feature without touching Settings had no profile row.
- Fix: after `exchangeCodeForSession` succeeds, upsert `{ id: user.id }` with `ignoreDuplicates: true` — creates the row for new users (~50ms, once ever), pure no-op for returning users.
- File: `src/app/api/auth/callback/route.ts`

### [T75] Hide raw JSON during streaming ✓ COMPLETE
- Root cause: `streamingText` rendered verbatim — AI response ends with a JSON action array that was visible mid-stream before the done event parsed it into an action card.
- Fix: strip `/\n?\[[\s\n]*\{[\s\S]*/g` from `streamingText` before display. Pure-JSON responses collapse back to loading dots.
- File: `src/components/chat/ChatInterface.tsx`

### [T76] Timestamp-only log edits blocked ✓ COMPLETE
- Root cause: `updateLogAction` guarded on `Object.keys(fields).length === 0` unconditionally — returned "At least one field is required" even when only `logged_at` changed.
- Fix: only block when BOTH `fields` is empty AND `loggedAt` is absent. Pass `fields: undefined` on timestamp-only edits to skip the unnecessary read-modify-write.
- File: `src/app/actions/logs.ts`

---

## Commits This Session

| SHA | Message |
|-----|---------|
| `971547b` | fix(multi): target save for new users, button text overflow, splash white flash |
| `497489f` | fix(auth): create users row at OAuth callback for new sign-ups |
| `385cd17` | fix(chat): hide raw JSON action payload during streaming |
| `44cd3d5` | fix(logs): allow timestamp-only edits on log entries |
