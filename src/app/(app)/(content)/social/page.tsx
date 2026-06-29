import React from 'react'
import { fetchContentScheduleAction } from '@/app/actions/social'
import { SocialCalendar } from '@/components/social/SocialCalendar'

import { getSafeUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Social Calendar — YAHA',
  description: 'View daily posting schedules, scripts, hooks, and requested assets for our Hyrox Valencia Mixed Doubles sub-60 preparation.',
}

const ALLOWED_EMAILS = ['armaan1993@gmail.com', 'violetmikulchik@gmail.com']

export default async function SocialPage(): Promise<React.ReactElement> {
  const user = await getSafeUser()
  if (!user) {
    redirect('/login')
  }

  if (!user.email || !ALLOWED_EMAILS.includes(user.email)) {
    redirect('/dashboard')
  }

  const items = await fetchContentScheduleAction()
  
  return (
    <SocialCalendar initialItems={items} />
  )
}
