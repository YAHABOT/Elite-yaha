# Technical Log V1 — Guide Page + Settings Entry Point
**Date:** 2026-06-10
**Feature:** How to Use YAHA — static guide page (Phase 1 of interactive guide)

---

## Files Created / Modified

### NEW: `src/app/(app)/(content)/settings/guide/page.tsx`
Server component. Static — no data fetching. Three iterations delivered this session:

**Final structure:**
```
/settings/guide
├── Header (back → Settings)
├── Section 1 — Save to Home Screen
│   ├── iOS card (Safari share → Add to Home Screen, 4 steps)
│   └── Android card (Chrome 3-dot → Install App, 4 steps)
├── Section 2 — Create Your Trackers
│   ├── Via Chat card
│   │   ├── Text description prompts (2 copyable examples)
│   │   ├── Screenshot tip callout (attach Fitbit/Garmin screenshot)
│   │   └── "What happens next" box
│   ├── Manual card
│   │   ├── 5 numbered steps
│   │   └── "Open Tracker Builder →" link to /trackers/new
│   ├── AI Disclaimer (amber) — verify tracker type, field types, units via Edit Schema
│   └── Field Type Guide (7 rows: Number, Duration, Time, Rating, Select, Multi-Select, Text)
└── Coming Next teaser (steps 3–6, greyed out)
```

**Key components:**
- `StepBadge` — numbered circle badge
- `MethodCard` — icon + title + subtitle + children container
- `PromptExample` — monospace copyable prompt with copy icon
- `GuideStep` — numbered step with badge
- `FieldTypeRow` — colour-coded pill + description row

**Icons used:** `ChevronLeft, MessageSquare, SlidersHorizontal, Copy, AlertTriangle, CheckCircle2, Share, MoreHorizontal` (all from lucide-react)

---

### MODIFIED: `src/components/settings/SettingsForm.tsx`
- Added `BookOpen` to lucide-react imports
- Added "Help & Guide" Section before Sign Out:
  - Purple color scheme (`rgba(168,85,247,...)`)
  - Link to `/settings/guide`
  - Label: "How to Use YAHA"
  - Subtitle: "Step-by-step guide — trackers, logging, dashboard, routines"

---

## Build Verification
- `npx tsc --noEmit` — zero errors in new/modified files (pre-existing test errors in `__tests__/ai/actions.test.ts` unrelated)
- Deployed to Vercel production — READY ✅

---

## Iteration Notes

**v1 → v2 change:** User feedback — screenshot tip was presented as a "3rd method" but is actually part of the chat method. Folded into Via Chat card. Added AI disclaimer block (amber, hard to miss) pointing users to Edit Schema to verify tracker type / field types / units.

**v2 → v3 change:** User pointed out "the first step is actually save to home screen". Renamed existing content to Section 2, added new Section 1 with iOS + Android install instructions. Updated Coming Next teaser from 2–5 to 3–6.

---

## Verdict
[CA | 10:30] PASS — static guide page deployed. Phase 2 (interactive checklist) planned, pending user approval.
