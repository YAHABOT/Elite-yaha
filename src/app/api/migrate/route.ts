import { Client } from 'pg';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { sql, connectionString } = await req.json();
    if (!sql || !connectionString) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const client = new Client({ connectionString });
    await client.connect();
    await client.query(sql);
    await client.end();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
