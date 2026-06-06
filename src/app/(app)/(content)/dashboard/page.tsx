import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import DashboardLoading from './loading'

export default async function DashboardPage(): Promise<React.ReactElement> {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent userId={user.id} userEmail={user.email ?? ''} />
    </Suspense>
  )
}
