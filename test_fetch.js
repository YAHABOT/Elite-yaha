const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: briefs, error: err1 } = await supabase.from('coaching_daily_briefs').select('*').limit(5);
  console.log('Briefs:', briefs?.length, 'Error:', err1);

  const { data: audits, error: err2 } = await supabase.from('coaching_weekly_audits').select('*').limit(5);
  console.log('Audits:', audits?.length, 'Error:', err2);
}

check().catch(console.error);
