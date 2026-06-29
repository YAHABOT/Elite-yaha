'use server'
import { getSafeUser } from '@/lib/supabase/auth'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const EXCLUDED_EMAILS = [
  'armaan1993@gmail.com',
  'violetmikulchik@gmail.com',
  '1993armaan@gmail.com',
]
const FEEDBACK_INTERVAL_DAYS = 5

export async function checkFeedbackEligibility(): Promise<{ eligible: boolean }> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) return { eligible: false }
  if (EXCLUDED_EMAILS.includes(user.email ?? '')) return { eligible: false }

  // Check last feedback — eligible if none ever, or last was > 5 days ago
  const { data } = await supabase
    .from('feedback_responses')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return { eligible: true }
  const daysSince = (Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24)
  return { eligible: daysSince >= FEEDBACK_INTERVAL_DAYS }
}

export async function submitFeedback(
  response: 'very_helpful' | 'helpful_needs_work' | 'not_helpful',
  comment?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerClient()
  const user = await getSafeUser()
  if (!user) return { error: 'Not authenticated' }
  if (EXCLUDED_EMAILS.includes(user.email ?? '')) return { error: 'Excluded' }

  const { error } = await supabase.from('feedback_responses').insert({
    user_id: user.id,
    response,
    comment: comment?.trim() || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/insights')
  return { success: true }
}
