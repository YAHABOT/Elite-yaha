import type { FormulaNode, FieldValueMap } from '@/types/correlator'

type MinimalCorrelation = { id: string; formula: FormulaNode }
import type { TrackerLog } from '@/types/log'

const MAX_DEPTH = 20

function evaluateNode(
  node: FormulaNode,
  values: FieldValueMap,
  depth: number,
  lastKnownMap?: Map<string, number>
): number | null {
  if (depth > MAX_DEPTH) return null

  if (node.type === 'constant') {
    return node.value
  }

  if (node.type === 'field') {
    const key = `${node.trackerId}:${node.fieldId}`
    const value = values.get(key)
    if (value === undefined) return null
    return value
  }

  if (node.type === 'lastKnown') {
    const key = `${node.trackerId}:${node.fieldId}`
    // Prefer today's logged value; fall back to most recent historical value
    const todayValue = values.get(key)
    if (todayValue !== undefined) return todayValue
    return lastKnownMap?.get(key) ?? null
  }

  if (node.type === 'correlator') {
    const key = `corr:${node.correlatorId}`
    const value = values.get(key)
    if (value === undefined) return null
    return value
  }

  // node.type === 'op'
  const left = evaluateNode(node.left, values, depth + 1, lastKnownMap)
  const right = evaluateNode(node.right, values, depth + 1, lastKnownMap)

  if (left === null || right === null) return null

  if (node.operator === '+') return left + right
  if (node.operator === '-') return left - right
  if (node.operator === '*') return left * right
  if (node.operator === '/') {
    if (right === 0) return null
    return left / right
  }

  return null
}

export function evaluateFormula(
  node: FormulaNode,
  values: FieldValueMap,
  lastKnownMap?: Map<string, number>
): number | null {
  return evaluateNode(node, values, 0, lastKnownMap)
}

export function buildFieldValueMap(logs: TrackerLog[]): FieldValueMap {
  const map: FieldValueMap = new Map()

  for (const log of logs) {
    for (const [fieldId, value] of Object.entries(log.fields)) {
      if (typeof value !== 'number') continue

      const key = `${log.tracker_id}:${fieldId}`
      const existing = map.get(key)

      if (existing === undefined || existing === null) {
        map.set(key, value)
      } else {
        map.set(key, existing + value)
      }
    }
  }

  return map
}

/**
 * Collect all correlatorId references from a formula node.
 */
function collectCorrelatorDeps(node: FormulaNode): string[] {
  if (node.type === 'correlator') return [node.correlatorId]
  if (node.type === 'op') {
    return [...collectCorrelatorDeps(node.left), ...collectCorrelatorDeps(node.right)]
  }
  return []
}

/**
 * Topologically sort correlations so that dependencies come before dependents.
 * Correlations involved in cycles are returned in a separate set.
 */
function topoSortCorrelations(correlations: MinimalCorrelation[]): {
  sorted: MinimalCorrelation[]
  cyclic: Set<string>
} {
  const idToCorr = new Map<string, MinimalCorrelation>()
  for (const c of correlations) idToCorr.set(c.id, c)

  // Build dependency map: corrId → set of corrIds it depends on
  const deps = new Map<string, Set<string>>()
  for (const c of correlations) {
    const d = new Set(collectCorrelatorDeps(c.formula).filter(id => idToCorr.has(id)))
    deps.set(c.id, d)
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()
  const cyclic = new Set<string>()
  const sorted: MinimalCorrelation[] = []

  function visit(id: string): void {
    if (inStack.has(id)) {
      // Cycle detected — mark all nodes in the current stack path as cyclic
      inStack.forEach(sid => cyclic.add(sid))
      return
    }
    if (visited.has(id)) return

    inStack.add(id)
    const corrDeps = deps.get(id) ?? new Set<string>()
    for (const depId of corrDeps) {
      visit(depId)
    }
    inStack.delete(id)
    visited.add(id)

    const corr = idToCorr.get(id)
    if (corr) sorted.push(corr)
  }

  for (const c of correlations) {
    visit(c.id)
  }

  return { sorted, cyclic }
}

/**
 * Build a FieldValueMap from logs, then evaluate each correlation in topological
 * order and inject its result as `corr:${id}` into the map. Cyclic correlators
 * are skipped (they will return null when referenced).
 */
export function buildFieldValueMapWithCorrelators(
  logs: TrackerLog[],
  correlations: MinimalCorrelation[],
  lastKnownMap?: Map<string, number>
): FieldValueMap {
  const map = buildFieldValueMap(logs)

  if (correlations.length === 0) return map

  const { sorted, cyclic } = topoSortCorrelations(correlations)

  for (const corr of sorted) {
    if (cyclic.has(corr.id)) continue
    const result = evaluateFormula(corr.formula, map, lastKnownMap)
    if (result !== null) {
      map.set(`corr:${corr.id}`, result)
    }
  }

  return map
}

export function formatResult(value: number | null, unit: string): string {
  if (value === null) return '---'

  const rounded = Number.isInteger(value) ? value : Math.round(value * 10) / 10
  return `${rounded} ${unit}`
}
