# Session Log — 2026-06-13

## Carry-In from 2026-06-12

- ✅ Zone 2 % / Training Load crossTracker type-mismatch fallback (commit `600538e`)
- ✅ Zone 2 % formula math fix — ctMinutes → ct (commit `1cfff52`)
- ⚠️ Zone 2 % / Training Load still "---" — root cause not yet found at session end
- ⚠️ Vercel git integration broken — all deploys require `npx vercel deploy --prod`
- ❌ Agent Forge date bug — logs to previous day, root cause unknown

---

## Tasks This Session

### Task 1 — Zone 2 % / Training Load root cause identified & fixed (DB)
**Status:** ✅ DEPLOYED (DB fix only, no code commit)

**Root cause:** Stored formulas used `fieldLabel: "Workout duration"` (matched Running tracker's schema) but user primarily logs to Training tracker which labels the same field `"Duration "`. Normalized: `workoutduration` ≠ `duration` → key miss → null → "---".

**Previous fallback** (commit `600538e`) only handled tracker-TYPE mismatches, not label mismatches. Ineffective here.

**Fix:** Direct SQL UPDATE via Supabase MCP:
```sql
UPDATE correlations SET formula = jsonb_set(formula, '{right,left,fieldLabel}', '"Duration"') WHERE name = 'Training Load';
UPDATE correlations SET formula = jsonb_set(formula, '{left,right,fieldLabel}', '"Duration"') WHERE name = 'Zone 2 %';
```

Confirmed working: user saw 233.8 AU (Training Load) and 18.9% (Zone 2 %).

---

### Task 2 — Correlation ⓘ insights + auto-widget on suggest + crossTracker dashboard fix
**Status:** ✅ DEPLOYED (commit `6354bc4`)
**Files:** `src/lib/db/dashboard-data.ts`, `src/types/correlator.ts`, `src/lib/correlator/suggestions.ts`, `src/lib/correlator/insights.ts` (NEW), `src/app/actions/correlations.ts`, `src/components/journal/CorrelatorModal.tsx`, `src/components/journal/CorrelationInsightSheet.tsx` (NEW), `src/components/journal/CorrelationCard.tsx`

**Sub-issues:**

**2a. crossTracker nodes broken in dashboard widget evaluation**
- `computeWidgetValueOptimized` never built a `crossTrackerMap` — `buildCrossTrackerMap` wasn't even imported
- All correlator widgets using crossTracker formulas (Training Load, Zone 2 %) showed "---" on dashboard
- Fix: import `buildCrossTrackerMap`, build per-day map in correlator loop, pass to both `buildFieldValueMapWithCorrelators` and `evaluateFormula`

**2b. Auto-create dashboard widget when suggestion accepted**
- New `createCorrelationsFromSuggestionAction`: creates correlation(s) + conditionally creates a `this_week` correlator widget
- `autoWidget: { label, period, aggregation }` added to `CorrelatorSuggestion` type
- 4 suggestions get auto-widgets: Training Load (sum), Zone 2 % (avg), Sleep Efficiency (avg), Net Caloric Balance (sum)
- CorrelatorModal: uses new action for suggestion acceptance, shows "Widget added ✓" note

**2c. ⓘ info icon on all correlation cards**
- New `CorrelationInsightSheet`: bottom sheet with what/howToRead/ranges/widgetNote
- `CorrelationCard` + `MacroGroupCard`: made `'use client'`, added `Info` icon top-right, opens sheet on tap
- New `insights.ts`: static lookup for 6 system correlations (Training Load, Zone 2 %, Sleep Efficiency, Net Caloric Balance, Protein per kg, Macro Split)
- User-created correlations fall back to generic message

---

### Task 3 — Widget aggregation sum/avg for correlator period widgets
**Status:** ✅ DEPLOYED (commit `c40bbd9`)
**Files:** `src/types/widget.ts`, `src/types/correlator.ts`, `src/lib/db/dashboard.ts`, `src/lib/db/dashboard-data.ts`, `src/lib/correlator/suggestions.ts`, `src/app/actions/correlations.ts`

**Problem:** Period-based correlator widgets always summed daily values. Zone 2 % "This Week" would show 38% (18+20) instead of 19% average — nonsensical for rate/percentage metrics.

**DB migration:** `ALTER TABLE widgets ADD COLUMN IF NOT EXISTS aggregation TEXT NOT NULL DEFAULT 'sum' CHECK (aggregation IN ('sum', 'avg'))`

**Fix:**
- `Widget` type + `WIDGET_COLUMNS` + `createWidget`/`updateWidget`: include `aggregation`
- `computeWidgetValueOptimized`: when `period = this_week/last_week`, divide `cumulativeValue / dayCount` when `widget.aggregation === 'avg'`
- suggestions.ts: all 4 `autoWidget` entries now declare correct aggregation
- Action: passes `aggregation` through to `createWidget`

| Correlator | Aggregation |
|---|---|
| Training Load | sum |
| Calorie Balance | sum |
| Zone 2 % | avg |
| Sleep Efficiency | avg |

---

### Task 4 — Permanent fix: prefix-stripping in buildCrossTrackerMap
**Status:** ✅ DEPLOYED (commit `e52ae0e`)
**Files:** `src/lib/correlator/formula-engine.ts`, `src/lib/correlator/suggestions.ts`

**Problem:** User deleted and recreated correlators from Suggest. New formulas again used `"Workout duration"` (Running tracker label) because `resolveField` picks Running first. DB fix would need re-applying every time.

**Root cause (final):** crossTracker lookup is exact-normalized-label match. `"Workout duration"` → `workoutduration` ≠ `duration` ← `"Duration "`. No amount of type-agnostic fallback helps because the labels themselves differ.

**Permanent fix — `buildCrossTrackerMap` prefix stripping:**
- Defined `LABEL_PREFIXES = ['workout', 'session', 'training', 'exercise', 'total', 'active', 'daily']`
- For each field, also accumulate under prefix-stripped key: `"Workout duration"` → also stored as `workout:duration`
- Result: formula using `"Duration"` finds BOTH Training's `"Duration "` AND Running's `"Workout duration"`

**Permanent fix — canonical label in suggestions:**
- Training Load: `ctMinutes(duration.trackerType, 'Duration', duration.fieldType)` — not `displayLabel`
- Zone 2 %: `ct(totalDuration.trackerType, 'Duration', 'sum')` — not `displayLabel`
- Future recreates from Suggest will always write `"Duration"` → works for all workout trackers

**DB fix re-applied** via SQL (same as Task 1) to fix the formulas created during this session.

---

### Task 5 — Widget detail page: no data + correlator target matching
**Status:** ✅ DEPLOYED (commit `5e634e9`)
**Files:** `src/app/(app)/(content)/dashboard/widget/[widgetId]/page.tsx`, `src/components/dashboard/EditWidgetModal.tsx`

**5a. Widget detail page showed no history for crossTracker/chained correlations**
- `extractTrackerIds` only handled `field`+`op` nodes → returned `[]` for `crossTracker`, `lastKnown`, `correlator` nodes → no logs fetched → all daily points null
- `evaluateFormula` called without `crossTrackerMap` or allCorrelations → crossTracker nodes always null, correlator chains (Net Caloric Balance + TEF) always null
- Fix: added `hasCrossTrackerNodes` + `extractCrossTrackerTypes` helpers; correlator branch now fetches all correlations + logs from all trackers of required types; evaluates with `buildCrossTrackerMap` + `buildFieldValueMapWithCorrelators`

**5b. Target not matched for correlator widgets**
- Target lookup checked `t.trackerId === widget.tracker_id` but correlator widgets have `tracker_id = null`
- Correlation targets store `trackerId: '__correlations__'` + `fieldId: correlationId`
- Fix: correlator-aware lookup in both page.tsx and EditWidgetModal.tsx

**5c. Unit empty for correlator widgets**
- `unit` came from `fieldDef?.unit` (null for correlators) → `''`
- Fix: pass `correlation.unit` for correlator widgets

---

### Task 6 — Inline target step after suggestion creation
**Status:** ✅ DEPLOYED (commit `78f2135`)
**Files:** `src/app/actions/correlations.ts`, `src/components/journal/CorrelatorModal.tsx`

**Problem:** User can't set a target at suggestion creation time because the correlation doesn't exist yet (target needs correlationId). After auto-widget creation, there was no way to set a target inline.

**Fix:**
- `createCorrelationsFromSuggestionAction` now returns `{ success: true, correlationId: string }`
- After accepting a suggestion with `autoWidget`, modal transitions to a "🎯 Set a target?" step (instead of closing)
- Shows metric name, number input, unit, Set Target + Skip buttons
- Set Target → calls `addTargetAction` with `trackerId: '__correlations__'` + `fieldId: correlationId` → closes modal
- Skip → closes modal (target can be added later from Settings → Targets)

---

### Task 7 — TEF missing from suggestions + target step fixes
**Status:** ✅ DEPLOYED (commits `c404280`, `c8e0e8c`, `4074cb1`)
**Files:** `src/lib/correlator/suggestions.ts`, `src/lib/correlator/insights.ts`, `src/components/journal/CorrelatorModal.tsx`

**7a. TEF not in suggestions list**
- TEF was created by the old Gemini engine for armaan's account. New deterministic engine (Task 3 from 2026-06-12) never included TEF as a template → new users permanently blocked from creating Net Caloric Balance (which requires TEF)
- Fix: added TEF template to suggestions.ts — requires Protein, Carbs, Fat from nutrition tracker
- Formula: `protein * 1.12 + carbs * 0.28 + fat * 0.225` (28%/7%/2.5% of macro calories)
- Added TEF insight entry to insights.ts with ranges

**7b. "weekly target" label removed**
- Inline target step said "Set a weekly target?" — system only has daily targets
- Fix: changed to "Set a target? (optional)"

**7c. Inline target step missing direction picker**
- Target step was hardcoded to `direction: 'above'`, no UI for direction
- Fix: added Direction picker ("↑ At least / ↓ No more than") matching real Settings → Targets flow
- Added dynamic label ("At least (%)" / "No more than (%)") 
- Unit shown inline in input field
- Resets direction + value on each open

---

## Carry-Forward to Next Session

1. **Agent Forge date bug** — logs to previous day, root cause unknown. `activeAgent` branch in `route.ts` ~line 723
2. **Auto-expire stale day sessions** (safety net)
3. **Guide sections 3–6** in `/settings/guide`
4. **GIF assets for onboarding steps 1–10**
5. **Vercel git integration** — still broken, all deploys require `npx vercel deploy --prod`
6. **Existing users' widgets** — Zone 2 % and Training Load widgets added manually will use default `aggregation='sum'` from DB. If user has pre-existing widgets for these, they should delete and re-add from Suggest to get correct avg aggregation.

## Carry-Forward to Next Session

1. **Agent Forge date bug** — logs to previous day, root cause unknown. `activeAgent` branch in `route.ts` ~line 723
2. **Auto-expire stale day sessions** (safety net)
3. **Guide sections 3–6** in `/settings/guide`
4. **GIF assets for onboarding steps 1–10**
5. **Vercel git integration** — still broken, all deploys require `npx vercel deploy --prod`
6. **Verify target appears in Settings → Targets** after inline creation from correlator modal

---

## Commits This Session

| Commit | Description |
|--------|-------------|
| DB fix (no commit) | SQL UPDATE: Training Load + Zone 2 % formulas → "Duration" |
| `6354bc4` | feat: correlation ⓘ insights, auto-widget on suggest, crossTracker fix in dashboard |
| `c40bbd9` | feat: widget aggregation sum/avg for correlator period widgets |
| `e52ae0e` | fix(correlator): prefix-strip in buildCrossTrackerMap + canonical Duration label |
| `5e634e9` | fix(dashboard): widget detail data + correlator target matching |
| `78f2135` | feat: inline target step after suggestion creation |
| `c8e0e8c` | fix: remove 'weekly' from target prompt in correlator modal |
| `c404280` | feat: add TEF suggestion + insight |
| `4074cb1` | fix(correlator): target step matches real flow — direction picker + proper labels |
