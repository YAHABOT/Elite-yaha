const fs = require('fs');
const env = fs.readFileSync('.env.local.vercel', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?(?:\n|$)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?(?:\n|$)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="?(.*?)"?(?:\n|$)/);

if (!urlMatch || !keyMatch) {
  console.error("Missing credentials");
  process.exit(1);
}

const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

fetch(`${url}/rest/v1/trackers?name=eq.Food`, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
})
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data[0]?.schema, null, 2));
  })
  .catch(console.error);
