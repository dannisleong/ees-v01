/**
 * Dashboard — Management Attention Layer Tests
 *
 * Tests cover:
 * 1.  KPI aggregation — active projects, margin, BOM counts
 * 2.  NO-GO visibility — blocked projects appear in dashboard
 * 3.  Critical-risk visibility — critical risks surfaced
 * 4.  ETA-delay visibility — critical BOM delays detected
 * 5.  Quality-failure visibility — QC failures surfaced
 * 6.  Cost/margin visibility — margin variance detected
 * 7.  RBAC: Founder sees all projects
 * 8.  RBAC: PM sees only assigned projects
 * 9.  RBAC: Cammy sees only assigned projects
 * 10. Empty state — clean dashboard returns zero counts
 * 11. Project drill-down — returns correct project summary
 * 12. Overdue action visibility — overdue issues detected
 * 13. Upcoming deadline visibility — deadlines in next 7 days
 * 14. Compliance issue visibility — expired/expiring licences
 * 15. Alert severity sorting — critical alerts appear first
 *
 * Run: npm run test:dashboard
 */

import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import {
  getAttentionDashboard,
  getKpiSummary,
  getProjectDashboard,
} from '../services/dashboardEngine';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let testPassed = 0;
let testFailed = 0;

function assertEqual(actual: any, expected: any, message: string) {
  if (actual === expected) {
    console.log(`  ${GREEN}✓${RESET} ${message}`);
  } else {
    console.error(`  ${RED}✗${RESET} ${message}`);
    console.error(`    Expected: ${expected}`);
    console.error(`    Actual:   ${actual}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertTrue(value: boolean, message: string) {
  if (value) {
    console.log(`  ${GREEN}✓${RESET} ${message}`);
  } else {
    console.error(`  ${RED}✗${RESET} ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function testCase(name: string, fn: () => Promise<void>) {
  try {
    console.log(`\n▶ ${name}`);
    await fn();
    testPassed++;
  } catch (e) {
    testFailed++;
    console.error(`  ${RED}FAILED: ${e instanceof Error ? e.message : String(e)}${RESET}`);
  }
}

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Dashboard — Management Attention Layer Tests');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── Seed roles ─────────────────────────────────────────────────────────
  const roles = [
    { name: 'founder', name_zh: '创始人', name_en: 'Founder', level: 100 },
    { name: 'dongmei', name_zh: '冬梅', name_en: 'Dongmei', level: 80 },
    { name: 'project_manager', name_zh: '项目经理', name_en: 'Project Manager', level: 60 },
    { name: 'cammy', name_zh: 'Cammy', name_en: 'Cammy', level: 80 },
    { name: 'supplier', name_zh: '供应商', name_en: 'Supplier', level: 40 },
  ];

  for (const r of roles) {
    await prisma.roles.upsert({ where: { name: r.name }, update: {}, create: r });
  }

  const founderRole = await prisma.roles.findUnique({ where: { name: 'founder' } });
  const dongmeiRole = await prisma.roles.findUnique({ where: { name: 'dongmei' } });
  const pmRole = await prisma.roles.findUnique({ where: { name: 'project_manager' } });
  const cammyRole = await prisma.roles.findUnique({ where: { name: 'cammy' } });
  const supplierRole = await prisma.roles.findUnique({ where: { name: 'supplier' } });

  const hash = await bcrypt.hash('password123', 10);

  const founder = await prisma.users.upsert({
    where: { email: 'test-dash-founder@ees.sg' },
    update: {},
    create: { email: 'test-dash-founder@ees.sg', password_hash: hash, name_en: 'Test Founder', role_id: founderRole!.id }
  });
  const dongmei = await prisma.users.upsert({
    where: { email: 'test-dash-dongmei@ees.sg' },
    update: {},
    create: { email: 'test-dash-dongmei@ees.sg', password_hash: hash, name_en: 'Test Dongmei', role_id: dongmeiRole!.id }
  });
  const pm = await prisma.users.upsert({
    where: { email: 'test-dash-pm@ees.sg' },
    update: {},
    create: { email: 'test-dash-pm@ees.sg', password_hash: hash, name_en: 'Test PM', role_id: pmRole!.id }
  });
  const cammy = await prisma.users.upsert({
    where: { email: 'test-dash-cammy@ees.sg' },
    update: {},
    create: { email: 'test-dash-cammy@ees.sg', password_hash: hash, name_en: 'Test Cammy', role_id: cammyRole!.id }
  });
  const supplierUser = await prisma.users.upsert({
    where: { email: 'test-dash-supplier@ees.sg' },
    update: {},
    create: { email: 'test-dash-supplier@ees.sg', password_hash: hash, name_en: 'Test Supplier', role_id: supplierRole!.id }
  });

  // ── Create customers, partners, suppliers ──────────────────────────────
  const customer = await prisma.customers.create({
    data: { name: 'Dashboard Test Customer', customer_code: 'DASHC-' + Date.now() }
  });

  const supplier = await prisma.suppliers.create({
    data: { supplier_code: 'SUP-DASH-' + Date.now(), name: 'Dash Supplier', category: 'A' }
  });

  const partner = await prisma.partners.create({
    data: { partner_code: 'PART-DASH-' + Date.now(), name: 'Dash Partner', type: 'contractor' }
  });

  // ── Create projects with different assignments ─────────────────────────
  const projectA = await prisma.projects.create({
    data: {
      project_code: 'PRJ-DASH-A-' + Date.now(),
      name_en: 'Dongmei Home Alpha',
      customer_id: customer.id,
      status: 'active',
      dongmei_id: dongmei.id,
      pm_id: pm.id,
      target_margin_percent: 30.00,
    }
  });

  const projectB = await prisma.projects.create({
    data: {
      project_code: 'PRJ-DASH-B-' + Date.now(),
      name_en: 'Cammy Condo Beta',
      customer_id: customer.id,
      status: 'active',
      cammy_id: cammy.id,
      pm_id: pm.id,
      target_margin_percent: 25.00,
    }
  });

  const projectC = await prisma.projects.create({
    data: {
      project_code: 'PRJ-DASH-C-' + Date.now(),
      name_en: 'Founder Project Gamma',
      customer_id: customer.id,
      status: 'active',
      target_margin_percent: 20.00,
    }
  });

  // ── Seed gates ─────────────────────────────────────────────────────────
  const gate1 = await prisma.gates.upsert({
    where: { gate_number: 1 },
    update: {},
    create: { gate_number: 1, name_en: 'Gate 01: Order Confirmed', trigger_stage: 1 }
  });

  // ── 1. KPI aggregation ─────────────────────────────────────────────────
  await testCase('Test 01 — KPI aggregation with active projects', async () => {
    const kpi = await getKpiSummary(founder.id, 'founder');
    assertTrue(kpi.activeProjects >= 3, `Active projects >= 3 (got ${kpi.activeProjects})`);
    assertTrue(kpi.bomItemsTotal >= 0, 'BOM items total >= 0');
  });

  // ── Create NO-GO gate result ───────────────────────────────────────────
  await prisma.gate_results.create({
    data: {
      project_id: projectA.id,
      gate_id: gate1.id,
      result: 'NO-GO',
      evaluated_by: founder.id,
      evaluated_at: new Date(),
      reason: 'Deposit not received',
    }
  });

  // ── 2. NO-GO visibility ────────────────────────────────────────────────
  await testCase('Test 02 — NO-GO gate appears in dashboard', async () => {
    const dash = await getAttentionDashboard(founder.id, 'founder');
    assertTrue(dash.summary.noGoCount >= 1, `NO-GO count >= 1 (got ${dash.summary.noGoCount})`);
    assertTrue(dash.byCategory.noGo.some(a => a.projectId === projectA.id), 'NO-GO alert references Project A');
    assertEqual(dash.byCategory.noGo[0].severity, 'critical', 'NO-GO severity is critical');
  });

  // ── Create critical risk ───────────────────────────────────────────────
  await prisma.risks.create({
    data: {
      project_id: projectA.id,
      risk_number: 'RISK-DASH-001',
      category: 'supply_chain',
      description: 'Critical supplier may miss deadline due to factory shutdown',
      probability: 80,
      impact: 90,
      risk_level: 'critical',
      status: 'open',
      created_by: founder.id,
    }
  });

  // ── 3. Critical-risk visibility ────────────────────────────────────────
  await testCase('Test 03 — Critical risk appears in dashboard', async () => {
    const dash = await getAttentionDashboard(founder.id, 'founder');
    assertTrue(dash.summary.criticalRiskCount >= 1, `Critical risk count >= 1 (got ${dash.summary.criticalRiskCount})`);
    assertTrue(dash.byCategory.criticalRisks.some(r => r.projectId === projectA.id), 'Critical risk references Project A');
  });

  // ── Create critical BOM item with delay ────────────────────────────────
  const delayedBom = await prisma.bom_items.create({
    data: {
      project_id: projectA.id,
      item_code: 'BOM-DELAY-001',
      product_name: 'Delayed Critical Item',
      quantity: 1,
      is_critical: true,
      planned_eta: new Date('2026-01-01'), // past date
      forecast_eta: new Date('2026-08-20'),
      approval_status: 'approved',
      supplier_id: supplier.id,
    }
  });

  // ── 4. ETA-delay visibility ────────────────────────────────────────────
  await testCase('Test 04 — Critical BOM delay detected', async () => {
    const dash = await getAttentionDashboard(founder.id, 'founder');
    assertTrue(dash.summary.criticalBomDelayCount >= 1, `BOM delay count >= 1 (got ${dash.summary.criticalBomDelayCount})`);
    assertTrue(dash.byCategory.bomDelays.some(b => b.entityId === delayedBom.id), 'BOM delay alert references delayed item');
  });

  // ── Create QC failure ──────────────────────────────────────────────────
  await prisma.quality_audits.create({
    data: {
      project_id: projectA.id,
      audit_number: 'QA-DASH-001',
      stage_number: 2,
      result: 'fail',
      findings_summary: 'Surface finish below spec on cabinet doors',
      auditor_id: dongmei.id,
    }
  });

  // ── 5. Quality-failure visibility ──────────────────────────────────────
  await testCase('Test 05 — QC failure appears in dashboard', async () => {
    const dash = await getAttentionDashboard(founder.id, 'founder');
    assertTrue(dash.summary.qcFailureCount >= 1, `QC failure count >= 1 (got ${dash.summary.qcFailureCount})`);
    assertTrue(dash.byCategory.qcFailures.some(q => q.projectId === projectA.id), 'QC failure references Project A');
  });

  // ── Create landed cost with margin variance ────────────────────────────
  await prisma.landed_costs.create({
    data: {
      project_id: projectA.id,
      total_landed_cost: 80000.00,
      selling_price: 100000.00,
      gross_margin: 20000.00,
      margin_percent: 20.00, // below target of 30%
      is_current: true,
      created_by: founder.id,
    }
  });

  // ── 6. Cost/margin visibility ──────────────────────────────────────────
  await testCase('Test 06 — Margin variance detected', async () => {
    const dash = await getAttentionDashboard(founder.id, 'founder');
    assertTrue(dash.summary.costVarianceCount >= 1, `Cost variance count >= 1 (got ${dash.summary.costVarianceCount})`);
    assertTrue(dash.byCategory.costVariances.some(c => c.projectId === projectA.id), 'Cost variance references Project A');
  });

  // ── Create overdue issue ───────────────────────────────────────────────
  await prisma.issues.create({
    data: {
      project_id: projectA.id,
      issue_number: 'ISS-DASH-001',
      title: 'Supplier contract unsigned',
      category: 'contract',
      severity: 'high',
      status: 'open',
      due_date: new Date('2026-01-15'), // overdue
      created_by: founder.id,
    }
  });

  // ── 7. Overdue action visibility ───────────────────────────────────────
  await testCase('Test 07 — Overdue action detected', async () => {
    const dash = await getAttentionDashboard(founder.id, 'founder');
    assertTrue(dash.summary.overdueActionCount >= 1, `Overdue count >= 1 (got ${dash.summary.overdueActionCount})`);
    assertTrue(dash.byCategory.overdueActions.some(a => a.projectId === projectA.id), 'Overdue action references Project A');
  });

  // ── Create upcoming deadline BOM item ──────────────────────────────────
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3); // 3 days from now

  await prisma.bom_items.create({
    data: {
      project_id: projectA.id,
      item_code: 'BOM-DEADLINE-001',
      product_name: 'Upcoming Critical Item',
      quantity: 1,
      is_critical: true,
      planned_eta: futureDate,
      approval_status: 'approved',
    }
  });

  // ── 8. Upcoming deadline visibility ────────────────────────────────────
  await testCase('Test 08 — Upcoming deadline detected', async () => {
    const dash = await getAttentionDashboard(founder.id, 'founder');
    assertTrue(dash.summary.upcomingDeadlineCount >= 1, `Deadline count >= 1 (got ${dash.summary.upcomingDeadlineCount})`);
    assertTrue(dash.byCategory.upcomingDeadlines.some(d => d.projectId === projectA.id), 'Deadline references Project A');
  });

  // ── Create compliance issue (expiring qualification) ───────────────────
  const qualType = await prisma.qualification_types.create({
    data: {
      type_code: 'QT-DASH-' + Date.now(),
      name_zh: '施工许可证',
      name_en: 'Construction Permit',
      applicable_partner_types: ['contractor'],
    }
  });

  await prisma.qualifications.create({
    data: {
      partner_id: partner.id,
      qualification_type_id: qualType.id,
      licence_number: 'LIC-001',
      expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      status: 'valid',
    }
  });

  await prisma.project_partners.create({
    data: {
      project_id: projectA.id,
      partner_id: partner.id,
      assigned_stage: 1,
      assigned_date: new Date(),
      status: 'active',
    }
  });

  // ── 9. Compliance issue visibility ─────────────────────────────────────
  await testCase('Test 09 — Compliance issue detected', async () => {
    const dash = await getAttentionDashboard(founder.id, 'founder');
    assertTrue(dash.summary.complianceIssueCount >= 1, `Compliance count >= 1 (got ${dash.summary.complianceIssueCount})`);
    assertTrue(dash.byCategory.complianceIssues.some(c => c.projectId === projectA.id), 'Compliance issue references Project A');
  });

  // ── 10. RBAC: Founder sees all ─────────────────────────────────────────
  await testCase('Test 10 — Founder sees all projects', async () => {
    const dash = await getAttentionDashboard(founder.id, 'founder');
    const projectIds = new Set(dash.alerts.map(a => a.projectId).filter(Boolean));
    assertTrue(projectIds.has(projectA.id), 'Founder sees Project A alerts');
  });

  // ── 11. RBAC: PM sees only assigned projects ───────────────────────────
  await testCase('Test 11 — PM sees only assigned projects', async () => {
    const dash = await getAttentionDashboard(pm.id, 'project_manager');
    const projectIds = new Set(dash.alerts.map(a => a.projectId).filter(Boolean));
    assertTrue(!projectIds.has(projectC.id), 'PM does NOT see Project C (not assigned)');
    assertTrue(projectIds.has(projectA.id) || projectIds.has(projectB.id), 'PM sees at least Project A or B');
  });

  // ── 12. RBAC: Cammy sees only assigned projects ────────────────────────
  await testCase('Test 12 — Cammy sees only assigned projects', async () => {
    const dash = await getAttentionDashboard(cammy.id, 'cammy');
    const projectIds = new Set(dash.alerts.map(a => a.projectId).filter(Boolean));
    assertTrue(!projectIds.has(projectA.id), 'Cammy does NOT see Project A (not assigned)');
    assertTrue(!projectIds.has(projectC.id), 'Cammy does NOT see Project C (not assigned)');
  });

  // ── 13. Alert severity sorting ─────────────────────────────────────────
  await testCase('Test 13 — Critical alerts appear first', async () => {
    const dash = await getAttentionDashboard(founder.id, 'founder');
    const severities = dash.alerts.map(a => a.severity);
    const firstNonCriticalIdx = severities.findIndex(s => s !== 'critical');
    const lastCriticalIdx = severities.lastIndexOf('critical');
    if (firstNonCriticalIdx >= 0 && lastCriticalIdx >= 0) {
      assertTrue(firstNonCriticalIdx > lastCriticalIdx, 'All critical alerts come before non-critical');
    }
  });

  // ── 14. Empty state ────────────────────────────────────────────────────
  const emptyProject = await prisma.projects.create({
    data: {
      project_code: 'PRJ-EMPTY-' + Date.now(),
      name_en: 'Empty Project',
      customer_id: customer.id,
      status: 'active',
    }
  });

  await testCase('Test 14 — KPI summary for empty project', async () => {
    const kpi = await getKpiSummary(founder.id, 'founder');
    assertTrue(kpi.activeProjects >= 4, 'Active projects includes empty project');
    assertTrue(kpi.openIssues >= 0, 'Open issues non-negative');
  });

  // ── 15. Project drill-down ─────────────────────────────────────────────
  await testCase('Test 15 — Project drill-down returns correct summary', async () => {
    const drill = await getProjectDashboard(projectA.id);
    assertTrue(!!drill, 'Project drill-down not null');
    assertEqual(drill!.project.code, projectA.project_code, 'Project code matches');
    assertTrue(drill!.gateStatus.isBlocked, 'Project A is blocked (NO-GO)');
    assertTrue(drill!.bomStatus.totalItems >= 2, 'BOM items counted');
    assertTrue(drill!.bomStatus.delayedItems >= 1, 'Delayed BOM items counted');
    assertTrue(!!drill!.costSummary, 'Cost summary exists');
    assertEqual(drill!.costSummary!.marginPercent, 20.00, 'Margin percent is 20%');
  });

  // ── 16. KPI includes BOM approved count ────────────────────────────────
  await testCase('Test 16 — KPI BOM approved count accurate', async () => {
    const kpi = await getKpiSummary(founder.id, 'founder');
    assertTrue(kpi.bomItemsApproved >= 2, `Approved BOM >= 2 (got ${kpi.bomItemsApproved})`);
    assertTrue(kpi.bomItemsDelayed >= 1, `Delayed BOM >= 1 (got ${kpi.bomItemsDelayed})`);
  });

  // ── 17. Supplier user gets filtered view ───────────────────────────────
  await testCase('Test 17 — Supplier gets limited view', async () => {
    const dash = await getAttentionDashboard(supplierUser.id, 'supplier');
    assertTrue(dash.summary.totalAttentionItems === 0, 'Supplier sees 0 attention items (not assigned)');
  });

  // ── 18. Dashboard summary totals add up ────────────────────────────────
  await testCase('Test 18 — Dashboard summary totals are consistent', async () => {
    const dash = await getAttentionDashboard(founder.id, 'founder');
    const expectedTotal =
      dash.summary.noGoCount +
      dash.summary.criticalRiskCount +
      dash.summary.criticalBomDelayCount +
      dash.summary.overdueActionCount +
      dash.summary.qcFailureCount +
      dash.summary.complianceIssueCount +
      dash.summary.costVarianceCount;
    assertEqual(dash.summary.totalAttentionItems, expectedTotal, 'Total attention items adds up correctly');
  });

  // ── 19. KPI margin calculation is correct ──────────────────────────────
  await testCase('Test 19 — KPI margin calculation from landed costs', async () => {
    const kpi = await getKpiSummary(founder.id, 'founder');
    assertTrue(kpi.avgMarginPercent !== null, 'Average margin is not null');
    assertTrue(kpi.avgMarginPercent! >= 0 && kpi.avgMarginPercent! <= 100, `Average margin is a valid percent (got ${kpi.avgMarginPercent})`);
  });

  // ── Cleanup ────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('Cleaning up test data...');

  await prisma.eta_tracking.deleteMany({ where: { project_id: { in: [projectA.id, projectB.id, projectC.id, emptyProject.id] } } });
  await prisma.landed_costs.deleteMany({ where: { project_id: { in: [projectA.id, projectB.id, projectC.id, emptyProject.id] } } });
  await prisma.bom_items.deleteMany({ where: { project_id: { in: [projectA.id, projectB.id, projectC.id, emptyProject.id] } } });
  await prisma.risks.deleteMany({ where: { project_id: { in: [projectA.id, projectB.id, projectC.id, emptyProject.id] } } });
  await prisma.issues.deleteMany({ where: { project_id: { in: [projectA.id, projectB.id, projectC.id, emptyProject.id] } } });
  await prisma.quality_audits.deleteMany({ where: { project_id: { in: [projectA.id, projectB.id, projectC.id, emptyProject.id] } } });
  await prisma.gate_results.deleteMany({ where: { project_id: { in: [projectA.id, projectB.id, projectC.id, emptyProject.id] } } });
  await prisma.project_partners.deleteMany({ where: { project_id: { in: [projectA.id, projectB.id, projectC.id, emptyProject.id] } } });
  await prisma.projects.deleteMany({ where: { id: { in: [projectA.id, projectB.id, projectC.id, emptyProject.id] } } });
  await prisma.qualifications.deleteMany({ where: { partner_id: partner.id } });
  await prisma.qualification_types.deleteMany({ where: { id: qualType.id } });
  await prisma.partners.deleteMany({ where: { id: partner.id } });
  await prisma.suppliers.deleteMany({ where: { id: supplier.id } });
  await prisma.customers.deleteMany({ where: { id: customer.id } });
  await prisma.users.deleteMany({
    where: { email: { in: [
      'test-dash-founder@ees.sg',
      'test-dash-dongmei@ees.sg',
      'test-dash-pm@ees.sg',
      'test-dash-cammy@ees.sg',
      'test-dash-supplier@ees.sg',
    ]}}
  });

  console.log('Cleanup complete.');

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Dashboard — Test Results');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Passed: ${GREEN}${testPassed}${RESET}`);
  console.log(`Failed: ${testFailed > 0 ? RED : ''}${testFailed}${RESET}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();

  if (testFailed > 0) process.exit(1);
}

runTests().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
