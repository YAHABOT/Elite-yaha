import os, json, urllib.request

env_file = '../.env'
env_vars = {}
with open(env_file) as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env_vars[k] = v.strip('\"\'')

url = env_vars['SUPABASE_URL']
key = env_vars['SUPABASE_SERVICE_ROLE_KEY']
user_id = env_vars['VIOLET_YAHA_ID']

def fetch(table):
    req = urllib.request.Request(f'{url}/rest/v1/{table}?user_id=eq.{user_id}', headers={
        'apikey': key,
        'Authorization': f'Bearer {key}'
    })
    try:
        with urllib.request.urlopen(req) as response:
            print(f'--- {table} ---')
            data = json.loads(response.read().decode())
            if table == 'trackers':
                for t in data:
                    print(t['name'] + ' (type: ' + str(t.get('type')) + ')')
            else:
                for r in data:
                    print(r['name'] + ' (trigger: ' + r['trigger_phrase'] + ')')
    except Exception as e:
        print(f'Error fetching {table}: {e}')

fetch('routines')
fetch('trackers')
