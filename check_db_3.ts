
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
  const { data: users } = await supabase.from('users').select('id, name')
  for (const u of users || []) {
    const { data: routines } = await supabase.from('routines').select('type, name, trigger_phrase').eq('user_id', u.id)
    console.log(`User: ${u.name}`)
    console.log(routines)
    console.log('---')
  }
}

check()
