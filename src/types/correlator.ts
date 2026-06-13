// A formula step is one of:
// - field reference: { type: 'field', trackerId: string, fieldId: string }
// - constant: { type: 'constant', value: number }
// - operation: { type: 'op', operator: '+' | '-' | '*' | '/', left: FormulaNode, right: FormulaNode }
// - correlator reference: { type: 'correlator', correlatorId: string }
// - last known: { type: 'lastKnown', trackerId: string, fieldId: string }
//   Uses the most recent logged value for this field, even if not logged today.
// - cross-tracker: { type: 'crossTracker', trackerType, fieldLabel, aggregation }
//   Aggregates a named field across ALL trackers of the given type logged today.
//   e.g. sum zone2 time from ALL workout trackers in one formula node.
export type FormulaNode =
  | { type: 'field'; trackerId: string; fieldId: string }
  | { type: 'constant'; value: number }
  | { type: 'op'; operator: '+' | '-' | '*' | '/'; left: FormulaNode; right: FormulaNode }
  | { type: 'correlator'; correlatorId: string }
  | { type: 'lastKnown'; trackerId: string; fieldId: string }
  | { type: 'crossTracker'; trackerType: string; fieldLabel: string; aggregation: 'sum' | 'avg' }

// Pre-computed cross-tracker aggregates map.
// Keys: `sum:trackerType:normalizedLabel` or `avg:trackerType:normalizedLabel`
export type CrossTrackerMap = Map<string, number>

export type Correlation = {
  id: string
  user_id: string
  name: string
  formula: FormulaNode
  unit: string
  created_at: string
}

export type CreateCorrelationInput = {
  name: string
  formula: FormulaNode
  unit: string
}

// Key format: `${trackerId}:${fieldId}` — e.g. "tracker-uuid:fld_001"
// Correlator results stored as `corr:${correlatorId}`
export type FieldValueMap = Map<string, number | null>

export type CorrelatorSuggestion = {
  name: string
  description: string
  unit: string
  formula: FormulaNode
  requiredFields: Array<{
    label: string
    trackerId: string
    fieldId: string
    found: boolean
  }>
  missingCount: number
  readiness: 'ready' | 'almost' | 'aspirational'
  /** Extra correlators to create alongside the main one (e.g. Macro Split creates 3 at once) */
  additionalCreates?: Array<{ name: string; formula: FormulaNode; unit: string }>
  /** Display title shown in the suggestion card UI — defaults to name if not set */
  title?: string
  /** If set, a dashboard widget is automatically created when this suggestion is accepted */
  autoWidget?: {
    label: string
    period: 'this_week'
  }
}
