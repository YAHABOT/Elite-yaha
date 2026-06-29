const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.jwiqwxacxgzpsshtsmsl:YahaLink123!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query("SELECT * FROM pg_views WHERE viewname = 'logged_dates_summary'");
  console.log(res.rows);
  await client.end();
}

run();
