const API_BASE = 'http://localhost:3001/api';

async function main() {
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'founder@ees.sg', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  
  // Get pilot issues for PRJ-2026-001
  const projectsRes = await fetch(`${API_BASE}/projects`, { headers });
  const projects = await projectsRes.json();
  const prj = projects.find(p => p.project_code === 'PRJ-2026-001');
  
  if (prj) {
    const issuesRes = await fetch(`${API_BASE}/pilot-issues/project/${prj.id}`, { headers });
    const issues = await issuesRes.json();
    console.log('Pilot issues for PRJ-2026-001:', issues.length);
    issues.forEach(i => {
      console.log(`  - ${i.issue_number}: ${i.title} [${i.category}] ${i.priority} ${i.status}`);
    });
  }
  
  // Verify EN/ZH i18n files have all required keys
  const en = await import('./src/i18n/en.json', { assert: { type: 'json' } });
  const zh = await import('./src/i18n/zh-CN.json', { assert: { type: 'json' } });
  
  function checkKeys(obj, prefix = '') {
    const keys = [];
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'object' && v !== null) {
        keys.push(...checkKeys(v, `${prefix}${k}.`));
      } else {
        keys.push(`${prefix}${k}`);
      }
    }
    return keys;
  }
  
  const enKeys = checkKeys(en.default);
  const zhKeys = checkKeys(zh.default);
  
  const missingInZh = enKeys.filter(k => !zhKeys.includes(k));
  const missingInEn = zhKeys.filter(k => !enKeys.includes(k));
  
  console.log('\n=== I18N KEY CHECK ===');
  console.log('EN keys:', enKeys.length);
  console.log('ZH keys:', zhKeys.length);
  if (missingInZh.length > 0) console.log('Missing in ZH:', missingInZh);
  if (missingInEn.length > 0) console.log('Missing in EN:', missingInEn);
  if (missingInZh.length === 0 && missingInEn.length === 0) console.log('✅ All keys match between EN and ZH');
}

main().catch(console.error);
