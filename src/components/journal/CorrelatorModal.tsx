'use client'

import { useState, useTransition } from 'react'
import { X, GitBranch, Plus, Trash2, Pencil, ChevronLeft, Hash, Sparkles, ChevronDown, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Tracker } from '@/types/tracker'
import type { Correlation, FormulaNode, CorrelatorSuggestion } from '@/types/correlator'
import {
  createCorrelationAction,
  deleteCorrelationAction,
  updateCorrelationAction,
  suggestCorrelationsAction,
} from '@/app/actions/correlations'

type Props = {
  trackers: Tracker[]
  correlations: Correlation[]
  onClose: () => void
}

type RowType = 'field' | 'constant' | 'correlator'

type VariableRow = {
  id: string
  operator: '+' | '-' | '*' | '/'
  rowType: RowType
  trackerId: string
  fieldId: string
  constantValue: string
  correlatorId: string
}

const OPERATORS: Array<{ value: '+' | '-' | '*' | '/'; label: string }> = [
  { value: '+', label: '+' },
  { value: '-', label: '−' },
  { value: '*', label: '×' },
  { value: '/', label: '÷' },
]

const DEFAULT_ROWS: VariableRow[] = [
  { id: '1', operator: '+', rowType: 'field', trackerId: '', fieldId: '', constantValue: '', correlatorId: '' },
  { id: '2', operator: '+', rowType: 'field', trackerId: '', fieldId: '', constantValue: '', correlatorId: '' },
]

