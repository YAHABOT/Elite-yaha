'use client'

import { useState, useTransition } from 'react'
import { Bookmark, Check, ChevronDown, ChevronUp, Loader2, Pencil, X } from 'lucide-react'
import { createFoodBankEntryAction } from '@/app/actions/food-bank'
import type { SaveToFoodBankCard as SaveToFoodBankCardType } from '@/types/action-card'
import type { CreateFoodBankInput } from '@/types/food-bank'

type Status = 'pending' | 'saving' | 'saved' | 'error' | 'discarded'

type EditableCard = {
  name: string
  entry_type: 'dish' | 'pantry_item'
  kcal: string
  protein_g: string
  carbs_g: string
  fat_g: string
  fibre_g: string
  serving_label: string
  serving_size_g: string
  shortcut: string
  notes: string
}

type Props = {
  card: SaveToFoodBankCardType
}

export function SaveToFoodBankCard({ card }: Props): React.ReactElement {
  const [status, setStatus] = useState<Status>('pending')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showIngredients, setShowIngredients] = useState(false)
  const [isEditExpanded, setIsEditExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [editable, setEditable] = useState<EditableCard>({
    name: card.name,
    entry_type: card.entry_type,
    kcal: String(card.kcal),
    protein_g: String(card.protein_g),
    carbs_g: String(card.carbs_g),
    fat_g: String(card.fat_g),
    fibre_g: card.fibre_g != null ? String(card.fibre_g) : '',
    serving_label: card.serving_label ?? '',
    serving_size_g: card.serving_size_g != null ? String(card.serving_size_g) : '',
    shortcut: card.shortcut ?? '',
    notes: card.notes ?? '',
  })

  function set(field: keyof EditableCard, value: string) {
    setEditable(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      setStatus('saving')
      setErrorMsg(null)
      const input: CreateFoodBankInput = {
        name: editable.name.trim() || card.name,
        entry_type: editable.entry_type,
        shortcut: editable.shortcut.trim() || null,
        emoji: card.emoji ?? null,
        serving_label: editable.serving_label.trim() || null,
        serving_size_g: editable.serving_size_g !== '' ? Number(editable.serving_size_g) : null,
        kcal: Number(editable.kcal) || card.kcal,
        protein_g: Number(editable.protein_g) || card.protein_g,
        carbs_g: Number(editable.carbs_g) || card.carbs_g,
        fat_g: Number(editable.fat_g) || card.fat_g,
        fibre_g: editable.fibre_g !== '' ? Number(editable.fibre_g) : null,
        ingredients: card.ingredients ?? null,
        batch_yield_g: card.batch_yield_g ?? null,
        batch_kcal: card.batch_kcal ?? null,
        batch_protein_g: card.batch_protein_g ?? null,
        batch_carbs_g: card.batch_carbs_g ?? null,
        batch_fat_g: card.batch_fat_g ?? null,
        notes: editable.notes.trim() || null,
      }
      const result = await createFoodBankEntryAction(input)
      if (result.error) {
        setErrorMsg(result.error)
        setStatus('error')
      } else {
        setStatus('saved')
      }
    })
  }

  function handleDiscard() {
    setStatus('discarded')
  }

  const macroLine = `${Math.round(Number(editable.kcal) || card.kcal)} kcal • P:${editable.protein_g || card.protein_g}g • C:${editable.carbs_g || card.carbs_g}g • F:${editable.fat_g || card.fat_g}g`

  if (status === 'saved') {
    return (
      <div className="rounded-2xl border border-nutrition/30 bg-nutrition/[0.08] px-4 py-3.5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-nutrition/15">
          <Check className="h-4 w-4 text-nutrition" />
        </div>
        <div>
          <p className="text-sm font-bold text-nutrition">Saved to Food Bank</p>
          <p className="text-xs text-textMuted opacity-60">{editable.name || card.name}</p>
        </div>
      </div>
    )
  }

  if (status === 'discarded') {
    return (
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 px-4 py-3.5">
        <p className="text-sm font-medium text-muted-foreground/50">Food bank save discarded</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.20)' }}>
          <Bookmark className="h-4 w-4 text-nutrition" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-nutrition opacity-70">Save to Food Bank</p>
          {isEditExpanded ? (
            <input
              type="text"
              value={editable.name}
              onChange={e => set('name', e.target.value)}
              className="w-full bg-transparent text-sm font-bold text-textPrimary focus:outline-none border-b border-white/20 focus:border-nutrition/50 pb-0.5"
              placeholder="Name…"
            />
          ) : (
            <p className="text-sm font-bold text-textPrimary break-words leading-snug">{editable.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditExpanded ? (
            <select
              value={editable.entry_type}
              onChange={e => set('entry_type', e.target.value as 'dish' | 'pantry_item')}
              className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-transparent cursor-pointer focus:outline-none"
              style={{ border: '1px solid rgba(16,185,129,0.35)', color: '#10b981' }}
            >
              <option value="dish">DISH</option>
              <option value="pantry_item">PANTRY</option>
            </select>
          ) : (
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: editable.entry_type === 'dish' ? 'rgba(16,185,129,0.12)' : 'rgba(6,182,212,0.12)', color: editable.entry_type === 'dish' ? '#10b981' : '#06b6d4' }}>
              {editable.entry_type === 'dish' ? 'DISH' : 'PANTRY'}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsEditExpanded(v => !v)}
            className="rounded-lg p-1 text-muted-foreground/60 transition-all hover:bg-white/[0.08] hover:text-muted-foreground"
            aria-label="Edit entry"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {isEditExpanded ? (
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'kcal', label: 'Kcal' },
              { key: 'protein_g', label: 'Protein (g)' },
              { key: 'carbs_g', label: 'Carbs (g)' },
              { key: 'fat_g', label: 'Fat (g)' },
              { key: 'fibre_g', label: 'Fibre (g)' },
              { key: 'serving_size_g', label: 'Serving (g)' },
            ] as { key: keyof EditableCard; label: string }[]).map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 focus-within:border-nutrition/30">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{label}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editable[key]}
                  onChange={e => set(key, e.target.value)}
                  className="bg-transparent text-sm font-bold text-foreground w-full focus:outline-none"
                  placeholder="—"
                />
              </div>
            ))}
            <div className="col-span-2 flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 focus-within:border-nutrition/30">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Serving Label</span>
              <input
                type="text"
                value={editable.serving_label}
                onChange={e => set('serving_label', e.target.value)}
                className="bg-transparent text-sm font-bold text-foreground w-full focus:outline-none"
                placeholder="e.g. 1 bowl (350g)"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 focus-within:border-nutrition/30">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Shortcut</span>
              <input
                type="text"
                value={editable.shortcut}
                onChange={e => set('shortcut', e.target.value)}
                className="bg-transparent text-sm font-bold text-foreground w-full focus:outline-none"
                placeholder="e.g. ckn pasta"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 focus-within:border-nutrition/30">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Notes</span>
              <input
                type="text"
                value={editable.notes}
                onChange={e => set('notes', e.target.value)}
                className="bg-transparent text-sm font-bold text-foreground w-full focus:outline-none"
                placeholder="—"
              />
            </div>
          </div>
        ) : (
          <>
            {editable.serving_label && (
              <p className="text-xs text-textMuted opacity-60">{editable.serving_label}</p>
            )}
            <p className="text-sm font-bold text-textPrimary">{macroLine}</p>
            {editable.shortcut && (
              <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(0,212,255,0.10)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.20)' }}>
                {editable.shortcut}
              </span>
            )}
          </>
        )}

        {/* Ingredients toggle — only in view mode */}
        {!isEditExpanded && card.ingredients && card.ingredients.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowIngredients(v => !v)}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-textMuted hover:text-textPrimary transition-colors mt-1"
            >
              {showIngredients ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {card.ingredients.length} ingredients
            </button>
            {showIngredients && (
              <div className="mt-2 space-y-1.5">
                {card.ingredients.map((ing, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-textPrimary">{ing.qty_label} {ing.name}</span>
                    <span className="text-[11px] text-textMuted shrink-0">{ing.kcal}kcal P:{ing.protein_g}g C:{ing.carbs_g}g F:{ing.fat_g}g</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {errorMsg && (
        <p className="px-4 pb-2 text-xs text-red-400">{errorMsg}</p>
      )}
      <div className="flex items-center gap-2.5 px-4 pb-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || status === 'saving'}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:scale-100"
          style={{ background: 'rgba(16,185,129,0.90)', color: '#000' }}
        >
          {status === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bookmark className="h-3.5 w-3.5" />}
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={isPending || status === 'saving'}
          aria-label="Discard"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.06] text-muted-foreground/50 transition-all duration-200 hover:bg-white/[0.08] hover:text-muted-foreground active:scale-[0.95] disabled:opacity-30"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
