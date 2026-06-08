'use client'

import { useState } from 'react'
import { X, Search, UtensilsCrossed, ShoppingBasket } from 'lucide-react'
import type { FoodBankEntry } from '@/types/food-bank'

type Props = {
  entries: FoodBankEntry[]
  onSelect: (name: string) => void
  onClose: () => void
}

type Tab = 'all' | 'dish' | 'pantry_item'

export function FoodBankPicker({ entries, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('all')

  const filtered = entries.filter(e => {
    if (activeTab !== 'all' && e.entry_type !== activeTab) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return e.name.toLowerCase().includes(q) || (e.shortcut ?? '').toLowerCase().includes(q)
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'dish', label: 'Dishes' },
    { key: 'pantry_item', label: 'Pantry' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#050505' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe-top pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.20)' }}>
          <UtensilsCrossed className="h-4 w-4 text-nutrition" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-textPrimary">Food Bank</p>
          <p className="text-[10px] text-textMuted opacity-50">Select an item to add to your message</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-textMuted hover:text-textPrimary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-textMuted opacity-40 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or shortcut…"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-4 py-2.5 text-sm text-textPrimary placeholder:text-textMuted/30 focus:border-white/20 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-2.5 border-b border-white/[0.04]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${
              activeTab === t.key
                ? 'bg-nutrition/15 text-nutrition border border-nutrition/30'
                : 'bg-white/[0.03] text-textMuted border border-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-textMuted opacity-40">
              {entries.length === 0
                ? 'No food bank items saved yet. Add some in Settings → Food Bank.'
                : 'No items match your search.'}
            </p>
          </div>
        ) : (
          filtered.map(entry => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry.name)}
              className="w-full flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-all duration-200 hover:border-nutrition/20 hover:bg-nutrition/[0.04] active:scale-[0.98]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.12)' }}>
                {entry.emoji ? (
                  <span>{entry.emoji}</span>
                ) : entry.entry_type === 'dish' ? (
                  <UtensilsCrossed className="h-4 w-4 text-nutrition opacity-70" />
                ) : (
                  <ShoppingBasket className="h-4 w-4 text-nutrition opacity-70" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-bold text-textPrimary">{entry.name}</span>
                  {entry.shortcut && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.18)' }}>
                      {entry.shortcut}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-textMuted mt-0.5">
                  {entry.serving_label && <span className="opacity-50">{entry.serving_label} • </span>}
                  <span className="text-nutrition font-bold">{Math.round(entry.kcal)} kcal</span>
                  <span className="opacity-40"> • </span>
                  <span>P:{entry.protein_g}g C:{entry.carbs_g}g F:{entry.fat_g}g</span>
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
