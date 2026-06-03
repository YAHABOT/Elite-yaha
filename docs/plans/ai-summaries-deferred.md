# AI Summaries — Deferred (pinned 2026-06-03)

> **Status:** Hidden from UI. All backend code preserved. Do NOT delete.
> **Re-enable checklist:** bottom of this file.

---

## What Was Built

Full AI weekly/monthly health summary pipeline using Gemini.

### Backend (all intact, all working in isolation)

| File | Purpose |
|------|---------|
| `src/lib/ai/summary-generator.ts` | Core generator: fetches logs, aggregates fields, builds prompt, calls Gemini, saves result |
| `src/lib/db/summaries.ts` | DAL: `getSummaryConfigs`, `upsertSummary`, `getPreviousSummary`, `getEnabledSummaryUserIds` |
| `src/lib/db/scores.ts` | `getDailyScoresForPeriod` — per-day score rows for compliance breakdown |
| `src/app/actions/summaries.ts` | `saveSummaryConfigAction`, `regenerateSummaryAction` |
| `src/app/api/summaries/generate/route.ts` | Cron endpoint — batch-generates for all enabled users |
| `supabase/migrations/20260602*_create_summaries.sql` | `summaries` + `summary_configs` tables |
| `supabase/migrations/20260603*_create_daily_scores.sql` | `daily_scores` table |

### UI (intact, just unreachable)

| File | Purpose |
|------|---------|
| `src/app/(app)/(content)/settings/summaries/page.tsx` | Config page (enable/disable, linked fields, instructions) |
| `src/app/(app)/(content)/dashboard/summaries/[type]/page.tsx` | Summary display page |
| `src/components/settings/SummaryConfigCard.tsx` | Per-type config card component |
| `src/components/settings/LinkedFieldsPicker.tsx` | Field picker modal (multi-select, Done button) |
| `src/components/dashboard/SummaryReportView.tsx` | Summary display component |

### What the prompt sends to Gemini

1. **Aggregated linked fields** — per-day totals averaged across the period, with `✓ MET`/`✗ MISSED` inline annotations
2. **Correlation formula values** — computed per-day from actual logs and injected as synthetic `__correlations__` tracker entries
3. **Daily score breakdown** — from `daily_scores` table (only has data from June 3 onwards; pre-June rows will be empty)
4. **Previous period metrics** — for delta comparison

---

## Why It Was Deferred

The generated summaries were showing wildly incorrect numbers (e.g. 364 kcal/day instead of ~3000 kcal/day, 23g protein instead of ~190g).

### Root causes identified and partially fixed

| Bug | Fixed? | Notes |
|-----|--------|-------|
| Per-entry averaging (divided by meal count not day count) | ✓ Fixed | `aggregateLinkedFields` now groups by date then averages daily totals |
| `lf.isCorrelation` undefined on old saved configs | ✓ Fixed | Filter now also checks `lf.trackerId === '__correlations__'` |
| Coach narrative contradicting metrics | ✓ Fixed | Added `✓ MET`/`✗ MISSED` annotations + prompt rule |

### Remaining suspected causes (not yet confirmed)

1. **The numbers are still orders-of-magnitude wrong (364 vs 3000 kcal)** — this points to a `fieldId` mismatch. The linked fields in `summary_configs.linked_fields` may have the wrong `fieldId` value (e.g. user picked a field that got a different `fld_xxx` ID than what's stored in `tracker_logs.fields`). Check by running the debug log (see below).

2. **`daily_scores` is empty for any period before June 3 2026** — the table was created on that date. Weekly summaries for May 25–31 have zero compliance rows. This is harmless but means the AI has no daily breakdown.

3. **Timezone: logs are queried in UTC, user logs in BST (UTC+1)** — logs from e.g. May 31 23:00 local = June 1 00:00 UTC are excluded from May 25–31 query window. Minor but real distortion on last-day logs.

4. **Wrong Gemini model name** — `GEMINI_MODEL = 'gemini-3.1-flash-lite'` in `summary-generator.ts`. Verify this is a valid model name; if not, the fallback error path would return an empty/garbage response.

---

## How to Debug When You Pick This Back Up

A debug log was added at line ~258 of `summary-generator.ts` (guarded by `// DEBUG` comment). It prints to the dev server terminal when regenerate is clicked:

```
[SummaryGenerator DEBUG] {
  period: "2026-05-25 → 2026-05-31",
  linkedFields: ["Nutrition.Calories (trackerId=abc, fieldId=fld_001, isCorrelation=undefined)"],
  totalLogs: 47,
  syntheticCorrelationLogs: 7,
  dailyScoreRows: 0,
  dataSection: "- Nutrition · Calories: avg/day 364 · total ...",
  dailyBreakdown: ""
}
```

**If `dataSection` shows wrong numbers:** the aggregation logic is broken — check fieldId matching between linked config and actual `tracker_logs.fields` keys.

**If `totalLogs: 0`:** the period query returns no logs — likely timezone issue or tracker IDs rotated.

**If `syntheticCorrelationLogs: 0` with correlations configured:** the `corrRows` DB query returned nothing — correlation IDs in the saved config don't match live `correlations` table IDs.

---

## Re-enable Checklist

1. **Verify the debug numbers are correct** (see above)
2. **Fix the Gemini model name** — check `GEMINI_MODEL` in `summary-generator.ts` against current Gemini API docs
3. In `src/components/settings/SettingsForm.tsx` — restore the AI Summaries `<Section>` block (see `AI_SUMMARIES_DEFERRED` comment)
4. In `src/components/dashboard/DashboardClient.tsx` — restore the summary pills block (see `AI_SUMMARIES_DEFERRED` comment)
5. Remove the `// DEBUG` console.log block from `summary-generator.ts` once numbers are confirmed correct
6. Test: set up weekly summary config → click Regenerate Now → verify metrics match actual journal data
