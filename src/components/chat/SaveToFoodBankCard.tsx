'use client'

import { useState, useTransition } from 'react'
import { Bookmark, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { createFoodBankEntryAction } from '@/app/actions/food-bank'
import type { SaveToFoodBankCard as SaveToFoodBankCardType } from '@/types/action-card'
import type { CreateFoodBankInput } from '@/types/food-bank'

type Props = {
  card: SaveToFoodBankCardType
}

export function SaveToFoodBankCard({ card }: Props): React.ReactElement {
  const [status, setStatus] = useState<'pending' | 'saving' | 'saved' | 'error'>('pending')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showIngredients, setShowIngredients] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      setStatus('saving')
      const input: CreateFoodBankInput = {
        name: card.name,
        entry_type: card.entry_type,
        shortcut: card.shortcut ?? null,
        emoji: card.emoji ?? null,
        serving_label: card.serving_label ?? null,
        serving_size_g: card.serving_size_g ?? null,
        kcal: card.kcal,
        protein_g: card.protein_g,
        carbs_g: card.carbs_g,
        fat_g: card.fat_g,
        fibre_g: card.fibre_g ?? null,
        ingredients: card.ingredients ?? null,
        batch_yield_g: card.batch_yield_g ?? null,
        batch_kcal: card.batch_kcal ?? null,
        batch_protein_g: card.batch_protein_g ?? null,
        batch_carbs_g: card.batch_carbs_g ?? null,
        batch_fat_g: card.batch_fat_g ?? null,
        notes: card.notes ?? null,
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

  const macroLine = `${Math.round(card.kcal)} kcal • P:${card.protein_g}g • C:${card.carbs_g}g • F:${card.fat_g}g`

  if (status === 'saved') {
    return (
      <div className="rounded-2xl border border-nutrition/30 bg-nutrition/[0.08] px-4 py-3.5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-nutrition/15">
          <Check className="h-4 w-4 text-nutrition" />
        </div>
        <div>
          <p className="text-sm font-bold text-nutrition">Saved to Food Bank</p>
          <p className="text-xs text-textMuted opacity-60">{card.name}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.20)' }}>
          <Bookmark className="h-4 w-4 text-nutrition" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-nutrition opacity-70">Save to Food Bank</p>
          <p className="text-sm font-bold text-textPrimary truncate">{card.name}</p>
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
          style={{ background: card.entry_type === 'dish' ? 'rgba(16,185,129,0.12)' : 'rgba(6,182,212,0.12)', color: card.entry_type === 'dish' ? '#10b981' : '#06b6d4' }}>
          {card.entry_type === 'dish' ? 'DISH' : 'PANTRY'}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {card.serving_label && (
          <p className="text-xs text-textMuted opacity-60">{card.serving_label}</p>
        )}
        <p className="text-sm font-bold text-textPrimary">{macroLine}</p>
        {card.shortcut && (
          <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,212,255,0.10)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.20)' }}>
            {card.shortcut}
          </span>
        )}

        {/* Ingredients toggle */}
        {card.ingredients && card.ingredients.length > 0 && (
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
      <div className="flex gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || status === 'saving'}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-[11px] font-black uppercase tracking-widest transition-all duration-200 disabled:opacity-40"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10b981' }}
        >
          {status === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bookmark className="h-3.5 w-3.5" />}
          {status === 'saving' ? 'Saving…' : 'Add to Food Bank'}
        </button>
      </div>
    </div>
  )
}
