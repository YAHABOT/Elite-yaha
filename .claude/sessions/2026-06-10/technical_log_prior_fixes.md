# Technical Log — Prior Session Fixes (Retroactive)
**Reconstructed from compacted session summary. Fixes deployed before 2026-06-10 session started.**

---

## Fix 1 — 7-Day Avg Denominator

**File:** `src/lib/db/dashboard-data.ts`
**Function:** `computeWidgetValueOptimized` → `field_average` case

**Root cause:** When today had no data, the averaging window still included today as a zero. Sum of 6 real days divided by 7 = artificially low average. User correctly identified this after the first attempted fix (which was dividing sum by N-1 instead — also wrong).

**Correct fix:** Shift the window entirely when today is empty. Use midnight cutoff of `(today - N)` as the start, giving exactly N complete calendar days ending yesterday. Today is absent from both the sum AND the denominator.

```typescript
// When isMultiDayPeriod && !hasTodayData && !widget.period:
// cutoff = midnight of (today - N) → window = N genuine past days
const effectiveAvgLogs = (!hasTodayData && !widget.period)
  ? logs.filter(l => new Date(l.logged_at) >= midnightCutoff)
  : logs
const avgWindowDays = widget.days ?? 7  // full N, not N-1
```

---

## Fix 2 — Sparkline Day-Shift + Label Offset

**Files:**
- `src/components/dashboard/DashboardContent.tsx`
- `src/types/widget.ts`
- `src/components/dashboard/WidgetCard.tsx`

**Root cause:** When today had no data, the sparkline showed 6 computed days + a blank slot for today instead of 7 real days. The blank was visible as an empty right edge on the chart.

**Fix:** When today is empty, shift the entire `adjSparkStart` back 1 day so the 7-slot window ends at yesterday. Pass `trendDayOffset = 1` on `WidgetValue` so `getDayLabels` also shifts back — otherwise data and labels would be off by one day.

```typescript
// DashboardContent.tsx
if (todayIsEmpty && !w.period) {
  adjSparkStart.setDate(sparkStart.getDate() - 1)
  trendDayOffset = 1
}
val.trend = computeDailyPointsFromLogs(..., adjSparkDays, adjSparkStart, false)
if (trendDayOffset) val.trendDayOffset = trendDayOffset

// WidgetCard.tsx — getDayLabels shifted by offset days
function getDayLabels(n: number, offset: number = 0): string[] {
  const today = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (n - 1 - i) - offset)
    return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3).toUpperCase()
  })
}
```

**Type change:** Added `trendDayOffset?: number` to `WidgetValue` in `src/types/widget.ts`.

---

## Fix 3 — Duration Sparkline Labels Clipping ("22:00" instead of "7:22")

**File:** `src/components/dashboard/WidgetCard.tsx`

**Root cause:** The full `H:MM:SS` format string (e.g. `"7:22:00"`) was overflowing the Recharts left margin, visually clipping to show only `"22:00"`. This was misdiagnosed initially as bad data — user provided a screenshot showing the actual sleep log was 7h 22m, proving it was a display clipping issue.

**Fix:** New `formatDurationShort` function renders `H:MM` (no seconds). Left margin increased for duration fields (`hMargin = isDuration ? 20 : 8`).

