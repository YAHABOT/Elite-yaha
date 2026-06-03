# AI Summaries — Weekly & Monthly Health Reports
**Status:** APPROVED — awaiting dashboard greenlight before build  
**Mockup:** sc1 provided by user (2026-06-02) — stored in `.claude/sessions/2026-06-02/`  
**Priority:** After dashboard overhaul is confirmed ✓

---

## What It Is

An AI-generated weekly and monthly health report system. The user writes plain-language instructions telling the AI exactly what to summarise. The AI reads those instructions + the user's actual logged data every Monday / 1st of month and generates a structured report. Reports are stored in the DB and viewable from the dashboard.

---

## User-Facing Features

### Settings — "AI Summaries" Section (`/settings/summaries`)

Two cards: **Weekly Summary** and **Monthly Summary**. Each has:

**Toggle** — enable/disable generation  
**Trigger & Coverage info:**
- Weekly: `Monday · 7:00 AM` or `After Sunday evening routine` · Covers: Mon–Sun previous 7 days
- Monthly: `1st of month · 7:00 AM` or `After last day evening routine` · Covers: previous full month

**Instructions to AI** — plain text box, up to 247 chars  
Example: *"Average my sleep duration and sleep score. Count total workouts logged (any tracker with type = workout). Show total calories vs my daily target. Report weight change vs the previous week. Flag any day where protein was under 150g. End with one coaching note."*

**Linked Trackers & Fields** — visual tag system (like the mockup)  
- Each tracker shown as a row with its color dot + name  
- Fields shown as removable pills (e.g. Sleep → Duration, Score)  
- `+ Add` button opens a picker (same pattern as CreateTargetForm)  
- Fields passed directly to AI — no guessing which tracker is meant  
- Correlations can also be added here

**Targets vs completion** — if a linked field has a target set, the AI automatically receives `target: X` alongside the field data and will compare actual vs target.

---

### Dashboard — Summary Cards (near greeting)

Two pill buttons beneath the greeting: **Weekly** and **Monthly**  

Tapping opens a slide-up or page showing:
- List of all generated periods (e.g. "May 26 – Jun 1 · LATEST", "May 18–25", etc.)
- Each entry shows a score badge if the AI returned one (0–100)
- Tap any period → full report view

**Report view layout** (from mockup):
```
COACH SUMMARY
[AI-written paragraph — 3–5 sentences]

THIS WEEK / THIS MONTH metrics grid:
┌─────────────────┬──────────────────┐
│ SLEEP AVG       │ WORKOUTS         │
│ 7h 16m          │ 5 / week         │
├─────────────────┼──────────────────┤
│ AVG PROTEIN     │ WEIGHT ↑         │
│ 171g/day        │ -0.1kg on track  │
├─────────────────┼──────────────────┤
│ AVG STEPS       │ SLEEP SCORE      │
│ 13,940/day      │ 88 avg           │
└─────────────────┴──────────────────┘

HIGHLIGHTS
• PB: Squat 120kg x 5 (↑15kg vs last week)
• [flagged items — e.g. "Protein under 150g: Tuesday, Thursday"]
```

**Monthly view extras:**
- Weekly scores bar chart (4 bars, one per week of the month)
- MAV Totals: total workouts, avg sleep score, avg protein, avg weight, avg steps, avg calories
- Month-over-month comparison (Apr vs May etc.)

---

## Technical Architecture

### DB Schema — 2 new tables

```sql
-- User's summary configuration
CREATE TABLE summary_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  enabled     BOOLEAN NOT NULL DEFAULT false,
  instructions TEXT NOT NULL DEFAULT '',
  linked_fields JSONB NOT NULL DEFAULT '[]',
  -- linked_fields: [{ trackerId, trackerName, fieldId, fieldLabel, fieldType, unit? }]
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- Generated report storage
CREATE TABLE summaries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  content      JSONB NOT NULL,
  -- content: { coachSummary, metrics: [{label, value, unit, delta?}], highlights: string[], score?: number }
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, type, period_start)
);

ALTER TABLE summary_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
-- RLS: user_id = auth.uid() on both
```

### Trigger Mechanism — 2 paths

**Path A: No routine**  
Vercel Cron Job (`vercel.json`) fires:
- Weekly: `0 7 * * 1` (Monday 7am UTC)
- Monthly: `0 7 1 * *` (1st of month 7am UTC)

Hits a protected Route Handler: `POST /api/summaries/generate`  
Body: `{ type: 'weekly' | 'monthly' }`  
Loops over all users with `summary_configs.enabled = true` for that type, generates + stores.

**Path B: Routine exists**  
When `day_end` routine completes (Sunday or last day of month), the routine completion handler checks:
- If today is Sunday → trigger weekly generation for this user
- If today is last day of month → trigger monthly generation for this user  
Calls the same generation function used by Path A.

### Generation — Gemini Pipeline

