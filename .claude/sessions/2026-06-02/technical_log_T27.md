# Technical Log T27 — Dashboard Fixes (4 issues)

**Date:** 2026-06-02
**Agent:** [CA | T27]
**Build:** PASS (tsc + next build, zero non-test errors)

---

## Fix 1 — Floating point display

**File:** `src/components/dashboard/WidgetCard.tsx`

Added `formatDisplayValue(val)` helper: rounds to 1 decimal, strips trailing `.0` for integers.
Replaced raw `String(value.value)` with `formatDisplayValue(value.value)` for main display.
Replaced `String(ev.value)` in `MultiMetricStrip` with `formatDisplayValue(ev.value) ?? '—'`.
`Math.round(numericValue)` already used in ring progress "to go" calculation — no change needed there.

---

## Fix 2 — Days window free typing

**File:** `src/components/dashboard/AddWidgetModal.tsx`

Changed `days: number` state to `daysStr: string` initialized to `String(DEFAULT_DAYS)`.
Input now binds `value={daysStr}` and `onChange={e => setDaysStr(e.target.value)}` — allows backspace/retype.
`handleSubmit` parses: `const daysNum = Math.max(1, Math.min(365, parseInt(daysStr, 10) || DEFAULT_DAYS))`.
`handleBack()` resets `daysStr` to `String(DEFAULT_DAYS)`.

---

## Fix 3 — New `tracker_latest` widget type

### 3a — `src/types/widget.ts`
- Added `'tracker_latest'` to `WidgetType` union and `WIDGET_TYPES` array (position: before `correlator`).
- Added `loggedAt?: string` to `WidgetValue`.

### 3b — Migration
- File: `supabase/migrations/20260602000003_add_tracker_latest_widget.sql`
- Drops old type CHECK constraint, adds new one including `'tracker_latest'`.
- Applied to project `jfretlgjsthhmlmgmlog` via Supabase MCP — status: success.

### 3c — `src/lib/db/dashboard-data.ts`
- Added `import type { Tracker } from '@/types/tracker'`.
- Added `trackers: Tracker[] = []` as 5th parameter to `computeWidgetValueOptimized`.
- Added `case 'tracker_latest'`: finds most-recent log across `[...todayLogs, ...nDayLogs]`, maps all fields using tracker schema for labels/units, returns `{ value: null, loggedAt, extraValues }`.

### 3d — `src/app/(app)/(content)/dashboard/page.tsx`
- Passes `trackers` as 5th argument to `computeWidgetValueOptimized`.

### 3e — `src/components/dashboard/WidgetCard.tsx`
- Added `timeAgo(isoStr)` helper (m/h/d ago).
- `isLatestEntry = widget.type === 'tracker_latest'`.
- `isMultiMetric` now also true for `isLatestEntry` (not just `isFull`) when extraValues present.
- Value section: when `isLatestEntry && !displayValue`, renders `timeAgo(value.loggedAt)` instead of dash.

### 3f — `src/components/dashboard/AddWidgetModal.tsx`
- Added `tracker_latest: 'Latest Entry'` to `WIDGET_TYPE_LABELS`.
- Added description to `WIDGET_TYPE_DESCRIPTIONS`.
- `isTrackerOnlyType = selectedType === 'tracker_latest'`.
- Tracker selector shown for `isFieldType || isTrackerOnlyType`.
- Field selector and additional fields hidden when `isTrackerOnlyType`.
- Days window hidden when `isTrackerOnlyType`.
- Submit: `tracker_id` set for `isFieldType || isTrackerOnlyType`; `field_id` only for `isFieldType`.

---

## Fix 4 — Edit existing widgets

### 4a — `src/app/actions/dashboard.ts`
- Added `updateWidget` to imports from `@/lib/db/dashboard`.
- Added `updateWidgetAction(id, data)` Server Action with label length + days range validation.

### 4b — `src/components/dashboard/EditWidgetModal.tsx` (new file)
- Single-step modal pre-populated from existing widget.
- Props: `{ widget: Widget, trackers: Tracker[], onClose: () => void }`.
- Widget type shown as read-only badge in header.
- Shows tracker selector (if field type or tracker_latest), field selector + extra fields (if field type), days input (if field_average or field_total), label input, card size toggle.
- On submit: calls `updateWidgetAction(widget.id, {...})`.
- Style identical to `AddWidgetModal` (same rounded-3xl, same input classes, same button styles).

### 4c — `src/components/dashboard/WidgetCard.tsx`
- Added `onEdit?: () => void` to `Props`.
- Edit mode shows both pencil and delete buttons (wrapped in a flex div).
- Pencil button: `hover:border-white/40 hover:text-textPrimary`.
- Added `Pencil` to lucide-react imports.

### 4d — `src/components/dashboard/DashboardClient.tsx`
- Added `useRouter` from `next/navigation`.
- Added `EditWidgetModal` import.
- Added `editingWidget: Widget | null` state.
- Passes `onEdit={() => setEditingWidget(widget)}` to each `<WidgetCard>`.
- Renders `<EditWidgetModal>` when `editingWidget !== null`; `onClose` calls `setEditingWidget(null)` then `router.refresh()`.

---

## Files Changed

- `src/components/dashboard/WidgetCard.tsx` (modified)
- `src/components/dashboard/AddWidgetModal.tsx` (modified)
- `src/components/dashboard/DashboardClient.tsx` (modified)
- `src/components/dashboard/EditWidgetModal.tsx` (created)
- `src/types/widget.ts` (modified)
- `src/lib/db/dashboard-data.ts` (modified)
- `src/app/(app)/(content)/dashboard/page.tsx` (modified)
- `src/app/actions/dashboard.ts` (modified)
- `supabase/migrations/20260602000003_add_tracker_latest_widget.sql` (created, applied)

## Validation

- `npx tsc --noEmit`: 0 errors outside `src/__tests__/` (pre-existing test errors unchanged)
- `npx next build`: PASS — all routes compile, no build errors