```typescript
function formatDurationShort(seconds: number): string {
  const totalSeconds = Math.round(Math.abs(seconds))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}`
  return `${m}m`
}
```

---

## Fix 4 — This Week / Last Week Aggregation Chooser

**Files:** `src/components/dashboard/AddWidgetModal.tsx`, `src/components/dashboard/EditWidgetModal.tsx`

**User request:** When This Week or Last Week period is selected in Add/Edit Widget modal, show a Total vs Average toggle above the Personal Best checkbox.

**Implementation:**
```typescript
// AddWidgetModal.tsx
const [weekAgg, setWeekAgg] = useState<'total' | 'average'>('total')
const isWeekPeriod = aggregation === 'this_week' || aggregation === 'last_week'
// widgetType = isWeekPeriod && weekAgg === 'average' ? 'field_average' : 'field_total'
```

Chooser rendered as two grid buttons (Total / Average) appearing above the PB checkbox when `isWeekPeriod` is true. EditWidgetModal version changes `selectedType` between `field_total` and `field_average`.

---

## Fix 5 — Wrong Date Logging ⚠️ REGRESSED — REVERTED 2026-06-10

**File:** `src/app/api/chat/route.ts`

**User report:** Active agents (Agent Forge) were logging to the previous day. Regular chat was fine. Routines were fine. Bug was strictly isolated to the Agent Forge path.
- Regular chat → correct date ✅
- Routines → correct date ✅ (routines were NOT affected before the bad fix)
- Active agents (Agent Forge) → previous day ❌

All End Day routines were completed — no orphaned sessions.

**Root cause — NOT diagnosed.** What caused agents specifically to use the wrong date was never identified. Likely somewhere in how `loggingDate` is passed into the agent system prompt vs the routine system prompt.

**Fix applied:** `const loggingDate = today` — blunt override, ignored active session date entirely.

**Regression introduced:** Broke routines that were previously working. Start Day June 10 → cross midnight to June 11 → routines logged to June 11 instead of June 10. Active session must own the log date until End Day clears it.

**Reverted 2026-06-10 to:** `const loggingDate = finalActiveDayState?.date ?? today`

**⚠️ Agent date bug still unresolved.** If agents log to previous day again, investigate: how `loggingDate` is injected into agent system prompt (the `activeAgent` branch in route.ts) vs how it flows into `buildRoutineSystemPrompt`. Routine path was fine — the difference is in the agent branch.

---

## Fix 6 — File Processing Message Overflow

**File:** `src/app/api/chat/route.ts`

**Root cause:** When user attached a file/photo, the chat showed the raw UUID filename as the processing message — overflowing the bubble container.

**Fix:**
```typescript
const fileCount = attachments?.length ?? 1
const processingMsg = `Processing ${fileCount} file${fileCount > 1 ? 's' : ''}…`
```

---

## Fix 7 — Skip Button Non-Functional

**File:** `src/components/chat/ChatInterface.tsx`

**Root cause:** Active Ritual banner SKIP button was firing a raw `fetch()` to the SSE endpoint. The response stream was not piped back into chat, so nothing appeared to happen and the routine step didn't advance.

**Fix:** Replaced with `handleSendSilentRef.current?.('skip', currentSessionId)` — uses the same ref-based silent send that routine auto-advance uses. Response streams correctly into chat.

---

## Fix 8 — Food Bank Card Title Truncating

**File:** `src/components/chat/SaveToFoodBankCard.tsx` (line 135)

**Fix:** `className="truncate"` → `className="break-words leading-snug"` on item name element. Long names like "Strawberry Jam Sandwich" now wrap instead of cutting off.

---

## Fix 9 — AI Proactively Asking About Food Bank

**File:** `src/lib/ai/prompt-builder.ts`

**Root cause:** `FOOD_BANK_SAVE_RULE` did not explicitly prohibit the AI from suggesting food bank saves. AI was producing `SAVE_TO_FOOD_BANK` cards or asking "Would you like to save this?" after every food log.

**Fix:** Added to `FOOD_BANK_SAVE_RULE`:
> "NEVER PROACTIVELY SUGGEST OR ASK about saving to the food bank. If the user just logs food normally, produce only a LOG_DATA card."

User can still trigger both by saying "log it and save to food bank" — that produces both a `LOG_DATA` and `SAVE_TO_FOOD_BANK` card simultaneously.

---

## Fix 10 — Missing Fields from Screenshots (Large Trackers)

**File:** `src/lib/ai/prompt-builder.ts`

**Root cause:** Routines explicitly inject `fld_*` field IDs and labels into the system prompt, so Gemini knows exactly what to fill. Normal chat had no equivalent instruction to fill every visible field. For trackers with 15+ fields, Gemini was doing partial reads and then asking the user for data already visible in the image.

**Fix:** Added rule 15b to `GLOBAL_ANTI_HALLUCINATION_RULES`:
```
15b. COMPLETE FIELD EXTRACTION — NO PARTIAL READS:
When an image, screenshot, or structured data source contains values for a tracker
with multiple fields:
- You MUST extract and populate EVERY field that has a visible, readable value.
- Scan the ENTIRE image/data top-to-bottom.
- NEVER ask the user to provide data that is already visible in the image.
```

---

## Fix 11 — Update Log (Update Entry Button) Completely Broken

**Root cause:** Three things were missing from the `UPDATE_DATA` code path that `LOG_DATA` had:

### Root cause 1 — No field enrichment in route.ts
`UPDATE_DATA` action cards from Gemini contained raw `fld_001` field IDs with no labels, units, or type info. The edit card UI was rendering raw IDs instead of human-readable field names.

**File:** `src/app/api/chat/route.ts`
```typescript
// Added UPDATE_DATA enrichment block (mirrors LOG_DATA enrichment)
if (action.type === 'UPDATE_DATA' && action.trackerId) {
  const updateTracker = trackers.find(t => t.id === action.trackerId)
  if (updateTracker) {
    const schema = updateTracker.schema as SchemaFieldDef[]
    const uFieldLabels: Record<string, string> = {}
    const uFieldUnits: Record<string, string> = {}
    const uFieldOrder: string[] = []
    const uFieldDefs: Record<string, SchemaFieldDef> = {}
    for (const field of schema) {
      uFieldLabels[field.fieldId] = field.label
      if (field.unit) uFieldUnits[field.fieldId] = field.unit
      uFieldOrder.push(field.fieldId)
      uFieldDefs[field.fieldId] = field
    }
    return { ...action, fieldLabels: uFieldLabels, fieldUnits: uFieldUnits,
             fieldOrder: uFieldOrder, fieldDefinitions: uFieldDefs } as AnyActionCard
  }
}
```

### Root cause 2 — TypeScript type missing fieldDefinitions
First deploy attempt failed: `Property 'fieldDefinitions' does not exist on type 'UpdateDataCard'`.

**File:** `src/types/action-card.ts`
```typescript
// Added to UpdateDataCard type:
fieldDefinitions?: Record<string, {
  fieldId: string; label: string; type: string;
  unit?: string; selectOptions?: string[]; multiSelect?: boolean
}>
```

### Root cause 3 — No duration conversion in ActionCard.tsx
Duration fields in the edit card were showing raw seconds. On confirm, the H:MM:SS string was being sent back to `updateLogAction` without converting back to seconds.

**File:** `src/components/chat/ActionCard.tsx` (`UpdateDataCardComponent`)
- Init: `if (fieldDef?.type === 'duration') return [key, formatDuration(numVal)]` (seconds → H:MM:SS)
- Confirm: `if (fieldDef?.type === 'duration') return [key, parseDuration(val)]` (H:MM:SS → seconds)

### Root cause 4 — No score refresh after update
`updateLogAction` was not calling `upsertScoreForDate`, so the daily score widget didn't refresh after editing a log.

**File:** `src/app/actions/chat.ts`
```typescript
// Added after successful DB update:
const logDateStr = (existingLog.logged_at as string).split('T')[0]
void upsertScoreForDate(supabase, user.id, logDateStr).catch(() => {})
```
Also added `logged_at` to the `existingLog` select so the date was available.

---

## Deploy Notes

- First deploy failed on Fix 11 due to missing `fieldDefinitions` type — fixed type first, redeployed.
- All other fixes deployed cleanly in the same build.
- Fix 5 (wrong date logging) was later found to be a regression and reverted in the 2026-06-10 session.
