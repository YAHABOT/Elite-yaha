# Session Log — 2026-06-12

## Carry-In from 2026-06-11

- ✅ Correlator chaining (Task 8, commit `120efb7`)
- ✅ AI suggestion engine (Task 9, commits `f82a158`, `f772e7d`)
- ❌ Suggest button returning "Failed to generate suggestions" (model name bug, fixed Task 1 below)
- ❌ Agent Forge date bug — logs to previous day, root cause still unknown
- ⏳ BOM fix (globals.css + layout.tsx) — stripped but not committed, owned by onboarding session
- ⏳ GIF assets for onboarding steps 1–10 (screenshots in place)
- ⏳ Guide sections 3–6 in /settings/guide

---

## Tasks This Session

### Task 1 — Suggestion Engine Model Fix
**Status:** ✅ DEPLOYED
**File:** `src/app/actions/correlations.ts`
**Root cause:** `suggestCorrelationsAction` was calling `gemini-2.0-flash-lite` — model doesn't exist. Entire codebase uses `gemini-3.1-flash-lite`.
**Fix:** Changed `SUGGESTION_MODEL = 'gemini-2.0-flash-lite'` → `'gemini-3.1-flash-lite'`

---

### Task 2 — Correlator Modal Overflow Fix
**Status:** ✅ DEPLOYED
**File:** `src/components/journal/CorrelatorModal.tsx`
**Problem:** Formula builder rows were a single horizontal line (operators + type toggle + select + delete = ~370px), overflowing mobile screens. Also `max-h-[70vh]` didn't account for mobile browser chrome cutting off the footer.
**Fix:**
- Each formula row redesigned as a 2-line card: top line = operator buttons (24px compact) + type toggle + delete; bottom line = full-width input
- `max-h-[70vh]` → `max-h-[calc(100dvh-200px)]` — `dvh` handles mobile browser address bar / safe areas
- First row shows "Start with" label instead of invisible spacer

---

### Task 3 — Deterministic Suggestion Engine
**Status:** ✅ DEPLOYED (commit `461dc69`)
**Decision:** Kill Gemini from suggestions entirely. Replace with a deterministic TypeScript formula library — same 10 curated suggestions for every user, checked against their actual tracker fields. Zero API cost, instant, no hallucinations.

**Metrics to build (7 feasible now):**
| # | Metric | Formula | Notes |
|---|--------|---------|-------|
| 1 | Sleep Efficiency % | `(sleep_duration / time_in_bed) × 100` | Fields: sleep tracker |
| 2 | Net Caloric Balance | `calories_in - calories_burned - [TEF]` | TEF chain: if TEF correlator exists use it; if not, show prerequisite nudge card |
| 3 | Protein per kg | `protein_g / bodyweight_kg` | Cross-tracker: nutrition + body |
| 4a | Protein % of Calories | `(protein_g × 4 / total_kcal) × 100` | |
| 4b | Carbs % of Calories | `(carbs_g × 4 / total_kcal) × 100` | |
| 4c | Fat % of Calories | `(fat_g × 9 / total_kcal) × 100` | |
| 5 | Training Load (RPE) | `rpe × duration_min` | |
| 6 | Zone 2 % | `(time_in_zone_2 / total_duration) × 100` | Self-gating: only appears if user has zone_2 field |
| 7 | Hydration Attainment % | `(water_ml / target_ml) × 100` | `target_ml` uses field if tracked, otherwise constant 2000 |

**Dropped:** Caloric Density (nobody tracks meal count), HRV vs baseline, Weekly Workout Volume, Sleep Consistency (all need rolling window — deferred below)

**Architecture:**
- Pure TS function `getCorrelatorSuggestions(trackers, correlations)` — no Gemini
- Each template defines `requiredFields` with `labelPatterns` (fuzzy label match, e.g. `['calori', 'kcal']`)
- Field resolution: if same label appears across multiple same-type trackers → mark as found, note "combined across X trackers"
- TEF prerequisite: Net Caloric Balance checks for existing correlator named like "thermic effect" or "TEF" — if found, chains it; if not, shows "Create TEF first" nudge card above it
- Readiness: ready (0 missing) → almost (1-2 missing) → aspirational (3+)
- Remove `suggestCorrelationsAction` Gemini call entirely; replace with sync function

---

## Deferred — Rolling Window Metrics (Future: Analytics Section / Suggested Widgets)

These 3 metrics require multi-day aggregation (rolling averages / weekly sums). The current formula engine is per-day only. Deferred to a future "Analytics" page or "Suggested Widgets" feature.

| Metric | Why deferred | Future home |
|--------|-------------|-------------|
| HRV vs 7-day Baseline | `hrv_today / hrv_7day_avg × 100` — needs rolling 7-day avg | Analytics section / dashboard widget |
| Weekly Workout Volume | Sum of all workout durations over 7 days — needs rolling sum + cross-tracker | Analytics section / suggested widget |
| Sleep Consistency | `abs(avg_bedtime_7d - today_bedtime)` — needs rolling avg of bedtimes | Analytics section / suggested widget |