```typescript
async function generateSummary(userId: string, type: 'weekly' | 'monthly', periodStart: Date, periodEnd: Date) {
  // 1. Fetch config (instructions + linked fields)
  const config = await getSummaryConfig(userId, type)
  if (!config?.enabled) return

  // 2. Fetch all logs for the period
  const logs = await getLogsForPeriod(userId, periodStart, periodEnd)

  // 3. Fetch user targets (for vs-target comparisons)
  const targets = await getUserTargets(userId)

  // 4. Fetch previous period's summary (for delta comparisons)
  const prevSummary = await getPreviousSummary(userId, type, periodStart)

  // 5. Build Gemini prompt
  const prompt = buildSummaryPrompt({
    type,
    periodStart,
    periodEnd,
    instructions: config.instructions,
    linkedFields: config.linked_fields,
    logs,
    targets,
    prevSummary,
  })

  // 6. Call Gemini → parse JSON response
  const result = await gemini.generateContent(prompt)
  const parsed = JSON.parse(result) // { coachSummary, metrics, highlights, score }

  // 7. Store in summaries table
  await upsertSummary(userId, type, periodStart, periodEnd, parsed)
}
```

### Prompt Structure

```
You are a personal health coach AI. Generate a structured weekly health summary.

PERIOD: [Mon, May 26] to [Sun, Jun 1]
USER INSTRUCTIONS: [config.instructions]

LINKED DATA:
- Sleep · Duration: [avg Xh Ym] · Score: [avg X]
- Workout: [N sessions logged]
- Food · Calories: [total X / daily avg X] · Target: 2500 · Protein: [avg Xg/day] · Target: 190g
- Weight · Value: [Xkg → Ykg, delta]
- Correlation "Net Calories": [avg X]

PREVIOUS WEEK SUMMARY: [prev metrics for delta]

Respond in JSON: {
  "coachSummary": "...",
  "score": 84,
  "metrics": [{"label":"Sleep Avg","value":"7h 16m","unit":null,"delta":"+12m"},…],
  "highlights": ["PB: Squat 120kg x 5 (+15kg vs last week)", "Low protein: Tuesday, Thursday"]
}
```

### Settings Page

**Route:** `/settings/summaries`  
**Components:**
- `SummaryConfigCard` — the full settings card per type (weekly/monthly)
- `LinkedFieldsPicker` — modal for adding tracker fields (same pattern as AddWidgetModal)
- Server Action: `saveSummaryConfigAction` — upserts summary_configs row

### Dashboard Integration

**DashboardClient:** Two new pill buttons near the greeting → navigate to `/dashboard/summaries` or open a slide-up panel  
**Route:** `/dashboard/summaries/[type]` (weekly | monthly) → list view  
**Route:** `/dashboard/summaries/[type]/[id]` → full report view

---

## Build Order

1. **DB migration** — create `summary_configs` + `summaries` tables
2. **Settings page** — `/settings/summaries` with config cards + linked fields picker
3. **Server Action** — `saveSummaryConfigAction`
4. **Generation function** — `src/lib/ai/summary-generator.ts`
5. **Cron Route Handler** — `src/app/api/summaries/generate/route.ts`
6. **Routine hook** — add Sunday/month-end check to routine completion flow
7. **Dashboard viewer** — summary list + report view components
8. **Vercel cron config** — `vercel.json` cron entries

---

## Key Design Decisions

- **Instructions are freeform text** — Gemini handles interpretation. No schema needed.
- **Linked fields are explicit** — prevents AI hallucinating which tracker means what
- **Targets auto-included** — if a linked field has a target, it's injected automatically; no user config needed
- **Correlations supported** — stored correlations can be linked the same as tracker fields
- **Score is optional** — AI generates 0–100 if it can, otherwise omitted
- **Upsert not insert** — re-generating for the same period overwrites (idempotent)
- **Vercel Cron** — requires Pro plan. If on free tier, use Supabase `pg_cron` extension instead as fallback.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/YYYYMMDD_create_summaries.sql` | Create |
| `src/types/summary.ts` | Create |
| `src/lib/db/summaries.ts` | Create |
| `src/lib/ai/summary-generator.ts` | Create |
| `src/app/actions/summaries.ts` | Create |
| `src/app/api/summaries/generate/route.ts` | Create |
| `src/app/(app)/(content)/settings/summaries/page.tsx` | Create |
| `src/components/settings/SummaryConfigCard.tsx` | Create |
| `src/components/settings/LinkedFieldsPicker.tsx` | Create |
| `src/app/(app)/(content)/dashboard/summaries/page.tsx` | Create |
| `src/components/dashboard/SummaryReportView.tsx` | Create |
| `src/components/dashboard/DashboardClient.tsx` | Modify — add summary pills |
| `src/lib/db/routines.ts` or routine completion handler | Modify — add Sunday/month-end trigger |
| `vercel.json` | Modify — add cron entries |

---

*Spec written 2026-06-02. Mockup provided by user in session screenshot (sc1).*
*Awaiting: dashboard multi-metric card greenlight → then build this.*
