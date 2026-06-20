# Technical Log T23 — Dashboard Overhaul

**Date:** 2026-06-02  
**Task:** 3 bugs + 2 feature requests — dashboard widget system

---

## Summary

Fixed two critical bugs (wrong N-day values, label truncation) and implemented a full half/full-width card system with migration, type updates, DB layer, server action, grid layout, ring progress indicator, and modal UI.

---

## Changes Made

### Bug 1 — 7-day avg/total shows wrong values (CRITICAL)

**Root cause confirmed:** `dashboard/page.tsx` was fetching only `todayLogs` and passing them to `computeWidgetValueOptimized` for ALL widget types. `field_average` and `field_total` need N-day logs.

**Fix:** Replaced single `allLogs` fetch with two parallel fetches:
- `todayLogs` — filtered to today's date range, used for `field_latest`
- `nDayLogs` — from `maxDays` back (computed from `widgets.reduce`), used for `field_average`, `field_total`, `correlator`

**Updated `computeWidgetValueOptimized` signature:**
```typescript
export function computeWidgetValueOptimized(
  widget: Widget,
  todayLogs: TrackerLog[],
  nDayLogs: TrackerLog[],
  correlations: CorrelationRecord[]
): WidgetValue
```

Each widget type now filters `nDayLogs` by its own `widget.days` window (not just maxDays), so a 7-day widget and a 30-day widget sharing the same `nDayLogs` pool still get correct date filtering.

Also fixed a subtle mutation bug: `widgetLogs.reverse()` was mutating the input array. Changed to `[...todayWidgetLogs].reverse()` (spread before reverse).

### Bug 2 — Label truncation

Changed label `<span>` from `break-words` to `truncate` with `title={value.label}` tooltip. The label now ellipsis-truncates at the card boundary and shows full text on hover.

### Feature 1 — Half/Full-width card system

**Migration** (`supabase/migrations/20260602000001_add_widget_width.sql`):
```sql
ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS width TEXT NOT NULL DEFAULT 'half'
    CHECK (width IN ('half', 'full'));
```

**Type** (`src/types/widget.ts`): Added `width?: 'half' | 'full'` to `Widget` and (via `Omit`) to `CreateWidgetInput`.

**DB layer** (`src/lib/db/dashboard.ts`):
- Added `width` to `WIDGET_COLUMNS`
- `createWidget`: inserts `width: input.width ?? 'half'`
- `updateWidget`: maps `data.width` to `updates.width`

**Server Action** (`src/app/actions/dashboard.ts`):
- Passes `width` through with safe coercion: `const width = input.width === 'full' ? 'full' : 'half'`

**Grid** (`src/components/dashboard/DashboardClient.tsx`):
- Changed from `grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4` to `grid grid-cols-2 gap-3`
- Each widget is wrapped in a `<div className={widget.width === 'full' ? 'col-span-2' : ''}>` — the card itself stays unaware of its grid span, layout responsibility lives in the parent div.

**WidgetCard** (`src/components/dashboard/WidgetCard.tsx`):
- Added `RingProgress` component (inline SVG, no external dep) for full-width target progress
- Full-width cards: larger value font (`text-3xl md:text-4xl` vs `text-2xl md:text-3xl`), ring progress instead of bar
- Half-width cards: original bar progress unchanged
- `isFull = widget.width === 'full'` drives all conditional rendering

**AddWidgetModal** (`src/components/dashboard/AddWidgetModal.tsx`):
- Added `width` state (`useState<'half' | 'full'>('half')`)
- Added "Card Size" pill selector (two buttons: ½ Width / Full Width) after the label input
- `width` passed into `CreateWidgetInput` in `handleSubmit`

---

## Files Edited

- `supabase/migrations/20260602000001_add_widget_width.sql` (created)
- `src/types/widget.ts` (edited — added `width`)
- `src/lib/db/dashboard.ts` (edited — WIDGET_COLUMNS, createWidget, updateWidget)
- `src/app/actions/dashboard.ts` (edited — pass width through)
- `src/lib/db/dashboard-data.ts` (edited — new signature, two log arrays, date-window filtering per widget)
- `src/app/(app)/(content)/dashboard/page.tsx` (edited — two parallel log fetches, updated call)
- `src/components/dashboard/WidgetCard.tsx` (edited — truncate fix, RingProgress, full-width layout)
- `src/components/dashboard/DashboardClient.tsx` (edited — col-span-2 wrapper, removed responsive breakpoints)
- `src/components/dashboard/AddWidgetModal.tsx` (edited — width state, pill selector, pass through)

---

## Gotchas

1. `Array.reverse()` mutates in place — `widgetLogs.reverse()` in the original `field_latest` case was mutating the input array. Fixed with spread copy before reversing.
2. `md:grid-cols-3 lg:grid-cols-4` removed from the grid — these would break the col-span-2 layout at desktop breakpoints (a full-width widget in a 4-col grid would only span 2 of 4 columns). The 2-column grid is intentional for mobile-first design.
3. Migration uses `ADD COLUMN IF NOT EXISTS` so it is idempotent and safe to apply to a DB that already has the column.

---

## Validation

- `npx tsc --noEmit`: Zero errors in source files (all errors are pre-existing stale test fixtures in `src/__tests__/`)
- `npx next build`: PASS — all 28 routes compiled cleanly
- `npx next lint`: PASS — zero errors (one pre-existing warning in ChatInterface.tsx, unrelated)

---

[CA | 23:00] Delivered T23
