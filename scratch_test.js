const { createClient } = require('@supabase/supabase-js');
const url = 'https://jfretlgjsthhmlmgmlog.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcmV0bGdqc3RoaG1sbWdtbG9nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA4MTAwNiwiZXhwIjoyMDg4NjU3MDA2fQ.frFtHbwtQPEax_qhwr2ekQ2qfOZNQgEMBzc2OHQXrc0';

const client = createClient(url, key);
const userId = '44ef9aae-79d7-4bc9-8eea-7d8a55964813';

async function run() {
  const start = "2026-05-27T00:00:00.000Z";
  const end = "2026-05-28T00:00:00.000Z";
  
  const { data: logs, error } = await client
    .from('tracker_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', start)
    .lt('logged_at', end);
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(JSON.stringify(logs, null, 2));
}

run().catch(console.error);
