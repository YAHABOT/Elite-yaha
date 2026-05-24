import { createServerClient } from './src/lib/supabase/server';

async function checkUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  console.log('CURRENT_USER_ID:', user?.id);
  console.log('CURRENT_USER_EMAIL:', user?.email);
}

checkUser().catch(console.error);
