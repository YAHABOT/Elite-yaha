# V27 Manual Test Checklist
**Branch:** feat/mvp-build | **PR:** https://github.com/YAHABOT/yaha/pull/2
**Source:** V26 full test report (.claude/sessions/2026-03-30/SESSION_LOG.md)

---

## P0 — Core Fixes (must all work)

- [ ] **Day lock auto-ends** — with a stale open session from a previous date, send a message → system auto-closes it and enters neutral state (no more indefinite lock)
- [ ] **End Day button visible past 7pm** — with an active session, open dashboard after 7pm → End Day button still shows (not hidden by time)
- [ ] **Start Day blocked while session open** — with yesterday's session still open, trigger Start Day (button or phrase) → blocked with error: "End yesterday's session first"
- [ ] **Settings toggle present** — Settings page → Preferences section → "Confirm on page refresh" toggle visible, toggles on/off, survives page refresh
- [ ] **Action card correct date** — log food/anything via chat → action card shows today's correct date (not March 4 or any stale date) → confirm → journal entry shows correct date

---

## P1 — Regressions to Recheck

- [ ] **Chat scroll (TC-01)** — open a new chat, send messages → header stays pinned at top, input bar stays pinned at bottom (was randomly broken before)
- [ ] **Journal scroll (TC-03)** — open journal, scroll through entries → header stays sticky, does not disappear
- [ ] **Routine resume on refresh** — start a routine, complete 1-2 steps, refresh the page → AI resumes from the correct step, does NOT restart from scratch
- [ ] **Today vs yesterday are different dates** — with NO active day session, say "log X for today" and "log X for yesterday" → two different dates saved in journal

---

## P2 — UI Bugs

- [ ] **Correlations button not truncated** — open journal header → "Correlations" button fully visible, not cut off, sits on its own line below "View" button
- [ ] **View button visible** — journal header "View" button is tappable and works
- [ ] **File attachment (.txt) shows indicator** — attach a .txt file to a chat message → a visual indicator appears in the chat bubble (same as images get)
- [ ] **Action card no double unit** — log calories → action card shows e.g. "360 kcal" only, NOT "360 KCAL kcal" or "360 KCAL G" (no duplicate unit or extra badge)
- [ ] **No pull-to-refresh on scroll-up** — on mobile, scroll up fast in chat or journal → browser pull-to-refresh does NOT fire

---

## P3 — Smoke Check

- [ ] **No duplicate Start Day sessions** — trigger Start Day twice rapidly → only one session created, no duplicates in DB

---

## Deferred to V28 (do NOT test — known open issues)

- Scroll intermittent race condition (deeper fix needed)
- 7pm timestamp on all logs (needs investigation)
- March 4 wrong date in journal (related to P0-A, needs full day cycle to reproduce)
- markDayStarted fire-and-forget guard bypass
- JSONB stats clobber on partial upsert
- Shared useTransition between toggle and form submit
