import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getAdminInsights } from '@/lib/db/analytics'
import { InsightsDashboard } from '@/components/admin/InsightsDashboard'

export default async function AdminInsightsPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || !user || user.email !== adminEmail) {
    redirect('/')
  }

  const insights = await getAdminInsights()

  return (
    <>
      <div className="flex items-center justify-center h-[60vh] md:hidden">
        <p className="text-sm text-textMuted text-center px-8">Admin insights are desktop only.</p>
      </div>
      <div className="hidden md:block">
        <InsightsDashboard insights={insights} />
      </div>
    </>
  )
}
