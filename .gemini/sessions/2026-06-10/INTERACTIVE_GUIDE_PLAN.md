# Interactive Onboarding Guide — Plan
**Date:** 2026-06-10
**Status:** PENDING USER REVIEW — next session go through this with user step by step

---

## Problem with Current Approach

The static `/settings/guide` page is the wrong format. Research confirms:
- Static text guides have <15% completion rate
- Nobody reads a guide page before using an app
- Showing a guide BEFORE the user sees the app causes abandonment

The static page can stay as a reference doc (people Google "how do I do X") but it should NOT be the primary onboarding tool.

---

## What to Build Instead

### Architecture: Persistent Floating Chip + Bottom Sheet Checklist

A small floating button lives bottom-right above the nav bar at all times. It shows a circular progress ring (e.g. "2 / 6"). Tapping it slides up a bottom sheet with a 6-step checklist. Never blocks the UI. Dismissible but restorable from Settings.

```
[ App UI — always accessible ]
                          ┌──────────────┐
                          │  ◉ 2/6       │  ← floating chip, bottom-right
                          └──────────────┘

[ Tap chip → bottom sheet slides up ]

┌─────────────────────────────────────┐
│  ████████░░░░  2 of 6 complete      │  ← progress bar
│─────────────────────────────────────│
│  ✅  Save to Home Screen            │  ← completed, muted
│  ✅  Log your first entry           │  ← completed, muted
│  ▶   Create your first tracker      │  ← ACTIVE — cyan left border
│  ·   Add a dashboard widget         │  ← locked (dim)
│  ·   Set up a daily routine         │  ← locked (dim)
│  ·   Connect Telegram  (optional)   │  ← locked (dim)
└─────────────────────────────────────┘
```

---

## The 6 Steps

| # | Step | How it auto-completes |
|---|------|-----------------------|
| 1 | Save to Home Screen | User taps "Mark as done" (can't auto-detect PWA install) |
| 2 | Log your first health entry | First ActionCard confirmed in chat |
| 3 | Create your first tracker | First tracker saved to DB |
| 4 | Add a dashboard widget | First widget saved |
| 5 | Set up a daily routine | First routine created |
| 6 | Connect Telegram *(optional)* | Telegram connected OR user taps "Skip" |

---

## Step Card Design

**Collapsed state:**
```
[icon]  Step name                          [✅ or ›]
```

**Expanded state (active step):**
```
┌─────────────────────────────────────┐
│  [looping GIF — 3–5 sec, exact UI]  │
│─────────────────────────────────────│
│  Short title                        │
│  2-sentence description.            │
│                                     │
│  [ Try it now → ]                   │
└─────────────────────────────────────┘
```

**Completed state:** muted opacity, filled cyan checkmark, no GIF.
**Active state:** cyan left border (2px), full opacity, slightly elevated.

---

## Visual Design (OLED)

| Element | Token |
|---------|-------|
| Sheet background | `surface` `#0A0A0A` |
| Active step left border | `#06b6d4` (cyan) |
| Progress ring fill | `#06b6d4` |
| Progress ring track | `#1E1E1E` |
| Completed checkmark | `#06b6d4` |
| Step title | `#F5F5F5` |
| Step description | `#A1A1AA` |
| GIF container bg | `surfaceHighlight` `#121212` |
| Completion animation | 200ms scale 0.8→1.0 + cyan glow pulse on checkmark |

---

## Progressive Unlock

**Option A — Progressive (recommended by research):**
- Day 1: steps 1–2 visible
- After first log confirmed: steps 3–4 unlock
- After Day 3: steps 5–6 unlock
- Prevents overwhelm, maps to real product familiarity

**Option B — All visible day 1:**
- Simpler to build
- Risk: seeing 6 steps at once can cause drop-off (decision fatigue)

→ **Need user to decide which option**

---

## GIF Assets Needed

Each step needs a 3–5 second looping screen recording. Until we have real GIFs, use static screenshots as fallback.

| Step | What to record |
|------|---------------|
| 1 | iOS Share sheet → Add to Home Screen |
| 2 | Chat input → ActionCard appears → Confirm tap |
| 3 | Tracker creation via chat OR manual builder |
| 4 | Add Widget modal → widget appears on dashboard |
| 5 | Routine chat flow → step-by-step execution |
| 6 | Telegram settings page |

→ **Need user to confirm: GIFs now or static screenshots as placeholder?**

---

## DB Schema

Need to persist checklist state per user so it survives page reload.

**Option A — Add to `users` table:**
```sql
ALTER TABLE users ADD COLUMN onboarding_steps jsonb DEFAULT '{}'::jsonb;
-- e.g. { "home_screen": true, "first_log": true, "first_tracker": false, ... }
```

**Option B — Derive from existing data (no migration):**
- `first_log` → check if `tracker_logs` has any rows for user
- `first_tracker` → check if `trackers` has any rows
- `first_widget` → check if `dashboard_widgets` has any rows
- `first_routine` → check if `routines` has any rows
- `home_screen` + `telegram` → still need a flag somewhere (can't derive)

→ **Hybrid recommended:** derive steps 2–5 from DB, store only `home_screen_done` + `telegram_done` + `dismissed` in `users.stats jsonb` (already exists, no migration needed)

---

## Auto-Complete Hooks

Steps 2–5 can auto-complete silently when the user does the action:
- **Step 2** — `confirmLogAction` already runs on ActionCard confirm → add onboarding update call
- **Step 3** — `createTrackerAction` → add onboarding update call
- **Step 4** — `saveWidgetAction` → add onboarding update call
- **Step 5** — `createRoutineAction` → add onboarding update call

No new endpoints needed — piggyback on existing Server Actions.

---

## Dismissal Behaviour

- Chip disappears permanently once all 6 steps complete
- OR user taps "Dismiss forever" in the sheet footer
- Dismissal stored in `users.stats.onboarding_dismissed = true`
- Can be restored via Settings → Help & Guide (already exists)

---

## Questions to Confirm with User Next Session

1. **Progressive unlock (A) or all visible day 1 (B)?**
2. **GIFs now or static screenshots as placeholder?**
3. **Step order correct?** Any step to add/remove?
4. **Chip position** — bottom-right above nav, or somewhere else?
5. **Completion celebration** — subtle cyan pulse only, or something more?

---

## Implementation Order (once approved)

1. DB layer — `getOnboardingState(userId)` util (derives from existing tables + reads `users.stats`)
2. `OnboardingChip` component — floating button with progress ring
3. `OnboardingSheet` component — bottom sheet with step cards
4. Auto-complete hooks — piggyback on existing Server Actions
5. Wire into app shell layout
6. Step 1 "Mark done" flow (manual, can't auto-detect)
7. GIF swap-in (when assets available)
