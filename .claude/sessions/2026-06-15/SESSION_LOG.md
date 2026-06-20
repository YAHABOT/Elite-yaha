# Session Log — 2026-06-15

## Carry-In from 2026-06-14

1. **Agent Forge date bug** — logs to previous day, root cause unknown. `activeAgent` branch in `route.ts` ~line 723
2. **Auto-expire stale day sessions** (safety net)
3. **GIF assets for onboarding steps 1–10**
4. **Vercel git integration** — still broken, all deploys require `vercel deploy --prod` directly
5. **Verify target appears in Settings → Targets** after inline creation from correlator modal

---

## Tasks This Session

### T1 — Onboarding Guide: Steps 1 & 2 + Infrastructure
**Status:** ✅ Complete

**Files changed:**
- `src/components/onboarding/steps.ts` — Added `StepPlatform` type, `platforms?`, `ctaLabel?`, `ctaHref?`, `ctaNote?` fields; 11 steps total (added `profile` between home_screen and trackers); step 1 uses platform cards; step 2 has CTA + screenshot
- `src/components/onboarding/OnboardingSheet.tsx` — Added `renderBold()`, `UserCircle` icon, platform card rendering, CTA note rendering, text-above-image layout, centered carousel wrapper
- `src/components/onboarding/StepCarousel.tsx` — Fixed `aspect-video` → `aspect-[9/16] max-h-[420px]`, `object-cover` → `object-contain`, portrait layout for all steps
- `src/lib/db/onboarding.ts` — Added `profile` to `OnboardingStepId`, `ALL_STEP_IDS`, profile auto-completion logic
- `src/app/actions/onboarding.ts` — Added `profile: 'profile_done'` to flagMap
- `public/onboarding/step-2-profile.png` — Profile page screenshot (user-provided)

### T2 — Chat Tab → /chat/new directly
**Status:** ✅ Complete

- `src/components/nav/MobileBottomNav.tsx` — Chat tab href changed to `/chat/new`, added `activeMatch: '/chat'` so active state still triggers on all /chat/* routes

### T3 — Remove auto-seeded trackers/routines on signup
**Status:** ✅ Complete

- `src/app/actions/auth.ts` — Removed `createDefaultRoutines()` function and its call from `signUp()`; new accounts start with blank slate

### T4 — Settings restructure
**Status:** ✅ Complete

- `src/components/settings/SettingsForm.tsx` — Removed Identity section; added `NavRow` component; `SystemSection` with 4 nav rows (Food Bank, Daily Targets, Agent Management, Routine Management); Profile NavRow at top
- `src/app/(app)/(content)/settings/profile/page.tsx` — NEW: server component, fetches profile, renders ProfileForm
- `src/components/settings/ProfileForm.tsx` — NEW: Alias (blur-save), DOB (date picker), Height (number + cm), Gender (select); per-field save state
- `src/lib/db/users.ts` — Added `UserProfile` type, `profile?` to `UserStats`, `profile_done?` to `OnboardingManualFlags`
- `src/app/actions/settings.ts` — Added `updateProfileAction()` with deep-merge for `users.stats`

---

## In Progress

- **Onboarding steps 3–11 review** — content review in progress, step 2 just finalized

---

### T5 — 5 AI/UI Bug Fixes
**Status:** ✅ DEPLOYED

**Files changed:**
- `src/lib/ai/prompt-builder.ts` — Bug 1: routine next-step preview rule tightened (NEVER list next step fields in current step response). Bug 2: food bank ABSOLUTE PRIORITY rule added (forbids USDA fallback for matched items). Bug 3: rule 15b extended with explicit workout field checklist (Steps, HRZ times, etc.)
- `src/app/api/chat/route.ts` — Bug 4: added 8 comparison patterns to `HISTORICAL_INTENT_PATTERNS`; comparison queries now fetch 30-day range instead of yesterday-only
- `src/components/dashboard/WidgetDetailClient.tsx` — Bug 5: weekly bucket aggregation now uses `shouldSumWeekly` (only sums for field_total, combined_field, correlator+sum); field_average now correctly averages in 90D/ALL view

---

## Carry-Forward to Next Session

1. **Agent Forge date bug** — `activeAgent` branch `route.ts` ~L723, logs to previous day
2. **Auto-expire stale day sessions** (safety net)
3. **Guide sections 3–6** in `/settings/guide`
4. **GIF assets for onboarding steps 1–10**
5. **Vercel git integration** — still broken, manual `vercel deploy --prod` required
6. **Onboarding steps 3–11 content review** — in progress

---

## Commits This Session

| Commit | Description |
|--------|-------------|
| (deploy via vercel CLI) | fix: double routine prompt, food bank priority, workout field extraction, compare query history, 90D+ chart avg |
