# TECHNICAL LOG — V8

**Date:** 2026-03-25
**Build result:** EXIT 0 — 25 routes, zero errors, warnings only (pre-existing)

---

## SC1 — Duration format regression in ActionCard

### Root cause
V7 stripped `formatFieldValue` from the `editableFields` initializer entirely to prevent unit text (e.g. `"8.9 HRS"`) from being embedded in editable inputs. This was the right intent but the wrong scope — it removed duration formatting too, so decimal hours like `8.9` appeared raw in the input instead of `08:54`.

### Fix
`src/components/chat/ActionCard.tsx` — `editableFields` initializer now checks `card.fieldUnits?.[key]`. If the unit is `HRS` (case-insensitive) and the value is a number, the decimal is converted to `HH:MM` before being placed in the input. All other field types continue to use raw values. The unit pill rendered outside the input is untouched.

```typescript
if (unit && unit.toLowerCase() === 'hrs' && typeof value === 'number') {
  const totalMinutes = Math.round(value * 60)
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return [key, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`]
}
return [key, value]
```

---

## SC2 — Disappearing fields in LogEntryCard edit mode

### Root cause
`startEdit()` called `formatFieldValue(val, field.unit, field.label)` for all non-time fields. For `number` and `rating` type fields, this returns the value with a unit suffix (e.g. `"94 %"`, `"72 bpm"`). When assigned to `<input type="number">`, the browser rejects the non-numeric string and renders an empty input — the field appears blank.

### Fix
`src/components/trackers/LogEntryCard.tsx` — `startEdit()` now branches on field type before formatting:

- `time` → decimal-to-HH:MM conversion (unchanged)
- `number` or `rating` → `String(val)` directly (raw, no unit suffix)
- `text` → `formatFieldValue` (unchanged, correct for text displays)

---

## SC3 — ActionCard confirmed state not persisting across page refresh

### Root cause
In `handleSendInternal`, assistant messages were pushed into local React state with a client-generated fake ID: `id: \`mod-\${Date.now()}\``. This fake ID was then passed to `ActionCard` as `messageId`. When the user confirmed a log, `confirmLogAction` called:

```typescript
supabase.from('chat_messages').select(...).eq('id', 'mod-1234567890')
```

No row in the DB has that ID — the DB generated its own UUID on insert. The query returned zero rows, the update silently no-oped, and `confirmed: true` was never written. On the next page load, the card correctly read `confirmed: false` from the DB and showed "Pending".

### Fix
`src/components/chat/ChatInterface.tsx` — `handleSendInternal` now uses the real DB UUID returned by the `/api/chat` route:

```typescript
id: data.message?.id ?? `mod-${Date.now()}`,
```

The `?? \`mod-\${Date.now()}\`` fallback is kept for safety in case the API returns an unexpected shape, but in normal operation the real UUID is always present in `data.message.id`.

---

## Files Changed

- `src/components/chat/ActionCard.tsx` — SC1: HRS duration → HH:MM in editableFields init
- `src/components/trackers/LogEntryCard.tsx` — SC2: raw value for number/rating in startEdit
- `src/components/chat/ChatInterface.tsx` — SC3: real DB UUID for assistant message ID
