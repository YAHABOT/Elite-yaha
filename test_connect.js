const { Client } = require('pg');

const hosts = [
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com',
  'aws-0-eu-west-3.pooler.supabase.com'
];
const users = ['postgres.jwiqwxacxgzpsshtsmsl', 'postgres'];
const ports = [5432, 6543];

async function test() {
  for (const host of hosts) {
    for (const user of users) {
      for (const port of ports) {
        console.log(`Testing host=${host} user=${user} port=${port}...`);
        const client = new Client({
          host,
          port,
          user,
          password: 'Llinklink123456//',
          database: 'postgres',
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3000
        });
        try {
          await client.connect();
          console.log(`>>> SUCCESS! Connected with host=${host} user=${user} port=${port}`);
          await client.end();
          return;
        } catch (err) {
          console.log(`Failed: ${err.message}`);
        }
      }
    }
  }
}

test().catch(console.error);
