const { createClient } = require('@supabase/supabase-js');
const url = 'https://jfretlgjsthhmlmgmlog.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcmV0bGdqc3RoaG1sbWdtbG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODEwMDYsImV4cCI6MjA4ODY1NzAwNn0.BdzU2E4F25gJHsy_oyQegqW3dd3VzM0rquQDNCJEA_A';

const client = createClient(url, key);
console.log('Testing Supabase connection...');
client.auth.getUser().then(() => {
  console.log('✅ Supabase connection successful');
  process.exit(0);
}).catch((e) => {
  console.error('❌ Supabase error:', e.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('❌ Timeout - no response from Supabase');
  process.exit(1);
}, 5000);
