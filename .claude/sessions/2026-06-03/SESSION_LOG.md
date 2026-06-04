# Session 2026-06-03 — V36-V37: Score System + Cross-Tracker Aggregation + Dashboard Widgets

**Status:** CLOSED ✓
**Branch:** feat/mvp-build
**Previous:** 2026-06-02 CLOSED ✓

---

## Carry-Over from 2026-06-02

| Task | Status | Notes |
|------|--------|-------|
| CT-2.1 CR findings v32 | ⏳ Deferred | Non-blocking |
| CT-3 QA Testing | ⏳ Deferred | 67 test cases pending |
| T15 Routine Step 2 auto-advance | ⏳ Pinned | Awaiting repro screenshot |
| T23 Dashboard overhaul | ⏳ Pending QA | Half/full width + multi-metric cards, built |
| T24 Multi-metric cards | ⏳ Pending QA | extra_fields JSONB, built |
| T25 Correlations in targets | ⏳ Pending QA | /settings/targets/new, built |
| T26 AI Summaries spec | ✓ Spec written | docs/plans/2026-06-02-ai-summaries.md |

---

## Tasks Completed This Session

### [T28] Score System — ScoreCard + WeeklyBarChart + daily_scores DB ✓ COMPLETE
**What:** ScoreCard ring 88×88 (r=36); dynamic tier colors. WeeklyBarChart bar colors per tier. `daily_scores` DB table — upsert on every `confirmLogAction`.
**Files:** `ScoreCard.tsx`, `WeeklyBarChart.tsx`, `src/lib/db/scores.ts` (new), `chat.ts`, migration `20260603000003`
[CA | session] Delivered

### [T29] AI Summaries — Daily Score Breakdown in Prompt ✓ COMPLETE
**What:** `summary-generator.ts` fetches `daily_scores`, injects `buildDailyBreakdown()` into prompt.
**Files:** `src/lib/ai/summary-generator.ts`
[CA | session] Delivered

### [T30] Photo Logging — Calibration Rules + Step 0 ✓ COMPLETE
**What:** `PHOTO PORTION CALIBRATION` block (−30% camera inflation, sanity gate). Step 0 asks home/restaurant context.
**Files:** `src/lib/ai/prompt-builder.ts`
[CA | session] Delivered

### [T31] Token Optimisation — Conditional Rule Injection + Smart Day Summary ✓ COMPLETE
**What:** ~950 tokens/message saved. Compact day summary default; vision rules injected only on image messages; duration rules only if user has duration fields.
**Files:** `prompt-builder.ts`, `src/app/api/chat/route.ts`
[CA | session] Delivered

### [T32] AI Summary — Correlation Data + Target Accuracy + Picker UX ✓ COMPLETE
**What:** Correlations injected into summary prompt; `✓ MET / ✗ MISSED` annotations; picker multi-select fixed.
**Files:** `LinkedFieldsPicker.tsx`, `SummaryConfigCard.tsx`, `summary-generator.ts`
[CA | session] Delivered

### [T33] AI Summaries — Deferred + UI Hidden ✓ COMPLETE
**What:** Feature hidden from UI (backend preserved). Debug log added. Plan at `docs/plans/ai-summaries-deferred.md`.
**Files:** `SettingsForm.tsx`, `DashboardClient.tsx`
[CA | session] Delivered

### [T34] Navigation Speed — `unstable_cache` + prefetch ✓ COMPLETE
**What:** `unstable_cache` on 6 DAL functions + `revalidateTag` on 7 action files + `prefetch={true}` on all nav links.
**Files:** 6 DAL + 7 action files + `MobileBottomNav.tsx`
[CA | session] Delivered

---

### [T35] Cross-Tracker Type Aggregation ✓ COMPLETE
**What:**
1. **SchemaEditor type selector** — tracker type editable after creation; horizontal pill selector with type colors.
2. **Journal Combined row** — when 2+ trackers share type + field label, a "Combined" aggregate row renders after the last tracker of that type (follows drag order). Collapsible via chevron (starts closed). Configurable (sum/avg per field, show/hide) via same `TotalsConfigModal` pattern stored in separate `journal_cross_totals_config` localStorage key.
3. **Drag** — free drag (each tracker moves independently); Combined row floats to last tracker of its type.
**Files:**
- `src/components/trackers/SchemaEditor.tsx`
- `src/components/journal/TotalsConfigModal.tsx` (added `CrossTrackerTotalsConfig` helpers)
- `src/components/journal/CrossTrackerAggregateRow.tsx` (new)
- `src/components/journal/DayView.tsx`
- `src/components/journal/SortableJournalList.tsx`
[CA | session] Delivered — commits `6f4eb62`, `067ca27`, `ad5e65c`

---

### [T36] Dashboard: Combined Field Widget + Correlator Fixes + Settings Cleanup ✓ COMPLETE
**What:**
1. **Correlator widget — blank value root cause fixed** — `buildFieldValueMap` was silently skipping string-typed numeric values (AI stores `"500"` not `500`). Now parses with `parseFloat()`.
2. **Correlator widget — validation** — "Add Widget" disabled until formula selected.
3. **Correlator widget — sparkline** — 7-day trend computed, same as field_average.
4. **Correlator widget — time window UI** — "Evaluate over" section added: Today / This Week / Last Week / Last N Days. Uses `filterByPeriod()` so this_week/last_week slice correctly.
5. **Combined Field widget (new type `combined_field`)** — AddWidget picker shows "Combined Fields" section when 2+ same-type trackers share a numeric field label. Widget stores `field_id = combined:{type}:{label}`. Aggregates across all matching trackers. Supports same period options (today/week/N-day). Sparkline included.
6. **DB migration `20260603000004`** — added `combined_field` to `widgets.type` CHECK constraint (was missing → "Failed to create widget").
7. **Settings** — removed Export JSON / Import JSON / Clear Local Data buttons.
**Files:**
- `src/lib/correlator/formula-engine.ts`
- `src/lib/db/dashboard-data.ts`
- `src/types/widget.ts`
- `src/components/dashboard/AddWidgetModal.tsx`
- `src/components/dashboard/EditWidgetModal.tsx`
- `src/components/settings/SettingsForm.tsx`
- `supabase/migrations/20260603000004_add_combined_field_widget.sql`
[CA | session] Delivered — commits `38c85af`, `3e5a642`

---

## Pending (Carry-Over to Next Session)

- **CT-2.1** Code review findings from v32 (low/medium — non-blocking)
- **CT-3** QA Testing (67 test cases)
- **T15** Routine Step 2 auto-advance — pinned, awaiting repro
- **T23/T24/T25** Dashboard + targets QA — awaiting user sign-off
- **T26** AI Summaries build — spec ready, cron + UI pending
- **T37** Targets: combined field source — when creating a target, allow selecting a combined cross-tracker field (same `combined:{type}:{label}` encoding) so targets track totals across both trackers. User confirmed this is desired.

---

## Commits This Session

| SHA | Message |
|-----|---------|
| `e2f9281` | feat(v36): score system, photo calibration, token optimisation, navigation speed, settings cleanup |
| `6f4eb62` | feat(journal): cross-tracker type aggregation + tracker type editing |
| `38c85af` | fix(dashboard): correlator widget + combined field widget + settings cleanup |
| `067ca27` | feat(journal): group-drag + collapsible combined row |
| `3e5a642` | fix(dashboard): correlator time window + combined_field DB constraint |
| `ad5e65c` | revert(journal): restore free drag, keep collapsible Combined row |
