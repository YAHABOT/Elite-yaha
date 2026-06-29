const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Llinklink123456%2F%2F@db.jwiqwxacxgzpsshtsmsl.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('Connecting to PostgreSQL database directly...');
  await client.connect();
  console.log('Connected successfully!');

  const query = `
    ALTER TABLE coaching_baseline_questionnaires
    ADD COLUMN IF NOT EXISTS medical_conditions TEXT,
    ADD COLUMN IF NOT EXISTS preferred_activities TEXT,
    ADD COLUMN IF NOT EXISTS smartwatch_model TEXT,
    ADD COLUMN IF NOT EXISTS has_food_scale TEXT,
    ADD COLUMN IF NOT EXISTS workout_equipment_handy TEXT,
    ADD COLUMN IF NOT EXISTS foods_liked TEXT,
    ADD COLUMN IF NOT EXISTS foods_disliked TEXT,
    ADD COLUMN IF NOT EXISTS foods_must_stay TEXT,
    ADD COLUMN IF NOT EXISTS main_goal TEXT,
    ADD COLUMN IF NOT EXISTS roadblocks TEXT,
    ADD COLUMN IF NOT EXISTS strengths TEXT,
    ADD COLUMN IF NOT EXISTS additional_notes TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
  `;

  console.log('Executing DDL statement...');
  await client.query(query);
  console.log('DDL statement executed successfully!');

  // Check columns to verify
  const checkQuery = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'coaching_baseline_questionnaires'
    ORDER BY ordinal_position;
  `;
  const res = await client.query(checkQuery);
  console.log('Current columns in coaching_baseline_questionnaires:');
  res.rows.forEach(row => {
    console.log(` - ${row.column_name}: ${row.data_type}`);
  });

  await client.end();
  console.log('Disconnected.');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
