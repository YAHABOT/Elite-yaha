# Technical Log v37 — Journal drag group + CrossTracker collapse

**Date:** 2026-06-03
**Agent:** [CA | coding-agent]

## Changes

### 1. SortableJournalList.tsx — Group-based drag

- Added `SoloItem`, `GroupItem`, `DragItem` union types
- Added `buildDragItems(ordered, crossGroups)` — walks flat tracker list, groups 2+ same-type trackers into a single `GroupItem`; solos remain `SoloItem`
- Added `flattenDragItems(items)` — reconstructs flat tracker array from drag items
- Added `SortableGroupBlock` component — single `useSortable` node wrapping all group trackers + `CrossTrackerAggregateRow`; all trackers in the block share the same drag handle props so any tracker header drags the whole group
- Replaced flat `handleDragEnd` with group-aware version: rebuilds drag items from flat state, calls `arrayMove` on drag items, flattens back to tracker array
- `SortableContext` now uses `dragItems.map(d => d.id)` (group IDs like `group_workout` for grouped items)
- Removed old `lastOfType` Map and inline `CrossTrackerAggregateRow` injection from solo render loop — aggregate row now lives exclusively inside `SortableGroupBlock`
- `allCollapsed` still computed from flat `items` array (correct — keyed by tracker.id)

### 2. CrossTrackerAggregateRow.tsx — Header cleanup + collapsible body

- Added `ChevronDown` import from `lucide-react`
- Added `const [isOpen, setIsOpen] = useState(false)` — starts collapsed
- Removed `<span>Σ Combined</span>` grey text element
- Added chevron toggle button between tracker count text and Configure button
- Made `mb-3` on header div conditional: `isOpen ? 'mb-3' : ''`
- Wrapped field grid in `{isOpen && (<div className="mt-3">...</div>)}`

## Validation

- `npm run lint` — PASS (pre-existing warnings only, no new errors)
- `npm run build` — PASS (compiled successfully, all 25 static pages generated)
