// A formula step is one of:
// - field reference: { type: 'field', trackerId: string, fieldId: string }
// - constant: { type: 'constant', value: number }
// - operation: { type: 'op', operator: '+' | '-' | '*' | '/', left: FormulaNode, right: FormulaNode }
// - correlator reference: { type: 'correlator', correlatorId: string }
export type FormulaNode =
  | { type: 'field'; trackerId: string; fieldId: string }
  | { type: 'constant'; value: number }
  | { type: 'op'; operator: '+' | '-' | '*' | '/'; left: FormulaNode; right: FormulaNode }
  | { type: 'correlator'; correlatorId: string }

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
}
