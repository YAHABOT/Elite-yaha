'use client'

import { useState, useTransition } from 'react'
import { X, GitBranch, Plus, Trash2, Pencil, ChevronLeft, Hash, Sparkles, Clock, Sigma, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Tracker } from '@/types/tracker'
import type { Correlation, FormulaNode, CorrelatorSuggestion } from '@/types/correlator'
import {
  createCorrelationAction,
  deleteCorrelationAction,
  updateCorrelationAction,
  suggestCorrelationsAction,
  createCorrelationsFromSuggestionAction,
} from '@/app/actions/correlations'
import { addTargetAction } from '@/app/actions/targets'

type Props = {
  trackers: Tracker[]
  correlations: Correlation[]
  onClose: () => void
  lastKnownValues?: Record<string, number>
}

type RowType = 'field' | 'constant' | 'correlator' | 'lastKnown' | 'crossTracker'

type VariableRow = {
  id: string
  operator: '+' | '-' | '*' | '/'
  rowType: RowType
  trackerId: string
  fieldId: string
  constantValue: string
  correlatorId: string
  crossTrackerType: string
  crossTrackerLabel: string
  crossTrackerAgg: 'sum' | 'avg'
}

const OPERATORS: Array<{ value: '+' | '-' | '*' | '/'; label: string }> = [
  { value: '+', label: '+' },
  { value: '-', label: '−' },
  { value: '*', label: '×' },
  { value: '/', label: '÷' },
]

const EMPTY_ROW = (id: string): VariableRow => ({
  id, operator: '+', rowType: 'field',
  trackerId: '', fieldId: '', constantValue: '', correlatorId: '',
  crossTrackerType: '', crossTrackerLabel: '', crossTrackerAgg: 'sum',
})

const DEFAULT_ROWS: VariableRow[] = [EMPTY_ROW('1'), EMPTY_ROW('2')]

function buildFormula(rows: VariableRow[]): FormulaNode | null {
  if (rows.length === 0) return null

  const valid = rows.filter(r => {
    if (r.rowType === 'field') return r.trackerId !== '' && r.fieldId !== ''
    if (r.rowType === 'lastKnown') return r.trackerId !== '' && r.fieldId !== ''
    if (r.rowType === 'constant') return r.constantValue.trim() !== '' && !isNaN(parseFloat(r.constantValue))
    if (r.rowType === 'correlator') return r.correlatorId !== ''
    if (r.rowType === 'crossTracker') return r.crossTrackerType !== '' && r.crossTrackerLabel !== ''
    return false
  })

  if (valid.length === 0) return null

  function rowToNode(r: VariableRow): FormulaNode {
    if (r.rowType === 'constant') return { type: 'constant', value: parseFloat(r.constantValue) }
    if (r.rowType === 'correlator') return { type: 'correlator', correlatorId: r.correlatorId }
    if (r.rowType === 'lastKnown') return { type: 'lastKnown', trackerId: r.trackerId, fieldId: r.fieldId }
    if (r.rowType === 'crossTracker') return { type: 'crossTracker', trackerType: r.crossTrackerType, fieldLabel: r.crossTrackerLabel, aggregation: r.crossTrackerAgg }
    return { type: 'field', trackerId: r.trackerId, fieldId: r.fieldId }
  }

  let tree: FormulaNode = rowToNode(valid[0])

  for (let i = 1; i < valid.length; i++) {
    tree = {
      type: 'op',
      operator: valid[i].operator,
      left: tree,
      right: rowToNode(valid[i]),
    }
  }

  return tree
}

/** Returns true if the formula contains crossTracker or lastKnown nodes (auto-generated, complex structure) */
function hasComplexNodes(node: FormulaNode): boolean {
  if (node.type === 'crossTracker' || node.type === 'lastKnown') return true
  if (node.type === 'op') return hasComplexNodes(node.left) || hasComplexNodes(node.right)
  return false
}

