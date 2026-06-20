## V28-B Technical Log

[CA | 14:10] Fixed KCAL double unit display and date sanity check for stale AI-hallucinated dates.

### Fix 1 — KCAL Double Unit (ActionCard.tsx)

The unit badge previously rendered in the label header row alongside the field label text (e.g. "CALORIES" + "KCAL" badge side-by-side). This caused visual duplication since the label already semantically implies the unit.

Change: Removed the unit badge from the label header `<div>`. Moved unit rendering into the value row as a small inline suffix after the value text. Unit only renders when a value is present (not shown when displaying the `—` placeholder). Unit is now a muted `text-[9px]` span inline with the value, not a full pill badge.

### Fix 2 — Date Sanity Check (chat/route.ts)

Added a stale-date guard inside the `sanitizedActions` map (LOG_DATA cards only).

Logic:
1. Before the map, detect whether the user's message contains an explicit date reference using regex patterns: relative weekdays, slash/dash date formats, ISO dates, month names, ordinal numbers. Stored as `messageHasExplicitDate`.
2. Inside the map, for each LOG_DATA action: if `card.date` is more than 30 days before `loggingDate` AND `messageHasExplicitDate` is false, override `action.date` with `loggingDate` and log the override with delta in days.
3. Downstream schema enforcement and field sanitization use `actionWithDate` (not original `action`) so the corrected date flows through to the saved card.

### Validation
- `npm run lint`: Zero errors, pre-existing warnings only (none from changed files)
- `npm run build`: Compiled successfully in 5.8min, all 20 static pages generated, no type errors

### Files Changed
- src/components/chat/ActionCard.tsx (modified — unit badge moved from label row to value row)
- src/app/api/chat/route.ts (modified — date sanity guard added before sanitizedActions map)
