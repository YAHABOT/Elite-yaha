import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getSafeUser } from '@/lib/supabase/auth'
import {
  fetchTimelineReportAction,
  fetchMorningBriefingDetailAction,
  fetchEveningBriefingDetailAction,
  fetchWeeklyAuditDetailAction,
  TimelineType,
} from '@/app/actions/coaching'
import { MarkdownBlock } from '@/components/chat/MarkdownBlock'
import { MorningBriefingDetail } from '@/components/coaching/MorningBriefingDetail'
import { EveningBriefingDetail } from '@/components/coaching/EveningBriefingDetail'
import { WeeklyAuditDetail } from '@/components/coaching/WeeklyAuditDetail'

export default async function CoachingReportPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>
}): Promise<React.ReactElement> {
  const user = await getSafeUser()
  if (!user) redirect('/login')

  const resolvedParams = await params

  const validTypes = ['morning_briefing', 'evening_briefing', 'weekly_audit', 'medical_report']
  if (!validTypes.includes(resolvedParams.type)) {
    notFound()
  }

  const type = resolvedParams.type as TimelineType
  const id = resolvedParams.id

  // ── Morning Briefing: use structured detail ──────────────────────────────
  if (type === 'morning_briefing') {
    const brief = await fetchMorningBriefingDetailAction(id)
    if (!brief) notFound()

    return (
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 safe-top">
          <div className="flex items-center justify-between px-4 h-14">
            <Link
              href="/coaching"
              className="p-2 -ml-2 text-textMuted hover:text-white rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </Link>
            <div className="font-bold text-base tracking-widest text-white/90 uppercase truncate max-w-[200px]">
              Morning Briefing
            </div>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 pb-32">
          <div className="max-w-2xl mx-auto">
            <MorningBriefingDetail brief={brief} />
          </div>
        </main>
      </div>
    )
  }

  // ── Evening Briefing: use structured detail ──────────────────────────────
  if (type === 'evening_briefing') {
    const brief = await fetchEveningBriefingDetailAction(id)
    if (!brief) notFound()

    return (
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 safe-top">
          <div className="flex items-center justify-between px-4 h-14">
            <Link
              href="/coaching"
              className="p-2 -ml-2 text-textMuted hover:text-white rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </Link>
            <div className="font-bold text-base tracking-widest text-white/90 uppercase truncate max-w-[200px]">
              Evening Briefing
            </div>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 pb-32">
          <div className="max-w-2xl mx-auto">
            <EveningBriefingDetail brief={brief} />
          </div>
        </main>
      </div>
    )
  }

  // ── Weekly Audit: use structured detail ──────────────────────────────────
  if (type === 'weekly_audit') {
    const audit = await fetchWeeklyAuditDetailAction(id)
    if (!audit) notFound()

    return (
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 safe-top">
          <div className="flex items-center justify-between px-4 h-14">
            <Link
              href="/coaching"
              className="p-2 -ml-2 text-textMuted hover:text-white rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </Link>
            <div className="font-bold text-base tracking-widest text-white/90 uppercase truncate max-w-[200px]">
              Weekly Performance Audit
            </div>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 pb-32">
          <div className="max-w-2xl mx-auto">
            <WeeklyAuditDetail audit={audit} />
          </div>
        </main>
      </div>
    )
  }

  // ── All other report types: generic markdown viewer ──────────────────────
  const report = await fetchTimelineReportAction(type, id)
  if (!report) notFound()

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Link
            href="/coaching"
            className="p-2 -ml-2 text-textMuted hover:text-white rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </Link>
          <div className="font-bold text-base tracking-widest text-white/90 uppercase truncate max-w-[200px]">
            {report.title}
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-32">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-xs font-mono text-textMuted tracking-wider uppercase mb-8">
            Generated on{' '}
            {report.date.toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            at{' '}
            {report.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          <div className="prose prose-invert prose-sm md:prose-base max-w-none prose-h1:text-cyan-400 prose-h2:text-primary prose-a:text-cyan-400">
            <MarkdownBlock content={report.markdown || ''} />
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="text-lg font-bold text-white mb-4">Extras &amp; Notes</h3>
            <textarea
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              placeholder="Add any exceptional notes or context worth mentioning here..."
            />
            <button className="mt-4 px-6 py-2 bg-primary/20 text-primary font-bold tracking-widest text-sm rounded-lg hover:bg-primary/30 transition-colors">
              SAVE NOTES
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
