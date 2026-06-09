import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Warmup endpoint — pinged every 5 min by cron-job.org to prevent cold starts.
// Does a lightweight DB ping so the Supabase connection pool stays warm too.
export async function GET() {
  const t = Date.now()

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabase.from('trackers').select('id').limit(1)
  } catch {
    // Don't fail warmup if DB ping errors — still return 200
  }

  return NextResponse.json({ ok: true, ts: t, ping_ms: Date.now() - t })
}
