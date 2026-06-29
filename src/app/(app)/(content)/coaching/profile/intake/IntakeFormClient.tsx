'use client'

import { useState, useEffect, useRef } from 'react'
import { saveIntakeDraftAction, submitIntakeFormAction } from '@/app/actions/coaching'
import { Loader2, CheckCircle2, AlertTriangle, Send, Lock, Sparkles, Smile, ShieldAlert } from 'lucide-react'

type IntakeFormClientProps = {
  initialData: {
    id: string
    user_id: string
    age: string | null
    height_cm: number | null
    weight_kg: number | null
    smartwatch_model: string | null
    medical_conditions: string | null
    preferred_activities: string | null
    has_food_scale: string | null
    workout_equipment_handy: string | null
    foods_liked: string | null
    foods_disliked: string | null
    foods_must_stay: string | null
    main_goal: string | null
    roadblocks: string | null
    strengths: string | null
    additional_notes: string | null
    status: string | null
  }
}

export function IntakeFormClient({ initialData }: IntakeFormClientProps) {
  const [formData, setFormData] = useState({
    age: initialData.age || '',
    height_cm: initialData.height_cm ? String(initialData.height_cm) : '',
    weight_kg: initialData.weight_kg ? String(initialData.weight_kg) : '',
    smartwatch_model: initialData.smartwatch_model || '',
    medical_conditions: initialData.medical_conditions || '',
    preferred_activities: initialData.preferred_activities || '',
    has_food_scale: initialData.has_food_scale || '',
    workout_equipment_handy: initialData.workout_equipment_handy || '',
    foods_liked: initialData.foods_liked || '',
    foods_disliked: initialData.foods_disliked || '',
    foods_must_stay: initialData.foods_must_stay || '',
    main_goal: initialData.main_goal || '',
    roadblocks: initialData.roadblocks || '',
    strengths: initialData.strengths || '',
    additional_notes: initialData.additional_notes || '',
  })

  const [status, setStatus] = useState<string>(initialData.status || 'draft')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isFirstRender = useRef(true)
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null)

  // Track field changes for debounced auto-save
  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    if (status === 'submitted') return // Locked
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    setSaveStatus('saving')
  }

  // Trigger auto-save when formData changes (debounced)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (status === 'submitted') return

    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current)
    }

    autoSaveTimeout.current = setTimeout(async () => {
      try {
        await saveIntakeDraftAction({
          ...formData,
          height_cm: formData.height_cm ? Number(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
        })
        setSaveStatus('saved')
      } catch (err) {
        console.error('Auto-save failed:', err)
        setSaveStatus('error')
      }
    }, 1500) // 1.5 seconds debounce

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current)
      }
    }
  }, [formData, status])

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'submitted') return
    setShowConfirmModal(true)
  }

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false)
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await submitIntakeFormAction({
        ...formData,
        height_cm: formData.height_cm ? Number(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
      })
      setStatus('submitted')
      setSaveStatus('idle')
    } catch (err: unknown) {
      console.error('Submission failed:', err)
      const errorInstance = err as Error
      setErrorMessage(errorInstance.message || 'Failed to submit form. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLocked = status === 'submitted'

  return (
    <div className="space-y-8 relative">
      {/* Save status indicator */}
      {!isLocked && (
        <div className="fixed bottom-6 right-6 z-40 bg-[#0c1424]/90 backdrop-blur border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-2xl text-[11px] font-black uppercase tracking-wider">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span className="text-white/60">Saving Draft...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">All Changes Saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-400">Save Error</span>
            </>
          )}
          {saveStatus === 'idle' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-white/40" />
              <span className="text-white/40">Draft Mode</span>
            </>
          )}
        </div>
      )}

      {/* Locked / Submitted Banner */}
      {isLocked && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(16,185,129,0.05)] animate-in fade-in duration-500">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0">
              <Lock size={22} />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wider uppercase text-emerald-400">Intake Form Submitted</h3>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Your questionnaire is now locked and submitted to the coaches. You can review your responses below, but editing is disabled.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0">
            <Sparkles size={12} className="animate-pulse" />
            Active Client Profile
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitClick} className="space-y-8">
        {/* Section 1: General Info */}
        <div className="bg-[#050C1A]/40 border border-white/[0.03] rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400">
              <Smile size={16} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/90">Section 1: Personal Profile</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Age</label>
              <input
                type="text"
                disabled={isLocked}
                value={formData.age}
                onChange={e => handleFieldChange('age', e.target.value)}
                placeholder="e.g. 28"
                className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Height (cm)</label>
              <input
                type="number"
                disabled={isLocked}
                value={formData.height_cm}
                onChange={e => handleFieldChange('height_cm', e.target.value)}
                placeholder="e.g. 165"
                className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Weight (kg)</label>
              <input
                type="number"
                disabled={isLocked}
                value={formData.weight_kg}
                onChange={e => handleFieldChange('weight_kg', e.target.value)}
                placeholder="e.g. 68.5"
                className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Smartwatch or Fitness Tracker Model</label>
            <input
              type="text"
              disabled={isLocked}
              value={formData.smartwatch_model}
              onChange={e => handleFieldChange('smartwatch_model', e.target.value)}
              placeholder="e.g. Apple Watch Series 9, Garmin Venu 3, Fitbit Charge 6, none, etc."
              className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Section 2: Health & Medical */}
        <div className="bg-[#050C1A]/40 border border-white/[0.03] rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center text-purple-400">
              <ShieldAlert size={16} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/90">Section 2: Health & Medical History</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Medical Diagnoses & Conditions</label>
            <p className="text-[10px] text-white/30 italic">Have you ever been diagnosed with PCOS, thyroid conditions, diabetes, cardiovascular conditions, or any other medical conditions?</p>
            <textarea
              rows={3}
              disabled={isLocked}
              value={formData.medical_conditions}
              onChange={e => handleFieldChange('medical_conditions', e.target.value)}
              placeholder="Please describe any medical conditions or list 'none'..."
              className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors resize-y min-h-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Section 3: Fitness & Equipment */}
        <div className="bg-[#050C1A]/40 border border-white/[0.03] rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
              <Sparkles size={16} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/90">Section 3: Activity & Equipment</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Do you own and use a Food Scale?</label>
            <input
              type="text"
              disabled={isLocked}
              value={formData.has_food_scale}
              onChange={e => handleFieldChange('has_food_scale', e.target.value)}
              placeholder="e.g. Yes (daily), Yes (rarely), No, willing to purchase, etc."
              className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40">What fitness / workout equipment is handy to you?</label>
            <p className="text-[10px] text-white/30 italic">List what you have access to (e.g. gym membership, home dumbbells, kettlebells, bands, no equipment, etc.)</p>
            <textarea
              rows={2}
              disabled={isLocked}
              value={formData.workout_equipment_handy}
              onChange={e => handleFieldChange('workout_equipment_handy', e.target.value)}
              placeholder="e.g. Full commercial gym access / home adjustable dumbbells and resistance bands..."
              className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors resize-y min-h-[60px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Preferred or Possible Activities</label>
            <p className="text-[10px] text-white/30 italic">What types of movements/activities do you enjoy or are possible for you to perform? (e.g. walking, swimming, light weights, Pilates, cycling, etc.)</p>
            <textarea
              rows={2}
              disabled={isLocked}
              value={formData.preferred_activities}
              onChange={e => handleFieldChange('preferred_activities', e.target.value)}
              placeholder="e.g. Walking, bodyweight movements, swimming, yoga..."
              className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors resize-y min-h-[60px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Section 4: Nutrition & Diet */}
        <div className="bg-[#050C1A]/40 border border-white/[0.03] rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Smile size={16} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/90">Section 4: Nutrition Profile</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Foods You Enjoy (Likes)</label>
            <textarea
              rows={2}
              disabled={isLocked}
              value={formData.foods_liked}
              onChange={e => handleFieldChange('foods_liked', e.target.value)}
              placeholder="List protein sources, carbs, veggies, or meals you love..."
              className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors resize-y min-h-[60px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Foods You Dislike / Avoid</label>
            <textarea
              rows={2}
              disabled={isLocked}
              value={formData.foods_disliked}
              onChange={e => handleFieldChange('foods_disliked', e.target.value)}
              placeholder="List any foods, textures, or meals you strongly dislike or have intolerances/allergies to..."
              className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors resize-y min-h-[60px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Non-Negotiable Foods (Must Stay)</label>
            <p className="text-[10px] text-white/30 italic">What foods or treats MUST stay in your plan for you to succeed long-term? (e.g. morning coffee, a small piece of chocolate, rice, etc.)</p>
            <textarea
              rows={2}
              disabled={isLocked}
              value={formData.foods_must_stay}
              onChange={e => handleFieldChange('foods_must_stay', e.target.value)}
              placeholder="e.g. Oat milk coffee, sourdough toast, weekend chocolate..."
              className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors resize-y min-h-[60px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Section 5: Goals & Barriers */}
        <div className="bg-[#050C1A]/40 border border-white/[0.03] rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-rose-400/10 border border-rose-400/20 flex items-center justify-center text-rose-400">
              <Send size={16} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/90">Section 5: Goals & Roadblocks</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40">What is your main goal?</label>
            <p className="text-[10px] text-white/30 italic">What results do you want to achieve? What would make this coaching successful?</p>
            <textarea
              rows={3}
              disabled={isLocked}
              value={formData.main_goal}
              onChange={e => handleFieldChange('main_goal', e.target.value)}
              placeholder="e.g. Lose fat, build baseline physical fitness, tone body, and feel more energetic daily..."
              className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors resize-y min-h-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Roadblocks & Barriers</label>
            <p className="text-[10px] text-white/30 italic">What is stopping you today from achieving these goals? (e.g. busy job, emotional eating, fatigue, lack of structure, etc.)</p>
            <textarea
              rows={2}
              disabled={isLocked}
              value={formData.roadblocks}
              onChange={e => handleFieldChange('roadblocks', e.target.value)}
              placeholder="e.g. Long working hours, snacking late at night, feeling too tired to exercise..."
              className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors resize-y min-h-[60px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Your Greatest Strengths</label>
            <p className="text-[10px] text-white/30 italic">What are your strengths when it comes to habits? (e.g. highly disciplined once a plan is set, good cook, early riser, etc.)</p>
            <textarea
              rows={2}
              disabled={isLocked}
              value={formData.strengths}
              onChange={e => handleFieldChange('strengths', e.target.value)}
              placeholder="e.g. Very good at logging food if I have a clear plan, persistent, enjoy cooking fresh meals..."
              className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors resize-y min-h-[60px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Section 6: Additional Information */}
        <div className="bg-[#050C1A]/40 border border-white/[0.03] rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
              <Lock size={16} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/90">Section 6: Open Space</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Is there anything else you want us to know?</label>
            <p className="text-[10px] text-white/30 italic">Free-form field to add any notes, concerns, or context that wasn{"'t"} covered above.</p>
            <textarea
              rows={4}
              disabled={isLocked}
              value={formData.additional_notes}
              onChange={e => handleFieldChange('additional_notes', e.target.value)}
              placeholder="Free-form details..."
              className="w-full bg-[#030712]/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors resize-y min-h-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-4 text-xs font-bold uppercase tracking-wider flex items-center gap-3">
            <AlertTriangle size={18} />
            {errorMessage}
          </div>
        )}

        {/* Submit button */}
        {!isLocked && (
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase tracking-widest text-xs px-8 py-4 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all active:scale-[0.98] flex items-center gap-2 hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Questionnaire
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div onClick={() => setShowConfirmModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          
          {/* Modal Content */}
          <div className="bg-[#0c1424] border border-white/10 max-w-md w-full rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 mx-auto">
              <Send size={24} />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Submit Intake Form?</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Are you sure you want to submit your questionnaire? This will lock editing and notify your coach. You cannot change your answers after submitting.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-black uppercase tracking-widest text-[10px] py-3.5 rounded-xl transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase tracking-widest text-[10px] py-3.5 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all active:scale-[0.98]"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