function buildFormula(rows: VariableRow[]): FormulaNode | null {
  if (rows.length === 0) return null

  const valid = rows.filter(r => {
    if (r.rowType === 'field') return r.trackerId !== '' && r.fieldId !== ''
    if (r.rowType === 'constant') return r.constantValue.trim() !== '' && !isNaN(parseFloat(r.constantValue))
    if (r.rowType === 'correlator') return r.correlatorId !== ''
    return false
  })

  if (valid.length === 0) return null

  function rowToNode(r: VariableRow): FormulaNode {
    if (r.rowType === 'constant') return { type: 'constant', value: parseFloat(r.constantValue) }
    if (r.rowType === 'correlator') return { type: 'correlator', correlatorId: r.correlatorId }
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

function formulaToRows(formula: FormulaNode): VariableRow[] {
  const rows: VariableRow[] = []

  function traverse(node: FormulaNode, operator: VariableRow['operator'] = '+'): void {
    if (node.type === 'field') {
      rows.push({
        id: String(Date.now() + rows.length),
        operator,
        rowType: 'field',
        trackerId: node.trackerId,
        fieldId: node.fieldId,
        constantValue: '',
        correlatorId: '',
      })
    } else if (node.type === 'constant') {
      rows.push({
        id: String(Date.now() + rows.length),
        operator,
        rowType: 'constant',
        trackerId: '',
        fieldId: '',
        constantValue: String(node.value),
        correlatorId: '',
      })
    } else if (node.type === 'correlator') {
      rows.push({
        id: String(Date.now() + rows.length),
        operator,
        rowType: 'correlator',
        trackerId: '',
        fieldId: '',
        constantValue: '',
        correlatorId: node.correlatorId,
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

export function CorrelatorModal({ trackers, correlations, onClose }: Props): React.ReactElement {
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
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set())
  const [creatingSuggestion, setCreatingSuggestion] = useState<number | null>(null)

  const fieldOptions = getFieldOptions(trackers)

  function addRow(): void {
    setRows(prev => [
      ...prev,
      { id: String(Date.now()), operator: '+', rowType: 'field', trackerId: '', fieldId: '', constantValue: '', correlatorId: '' },
    ])
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
        ? { ...r, rowType: newType, trackerId: '', fieldId: '', constantValue: '', correlatorId: '' }
        : r
    ))
  }

  async function handleLoadSuggestions(): Promise<void> {
    setLoadingSuggestions(true)
    setSuggestError(null)
    setSuggestions(null)
    try {
      const result = await suggestCorrelationsAction(trackers, correlations)
      if (result.suggestions) {
        setSuggestions(result.suggestions)
        const readyIndices = new Set(
          result.suggestions.map((s, i) => (s.readiness === 'ready' ? i : -1)).filter(i => i >= 0)
        )
        setExpandedSuggestions(readyIndices)
      } else {
        setSuggestError(result.error ?? 'Failed to generate suggestions')
      }
    } catch {
      setSuggestError('Failed to generate suggestions — check your connection')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  function toggleSuggestionExpand(index: number): void {
    setExpandedSuggestions(prev => {
      const next = new Set(prev)
      if (next.has(index)) { next.delete(index) } else { next.add(index) }
      return next
    })
  }

  async function handleCreateSuggestion(suggestion: CorrelatorSuggestion, index: number): Promise<void> {
    setCreatingSuggestion(index)
    const result = await createCorrelationAction({ name: suggestion.name, formula: suggestion.formula, unit: suggestion.unit })
    setCreatingSuggestion(null)
    if (!result.error) {
      router.refresh()
      setSuggestions(prev => prev ? prev.filter((_, i) => i !== index) : null)
    }
  }

  function handleEdit(correlation: Correlation): void {
    setEditingId(correlation.id)
    setName(correlation.name)
    setUnit(correlation.unit ?? '')
    setRows(formulaToRows(correlation.formula))
    setView('edit')
    setError(null)
  }

  function handleCancelEdit(): void {
    setView('list')
    setEditingId(null)
    setError(null)
  }

  function resetForm(): void {
    setName('')
    setUnit('')
    setRows(DEFAULT_ROWS)
    setError(null)
  }

  function handleSave(): void {
    setError(null)
    const formula = buildFormula(rows)
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
              <>
                <button
                  onClick={handleLoadSuggestions}
                  disabled={loadingSuggestions}
                  className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-400 transition-all hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3" />
                  {loadingSuggestions ? 'Analyzing...' : 'Suggest'}
                </button>
                <button
                  onClick={() => { resetForm(); setView('new') }}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-all hover:scale-[1.02]"
                >
                  <Plus className="h-3 w-3" /> New Metric
                </button>
              </>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-textMuted hover:bg-surfaceHighlight">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {view === 'list' ? (
            /* List view */
            <div>
              {/* Suggest row — idle state */}
              {!loadingSuggestions && suggestions === null && !suggestError && (
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-xs text-textMuted">AI-suggested metrics from your trackers</span>
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
                  <p className="text-xs text-textMuted">Analyzing your fields...</p>
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
                      const isExpanded = expandedSuggestions.has(i)
                      const isReady = s.readiness === 'ready'
                      const isAlmost = s.readiness === 'almost'
                      return (
                        <div
                          key={`${s.name}-${i}`}
                          className={`rounded-xl border bg-surfaceHighlight p-3 ${
                            isReady ? 'border-l-2 border-l-cyan-500/60 border-t-border border-r-border border-b-border'
                            : isAlmost ? 'border-l-2 border-l-amber-500/50 border-t-border border-r-border border-b-border'
                            : 'border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-textPrimary">{s.name}</p>
                              <p className="mt-0.5 text-xs text-textMuted">{s.description}</p>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-1.5">
                              {!isReady && s.missingCount > 0 && (
                                <button onClick={() => toggleSuggestionExpand(i)} className="flex items-center gap-0.5 text-xs text-amber-400">
                                  {s.missingCount} missing
                                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </button>
                              )}
                              {isReady && (
                                <button
                                  onClick={() => handleCreateSuggestion(s, i)}
                                  disabled={creatingSuggestion === i}
                                  className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-cyan-500 disabled:opacity-50"
                                >
                                  {creatingSuggestion === i ? 'Creating...' : 'Create'}
                                </button>
                              )}
                            </div>
                          </div>
                          {(isReady || isExpanded) && s.requiredFields.length > 0 && (
                            <div className="mt-2 space-y-1 border-t border-border pt-2">
                              {s.requiredFields.map((rf, j) => (
                                <div key={`${rf.fieldId}-${j}`} className="flex items-center gap-1.5">
                                  <span className={rf.found ? 'text-green-400' : 'text-textMuted'}>{rf.found ? '✓' : '✗'}</span>
                                  <span className={`text-xs ${rf.found ? 'text-green-400' : 'text-textMuted'}`}>{rf.label}</span>
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
                <div className="space-y-2">
                  {rows.map((row, idx) => (
                    <div key={row.id} className="flex items-center gap-2">
                      {idx > 0 && (
                        <div className="flex gap-1">
                          {OPERATORS.map(op => (
                            <button
                              key={op.value}
                              onClick={() => updateRow(row.id, { operator: op.value })}
                              className={`min-w-[28px] rounded-lg px-2 py-1.5 text-sm font-bold transition-colors ${
                                row.operator === op.value
                                  ? 'bg-primary text-white'
                                  : 'bg-surfaceHighlight text-textMuted hover:bg-primary/20 hover:text-primary'
                              }`}
                            >
                              {op.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {idx === 0 && <div className="w-[88px] flex-shrink-0" />}

                      {/* Row type toggle: [Field] [Corr] [#] */}
                      <div className="flex gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => toggleRowType(row.id, 'field')}
                          className={`rounded-l-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                            row.rowType === 'field'
                              ? 'bg-primary text-white'
                              : 'bg-surfaceHighlight text-textMuted hover:bg-primary/20 hover:text-primary'
                          }`}
                          title="Field value"
                        >
                          Field
                        </button>
                        <button
                          onClick={() => toggleRowType(row.id, 'correlator')}
                          className={`px-2 py-1.5 text-xs font-semibold transition-colors ${
                            row.rowType === 'correlator'
                              ? 'bg-primary text-white'
                              : 'bg-surfaceHighlight text-textMuted hover:bg-primary/20 hover:text-primary'
                          }`}
                          title="Another metric"
                        >
                          <GitBranch className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => toggleRowType(row.id, 'constant')}
                          className={`rounded-r-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                            row.rowType === 'constant'
                              ? 'bg-primary text-white'
                              : 'bg-surfaceHighlight text-textMuted hover:bg-primary/20 hover:text-primary'
                          }`}
                          title="Constant number"
                        >
                          <Hash className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Input area based on row type */}
                      {row.rowType === 'field' && (
                        <select
                          value={`${row.trackerId}::${row.fieldId}`}
                          onChange={e => {
                            const [tid, fid] = e.target.value.split('::')
                            updateRow(row.id, { trackerId: tid, fieldId: fid })
                          }}
                          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-textPrimary focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                        >
                          <option value="::">Select field...</option>
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
                          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-textPrimary focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
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
                          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      )}

                      {rows.length > 1 && (
                        <button onClick={() => removeRow(row.id)} className="p-1.5 text-textMuted hover:text-red-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addRow}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" /> Add Variable
                </button>
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isFormView && (
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
