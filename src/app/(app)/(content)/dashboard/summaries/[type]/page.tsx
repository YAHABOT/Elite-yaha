import { redirect, notFound } from 'next/navigation'
import { getSafeUser } from '@/lib/supabase/auth'
import { getSummaries } from '@/lib/db/summaries'
import { createServerClient } from '@/lib/supabase/server'
import { SummaryReportView } from '@/components/dashboard/SummaryReportView'
import type { SummaryType } from '@/types/summary'

type PageProps = {
  params: Promise<{ type: string }>
}

export default async function SummariesPage({ params }: PageProps): Promise<React.ReactElement> {
  const { type: rawType } = await params
  if (rawType !== 'weekly' && rawType !== 'monthly') notFound()
  const type = rawType as SummaryType

  const user = await getSafeUser()
  if (!user) redirect('/login')

  const supabase = await createServerClient()
  const summaries = await getSummaries(type, 12, supabase).catch(() => [])

  return <SummaryReportView summaries={summaries} type={type} />
}
