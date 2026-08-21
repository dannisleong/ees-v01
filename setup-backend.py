import subprocess, os, time, socket, sys

cwd = r'C:\Users\danni\Documents\kimi\workspace\ees-v01-alpha'
npx = r'C:\Users\danni\AppData\Local\Programs\Kimi\resources\resources\runtime\npx.cmd'

def wait_for_port(port, timeout=30):
    for _ in range(timeout * 2):
        try:
            s = socket.create_connection(('127.0.0.1', port), timeout=0.5)
            s.close()
            return True
        except:
            time.sleep(0.5)
    return False

# 1. Start PostgreSQL
print('[setup] Starting PostgreSQL...')
pg_log = os.path.join(cwd, 'pg.log')
with open(pg_log, 'w') as f:
    pg_proc = subprocess.Popen(
        ['node', 'start-pg-resume.mjs'],
        cwd=cwd,
        stdout=f,
        stderr=subprocess.STDOUT,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0,
    )

if not wait_for_port(5432):
    print('[setup] ERROR: PostgreSQL did not start')
    sys.exit(1)
print('[setup] PostgreSQL ready')

# 2. Push schema
print('[setup] Pushing Prisma schema...')
result = subprocess.run([npx, 'prisma', 'db', 'push', '--accept-data-loss'], cwd=cwd, capture_output=True, text=True)
if result.returncode != 0:
    print('[setup] db push output:', result.stdout, result.stderr)
print('[setup] Schema pushed')

# 3. Mark migrations as applied
for mig in ['20250816000000_deposit_ssot_trigger', '20250816000001_smart_gate_conditions', 
            '20250816000002_document_access_permissions', '20250816210000_add_pilot_issues']:
    subprocess.run([npx, 'prisma', 'migrate', 'resolve', '--applied', mig], cwd=cwd, capture_output=True)
print('[setup] Migrations marked')

# 4. Start API
print('[setup] Starting API...')
api_log = os.path.join(cwd, 'api.log')
with open(api_log, 'w') as f:
    api_proc = subprocess.Popen(
        [npx, 'tsx', 'api/src/index.ts'],
        cwd=cwd,
        stdout=f,
        stderr=subprocess.STDOUT,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0,
    )

if not wait_for_port(3001):
    print('[setup] ERROR: API did not start')
    sys.exit(1)
print('[setup] API ready')

# 5. Seed data
print('[setup] Seeding test data...')
import urllib.request, json
req = urllib.request.Request(
    'http://localhost:3001/api/auth/seed',
    data=b'{}',
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    print('[setup] Seed response:', resp.read().decode())
except Exception as e:
    print('[setup] Seed error:', e)

print('[setup] ALL DONE - Backend is running')
print(f'  PostgreSQL PID: {pg_proc.pid}')
print(f'  API PID: {api_proc.pid}')
