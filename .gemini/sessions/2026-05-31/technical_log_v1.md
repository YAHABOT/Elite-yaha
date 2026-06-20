# Technical Log v1 — 2026-05-31

## EX11 v1 (body scroll — 06:42)

**File:** `src/app/layout.tsx`

```diff
- <html lang="en" className={`${inter.variable} ${orbitron.variable}`}>
-   <body className="bg-background text-foreground min-h-screen antialiased font-sans">
+ <html lang="en" className={`${inter.variable} ${orbitron.variable} h-full`}>
+   <body className="bg-background text-foreground h-full overflow-hidden overscroll-none antialiased font-sans">
```

**Diagnosis:** Body had `min-h-screen` with no overflow constraint. On iOS/Android, the browser scrolled the body element itself (not an inner container), causing flex children (header, input) to scroll off screen.

**Result:** Deployed. User tested on Android Chrome → FAILED. Window-level scroll (not body scroll) was the actual mechanism. This fix only prevents body-element scroll.

---

## SC2 Fix — Routine Action Card Wrong Tracker (08:45)

### Root Cause Analysis

Chain of failure:
1. End Of Day routine Step 2 = Notes tracker (`fld_benchmark_day`, `fld_notes`)
2. Gemini hallucinated Overview tracker's UUID as `trackerId` but wrote `trackerName: "Notes"`
3. `buildSanitizedActions` in `route.ts` finds tracker by `trackerId` → found Overview tracker
4. Rebuilt `fieldLabels` from Overview schema → card shows Weight, Steps, Distance, etc.
5. Advancement check: `sanitizedActions.some(a => a.trackerId === currentStep.trackerId)` → FALSE (Overview UUID ≠ Notes UUID)
6. `shouldAutoPromptNextStep = false` → auto-prompt never fired (also explains SC1)

### Fix A — `src/lib/ai/prompt-builder.ts`

Added `fieldsJsonTemplate` and `fieldLabelsJsonTemplate` builders from tracker schema:

```typescript
const stepTracker = trackers.find(t => t.id === currentStep.trackerId)
const fieldsJsonTemplate = currentStep.targetFields
  .map(fid => {
    const field = stepTracker?.schema.find(f => f.fieldId === fid)
    const typeHint = field?.type === 'select'
      ? `"${field.selectOptions?.[0]}" /* ONLY valid values: ${field.selectOptions?.join(' | ')} */`
      : (field?.type === 'number' || ...) ? '<number_from_user>'
      : '"<text_from_user>"'
    return `"${fid}": ${typeHint}`
  }).join(',\n      ')
const fieldLabelsJsonTemplate = currentStep.targetFields
  .map(fid => {
    const field = stepTracker?.schema.find(f => f.fieldId === fid)
    return `"${fid}": "${field?.label ?? fid}"`
  }).join(', ')
```

JSON template in system prompt changed from generic:
```json
"fields": { "fieldId": value },
"fieldLabels": { "fieldId": "Label" }
```
to explicit:
```json
"fields": { "fld_benchmark_day": "Yes" /* ONLY valid: Yes | No */ },
"fieldLabels": { "fld_benchmark_day": "Benchmark Day" }
```

### Fix B — `src/app/api/chat/route.ts`

Server-side trackerId correction before schema lookup:

```typescript
// SC2 FIX: During a routine, if the AI used the wrong trackerId but trackerName
// matches the current step, correct the trackerId
if (action.type === 'LOG_DATA' && activeRoutine) {
  const currentStep = activeRoutine.steps[session.current_step_index]
  if (currentStep &&
      actionWithDate.trackerId !== currentStep.trackerId &&
      actionWithDate.trackerName === currentStep.trackerName) {
    console.warn(`[ChatRoute] SC2 FIX: Correcting trackerId...`)
    actionWithDate = { ...actionWithDate, trackerId: currentStep.trackerId }
  }
}
```

---

## EX11 v2 — Android Chrome (fixed inset-0) (08:55)

**Files:** `src/app/(app)/layout.tsx`, `src/app/layout.tsx`

**Root cause:** Android Chrome triggers window-level scroll (not body scroll) when touch momentum from the messages `overflow-y-auto` container escapes to the window. `overflow: hidden` on body doesn't block window scroll. `window.scrollY` can still increase, pushing the fixed-height flex container upward and scrolling the header off.

**Fix:** `position: fixed; inset: 0` on the app shell removes all document-flow content from the body. Body has height 0 in document flow → `window.scrollY` can never move → header structurally cannot unpin.

```diff
# (app)/layout.tsx
- <div className="h-dvh overflow-hidden bg-background">
+ <div className="fixed inset-0 overflow-hidden bg-background">

# layout.tsx  
- <html ... className="... h-full">
-   <body className="... h-full overflow-hidden overscroll-none ...">
+ <html ... className="...">
+   <body className="... overflow-hidden overscroll-none ...">
```

`h-full` on html/body reverted since it's no longer needed — the fixed shell sets its own dimensions from `inset-0`, not from parent height.

**User result:** "seems fine for now" ✓

---

[CA | session-end] All hotfixes deployed to production. No CR/QA run (emergency fixes). Recommend CR sweep next session.
