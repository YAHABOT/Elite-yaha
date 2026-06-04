# Technical Log V36 — Correlator Fix + Combined Field Widget

**Date:** 2026-06-03  
**Agent:** [CA | session]  
**Build verdict:** PASS

---

## Changes

### Fix 1 — `src/lib/correlator/formula-engine.ts`
`buildFieldValueMap` now accepts numeric strings via `parseFloat()`. Previously `typeof value !== 'number'` caused all AI-logged string values (e.g. `"500"`) to be skipped silently. Fix uses `NaN` guard after parse.

### Fix 2 — `src/components/dashboard/AddWidgetModal.tsx`
Submit button now disabled when `entryMode === 'correlator' && !selectedCorrelationId`. Added "Select a formula to continue." hint text beneath the dropdown when nothing is selected.

### Fix 3 — `src/lib/db/dashboard-data.ts`
Correlator case in `computeWidgetValueOptimized` now computes a 7-day sparkline trend. Per-day buckets use `l.logged_at.startsWith(dayStr)` — same pattern as `computeDailyPointsFromLogs`. Returns `trend: undefined` when all values are zero.

### Fix 4 — `combined_field` widget type

**`src/types/widget.ts`** — Added `'combined_field'` to `WidgetType` union and `WIDGET_TYPES` array.

**`src/lib/db/dashboard-data.ts`** — New `combined_field` case in `computeWidgetValueOptimized`:
- Parses `field_id` encoded as `combined:{trackerType}:{normalizedLabel}`
- Collects all `fieldId`s from matching trackers whose label normalizes to the target label
- Aggregates with `filterByPeriod` (same as `field_total`)
- Includes 7-day sparkline; returns `trend: undefined` if all zero

**`src/components/dashboard/AddWidgetModal.tsx`** — Full UI integration:
- New `EntryMode` value `'combined_field'`
- `CombinedOption` type + `TYPE_COLORS` constant at module level
- `combinedOptions` computed via IIFE — groups trackers by type, finds labels present in 2+ trackers with non-text fields
- "Combined Fields" section in Step 1 (above Correlator), only rendered when `combinedOptions.length > 0`
- `handleSelectCombinedField()` handler sets mode and jumps to config step
- Step 3 config branch shows tracker type info card + aggregation buttons (today/this_week/last_week/average/total) + optional N-day input
- `defaultLabel` returns `"{label} (Combined)"`
- `stepSubtitle` returns `'Combined Field · Configure'`
- `handleBack` resets `selectedCombined` when backing out of combined_field config

**`src/components/dashboard/EditWidgetModal.tsx`** — Added `combined_field: 'Combined Field'` to `WIDGET_TYPE_LABELS` (required by `Record<WidgetType, string>` exhaustiveness; discovered during build).

---

## Build Artifact Checklist
- [x] UI elements visible — Combined Fields section appears in Step 1 when 2+ same-type trackers share a numeric field label
- [x] No DB migration — `field_id` encoding (`combined:{type}:{label}`) reuses existing column
- [x] Route resolves — `/dashboard` builds cleanly (ƒ dynamic)
- [x] No new env vars required
- [x] No secrets logged
- [x] Error messages meaningful — "Select a formula to continue." user-visible

## Validation
```
npm run lint  → 0 errors (2 pre-existing warnings, unchanged)
npm run build → SUCCESS, 25 static pages generated
```
