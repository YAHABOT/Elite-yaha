import { createServiceClient } from '@/lib/supabase/service'
import { generateSummaryForUser, getPeriodDates } from '@/lib/ai/summary-generator'
import { getEnabledSummaryUserIds } from '@/lib/db/summaries'
import type { SummaryType } from '@/types/summary'

export const maxDuration = 300

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

async function handleGenerate(req: Request, type: SummaryType): Promise<Response> {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const userIds = await getEnabledSummaryUserIds(type, supabase)
    const today = new Date()
    const { start, end } = getPeriodDates(type, today)

    let generated = 0
    let failed = 0

    for (const userId of userIds) {
      try {
        await generateSummaryForUser(userId, type, start, end, supabase)
        generated++
      } catch (err) {
        console.error(`[summaries/generate] Failed for user ${userId}:`, err)
        failed++
      }
    }

    return Response.json({
      ok: true, type, generated, failed,
      period: { start: start.toISOString(), end: end.toISOString() },
    })
  } catch (err) {
    console.error('[summaries/generate] Fatal error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** Vercel Cron fires GET requests — type passed as query param ?type=weekly|monthly */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const type = url.searchParams.get('type') as SummaryType | null
  if (!type || !['weekly', 'monthly'].includes(type)) {
    return Response.json({ error: 'type query param must be "weekly" or "monthly"' }, { status: 400 })
  }
  return handleGenerate(req, type)
}

/** Manual POST trigger (settings page regeneration) */
export async function POST(req: Request): Promise<Response> {
  let body: { type?: string }
  try {
    body = await req.json() as { type?: string }
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const type = body.type as SummaryType | undefined
  if (!type || !['weekly', 'monthly'].includes(type)) {
    return Response.json({ error: 'type must be "weekly" or "monthly"' }, { status: 400 })
  }
  return handleGenerate(req, type)
}
