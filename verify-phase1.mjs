const API_BASE = 'http://localhost:3001/api';

async function main() {
  // Login as founder
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'founder@ees.sg', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  
  if (!token) {
    console.log('Login failed:', loginData);
    return;
  }
  
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  
  // Get projects
  const projectsRes = await fetch(`${API_BASE}/projects`, { headers });
  const projects = await projectsRes.json();
  const prj = projects.find(p => p.project_code === 'PRJ-2026-001');
  
  console.log('\n=== PROJECTS ===');
  console.log('Projects count:', projects.length);
  console.log('PRJ-2026-001 found:', !!prj);
  if (prj) {
    console.log('Project ID:', prj.id);
    console.log('Status:', prj.status);
    console.log('Current stage:', prj.current_stage);
    console.log('Current gate:', prj.current_gate);
    console.log('Target margin:', prj.target_margin_percent);
  }
  
  // Get dashboard attention
  const dashRes = await fetch(`${API_BASE}/dashboard/attention`, { headers });
  const dash = await dashRes.json();
  
  console.log('\n=== DASHBOARD ATTENTION ===');
  console.log('Summary:', JSON.stringify(dash.summary, null, 2));
  console.log('Alerts count:', dash.alerts.length);
  if (dash.alerts.length > 0) {
    console.log('First alert linkPath:', dash.alerts[0].linkPath);
    console.log('First alert projectId:', dash.alerts[0].projectId);
  }
  
  // Get project cockpit data
  if (prj) {
    const cockpitRes = await fetch(`${API_BASE}/dashboard/project/${prj.id}`, { headers });
    const cockpit = await cockpitRes.json();
    
    console.log('\n=== PROJECT COCKPIT (PRJ-2026-001) ===');
    console.log('Project:', cockpit.project);
    console.log('Gate status:', cockpit.gateStatus);
    console.log('BOM status:', cockpit.bomStatus);
    console.log('ETA summary:', cockpit.etaSummary);
    console.log('Risk summary:', cockpit.riskSummary);
    console.log('Issue summary:', cockpit.issueSummary);
    console.log('Cost summary:', cockpit.costSummary);
    console.log('Partners:', cockpit.partners);
  }
  
  // Get project detail with gate results
  if (prj) {
    const detailRes = await fetch(`${API_BASE}/projects/${prj.id}`, { headers });
    const detail = await detailRes.json();
    
    console.log('\n=== PROJECT DETAIL GATES ===');
    console.log('Gate results count:', detail.gate_results?.length);
    if (detail.gate_results) {
      detail.gate_results.forEach(gr => {
        console.log(`  Gate ${gr.gate?.gate_number}: ${gr.result} (${gr.gate?.name_en})`);
      });
    }
    console.log('Landed costs:', detail.landed_costs);
  }
}

main().catch(console.error);
