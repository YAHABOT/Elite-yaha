'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Wand2 } from 'lucide-react'
import { createFoodBankEntryAction, updateFoodBankEntryAction, parseFoodBankEntryAction } from '@/app/actions/food-bank'
import type { FoodBankEntry, FoodBankIngredient, CreateFoodBankInput } from '@/types/food-bank'

type Props = { initialData?: FoodBankEntry }

type IngredientRow = FoodBankIngredient & { _key: number }

const inputClass = 'w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-textPrimary placeholder:text-textMuted/30 focus:border-white/20 focus:outline-none transition-all duration-200'
const smallInputClass = 'w-full rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-textPrimary placeholder:text-textMuted/20 focus:border-white/20 focus:outline-none transition-all duration-200'
const labelClass = 'block text-[9px] font-black uppercase tracking-[0.16em] text-textMuted opacity-50 mb-1.5'

export function FoodBankForm({ initialData }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual')
  const [isPending, startTransition] = useTransition()
  const [isParsing, startParseTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form fields
  const [entryType, setEntryType] = useState<'dish' | 'pantry_item'>(initialData?.entry_type ?? 'dish')
  const [name, setName] = useState(initialData?.name ?? '')
  const [emoji, setEmoji] = useState(initialData?.emoji ?? '')
  const [shortcut, setShortcut] = useState(initialData?.shortcut ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [servingLabel, setServingLabel] = useState(initialData?.serving_label ?? '')
  const [servingSizeG, setServingSizeG] = useState(initialData?.serving_size_g?.toString() ?? '')
  const [kcal, setKcal] = useState(initialData?.kcal?.toString() ?? '')
  const [proteinG, setProteinG] = useState(initialData?.protein_g?.toString() ?? '')
  const [carbsG, setCarbsG] = useState(initialData?.carbs_g?.toString() ?? '')
  const [fatG, setFatG] = useState(initialData?.fat_g?.toString() ?? '')
  const [fibreG, setFibreG] = useState(initialData?.fibre_g?.toString() ?? '')
  const [showIngredients, setShowIngredients] = useState(!!(initialData?.ingredients?.length))
  const [showBatchInfo, setShowBatchInfo] = useState(!!(initialData?.batch_kcal))
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initialData?.ingredients?.map((ing, i) => ({ ...ing, _key: i })) ?? []
  )
  let _nextKey = ingredients.length
  const [batchYieldG, setBatchYieldG] = useState(initialData?.batch_yield_g?.toString() ?? '')
  const [batchKcal, setBatchKcal] = useState(initialData?.batch_kcal?.toString() ?? '')
  const [batchProteinG, setBatchProteinG] = useState(initialData?.batch_protein_g?.toString() ?? '')
  const [batchCarbsG, setBatchCarbsG] = useState(initialData?.batch_carbs_g?.toString() ?? '')
  const [batchFatG, setBatchFatG] = useState(initialData?.batch_fat_g?.toString() ?? '')

  // AI parse state
  const [pasteText, setPasteText] = useState('')
  const [fileBase64, setFileBase64] = useState<string | null>(null)
  const [fileMimeType, setFileMimeType] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  function addIngredientRow() {
    setIngredients(prev => [...prev, { _key: _nextKey++, name: '', qty_label: '', kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }])
  }

  function removeIngredientRow(key: number) {
    setIngredients(prev => prev.filter(r => r._key !== key))
  }

  function updateIngredient(key: number, field: keyof FoodBankIngredient, value: string) {
    setIngredients(prev => prev.map(r => {
      if (r._key !== key) return r
      if (field === 'name' || field === 'qty_label') return { ...r, [field]: value }
      return { ...r, [field]: parseFloat(value) || 0 }
    }))
  }

  function calculateFromIngredients() {
    const totals = ingredients.reduce((acc, r) => ({
      kcal: acc.kcal + (r.kcal || 0),
      protein_g: acc.protein_g + (r.protein_g || 0),
      carbs_g: acc.carbs_g + (r.carbs_g || 0),
      fat_g: acc.fat_g + (r.fat_g || 0),
    }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
    setKcal(String(Math.round(totals.kcal)))
    setProteinG(String(+totals.protein_g.toFixed(1)))
    setCarbsG(String(+totals.carbs_g.toFixed(1)))
    setFatG(String(+totals.fat_g.toFixed(1)))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setFileMimeType(file.type || 'text/plain')
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      const base64 = result.split(',')[1] ?? result
      setFileBase64(base64)
    }
    reader.readAsDataURL(file)
  }

  function handleParseWithAI() {
    if (!pasteText.trim() && !fileBase64) { setParseError('Paste some text or attach a file first.'); return }
    startParseTransition(async () => {
      setParseError(null)
      // Pass current form state so AI can apply adjustments instead of replacing the whole dish
      const currentEntry = {
        name: name.trim() || undefined,
        kcal: parseFloat(kcal) || undefined,
        protein_g: parseFloat(proteinG) || undefined,
        carbs_g: parseFloat(carbsG) || undefined,
        fat_g: parseFloat(fatG) || undefined,
        fibre_g: fibreG ? parseFloat(fibreG) : undefined,
        ingredients: showIngredients && ingredients.length > 0
          ? ingredients.map(({ _key: _, ...ing }) => ing)
          : undefined,
      }
      const hasExistingData = !!(currentEntry.name || (currentEntry.ingredients && currentEntry.ingredients.length > 0))
      const result = await parseFoodBankEntryAction(
        pasteText,
        fileBase64 ?? undefined,
        fileMimeType ?? undefined,
        hasExistingData ? currentEntry : undefined
      )
      if (result.error || !result.data) { setParseError(result.error ?? 'Could not parse recipe data'); return }
      const d = result.data
      if (d.name) setName(d.name)
      if (d.entry_type) setEntryType(d.entry_type)
      if (d.shortcut) setShortcut(d.shortcut)
      if (d.serving_label) setServingLabel(d.serving_label)
      if (d.serving_size_g != null) setServingSizeG(String(d.serving_size_g))
      if (d.kcal != null) setKcal(String(d.kcal))
      if (d.protein_g != null) setProteinG(String(d.protein_g))
      if (d.carbs_g != null) setCarbsG(String(d.carbs_g))
      if (d.fat_g != null) setFatG(String(d.fat_g))
      if (d.fibre_g != null) setFibreG(String(d.fibre_g))
      if (d.notes) setNotes(d.notes)
      if (d.batch_yield_g != null) { setBatchYieldG(String(d.batch_yield_g)); setShowBatchInfo(true) }
      if (d.batch_kcal != null) { setBatchKcal(String(d.batch_kcal)); setShowBatchInfo(true) }
      if (d.batch_protein_g != null) setBatchProteinG(String(d.batch_protein_g))
      if (d.batch_carbs_g != null) setBatchCarbsG(String(d.batch_carbs_g))
      if (d.batch_fat_g != null) setBatchFatG(String(d.batch_fat_g))
      if (d.ingredients?.length) {
        setIngredients(d.ingredients.map((ing, i) => ({ ...ing, _key: i })))
        setShowIngredients(true)
      }
      setActiveTab('manual')
    })
  }

  function buildInput(): CreateFoodBankInput {
    return {
      name: name.trim(),
      entry_type: entryType,
      shortcut: shortcut.trim().toUpperCase() || null,
      emoji: emoji.trim() || null,
      serving_label: servingLabel.trim() || null,
      serving_size_g: servingSizeG ? parseFloat(servingSizeG) : null,
      kcal: parseFloat(kcal) || 0,
      protein_g: parseFloat(proteinG) || 0,
      carbs_g: parseFloat(carbsG) || 0,
      fat_g: parseFloat(fatG) || 0,
      fibre_g: fibreG ? parseFloat(fibreG) : null,
      ingredients: showIngredients && ingredients.length > 0
        ? ingredients.map(({ _key: _, ...ing }) => ing)
        : null,
      batch_yield_g: showBatchInfo && batchYieldG ? parseFloat(batchYieldG) : null,
      batch_kcal: showBatchInfo && batchKcal ? parseFloat(batchKcal) : null,
      batch_protein_g: showBatchInfo && batchProteinG ? parseFloat(batchProteinG) : null,
      batch_carbs_g: showBatchInfo && batchCarbsG ? parseFloat(batchCarbsG) : null,
      batch_fat_g: showBatchInfo && batchFatG ? parseFloat(batchFatG) : null,
      notes: notes.trim() || null,
    }
  }

  function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    if (!kcal || !proteinG || !carbsG || !fatG) { setError('Kcal, protein, carbs and fat are required'); return }
    setError(null)
    const input = buildInput()
    startTransition(async () => {
      const result = initialData
        ? await updateFoodBankEntryAction(initialData.id, input)
        : await createFoodBankEntryAction(input)
      if (result.error) { setError(result.error); return }
      router.push('/settings/food-bank')
    })
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        {(['manual', 'ai'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${
              activeTab === tab
                ? 'bg-nutrition/15 text-nutrition border border-nutrition/30'
                : 'bg-white/[0.03] text-textMuted border border-white/5 hover:text-textPrimary'
            }`}
          >
            {tab === 'manual' ? 'Manual' : 'AI Parse'}
          </button>
        ))}
      </div>

      {activeTab === 'ai' ? (
        /* AI Parse tab */
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Paste Recipe Text</label>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="Paste recipe text, ingredient list, or nutrition label here..."
              rows={6}
              className={inputClass + ' resize-none'}
            />
          </div>
          <div>
            <label className={labelClass}>Or Attach File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.csv,.md"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-4 text-sm text-textMuted hover:border-white/25 hover:text-textPrimary transition-all duration-200"
            >
              {fileName ?? 'Click to attach a file (.txt, .pdf, .csv, .md)'}
            </button>
          </div>
          {parseError && (
            <p className="text-sm text-red-400 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">{parseError}</p>
          )}
          <button
            type="button"
            onClick={handleParseWithAI}
            disabled={isParsing}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[11px] font-black uppercase tracking-widest transition-all duration-200 disabled:opacity-40"
            style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.30)', color: '#a855f7' }}
          >
            {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {isParsing ? 'Parsing…' : 'Parse with AI'}
          </button>
        </div>
      ) : (
        /* Manual tab */
        <div className="space-y-5">
          {/* Entry type */}
          <div>
            <label className={labelClass}>Type</label>
            <div className="flex gap-2">
              {([['dish', 'Dish'], ['pantry_item', 'Pantry Item']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEntryType(val)}
                  className={`flex-1 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${
                    entryType === val
                      ? 'bg-nutrition/15 text-nutrition border border-nutrition/30'
                      : 'bg-white/[0.03] text-textMuted border border-white/5 hover:text-textPrimary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Name + Emoji */}
          <div className="grid grid-cols-[1fr_72px] gap-3">
            <div>
              <label className={labelClass}>Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chocolate Protein Pancakes" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Emoji</label>
              <input type="text" value={emoji} onChange={e => setEmoji(e.target.value.slice(0, 2))} placeholder="🍳" className={inputClass + ' text-center text-xl'} />
            </div>
          </div>

          {/* Shortcut */}
          <div>
            <label className={labelClass}>Shortcut (optional)</label>
            <input
              type="text"
              value={shortcut}
              onChange={e => setShortcut(e.target.value.toUpperCase().slice(0, 10))}
              placeholder="e.g. PB, PRO, CHOCPAN"
              className={inputClass}
            />
            <p className="text-[10px] text-textMuted opacity-40 mt-1">A quick alias to mention in chat when Food Bank mode is active</p>
          </div>

          {/* Serving */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Serving Label</label>
              <input type="text" value={servingLabel} onChange={e => setServingLabel(e.target.value)} placeholder="1 piece (90g)" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Serving (g)</label>
              <input type="number" step="any" value={servingSizeG} onChange={e => setServingSizeG(e.target.value)} placeholder="90" className={inputClass} />
            </div>
          </div>

          {/* Macros */}
          <div>
            <label className={labelClass}>Macros per serving *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Kcal *', kcal, setKcal],
                ['Protein (g) *', proteinG, setProteinG],
                ['Carbs (g) *', carbsG, setCarbsG],
                ['Fat (g) *', fatG, setFatG],
                ['Fibre (g)', fibreG, setFibreG],
              ].map(([label, val, setter]) => (
                <div key={label as string}>
                  <label className={labelClass}>{label as string}</label>
                  <input
                    type="number" step="any"
                    value={val as string}
                    onChange={e => (setter as (v: string) => void)(e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Ingredient breakdown (dishes only) */}
          {entryType === 'dish' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowIngredients(v => !v)}
                className="text-[11px] font-black uppercase tracking-widest text-textMuted hover:text-textPrimary transition-colors"
              >
                {showIngredients ? '▾ Hide' : '▸ Add'} Ingredient Breakdown
              </button>

              {showIngredients && (
                <div className="space-y-3">
                  {/* Column headers */}
                  <div className="grid grid-cols-[2fr_1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_24px] gap-1 text-[9px] font-black uppercase tracking-widest text-textMuted opacity-50 px-1">
                    <span>Ingredient</span><span>Qty</span><span>Kcal</span><span>Prot</span><span>Carb</span><span>Fat</span><span />
                  </div>
                  {ingredients.map(row => (
                    <div key={row._key} className="grid grid-cols-[2fr_1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_24px] gap-1 items-center">
                      <input type="text" value={row.name} onChange={e => updateIngredient(row._key, 'name', e.target.value)} placeholder="Chicken" className={smallInputClass} />
                      <input type="text" value={row.qty_label} onChange={e => updateIngredient(row._key, 'qty_label', e.target.value)} placeholder="200g" className={smallInputClass} />
                      <input type="number" step="any" value={row.kcal || ''} onChange={e => updateIngredient(row._key, 'kcal', e.target.value)} placeholder="0" className={smallInputClass} />
                      <input type="number" step="any" value={row.protein_g || ''} onChange={e => updateIngredient(row._key, 'protein_g', e.target.value)} placeholder="0" className={smallInputClass} />
                      <input type="number" step="any" value={row.carbs_g || ''} onChange={e => updateIngredient(row._key, 'carbs_g', e.target.value)} placeholder="0" className={smallInputClass} />
                      <input type="number" step="any" value={row.fat_g || ''} onChange={e => updateIngredient(row._key, 'fat_g', e.target.value)} placeholder="0" className={smallInputClass} />
                      <button type="button" onClick={() => removeIngredientRow(row._key)} className="text-textMuted hover:text-red-400 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button type="button" onClick={addIngredientRow} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-widest text-textMuted hover:text-textPrimary transition-colors">
                      <Plus className="h-3 w-3" /> Add Row
                    </button>
                    {ingredients.length > 0 && (
                      <button type="button" onClick={calculateFromIngredients} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-nutrition/20 bg-nutrition/[0.06] text-[10px] font-black uppercase tracking-widest text-nutrition hover:bg-nutrition/10 transition-colors">
                        Calculate Totals
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Batch info */}
          {entryType === 'dish' && showIngredients && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowBatchInfo(v => !v)}
                className="text-[11px] font-black uppercase tracking-widest text-textMuted hover:text-textPrimary transition-colors"
              >
                {showBatchInfo ? '▾ Hide' : '▸ Add'} Batch Info
              </button>
              {showBatchInfo && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Batch Yield (g)', batchYieldG, setBatchYieldG],
                    ['Batch Kcal', batchKcal, setBatchKcal],
                    ['Batch Protein (g)', batchProteinG, setBatchProteinG],
                    ['Batch Carbs (g)', batchCarbsG, setBatchCarbsG],
                    ['Batch Fat (g)', batchFatG, setBatchFatG],
                  ].map(([label, val, setter]) => (
                    <div key={label as string}>
                      <label className={labelClass}>{label as string}</label>
                      <input type="number" step="any" value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)} placeholder="0" className={inputClass} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this dish…" rows={2} className={inputClass + ' resize-none'} />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-2xl py-3.5 text-[11px] font-black uppercase tracking-widest text-textMuted border border-white/10 bg-white/[0.02] hover:text-textPrimary transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[11px] font-black uppercase tracking-widest transition-all duration-200 disabled:opacity-40"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10b981' }}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isPending ? 'Saving…' : initialData ? 'Save Changes' : 'Add to Food Bank'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
