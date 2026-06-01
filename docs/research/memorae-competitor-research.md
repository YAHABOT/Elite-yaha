# Memorae — Competitor Research
**Date:** 2026-06-01
**Source:** Live dashboard audit + public pricing page (memorae.ai)

---

## What Memorae Is

WhatsApp-first AI productivity assistant. An LLM (likely GPT-4) sits in the middle parsing natural language messages from WhatsApp/Telegram/email and turning them into structured actions — reminders, lists, calendar events, tasks. The web dashboard is the control panel; WhatsApp is the primary UX.

Tagline: *"The memory layer above all your apps."*

Available on: WhatsApp · Telegram · Email · iMessage · iOS app · Android app · Chrome extension

---

## Plan Breakdown

| Plan | Annual | Monthly | Storage |
|------|--------|---------|---------|
| Origin | €5/mo | €10/mo | 5GB |
| Supernova | €10/mo | €20/mo | 50GB |
| Big Bang | €30/mo | €60/mo | 200GB |

### Origin (base)
- Unlimited reminders
- Multi-channel: WhatsApp, Telegram, Email, iMessage, app, Chrome
- Multi-calendar sync (Google / Outlook / Apple)
- Create & manage lists
- Clean Up (review/keep/forget memories)
- Friend-to-friend reminders: 100 sends/mo · 20 friends · 2/day per friend
- Task tracker: 1 board · 100 tasks

### Supernova (most popular)
Everything in Origin plus:
- Long Term Memory (persistent AI context)
- Daily Briefing (morning summary of what needs attention)
- Image to Action (photo → tasks/memories extracted by AI)
- Full Control Dashboard
- Google Workspace: Gmail, Calendar, Drive, Docs
- Friend-to-friend: 500 sends/mo · 100 friends · 4/day
- Task tracker: 3 boards · 1,000 tasks per board

### Big Bang (executive tier)
Everything in Supernova plus:
- Automatic Inbox Organizer (email triaged automatically)
- Automatic Email Drafting (reply drafts written in your tone)
- Priority support
- Friend-to-friend: 1,000 sends/mo · 200 friends · 8/day
- Task tracker: unlimited boards · 10,000 tasks per board

---

## How Their "AI" Actually Works

Same pattern as YAHA — an LLM receives the user's natural language message, decides intent, and routes to the right action (create reminder, save memory, add to list, etc.). The AI isn't the differentiator; it's the plumbing built around it. YAHA already does this with Gemini.

---

## YAHA vs Memorae — Honest Gap Analysis

| Feature | YAHA | Memorae |
|---------|------|---------|
| AI chat (text/image/audio) | ✅ Gemini | ✅ GPT |
| Telegram bot | ✅ | ✅ |
| WhatsApp logging | ❌ | ✅ |
| Health data logging (deep) | ✅ | ❌ |
| Nutrition from photo | ✅ | ❌ |
| Sleep/workout analysis | ✅ | ❌ |
| Correlations & analytics | ✅ | ❌ |
| Daily routines | ✅ | ❌ |
| **Reminders (push notifications)** | ❌ | ✅ |
| **Friend-to-friend reminders** | ❌ | ✅ |
| Calendar sync | ❌ | ✅ |
| Google Workspace | ❌ | ✅ (Supernova+) |
| Email drafting/inbox | ❌ | ✅ (Big Bang) |
| Long term AI memory | ❌ | ✅ (Supernova+) |
| Chrome extension | ❌ | ✅ |
| Mobile app (native) | ❌ | ✅ |

---

## Most Valuable Features to Steal (Priority Order)

### 🔴 P1 — WhatsApp Logging
**Why it matters:** Memorae's biggest UX advantage. Users don't open an app — they message WhatsApp like they already do. For health logging this is huge: "just ate 300g chicken and rice" sent to WhatsApp while cooking. YAHA already has Telegram; WhatsApp is 10x the user base.
**Implementation:** WhatsApp Business API. Similar webhook pattern to Telegram bot already built.

### 🔴 P1 — Reminders / Push Notifications
**Why it matters:** "Remind me to log my weight every morning at 7am" — currently YAHA can log that you want to do it but cannot actually ping you. This is arguably the most impactful missing feature for a health app. Habit formation requires prompts.
**Implementation:** Supabase scheduled functions or cron + WhatsApp/Telegram message delivery.

### 🟡 P2 — Friend-to-Friend Reminders
**Why it matters:** "Remind [contact] to drink water" — accountability partner use case. Huge for fitness/health where accountability drives retention. Memorae treats it as a core differentiator. For YAHA: "remind my coach that I logged today" or "remind my partner to log their sleep."
**Implementation:** Store contact list, send Telegram/WhatsApp message to third party on trigger.

### 🟡 P2 — Daily Briefing
**Why it matters:** Morning summary — "you haven't logged breakfast, your sleep last night was 6h 20m (below your 7h target), you have a workout routine at 6pm." Memorae treats this as Supernova-tier. YAHA has all the data to do this better because it's health-specific.
**Implementation:** Cron job at user-configured time → build summary from daily_stats + routines → send via Telegram.

### 🟢 P3 — Long Term Memory
**Why it matters:** AI remembers context across sessions — "last time you mentioned your knee was hurting, how is it now?" Memorae sells this as a premium differentiator but it's mostly just injecting historical context into prompts, which YAHA is already partially doing.
**Implementation:** Already partially built via historical log injection. Extend to include chat history summaries.

### 🟢 P3 — Calendar Sync
**Why it matters:** "Schedule my gym session tomorrow at 6am" → adds to Google Calendar. Useful but not health-specific. Lower priority than reminders.

---

## Key Insight

Memorae is a general memory tool that happens to work on WhatsApp. YAHA is a health-specific tool that happens to have AI. The overlap is the AI chat interface — but YAHA's health depth (nutrition from photos, correlations, tracker schemas, sleep analysis) is something Memorae can't replicate.

The gap that hurts YAHA most: **no reminders and no WhatsApp.** Those two things are Memorae's entire value proposition for casual users. Add those and YAHA has everything Memorae has plus a 10x deeper health layer.
