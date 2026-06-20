const fs = require('fs');

async function pushMigration() {
  const sql = fs.readFileSync('combined_migrations.sql', 'utf8');
  const connectionString = 'postgresql://postgres:Llinklink123456%2F%2F@db.jwiqwxacxgzpsshtsmsl.supabase.co:5432/postgres';

  console.log('Sending migration payload to Vercel API...');
  
  try {
    const res = await fetch('https://elite-yaha.vercel.app/api/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, connectionString })
    });
    
    const data = await res.json();
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

pushMigration();
