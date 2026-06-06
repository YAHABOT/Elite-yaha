import { NextResponse } from 'next/server'

// Warmup endpoint — called by Vercel cron to prevent cold starts.
// Returns 200 immediately with no DB calls; just enough to keep the function warm.
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() })
}
