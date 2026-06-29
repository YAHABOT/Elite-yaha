const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.jwiqwxacxgzpsshtsmsl:YahaLink123!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  
  const sql = `
  CREATE OR REPLACE VIEW public.logged_dates_summary AS
  SELECT DISTINCT
      user_id,
      to_char(logged_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS log_date
  FROM public.tracker_logs;
  
  NOTIFY pgrst, 'reload schema';
  `;

  await client.query(sql);
  console.log('View created and schema reloaded!');
  await client.end();
}

run();