function formulaToRows(formula: FormulaNode): VariableRow[] {
  const rows: VariableRow[] = []

  function traverse(node: FormulaNode, operator: VariableRow['operator'] = '+'): void {
    if (node.type === 'field') {
      rows.push({ ...EMPTY_ROW(String(Date.now() + rows.length)), operator, rowType: 'field', trackerId: node.trackerId, fieldId: node.fieldId })
    } else if (node.type === 'constant') {
      rows.push({ ...EMPTY_ROW(String(Date.now() + rows.length)), operator, rowType: 'constant', constantValue: String(node.value) })
    } else if (node.type === 'correlator') {
      rows.push({ ...EMPTY_ROW(String(Date.now() + rows.length)), operator, rowType: 'correlator', correlatorId: node.correlatorId })
    } else if (node.type === 'lastKnown') {
      rows.push({
        ...EMPTY_ROW(String(Date.now() + rows.length)),
        operator,
        rowType: 'lastKnown',
        trackerId: node.trackerId,
        fieldId: node.fieldId,
      })
    } else if (node.type === 'crossTracker') {
      rows.push({
        ...EMPTY_ROW(String(Date.now() + rows.length)),
        operator,
        rowType: 'crossTracker',
        crossTrackerType: node.trackerType,
        crossTrackerLabel: node.fieldLabel,
        crossTrackerAgg: node.aggregation,
      })
    } else if (node.type === 'op') {
      traverse(node.left, '+')
      traverse(node.right, node.operator)
    }
  }

  traverse(formula)
  return rows.length > 0 ? rows : DEFAULT_ROWS
}

function getFieldOptions(trackers: Tracker[]): Array<{ label: string; trackerId: string; fieldId: string }> {
  const opts: Array<{ label: string; trackerId: string; fieldId: string }> = []
  for (const t of trackers) {
    for (const f of t.schema) {
      if (f.type === 'number' || f.type === 'rating' || f.type === 'duration' || f.type === 'time') {
        opts.push({ label: `${t.name}: ${f.label}`, trackerId: t.id, fieldId: f.fieldId })
      }
    }
  }
  return opts
}

