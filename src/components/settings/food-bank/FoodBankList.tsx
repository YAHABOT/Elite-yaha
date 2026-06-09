'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2, UtensilsCrossed, ShoppingBasket, Loader2, Check, CheckSquare, Square } from 'lucide-react'
import { deleteFoodBankEntryAction, logFoodBankEntryAction } from '@/app/actions/food-bank'
import type { FoodBankEntry } from '@/types/food-bank'

type Props = { initialEntries: FoodBankEntry[] }

type Tab = 'all' | 'dish' | 'pantry_item'

export function FoodBankList({ initialEntries }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState<FoodBankEntry[]>(initialEntries)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [logStates, setLogStates] = useState<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({})

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isBulkDeleting, startBulkDeleteTransition] = useTransition()

  const filtered = entries.filter(e => {
    if (activeTab !== 'all' && e.entry_type !== activeTab) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return e.name.toLowerCase().includes(q) || (e.shortcut ?? '').toLowerCase().includes(q)
  })

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(e => e.id)))
    }
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  function handleBulkDelete() {
    startBulkDeleteTransition(async () => {
      const ids = Array.from(selected)
      await Promise.all(ids.map(id => deleteFoodBankEntryAction(id)))
      setEntries(prev => prev.filter(e => !selected.has(e.id)))
      exitSelectMode()
    })
  }

  function handleDelete(id: string) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    startDeleteTransition(async () => {
      const result = await deleteFoodBankEntryAction(id)
      if (!result.error) {
        setEntries(prev => prev.filter(e => e.id !== id))
        setConfirmDeleteId(null)
      }
    })
  }

  async function handleLog(entry: FoodBankEntry) {
    setLogStates(prev => ({ ...prev, [entry.id]: 'loading' }))
    const result = await logFoodBankEntryAction(entry.id)
    if (result.error) {
      setLogStates(prev => ({ ...prev, [entry.id]: 'error' }))
      setTimeout(() => setLogStates(prev => ({ ...prev, [entry.id]: 'idle' })), 2000)
    } else {
      setLogStates(prev => ({ ...prev, [entry.id]: 'done' }))
      setTimeout(() => setLogStates(prev => ({ ...prev, [entry.id]: 'idle' })), 2000)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'dish', label: 'Dishes' },
    { key: 'pantry_item', label: 'Pantry' },
  ]

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${
                activeTab === t.key
                  ? 'bg-nutrition/15 text-nutrition border border-nutrition/30'
                  : 'bg-white/[0.03] text-textMuted border border-white/5 hover:text-textPrimary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <button
              onClick={exitSelectMode}
              className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-textMuted text-[11px] font-black uppercase tracking-widest hover:text-textPrimary transition-all duration-200"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-textMuted text-[11px] font-black uppercase tracking-widest hover:text-textPrimary transition-all duration-200"
            >
              Select
            </button>
          )}
          <Link
            href="/settings/food-bank/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-nutrition/15 border border-nutrition/30 text-nutrition text-[11px] font-black uppercase tracking-widest hover:bg-nutrition/20 transition-all duration-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Link>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-textMuted hover:text-textPrimary transition-colors"
          >
            {selected.size === filtered.length
              ? <CheckSquare className="h-4 w-4 text-nutrition" />
              : <Square className="h-4 w-4" />}
            {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
            >
              {isBulkDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Delete {selected.size}
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or shortcut…"
        className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-textPrimary placeholder:text-textMuted/30 focus:border-white/20 focus:outline-none transition-all duration-200"
      />

      {/* Entry list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-10 text-center">
          <p className="text-sm text-textMuted opacity-50">
            {search ? 'No items match your search.' : 'No items saved yet. Add your first dish or pantry item.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => {
            const logState = logStates[entry.id] ?? 'idle'
            const isSelected = selected.has(entry.id)
            return (
              <div
                key={entry.id}
                onClick={selectMode ? () => toggleSelect(entry.id) : undefined}
                className={`rounded-2xl border px-4 py-3.5 space-y-2.5 transition-all duration-150 ${
                  isSelected
                    ? 'border-red-500/30 bg-red-500/[0.04]'
                    : 'border-white/5 bg-white/[0.02]'
                } ${selectMode ? 'cursor-pointer' : ''}`}
              >
                {/* Top row: checkbox (select mode) + icon + name + badges */}
                <div className="flex items-start gap-3">
                  {selectMode && (
                    <div className="mt-0.5 shrink-0">
                      {isSelected
                        ? <CheckSquare className="h-4 w-4 text-red-400" />
                        : <Square className="h-4 w-4 text-textMuted/50" />}
                    </div>
                  )}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    {entry.emoji ? (
                      <span>{entry.emoji}</span>
                    ) : entry.entry_type === 'dish' ? (
                      <UtensilsCrossed className="h-4 w-4 text-nutrition" />
                    ) : (
                      <ShoppingBasket className="h-4 w-4 text-nutrition" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-textPrimary">{entry.name}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{ background: entry.entry_type === 'dish' ? 'rgba(16,185,129,0.12)' : 'rgba(6,182,212,0.12)', color: entry.entry_type === 'dish' ? '#10b981' : '#06b6d4' }}>
                        {entry.entry_type === 'dish' ? 'DISH' : 'PANTRY'}
                      </span>
                      {entry.shortcut && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(0,212,255,0.10)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.20)' }}>
                          {entry.shortcut}
                        </span>
                      )}
                      {entry.ingredients && entry.ingredients.length > 0 && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(168,85,247,0.10)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.20)' }}>
                          {entry.ingredients.length} ingredients
                        </span>
                      )}
                    </div>
                    {entry.serving_label && (
                      <p className="text-[11px] text-textMuted opacity-60 mt-0.5">{entry.serving_label}</p>
                    )}
                    <p className="text-[11px] text-textMuted mt-1">
                      <span className="text-nutrition font-bold">{Math.round(entry.kcal)} kcal</span>
                      <span className="opacity-50"> • </span>
                      <span>P:{entry.protein_g}g</span>
                      <span className="opacity-50"> • </span>
                      <span>C:{entry.carbs_g}g</span>
                      <span className="opacity-50"> • </span>
                      <span>F:{entry.fat_g}g</span>
                      {entry.fibre_g != null && (
                        <><span className="opacity-50"> • </span><span>Fibre:{entry.fibre_g}g</span></>
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions row — hidden in select mode */}
                {!selectMode && (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
                    {entry.entry_type === 'dish' && (
                      <button
                        onClick={() => void handleLog(entry)}
                        disabled={logState === 'loading'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 disabled:opacity-50"
                        style={{
                          background: logState === 'done' ? 'rgba(16,185,129,0.2)' : logState === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.10)',
                          border: logState === 'done' ? '1px solid rgba(16,185,129,0.40)' : logState === 'error' ? '1px solid rgba(239,68,68,0.30)' : '1px solid rgba(16,185,129,0.25)',
                          color: logState === 'done' ? '#10b981' : logState === 'error' ? '#ef4444' : '#10b981',
                        }}
                      >
                        {logState === 'loading' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : logState === 'done' ? (
                          <><Check className="h-3 w-3" /> Logged!</>
                        ) : logState === 'error' ? (
                          'Error'
                        ) : (
                          'Log Entry'
                        )}
                      </button>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => router.push(`/settings/food-bank/${entry.id}/edit`)}
                      className="rounded-lg p-1.5 text-textMuted hover:bg-white/[0.05] hover:text-textPrimary transition-all duration-200"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {confirmDeleteId === entry.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={isDeleting}
                          className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm?'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-textMuted hover:text-textPrimary transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="rounded-lg p-1.5 text-textMuted hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