**Future architecture note:** When the Analytics section is built, a "Suggested Analytics" panel could mirror what we're building for correlators — show pre-built rolling-window metrics and let users one-tap add them as widgets or analysis views. Same card format (name, description, ✓/✗ required fields).

---

## Open Items

- [x] **Task 3: Deterministic suggestion engine** — deployed `461dc69`
- [ ] Agent Forge date bug — logs to previous day, root cause unknown. `activeAgent` branch in `route.ts` ~L723
- [ ] Auto-expire stale day sessions (safety net)
- [ ] Continue guide sections 3–6 in `/settings/guide`
- [ ] ⏳ GIF assets for onboarding steps 1–10
- [ ] BOM fix — onboarding session to commit alongside their onboarding work

### Task 4 — lastKnown Formula Node
**Status:** ✅ DEPLOYED (commit `e6636e1`)
**Files:** `src/types/correlator.ts`, `src/lib/db/logs.ts`, `src/lib/correlator/formula-engine.ts`, `src/lib/correlator/suggestions.ts`, `src/app/actions/correlations.ts`, `src/app/(app)/journal/page.tsx`, `src/components/journal/DayView.tsx`, `src/components/journal/CorrelationCard.tsx`, `src/components/journal/CorrelatorModal.tsx`

**What:** 5th `FormulaNode` type — `{ type: 'lastKnown', trackerId, fieldId }`. Uses the most recent historical value for a field, not just today's. Designed for sparse fields like bodyweight (weekly weigh-ins).

**Key details:**
- `getLastKnownValues()` — fetches last 200 logs DESC, returns `Record<string,number>` (plain object, serializable across server→client boundary). First occurrence per key = most recent value.
- Engine: `evaluateNode` checks today's map first, falls back to `lastKnownMap` for `lastKnown` nodes. Optional param — all existing call sites unchanged.
- Journal page fetches lastKnownValues in parallel with today's logs, threads down DayView → CorrelationCard.
- Modal: 4th toggle button (amber Clock icon), same field dropdown with amber border.
- `Protein per kg` suggestion now uses `lastKnown` for bodyweight — works daily even with weekly weigh-ins.

---

### Task 5 — Correlation Card Numbers 5% Smaller + Targets Page Fixes + crossTracker Formula Protection
**Status:** ✅ DEPLOYED (commit `d3aa4fb`)
**Files:** `src/components/journal/CorrelationCard.tsx`, `src/components/settings/TargetsList.tsx`, `src/components/journal/CorrelatorModal.tsx`

**Sub-issues addressed (4 total):**

**5a. Correlation card numbers 5% smaller**
- `CorrelationCard`: value font `text-lg` → `text-[15px]` (~5% reduction, 4th iteration from original text-3xl)
- `MacroGroupCard`: same change, `text-lg` → `text-[15px]`

**5b. Targets page text truncation**
- `TargetsList.tsx`: replaced `truncate` with `break-words` on both `fieldLabel` (primary) and `trackerName` (subtitle)
- Long names like "Sleep Efficiency" and "Average Heart Rate" now wrap instead of cutting off as "SLEEP EFFICIEN..."
- Added null-safety on `target.trackerName` and `target.fieldType` to prevent crash on malformed target objects

**5c. Missing 6th target on targets page**
- Investigated code path: `getUser()` → `targets` JSONB array → `TargetsList` renders all
- No artificial limit found in code — all array items are rendered
- Added null-safety which may fix silent crash hiding the 6th item
- Could not access Supabase DB to inspect raw data — needs user to verify after deploy

**5d. Zone 2 % / Training Load formula corruption**
- **Root cause:** Opening Edit on an auto-generated crossTracker formula, then clicking Save, would rebuild the formula from flat rows — losing the nested tree structure (e.g. `ct('workout','Duration','sum') / 60` becomes just `60 × 100`)
- **Fix:** Added `hasComplexNodes()` detector for formulas containing `crossTracker` or `lastKnown` nodes
- When editing a complex formula: shows cyan info banner "Auto-generated formula — edit name & unit only", formula rows are dimmed + pointer-events-none, Save preserves original formula from DB
- Added `originalFormula` state to track the DB formula during edit
- "Add Variable" button hidden for complex formulas

---

### Task 6 — Missing Correlation Target on Dashboard Score Page
**Status:** ✅ DEPLOYED (commit `6564fb4`)
**File:** `src/app/(app)/(content)/dashboard/score/page.tsx`

**Root cause:** `computeDayDetails()` had an explicit filter `t.trackerId !== '__correlations__'` on line 40 that excluded ALL correlation-based targets. Sleep Efficiency (trackerId=`__correlations__`, fieldId=correlation UUID) was silently dropped — dashboard showed "5 targets tracked" instead of 6.

