# Technical Log V1 — 2026-06-11
**Covers:** Logging date revert, static guide page, Day Start warning modal

---

## 1. Logging Date Revert

**File:** `src/app/api/chat/route.ts` (~line 310)

**Change:**
```typescript
// BEFORE (bad fix from previous session):
// Always use the client-supplied actual date (today). A stale day session
// (started on a previous day and never ended) must NOT redirect new logs to
// that old date — that was the root cause of logs appearing on the wrong day.
// The session is kept for routine-step tracking only; it no longer owns the log date.
const loggingDate = today

// AFTER (correct):
// If an active day session exists (Start Day run, End Day not yet complete),
// all logs belong to that session's date — even if midnight has passed.
// The session owns the log date until End Day clears it.
// Only fall back to today when there is no active session at all.
const loggingDate = finalActiveDayState?.date ?? today
```

**Why the previous fix was wrong:**
- Original bug: Agent Forge ONLY was logging to previous day. Regular chat and routines were fine.
- Fix applied: `loggingDate = today` — ignored active session date entirely
- Regression: User runs Start Day on June 10, goes to sleep, wakes up June 11 at 5:55am. End Day not yet run. All logs now going to June 11 instead of June 10.
- Correct: Active session owns the date until End Day fires `markDayEnded()` and clears `day_state`.

**Agent Forge bug status:** Still unresolved. Root cause unknown. Added to CLAUDE.md Known Gotchas.

---

## 2. Static Guide Page

**New file:** `src/app/(app)/(content)/settings/guide/page.tsx`

**Server component — no data fetching.** Three build iterations:

### Components in the file
```typescript
StepBadge({ n })              // Numbered circle
MethodCard({ icon, iconColor, title, subtitle, children })  // Card container
PromptExample({ text })       // Monospace copyable prompt with Copy icon
GuideStep({ n, text })        // Numbered step with badge
FieldTypeRow({ label, color, description })  // Coloured pill + description row
```

### Final page structure
```
Header (← Settings back link, H1 "How to Use YAHA")
│
├── Section 1 — Save to Home Screen
│   ├── iOS card: Safari → Share button → Add to Home Screen → Add (4 steps)
│   └── Android card: Chrome → 3-dot menu → Install App → Confirm (4 steps)
│
├── Section 2 — Create Your Trackers
│   ├── Via Chat card
│   │   ├── Text prompts (2 copyable examples)
│   │   ├── Screenshot tip callout (green) — attach Fitbit/Garmin/Apple Health screenshot
│   │   └── "What happens next" box
│   ├── Manual card
│   │   ├── 5 numbered steps
│   │   └── "Open Tracker Builder →" Link to /trackers/new
│   ├── AI disclaimer (amber, AlertTriangle icon)
│   │   ├── Check tracker type (Workout/Nutrition/Sleep/Custom)
│   │   ├── Check field types (Duration/Number/Time/Rating/Select/Text)
│   │   └── Check units (kg vs lbs, km vs mi, kcal vs kJ)
│   └── Field type guide (7 FieldTypeRows)
│       ├── Number — plain numeric value
│       ├── Duration — length of time (sleep, workout) — NOT a clock time
│       ├── Time — specific clock time (bedtime, wake time) — NOT a duration
│       ├── Rating — 1–10 score, tap-to-pick scale
│       ├── Select — dropdown, fixed options, pick one
│       ├── Multi-Select — same, pick multiple
│       └── Text — free-form notes, can't be graphed
│
└── Coming Next teaser (Steps 3–6, greyed out, dashed border)
    Steps: Logging Data, Dashboard Widgets, Daily Routines, Food Bank
```

### Settings entry point
**Modified:** `src/components/settings/SettingsForm.tsx`
- Added `BookOpen` to lucide-react imports
- Added "Help & Guide" Section before Sign Out:
  - Purple color scheme (`rgba(168,85,247,...)`)
  - Link → `/settings/guide`
  - Label: "How to Use YAHA"

---

## 3. Day Start Warning Modal

**File:** `src/components/routines/RoutineForm.tsx`

**New state:**
```typescript
const [showDayStartWarning, setShowDayStartWarning] = useState<boolean>(false)
const [pendingType, setPendingType] = useState<RoutineType | null>(null)
```

**Intercepted handler:**
```typescript
function handleTypeChange(value: RoutineType): void {
  if (value === 'day_start') {
    setPendingType('day_start')
    setShowDayStartWarning(true)
  } else {
    setType(value)
  }
}

function handleWarningConfirm(): void {
  if (pendingType) setType(pendingType)
  setPendingType(null)
  setShowDayStartWarning(false)
}
```

**Select `onChange` updated:** `(e) => setType(...)` → `(e) => handleTypeChange(...)`

**Modal structure:**
```
fixed inset-0 z-50 backdrop-blur-sm bg-black/70
└── max-w-md rounded-[32px] border-amber-500/20 bg-[#0A0A0A]
    ├── Header: amber AlertTriangle icon + "Day Start needs a Day End"
    ├── Body:
    │   ├── Para 1: Day Start opens a session, all logs go to that date until Day End
    │   ├── Para 2: Without Day End, session stays open forever
    │   └── Callout: Day End doesn't need steps — create blank, skip in chat
    └── "I Understand — Continue" button (amber bg, full width)
```

**Behaviour:**
- Fires every time user selects `day_start` from the dropdown
- Standard / Day End → no modal, type sets directly
- "I Understand" → `setType('day_start')`, dismiss modal
- If user switches away and back to day_start → modal fires again

**Why this exists:**
- Start Day without End Day = session never closes
- All future logs pile into the same date indefinitely
- End Day can be blank (0 steps) — user just needs it to exist
- Only-End-Day is fine: just marks that day's session as ended

---

## Build Verification
- `npx tsc --noEmit` — zero errors in all changed files
- Deployed to Vercel — READY ✅

[CA | 2026-06-11] All three items delivered and deployed.
