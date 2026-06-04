# Technical Log T28–T31 — Score System · AI Summary · Photo Cal · Token Opt

**Date:** 2026-06-03
**Agent:** [CA | session]
**Build:** PASS (tsc — zero errors in production source)

---

## T28 — Score System

### ScoreCard.tsx
- Ring enlarged 72×72 → 88×88 (r=28 → r=36) so "EXCELLENT" (9 chars at 6.5px) fits without clipping
- Added `getScoreColor(score)` matching ScoreDetailClient tier colours
- SVG `cx/cy="44"`, circumference = 2π×36 ≈ 226.2

```typescript
function getScoreColor(score: number): string {
  if (score >= 80) return '#00d4ff'
  if (score >= 60) return '#10b981'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}
```

### WeeklyBarChart.tsx
- `getBarColor` rewritten to use score tiers; dim grey when no targets set
- `paddingTop: '4px'` → `'14px'` on bar row — fixes TARGET 100 dashed line overlap

### src/lib/db/scores.ts (new)
- `upsertDailyScore(userId, record, supabase)` — ON CONFLICT (user_id, date) DO UPDATE
- `getDailyScoresForPeriod(userId, from, to, supabase)` — returns `DailyScoreRecord[]`

### supabase/migrations/20260603000003_create_daily_scores.sql
- Table: `id, user_id, date DATE, score INT, targets_count INT, targets_hit INT, achievements JSONB`
- UNIQUE(user_id, date), RLS enabled, index on (user_id, date)
- **Applied** to Supabase project `jfretlgjsthhmlmgmlog`

### src/app/actions/chat.ts
- Added `upsertScoreForDate(supabase, userId, dateStr)` helper (not exported)
- Computes achievements per target (actual vs target, pct, hit boolean)
- Called fire-and-forget from `confirmLogAction` after tracker_logs insert

---

## T29 — AI Summaries Daily Breakdown

### src/lib/ai/summary-generator.ts
- Added `getDailyScoresForPeriod` import
- Added `buildDailyBreakdown(dailyScores)` → formats per-day hit/miss list:
  `- 2026-06-02: score 58/100 (2/4 targets) — hit: Sleep Duration, Steps · missed: Protein (43%), Water (71%)`
- `generateSummaryForUser` now fetches `[prevSummary, dailyScores]` in parallel
- Prompt updated: score rule "base on average of daily scores if provided"; highlights rule "mention specific targets missed by name and day"

---

## T30 — Photo Calibration + Step 0

### src/lib/ai/prompt-builder.ts — VISION_CAPABILITY additions
**Step 0:** Before estimating, ask "home-cooked or eating out?" — skip if message already contains restaurant name, "I made", "eating out", etc. Friend's house → treat as home. Empty array `[]` output during Step 0.

**PHOTO PORTION CALIBRATION block (6 rules):**
1. Camera inflation: reduce visual weight ~30% before reporting
2. Bowl/plate illusion: err toward lower bound of range
3. Single-serve default
4. Calorie sanity gate: >600 kcal (home) / >900 kcal (out) without high-fat items → reduce
5. User range → use lower bound ("40–50g" → 40g)
6. Correction = full recalculate from scratch, no anchoring on previous estimate

---

## T31 — Token Optimisation

### Compact day summary
`buildDaySummary(logs, trackers, mode: 'compact' | 'full' = 'compact')`
- **Compact** (default): `Logged today: Nutrition (3 entries)\n## Today's Totals\n### Nutrition — Daily Totals\n- Calories: 1850 kcal`
- **Full** (edit/query): per-entry lines with `[LOG_ID: xxx]` + totals block

Full mode triggered when `currentMessage`:
- Contains `?`
- Starts with question word (`what/how/show/tell/list/did i/have i`)
- Contains `total|stats|so far|how much|how many|logged|progress|update|change|edit|fix|correct|wrong|items?|entries`

### Conditional vision block
```typescript
const hasImage = params.hasImageAttachment ?? attachmentsReceived?.some(a => a.type.startsWith('image/')) ?? false
const visionBlock = hasImage ? VISION_CAPABILITY : '1-line note'
```
Saves ~280 tokens on non-image messages.

### Conditional duration rules
```typescript
const durationBlock = hasDurationFields(params.trackers) ? DURATION_FORMAT_RULE : ''
```
Saves ~673 tokens for users with no duration-type fields (e.g. nutrition-only users).

### route.ts
Both `buildHealthSystemPrompt` calls now pass:
- `currentMessage: message`
- `hasImageAttachment: attachments?.some(a => a.type.startsWith('image/')) ?? false`

### Pre-existing bug fixed
`VISION_CAPABILITY` had unescaped `` ` `` in line `Output an empty array \`[]\` during Step 0` — caused TS1011 (element access without argument). Fixed by escaping.

---

## Build Verification

```
npx tsc --noEmit
→ 0 errors in src/lib/ai/ and src/app/api/chat/
→ Pre-existing test file errors only (unrelated to this work)
```
