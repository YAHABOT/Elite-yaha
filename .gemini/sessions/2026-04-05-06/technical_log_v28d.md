# Technical Log — V28-D
**Task:** Journal Header — Correlations Button + View Button Fix

## Changes

### src/components/journal/DayView.tsx
- "Cor." label changed to "Correlate" — fits on one line, no truncation
- View button (mobile drawer + desktop): added `onClick={() => router.push('/journal/correlations')}` — was a non-functional `<button>` with no handler
- View button (desktop): same onClick fix applied
- Both buttons now functional and fully labelled

## Validation
- `npm run build` ✅ exit 0

[CA | 08:10] V28-D delivered — Correlate label + View button wired
