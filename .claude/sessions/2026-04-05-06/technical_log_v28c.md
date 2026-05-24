# Technical Log — V28-C
**Task:** Pull-to-Refresh Blocked + Chat Scroll Fix

## Changes

### Fix 1 — Pull-to-refresh blocked app-wide
- `src/app/globals.css` — added `overscroll-behavior-y: contain` to `body` block
- Prevents browser pull-to-refresh on iOS Safari and Android Chrome across all pages
- No JS required — pure CSS, applied at root level

### Fix 2 — Chat scroll / ActionCard unit
- `src/components/chat/ActionCard.tsx` — removed duplicate unit badge from label header row
- Unit now renders as muted inline suffix after the value (e.g. "865 kcal"), not as a separate chip in the label
- Chat page scroll chain already correct (`flex h-full min-h-0 overflow-hidden`) — no change needed

## Validation
- `npm run build` ✅ exit 0
- No new lint errors

[CA | 07:45] V28-C delivered — overscroll contain + KCAL unit deduplication