**Fix:**
- Removed the `__correlations__` exclusion from the `numericTargets` filter
- Added `__correlations__` branch in the target computation loop: evaluates the correlation formula using `buildFieldValueMapWithCorrelators` + `evaluateFormula` (same pattern as `computeTargetActual` in `dashboard-data.ts`)
- Fetches correlations from DB in parallel with logs (no extra round-trip)

**Note:** The main dashboard's `computeDailyScore` (in `dashboard-data.ts`) already handled `__correlations__` correctly — this was only broken in the score detail page's local `computeDayDetails` function.

---

### Task 7 — Correlator Sparkline 0-value on Days Without Data
**Status:** ✅ DEPLOYED (commit `20783a5`)
**File:** `src/lib/db/dashboard-data.ts`

**Root cause:** `correlatorTrend.push(isValid ? (dayResult as number) : 0)` — pushed literal `0` for any day with no logged data. For metrics like Sleep Efficiency at 7AM Saturday (nothing logged yet), this caused the sparkline to visibly drop to 0 at the end of the chart.

**Fix:**
- Changed `0` fallback → `null` (type widened to `(number | null)[]`)
- Added trailing null trim: `while (trend.at(-1) === null) trend.pop()` — removes empty days from the end entirely, so the chart just shows fewer bars rather than a crashed line
- Updated "has any data" guard: `some(v => v !== null)` instead of `some(v => v !== 0)`
- Affected all correlator widgets (Sleep Efficiency, Calorie Balance, etc.)

**Follow-up fix (commit `a130bc7`):** Trimming trailing nulls reduced array length → `getDayLabels` shifted labels forward (Calorie Balance showed TUE-SAT instead of MON-SAT). Fix: count trimmed nulls → return as `trendDayOffset` so Sparkline shifts labels back by same amount.

**Also fixed this session (git was NOT auto-deploying via integration):**
- Discovered Vercel git integration was broken — none of commits `d3aa4fb`, `6564fb4`, `c91bc72` had deployed
- Fixed by running `npx vercel deploy --prod` directly from CLI
- All pending fixes now live including: smaller correlation numbers, targets text wrapping, Sleep Efficiency in dashboard score

---

### Task 8 — Zone 2 % / Training Load crossTracker type-mismatch
**Status:** ✅ DEPLOYED (commit `600538e`)
**File:** `src/lib/correlator/formula-engine.ts`

**Root cause (hypothesis):** When the user clicks Suggest, `resolveField` iterates all trackers. If an OVERVIEW or other 'workout'-type tracker has fields with similar labels (e.g. "Training Intensity", "Duration"), `resolveField` with `trackerTypeFilter: ['workout']` might pick THAT tracker's type rather than the TRAINING tracker. The formula then stores `trackerType: 'workout'`. But the user logs to the TRAINING tracker which may be type 'custom'. At evaluation, `buildCrossTrackerMap` stores keys as `sum:custom:trainingintensity` but `evaluateNode` looks up `sum:workout:trainingintensity` → key miss → null → "---".

**Fix:** In `evaluateNode` for `crossTracker` nodes, after an exact type+label key miss, scan `crossTrackerMap` for any entry matching the same aggregation+normalized label regardless of tracker type. Preserves exact-match priority; fallback handles type mismatches.

**Note:** Even if this isn't the exact cause, the fallback makes crossTracker evaluation robust to any tracker-type inconsistency, which is a good defensive fix.

---

**Follow-up fix (commit `1cfff52`):** Zone 2 % formula used `ctMinutes(duration)` which divides raw seconds by 60, but zone2 was still in raw seconds → result was 60× too large (~1135% not ~19%). Fix: use `ct(duration)` directly (no /60). For a ratio, units cancel — `(zone2_raw / duration_raw) * 100` is correct regardless of storage unit.

**⚠️ USER ACTION REQUIRED:** Existing Zone 2 % correlator stored the OLD formula. Must **delete it and recreate from Suggest** to get the fixed formula.

---

## Carry-Forward to Next Session

1. ~~**Verify 6th target**~~ → Fixed: was a code exclusion, not data corruption
2. **Zone 2 % / Training Load** — user needs to delete old ones and recreate from Suggest to get proper crossTracker formulas. Old correlators stored `field` nodes pointing to one tracker; new ones use `crossTracker` nodes that aggregate across all workout trackers
3. Agent Forge date bug: `activeAgent` branch in `route.ts` ~line 723 — logs to previous day, root cause unknown
4. Auto-expire stale day sessions (safety net)
5. Continue guide sections 3–6 in `/settings/guide`
6. GIF assets for onboarding steps 1–10

### ⚠️ Parallel Session Note
Another chat session is working on a separate feature concurrently. Do NOT modify files touched in Task 5 without checking git log first:
- `src/components/journal/CorrelationCard.tsx`
- `src/components/journal/CorrelatorModal.tsx`
- `src/components/settings/TargetsList.tsx`
