# Technical Log T24 — Multi-Metric Full-Width Dashboard Cards

**Date:** 2026-06-02
**Feature:** Multi-metric widget cards showing 2–4 fields from one tracker in a single full-width card

---

## Summary

Implemented `extra_fields` support across the full dashboard stack: DB schema, types, data access, computation, UI rendering, and the add-widget modal.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `supabase/migrations/20260602000002_add_widget_extra_fields.sql` | Created | Adds `extra_fields JSONB NOT NULL DEFAULT '[]'` to widgets table |
| `src/types/widget.ts` | Modified | Added `ExtraField`, `ExtraFieldValue` types; added `extra_fields?` to `Widget`; added `extraValues?` to `WidgetValue` |
| `src/lib/db/dashboard.ts` | Modified | Added `extra_fields` to `WIDGET_COLUMNS`, `createWidget` insert, and `updateWidget` conditional update block |
| `src/lib/db/dashboard-data.ts` | Modified | Added `computeFieldValue` helper; wired `extraValues` into all three field-type case branches of `computeWidgetValueOptimized` |
| `src/components/dashboard/WidgetCard.tsx` | Modified | Added `MultiMetricStrip` sub-component; added `isMultiMetric` detection; renders strip after sparkline; slightly reduces headline font for multi-metric mode |
| `src/components/dashboard/AddWidgetModal.tsx` | Modified | Added `ExtraField` import, `Plus` import, `extraFields` state, tracker-change reset, "Additional Fields" UI section (up to 3 fields), `extra_fields` in submit payload |

---

## Implementation Details

### computeFieldValue helper
Placed just before `computeWidgetValueOptimized` in `dashboard-data.ts`. Handles all three widget types:
- `field_latest`: reads from `trackerLogs[0].fields[fieldId]` (pre-filtered to tracker, ordered desc)
- `field_average`/`field_total`: applies the `widgetDays` cutoff window inside the helper itself, so callers pass the full tracker-scoped `nDayLogs` slice

### Log array selection per case
- `field_latest`: passes `todayWidgetLogs` (already filtered to `tracker_id`)
- `field_average`/`field_total`: passes `nDayLogs.filter(l => l.tracker_id === widget.tracker_id)` — helper handles the days cutoff internally to avoid duplicate date-math

### Server Action passthrough
No changes needed — `createWidgetAction` does `createWidget({ ...input, label, days, width })`, so `extra_fields` from `input` flows through the spread untouched.

### DashboardClient
No changes needed — `col-span-2` wrapper already handles full-width layout.

---

## Gotchas / Deviations

1. **`color` param in `MultiMetricStrip`**: The spec passes `color` to the strip. To satisfy TypeScript's no-unused-vars rule cleanly, added `void color` inside the function body (the strip uses a fixed muted gradient per spec, color is reserved for future tinting).

2. **`computeFieldValue` days window**: The helper re-computes the cutoff date from `widgetDays`. For `field_latest`, it ignores the cutoff (reads from the first log in the pre-sorted array). For average/total, it filters by `widgetDays` internally. This means callers must pass the full tracker-scoped nDayLogs (not already-windowed logs) to the helper — which is what the implementation does.

3. **Pre-existing test errors**: `npx tsc --noEmit` shows errors only in `src/__tests__/` — all pre-existing, zero source file errors introduced by this change.

---

## Validation

- `npx tsc --noEmit`: Zero source file errors (test file errors are pre-existing)
- `npx next build`: Compiled successfully, 22/22 static pages generated, no new warnings

---

[CA | 14:30] Delivered T24
