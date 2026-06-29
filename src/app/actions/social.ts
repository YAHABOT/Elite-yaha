'use server'

import { getContentSchedule, ContentScheduleItem } from '@/lib/db/social'
import { getSafeUser } from '@/lib/supabase/auth'

const ALLOWED_EMAILS = ['armaan1993@gmail.com', 'violetmikulchik@gmail.com']

export async function fetchContentScheduleAction(): Promise<ContentScheduleItem[]> {
  try {
    const user = await getSafeUser()
    if (!user || !user.email || !ALLOWED_EMAILS.includes(user.email)) {
      throw new Error('Unauthorized')
    }
    return await getContentSchedule()
  } catch (e) {
    console.error('fetchContentScheduleAction error:', e)
    return []
  }
}