export function CorrelatorModal({ trackers, correlations, onClose, lastKnownValues }: Props): React.ReactElement {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [view, setView] = useState<'list' | 'new' | 'edit'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [rows, setRows] = useState<VariableRow[]>(DEFAULT_ROWS)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<CorrelatorSuggestion[] | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [creatingSuggestion, setCreatingSuggestion] = useState<number | null>(null)
  const [originalFormula, setOriginalFormula] = useState<FormulaNode | null>(null)
  const [pendingTarget, setPendingTarget] = useState<{
    correlationId: string
    name: string
    unit: string
  } | null>(null)
  const [targetInputValue, setTargetInputValue] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)

  const fieldOptions = getFieldOptions(trackers)

  function addRow(): void {
    setRows(prev => [...prev, EMPTY_ROW(String(Date.now()))])
  }

  function removeRow(id: string): void {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function updateRow(id: string, patch: Partial<VariableRow>): void {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function toggleRowType(id: string, newType: RowType): void {
    setRows(prev => prev.map(r =>
      r.id === id
        ? { ...r, rowType: newType, trackerId: '', fieldId: '', constantValue: '', correlatorId: '', crossTrackerType: '', crossTrackerLabel: '', crossTrackerAgg: 'sum' as const }
        : r
    ))
  }

  async function handleLoadSuggestions(): Promise<void> {
    setLoadingSuggestions(true)
    setSuggestError(null)
    setSuggestions(null)
    try {
      const result = await suggestCorrelationsAction(trackers, correlations, lastKnownValues)
      if (result.suggestions) {
        setSuggestions(result.suggestions)
      } else {
        setSuggestError(result.error ?? 'Failed to generate suggestions')
      }
    } catch {
      setSuggestError('Failed to generate suggestions — check your connection')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  async function handleCreateSuggestion(suggestion: CorrelatorSuggestion, index: number): Promise<void> {
    setCreatingSuggestion(index)
    const result = await createCorrelationsFromSuggestionAction(suggestion)
    setCreatingSuggestion(null)
    if (result.error) {
      setSuggestError(result.error)
      return
    }
    router.refresh()
    setSuggestions(prev => prev ? prev.filter((_, i) => i !== index) : null)
    // If this suggestion auto-creates a widget, pause before closing and offer a target
    if (suggestion.autoWidget && result.correlationId) {
      setPendingTarget({
        correlationId: result.correlationId,
        name: suggestion.name,
        unit: suggestion.unit,
      })
    } else {
      setTimeout(() => onClose(), 800)
    }
  }

  async function handleSaveTarget(): Promise<void> {
    if (!pendingTarget) return
    const num = parseFloat(targetInputValue)
    if (isNaN(num)) return
    setSavingTarget(true)
    await addTargetAction({
      trackerId: '__correlations__',
      trackerName: 'Correlations',
      fieldId: pendingTarget.correlationId,
      fieldLabel: pendingTarget.name,
      fieldType: 'number',
      unit: pendingTarget.unit,
      value: num,
      direction: 'above',
    })
    setSavingTarget(false)
    setPendingTarget(null)
    onClose()
  }

  function handleSkipTarget(): void {
    setPendingTarget(null)
    onClose()
  }

  function handleEdit(correlation: Correlation): void {
    setEditingId(correlation.id)
    setName(correlation.name)
    setUnit(correlation.unit ?? '')
    setRows(formulaToRows(correlation.formula))
    setOriginalFormula(correlation.formula)
    setView('edit')
    setError(null)
  }

  function handleCancelEdit(): void {
    setView('list')
    setEditingId(null)
    setOriginalFormula(null)
    setError(null)
  }

  function resetForm(): void {
    setName('')
    setUnit('')
    setRows(DEFAULT_ROWS)
    setOriginalFormula(null)
    setError(null)
  }

  const isComplexFormula = originalFormula !== null && hasComplexNodes(originalFormula)

  function handleSave(): void {
    setError(null)
    // For complex (auto-generated) formulas, preserve the original formula structure
    const formula = isComplexFormula ? originalFormula! : buildFormula(rows)
    if (!formula) { setError('Add at least one valid variable.'); return }
    if (!name.trim()) { setError('Name is required.'); return }

    startTransition(async () => {
      if (view === 'edit' && editingId) {
        const res = await updateCorrelationAction(editingId, { name: name.trim(), formula, unit: unit.trim() })
        if (res.error) {
          setError(res.error)
        } else {
          setEditingId(null)
          setView('list')
          resetForm()
          router.refresh()
        }
      } else {
        const res = await createCorrelationAction({ name: name.trim(), formula, unit: unit.trim() })
        if (res.error) {
          setError(res.error)
        } else {
          router.refresh()
          onClose()
        }
      }
    })
  }

  function handleDelete(id: string): void {
    startTransition(async () => {
      await deleteCorrelationAction(id)
      router.refresh()
    })
  }

  const isFormView = view === 'new' || view === 'edit'

  // Correlations available as inputs (exclude the one being edited to prevent self-reference)
  const availableCorrelations = correlations.filter(c => c.id !== editingId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            {view === 'edit' && (
              <button
                onClick={handleCancelEdit}
                className="rounded-lg p-1 text-textMuted transition-colors hover:bg-surfaceHighlight hover:text-textPrimary"
                aria-label="Back to list"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <GitBranch className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-textPrimary">
              {view === 'edit' ? 'Edit Metric' : 'Correlator'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <button
                onClick={() => { resetForm(); setView('new') }}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-all hover:scale-[1.02]"
              >
                <Plus className="h-3 w-3" /> New Metric
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-textMuted hover:bg-surfaceHighlight">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {pendingTarget !== null ? (
          /* Target step — shown after suggestion with autoWidget is accepted */
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <p className="text-base font-bold text-textPrimary">{pendingTarget.name}</p>
              <p className="text-xs text-textMuted">Widget added to your dashboard.</p>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-textMuted text-center">
                Set a weekly target? (optional)
              </p>
              <div className="flex flex-col items-center gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  value={targetInputValue}
                  onChange={e => setTargetInputValue(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-lg font-bold text-textPrimary placeholder:text-textMuted/40 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                {pendingTarget.unit && (
                  <p className="text-xs text-textMuted">{pendingTarget.unit}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveTarget}
                disabled={savingTarget || targetInputValue.trim() === '' || isNaN(parseFloat(targetInputValue))}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40"
              >
                {savingTarget ? 'Saving...' : 'Set Target'}
              </button>
              <button
                onClick={handleSkipTarget}
                className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-textMuted transition-colors hover:bg-surfaceHighlight"
              >
                Skip
              </button>
            </div>
          </div>
        ) : (
        <div className="max-h-[calc(100dvh-200px)] overflow-y-auto">
          {view === 'list' ? (
            /* List view */
            <div>
              {/* Suggest row — idle state */}
              {!loadingSuggestions && suggestions === null && !suggestError && (
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-xs text-textMuted">See all suggested metrics and what fields each one needs</span>
                  </div>
                  <button
                    onClick={handleLoadSuggestions}
                    className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-400 transition-all hover:bg-cyan-500/20"
                  >
                    Suggest
                  </button>
                </div>
              )}

              {/* Loading state */}
              {loadingSuggestions && (
                <div className="border-b border-border px-5 py-4 text-center">
                  <p className="text-xs text-textMuted">Checking your trackers...</p>
                </div>
              )}

              {/* Error state */}
              {suggestError && !loadingSuggestions && (
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <p className="text-xs text-red-400">{suggestError}</p>
                  <button onClick={handleLoadSuggestions} className="ml-3 shrink-0 text-xs text-cyan-400 hover:underline">Retry</button>
                </div>
              )}

              {suggestions !== null && suggestions.length > 0 && (
                <div className="border-b border-border">
                  <div className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Suggested Metrics</span>
                    </div>
                    <button onClick={() => setSuggestions(null)} className="rounded p-1 text-textMuted hover:text-textPrimary">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2 px-4 pb-4">
                    {suggestions.map((s, i) => {
                      const isReady = s.readiness === 'ready'
                      const isAlmost = s.readiness === 'almost'
                      return (
                        <div
                          key={`${s.name}-${i}`}
                          className={`rounded-xl border bg-surfaceHighlight p-3 ${
                            isReady
                              ? 'border-l-2 border-l-cyan-500/60 border-t-border border-r-border border-b-border'
                              : isAlmost
                              ? 'border-l-2 border-l-amber-500/50 border-t-border border-r-border border-b-border'
                              : 'border-border opacity-70'
                          }`}
                        >
                          {/* Header: display title + create button */}
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-textPrimary leading-snug">{s.title ?? s.name}</p>
                            {isReady && (
                              <button
                                onClick={() => handleCreateSuggestion(s, i)}
                                disabled={creatingSuggestion === i}
                                className="shrink-0 rounded-lg bg-cyan-600 px-3 py-1 text-xs font-semibold text-white transition-all hover:bg-cyan-500 disabled:opacity-50"
                              >
                                {creatingSuggestion === i ? '...' : 'Create'}
                              </button>
                            )}
                          </div>

                          {/* Description */}
                          <p className="mt-0.5 text-xs text-textMuted">{s.description}</p>

                          {/* Fields — always visible */}
                          {s.requiredFields.length > 0 && (
                            <div className="mt-2 space-y-1 border-t border-border pt-2">
                              {s.requiredFields.map((rf, j) => (
                                <div key={`${rf.fieldId}-${j}`} className="flex items-center gap-1.5">
                                  <span className={rf.found ? 'text-green-400' : 'text-red-400/70'}>{rf.found ? '✓' : '✗'}</span>
                                  <span className={`text-xs ${rf.found ? 'text-textMuted' : 'text-red-400/70'}`}>{rf.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {suggestions !== null && suggestions.length === 0 && (
                <div className="border-b border-border px-5 py-4 text-center">
                  <p className="text-xs text-textMuted">No new suggestions based on your current fields.</p>
                </div>
              )}


              <div className="divide-y divide-border">
              {correlations.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-textMuted">No correlations yet. Create one!</p>
                </div>
              ) : (
                correlations.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-semibold text-textPrimary">{c.name}</p>
                      {c.unit && <p className="text-xs text-textMuted">{c.unit}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(c)}
                        className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-white/[0.05] hover:text-textPrimary"
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={isPending}
                        className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          ) : (
            /* New / Edit correlation form */
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-textMuted">
                    Metric Name
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Net Calories"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-textMuted">
                    Unit
                  </label>
                  <input
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="e.g. kcal"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-textMuted">Formula</label>
                {isComplexFormula && (
                  <div className="mb-2 flex items-start gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
                    <Sigma className="h-3.5 w-3.5 shrink-0 text-cyan-400 mt-0.5" />
                    <p className="text-xs text-cyan-400/80 leading-relaxed">Auto-generated formula — edit name &amp; unit only. Delete and recreate from Suggest to change the formula.</p>
                  </div>
                )}
                <div className={`space-y-2 ${isComplexFormula ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                  {rows.map((row, idx) => (
                    <div key={row.id} className="rounded-xl border border-border bg-surfaceHighlight/40 p-2 space-y-1.5">
                      {/* Top line: operator (if not first) + type toggle + delete */}
                      <div className="flex items-center gap-1.5">
                        {idx === 0 ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-textMuted">Start with</span>
                        ) : (
                          <div className="flex gap-0.5">
                            {OPERATORS.map(op => (
                              <button
                                key={op.value}
                                onClick={() => updateRow(row.id, { operator: op.value })}
                                className={`h-6 w-6 rounded text-xs font-bold transition-colors ${
                                  row.operator === op.value
                                    ? 'bg-primary text-white'
                                    : 'bg-background text-textMuted hover:bg-primary/20 hover:text-primary'
                                }`}
                              >
                                {op.label}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex-1" />

                        {/* Row type toggle: Field | Metric | # | ↺ */}
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => toggleRowType(row.id, 'field')}
                            className={`rounded-l h-6 px-2 text-xs font-semibold transition-colors ${
                              row.rowType === 'field'
                                ? 'bg-primary text-white'
                                : 'bg-background text-textMuted hover:bg-primary/20 hover:text-primary'
                            }`}
                            title="Today's field value"
                          >
                            Field
                          </button>
                          <button
                            onClick={() => toggleRowType(row.id, 'correlator')}
                            className={`h-6 px-2 text-xs font-semibold transition-colors ${
                              row.rowType === 'correlator'
                                ? 'bg-primary text-white'
                                : 'bg-background text-textMuted hover:bg-primary/20 hover:text-primary'
                            }`}
                            title="Another metric"
                          >
                            <GitBranch className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => toggleRowType(row.id, 'constant')}
                            className={`h-6 px-2 text-xs font-semibold transition-colors ${
                              row.rowType === 'constant'
                                ? 'bg-primary text-white'
                                : 'bg-background text-textMuted hover:bg-primary/20 hover:text-primary'
                            }`}
                            title="Constant number"
                          >
                            <Hash className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => toggleRowType(row.id, 'lastKnown')}
                            className={`h-6 px-2 text-xs font-semibold transition-colors ${
                              row.rowType === 'lastKnown'
                                ? 'bg-amber-500/80 text-white'
                                : 'bg-background text-textMuted hover:bg-amber-500/20 hover:text-amber-400'
                            }`}
                            title="Last known value — uses most recent entry even if not logged today"
                          >
                            <Clock className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => toggleRowType(row.id, 'crossTracker')}
                            className={`rounded-r h-6 px-2 text-xs font-semibold transition-colors ${
                              row.rowType === 'crossTracker'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-background text-textMuted hover:bg-cyan-500/20 hover:text-cyan-400'
                            }`}
                            title="Cross-tracker sum/avg — aggregates across all trackers of a type"
                          >
                            <Sigma className="h-3 w-3" />
                          </button>
                        </div>

                        {rows.length > 1 && (
                          <button onClick={() => removeRow(row.id)} className="h-6 w-6 flex items-center justify-center rounded text-textMuted hover:text-red-400">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Bottom line: full-width input */}
                      {(row.rowType === 'field' || row.rowType === 'lastKnown') && (
                        <select
                          value={`${row.trackerId}::${row.fieldId}`}
                          onChange={e => {
                            const [tid, fid] = e.target.value.split('::')
                            updateRow(row.id, { trackerId: tid, fieldId: fid })
                          }}
                          className={`w-full rounded-lg border bg-background px-3 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 ${
                            row.rowType === 'lastKnown'
                              ? 'border-amber-500/30 focus:border-amber-500/50 focus:ring-amber-500/20'
                              : 'border-border focus:border-primary/50 focus:ring-primary/30'
                          }`}
                        >
                          <option value="::">{row.rowType === 'lastKnown' ? 'Select field (last known)...' : 'Select field...'}</option>
                          {fieldOptions.map(opt => (
                            <option key={`${opt.trackerId}::${opt.fieldId}`} value={`${opt.trackerId}::${opt.fieldId}`}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {row.rowType === 'correlator' && (
                        <select
                          value={row.correlatorId}
                          onChange={e => updateRow(row.id, { correlatorId: e.target.value })}
                          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-textPrimary focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                        >
                          <option value="">Select metric...</option>
                          {availableCorrelations.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {row.rowType === 'constant' && (
                        <input
                          type="number"
                          value={row.constantValue}
                          onChange={e => updateRow(row.id, { constantValue: e.target.value })}
                          placeholder="0"
                          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-textPrimary placeholder:text-textMuted/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      )}

                      {row.rowType === 'crossTracker' && (
                        <div className="w-full rounded-lg border border-cyan-500/30 bg-background px-3 py-1.5 flex items-center gap-1.5">
                          <Sigma className="h-3 w-3 shrink-0 text-cyan-400" />
                          <span className="text-xs text-textMuted truncate">
                            {row.crossTrackerLabel
                              ? `${row.crossTrackerAgg === 'avg' ? 'Avg' : 'Sum'} of ${row.crossTrackerLabel} (all ${row.crossTrackerType} trackers)`
                              : 'Cross-tracker aggregate'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {!isComplexFormula && (
                  <button
                    onClick={addRow}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add Variable
                  </button>
                )}
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
              )}
            </div>
          )}
        </div>
        )}

        {/* Footer */}
        {isFormView && pendingTarget === null && (
          <div className="flex gap-2 border-t border-border px-5 py-4">
            <button
              onClick={view === 'edit' ? handleCancelEdit : () => { setView('list'); setError(null) }}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-textMuted transition-colors hover:bg-surfaceHighlight"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {isPending ? 'Saving...' : view === 'edit' ? 'Update Metric' : 'Save Metric'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
