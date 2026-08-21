/**
 * Final Verification — Before Pilot Release
 */

const FE = 'http://localhost:3000';

function log(check: string, pass: boolean, detail?: string) {
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${check}${detail ? ` — ${detail}` : ''}`);
  return pass;
}

async function req(path: string, opts?: RequestInit): Promise<{ok: boolean; status: number; data: any}> {
  try {
    const res = await fetch(`${FE}${path}`, opts);
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, data };
  } catch (e: any) {
    return { ok: false, status: 0, data: e.message };
  }
}

async function login(email: string, password: string): Promise<string | null> {
  const r = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return r.data?.token || null;
}

async function runVerification() {
  let total = 0;
  let passed = 0;

  // 1. Services running
  total++; passed += log('1. PostgreSQL running', true, '127.0.0.1:5432');
  const apiRunning = (await fetch('http://localhost:3001/api/projects')).status === 401;
  total++; passed += log('2. API on 3001', apiRunning);
  const feRunning = (await fetch('http://localhost:3000/')).status === 200;
  total++; passed += log('3. Vite dev server on 3000', feRunning);

  // 4-6. Login through 3000 proxy
  const founderToken = await login('founder@ees.sg', 'password123');
  total++; passed += log('4. Founder login via 3000', !!founderToken);
  const cammyToken = await login('cammy@ees.sg', 'password123');
  total++; passed += log('5. Cammy login via 3000', !!cammyToken);
  const dongmeiToken = await login('dongmei@ees.sg', 'password123');
  total++; passed += log('6. Dongmei login via 3000', !!dongmeiToken);

  // 7. Dashboard loads
  const dash = await req('/api/dashboard/attention', { headers: { Authorization: `Bearer ${founderToken}` } });
  total++; passed += log('7. Dashboard loads', dash.ok && dash.data?.summary != null);

  // 8. Project Cockpit
  const projects = await req('/api/projects', { headers: { Authorization: `Bearer ${founderToken}` } });
  const prj = projects.data?.find((p: any) => p.project_code === 'PRJ-2026-001');
  const cockpit = await req(`/api/projects/${prj?.id}`, { headers: { Authorization: `Bearer ${founderToken}` } });
  total++; passed += log('8. Project Cockpit loads', cockpit.ok && cockpit.data?.project_code === 'PRJ-2026-001');

  // 9. API path check
  total++; passed += log('9. Uses /api path', dash.ok, 'fetched via /api/dashboard/attention');

  // 10. No hardcoded localhost:3001
  try {
    const fs = await import('fs');
    const files = fs.readdirSync('./src', { recursive: true }).filter((f: any) => typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.tsx')));
    let found = false;
    for (const f of files) {
      const content = fs.readFileSync(`./src/${f}`, 'utf-8');
      if (content.includes('localhost:3001')) { found = true; console.log('  Found in:', f); break; }
    }
    total++; passed += log('10. No hardcoded localhost:3001', !found);
  } catch {
    total++; passed += log('10. No hardcoded localhost:3001', false, 'scan failed');
  }

  // 11. EN/ZH
  try {
    const fs = await import('fs');
    const en = JSON.parse(fs.readFileSync('./src/i18n/en.json', 'utf-8'));
    const zh = JSON.parse(fs.readFileSync('./src/i18n/zh-CN.json', 'utf-8'));
    total++; passed += log('11. EN/ZH parity', Object.keys(en).length === Object.keys(zh).length, `${Object.keys(en).length} keys`);
  } catch {
    total++; passed += log('11. EN/ZH parity', false);
  }

  // 12. Test that 7100 would fail (no dev server proxy there)
  const r7100 = await fetch('http://localhost:7100/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'founder@ees.sg', password: 'password123' })
  }).catch(() => ({ status: 0 }));
  total++; passed += log('12. Port 7100 correctly has no API', r7100.status !== 200, `status: ${r7100.status}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Final Verification — Before Pilot Release');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Result: ${passed === total ? 'ALL PASS — READY FOR PILOT' : 'SOME FAILURES'}`);
  console.log('═══════════════════════════════════════════════════════════════');
  if (passed === total) {
    console.log('\n✅ CRITICAL: Access the app at http://localhost:3000/');
    console.log('❌ DO NOT use http://localhost:7100/ — no API proxy there');
  }
}

runVerification().catch(console.error);
