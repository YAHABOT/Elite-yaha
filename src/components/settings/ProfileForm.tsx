'use client'

import { useState } from 'react'
import { updateAliasAction, updateProfileAction } from '@/app/actions/settings'
import type { User } from '@/lib/db/users'

type Props = {
  initialValues: User | null
}

type SaveState = 'idle' | 'saving' | 'saved'

function FieldLabel({ label, saveState }: { label: string; saveState: SaveState }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted opacity-40">{label}</label>
      {saveState === 'saving' && <span className="text-[9px] font-black uppercase tracking-widest text-textMuted/40">Saving…</span>}
      {saveState === 'saved' && <span className="text-[9px] font-black uppercase tracking-widest text-nutrition">✓ Saved</span>}
    </div>
  )
}

const INPUT = "w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-textPrimary placeholder:text-textMuted/20 focus:border-[#06b6d4]/50 focus:outline-none focus:ring-1 focus:ring-[#06b6d4]/20 transition-all duration-300"

export function ProfileForm({ initialValues }: Props): React.ReactElement {
  const initialProfile = initialValues?.stats?.profile ?? {}

  const [alias, setAlias] = useState(initialValues?.alias ?? '')
  const [aliasSave, setAliasSave] = useState<SaveState>('idle')

  const [dob, setDob] = useState(initialProfile.dob ?? '')
  const [dobSave, setDobSave] = useState<SaveState>('idle')

  const [height, setHeight] = useState(initialProfile.heightCm?.toString() ?? '')
  const [heightSave, setHeightSave] = useState<SaveState>('idle')

  const [gender, setGender] = useState(initialProfile.gender ?? '')
  const [genderSave, setGenderSave] = useState<SaveState>('idle')

  async function handleAliasBlur() {
    if (alias.trim() === (initialValues?.alias ?? '').trim()) return
    setAliasSave('saving')
    const r = await updateAliasAction(alias)
    setAliasSave(r.error ? 'idle' : 'saved')
    if (!r.error) setTimeout(() => setAliasSave('idle'), 2000)
  }

  async function handleDobChange(val: string) {
    setDob(val)
    if (!val) return
    setDobSave('saving')
    const r = await updateProfileAction({ dob: val })
    setDobSave(r.error ? 'idle' : 'saved')
    if (!r.error) setTimeout(() => setDobSave('idle'), 2000)
  }

  async function handleHeightBlur() {
    const num = parseFloat(height)
    if (!height || isNaN(num)) return
    if (num === initialProfile.heightCm) return
    setHeightSave('saving')
    const r = await updateProfileAction({ heightCm: num })
    setHeightSave(r.error ? 'idle' : 'saved')
    if (!r.error) setTimeout(() => setHeightSave('idle'), 2000)
  }

  async function handleGenderChange(val: string) {
    setGender(val)
    if (!val) return
    setGenderSave('saving')
    const r = await updateProfileAction({ gender: val as 'male' | 'female' })
    setGenderSave(r.error ? 'idle' : 'saved')
    if (!r.error) setTimeout(() => setGenderSave('idle'), 2000)
  }

  return (
    <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-3xl shadow-2xl space-y-6">
      <div>
        <FieldLabel label="Alias" saveState={aliasSave} />
        <input
          value={alias}
          onChange={e => setAlias(e.target.value)}
          onBlur={() => void handleAliasBlur()}
          className={INPUT}
          placeholder="What should YAHA call you?"
          maxLength={50}
        />
      </div>

      <div>
        <FieldLabel label="Date of Birth" saveState={dobSave} />
        <input
          type="date"
          value={dob}
          onChange={e => void handleDobChange(e.target.value)}
          className={INPUT + ' [color-scheme:dark]'}
        />
      </div>

      <div>
        <FieldLabel label="Height" saveState={heightSave} />
        <div className="relative">
          <input
            type="number"
            value={height}
            onChange={e => setHeight(e.target.value)}
            onBlur={() => void handleHeightBlur()}
            className={INPUT + ' pr-14'}
            placeholder="0"
            min={50}
            max={300}
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-textMuted opacity-40">cm</span>
        </div>
      </div>

      <div>
        <FieldLabel label="Gender" saveState={genderSave} />
        <select
          value={gender}
          onChange={e => void handleGenderChange(e.target.value)}
          className={INPUT + ' [color-scheme:dark] appearance-none'}
        >
          <option value="">Select…</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>
    </div>
  )
}
