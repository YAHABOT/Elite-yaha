import { NextRequest, NextResponse } from 'next/server'

const ELITE_URL = 'https://jwiqwxacxgzpsshtsmsl.supabase.co'
const ELITE_KEY = process.env.ELITE_SUPABASE_SERVICE_ROLE_KEY!

const TARGET_USERS = new Set([
  '44ef9aae-79d7-4bc9-8eea-7d8a55964813', // Armaan
  '4c74333b-18e6-465a-a62a-523a4ad2999b',  // Violetta
])

// Tables that have a user_id column we can filter on
const USER_SCOPED_TABLES = new Set([
  'tracker_logs',
  'trackers',
  'correlations',
  'food_bank_entries',
  'widgets',
  'routines',
  'users',
])

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Kill-switch — set ELITE_SYNC_ENABLED=false (or remove it) to disable
  if (process.env.ELITE_SYNC_ENABLED !== 'true') {
    return NextResponse.json({ skipped: 'sync disabled' }, { status: 200 })
  }

  // Verify shared secret set in Supabase webhook headers
  const secret = request.headers.get('x-elite-sync-secret')
  if (!ELITE_KEY || secret !== process.env.ELITE_SYNC_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { type, table, schema, record } = payload

  // Only handle public schema, INSERT/UPDATE, and tables we care about
  if (schema !== 'public' || type === 'DELETE' || !USER_SCOPED_TABLES.has(table)) {
    return NextResponse.json({ skipped: 'not applicable' }, { status: 200 })
  }

  if (!record) {
    return NextResponse.json({ skipped: 'no record' }, { status: 200 })
  }

  // Filter: only sync the 2 target users
  const userId = record.user_id as string | undefined
  if (!userId || !TARGET_USERS.has(userId)) {
    return NextResponse.json({ skipped: 'not a target user' }, { status: 200 })
  }

  // Upsert into Elite Coaching (safe for both INSERT and UPDATE)
  try {
    const res = await fetch(`${ELITE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: ELITE_KEY,
        Authorization: `Bearer ${ELITE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(record),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[elite-sync] Failed to upsert into ${table}:`, res.status, body)
      return NextResponse.json({ error: 'upstream failed', status: res.status }, { status: 502 })
    }
  } catch (err) {
    console.error(`[elite-sync] Network error for ${table}:`, err)
    return NextResponse.json({ error: 'network error' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, table, type }, { status: 200 })
}
