/**
 * ETA Tracking — Automated Tests
 *
 * Tests cover:
 * 1.  Update planned ETA on BOM item (Dongmei)
 * 2.  PM cannot update forecast ETA → FORBIDDEN
 * 3.  Record actual arrival → variance calculated
 * 4.  Critical item delay → alert triggered
 * 5.  Critical item delay → Risk auto-created
 * 6.  Non-critical item delay → no alert
 * 7.  ETA summary data correct
 * 8.  Latest ETA status per BOM item
 * 9.  ETA tracking history record created
 * 10. Audit log on ETA change
 * 11. Supplier unauthorized update blocked
 * 12. Update non-existent BOM → NOT_FOUND
 * 13. Forecast later than planned on critical item → alert
 * 14. On-time critical item → no alert
 * 15. Ahead-of-schedule item → negative variance
 *
 * Run: npm run test:eta
 */

import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import {
  updateBomEta,
  listEtaTrackingWithBom,
  getEtaSummary,
  getLatestEtaByBomItem,
} from '../services/etaEngine';

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
  console.log('ETA Tracking — Automated Tests');
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
    where: { email: 'test-eta-founder@ees.sg' },
    update: {},
    create: { email: 'test-eta-founder@ees.sg', password_hash: hash, name_en: 'Test Founder', role_id: founderRole!.id }
  });
  const dongmei = await prisma.users.upsert({
    where: { email: 'test-eta-dongmei@ees.sg' },
    update: {},
    create: { email: 'test-eta-dongmei@ees.sg', password_hash: hash, name_en: 'Test Dongmei', role_id: dongmeiRole!.id }
  });
  const pm = await prisma.users.upsert({
    where: { email: 'test-eta-pm@ees.sg' },
    update: {},
    create: { email: 'test-eta-pm@ees.sg', password_hash: hash, name_en: 'Test PM', role_id: pmRole!.id }
  });
  const cammy = await prisma.users.upsert({
    where: { email: 'test-eta-cammy@ees.sg' },
    update: {},
    create: { email: 'test-eta-cammy@ees.sg', password_hash: hash, name_en: 'Test Cammy', role_id: cammyRole!.id }
  });
  const supplierUser = await prisma.users.upsert({
    where: { email: 'test-eta-supplier@ees.sg' },
    update: {},
    create: { email: 'test-eta-supplier@ees.sg', password_hash: hash, name_en: 'Test Supplier', role_id: supplierRole!.id }
  });

  // ── Create project, supplier, BOM items ────────────────────────────────
  const customer = await prisma.customers.create({
    data: { name: 'ETA Test Customer', customer_code: 'ETAC-' + Date.now() }
  });

  const project = await prisma.projects.create({
    data: {
      project_code: 'PRJ-ETA-' + Date.now(),
      name_en: 'Dongmei Home ETA',
      customer_id: customer.id,
      status: 'active',
      dongmei_id: dongmei.id,
      pm_id: pm.id,
    }
  });

  const supplier = await prisma.suppliers.create({
    data: { supplier_code: 'SUP-ETA-' + Date.now(), name: 'ETA Supplier', category: 'A' }
  });

  // Critical item
  const criticalItem = await prisma.bom_items.create({
    data: {
      project_id: project.id,
      item_code: 'ETA-CRIT',
      product_name: 'Critical Component',
      quantity: 1,
      is_critical: true,
      planned_eta: new Date('2026-10-01'),
      approval_status: 'approved',
    }
  });

  // Non-critical item
  const normalItem = await prisma.bom_items.create({
    data: {
      project_id: project.id,
      item_code: 'ETA-NORM',
      product_name: 'Normal Component',
      quantity: 1,
      is_critical: false,
      planned_eta: new Date('2026-10-01'),
      approval_status: 'approved',
    }
  });

  // ── Test 1: Update planned ETA ─────────────────────────────────────────
  await testCase('Test 01 — Update planned ETA', async () => {
    const result = await updateBomEta(
      criticalItem.id,
      { planned_eta: new Date('2026-10-15') },
      dongmei.id,
      'dongmei'
    );
    assertEqual(result.bomItem.planned_eta?.toISOString().split('T')[0], '2026-10-15', 'Planned ETA updated');
    assertTrue(!!result.etaRecord, 'ETA tracking record created');
  });

  // ── Test 2: PM cannot update forecast ETA ──────────────────────────────
  await testCase('Test 02 — PM update blocked (read-only)', async () => {
    try {
      await updateBomEta(
        normalItem.id,
        { forecast_eta: new Date('2026-10-10') },
        pm.id,
        'project_manager'
      );
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('FORBIDDEN'), 'PM update throws FORBIDDEN');
    }
  });

  // ── Test 3: Record actual arrival → variance calculated ────────────────
  await testCase('Test 03 — Actual arrival calculates variance', async () => {
    const result = await updateBomEta(
      normalItem.id,
      { actual_arrival: new Date('2026-10-05') },
      dongmei.id,
      'dongmei'
    );
    assertEqual(result.varianceDays, 4, 'Variance = 4 days (Oct 1 → Oct 5)');
    assertEqual(result.etaRecord.variance_days, 4, 'ETA record stores variance');
  });

  // ── Test 4: Critical item delay → alert triggered ──────────────────────
  await testCase('Test 04 — Critical item delay triggers alert', async () => {
    // Test 1 changed planned_eta to Oct 15, so use Oct 25 to be 10 days late
    const result = await updateBomEta(
      criticalItem.id,
      { actual_arrival: new Date('2026-10-25') },
      dongmei.id,
      'dongmei'
    );
    assertTrue(result.alertTriggered, 'Alert triggered for critical delay');
    assertTrue(result.etaRecord.alert_triggered, 'ETA record has alert_triggered = true');
  });

  // ── Test 5: Critical item delay → Risk auto-created ────────────────────
  await testCase('Test 05 — Critical delay auto-creates Risk', async () => {
    const risks = await prisma.risks.findMany({
      where: { project_id: project.id, category: 'eta_delay' }
    });
    assertTrue(risks.length > 0, 'At least one ETA risk created');
    assertTrue(risks.some(r => r.description.includes('ETA-CRIT')), 'Risk references critical item');
    assertEqual(risks[0].risk_level, 'high', 'Risk level is high');
    assertEqual(risks[0].status, 'open', 'Risk status is open');
  });

  // ── Test 6: Non-critical item delay → no alert ─────────────────────────
  await testCase('Test 06 — Non-critical delay does not trigger alert', async () => {
    const result = await updateBomEta(
      normalItem.id,
      { actual_arrival: new Date('2026-10-05') },
      dongmei.id,
      'dongmei'
    );
    assertTrue(!result.alertTriggered, 'No alert for non-critical item');
  });

  // ── Test 7: ETA summary data correct ───────────────────────────────────
  await testCase('Test 07 — ETA summary is accurate', async () => {
    const summary = await getEtaSummary(project.id);
    assertEqual(summary.total_items, 2, 'Total items = 2');
    assertEqual(summary.items_arrived, 2, 'Both items arrived');
    assertTrue(summary.delayed_items >= 1, 'At least one delayed');
    assertTrue(summary.critical_delayed_items >= 1, 'At least one critical delayed');
    assertTrue(summary.total_variance_days > 0, 'Total variance > 0');
  });

  // ── Test 8: Latest ETA status per BOM item ─────────────────────────────
  await testCase('Test 08 — Latest ETA status correct', async () => {
    const latest = await getLatestEtaByBomItem(project.id);
    assertEqual(latest.length, 2, 'Two BOM items returned');
    const crit = latest.find(i => i.item_code === 'ETA-CRIT');
    assertTrue(!!crit, 'Critical item found');
    assertEqual(crit?.eta_status, 'delayed', 'Critical item status is delayed');
    assertEqual(crit?.variance_days, 10, 'Critical item variance = 10 days (Oct 15 → Oct 25)');
  });

  // ── Test 9: ETA tracking history record created ────────────────────────
  await testCase('Test 09 — ETA tracking history exists', async () => {
    const history = await listEtaTrackingWithBom(project.id);
    assertTrue(history.length >= 4, 'At least 4 ETA records');
  });

  // ── Test 10: Audit log on ETA change ───────────────────────────────────
  await testCase('Test 10 — Audit log created on ETA update', async () => {
    const logs = await prisma.audit_logs.findMany({
      where: { action: 'eta_updated' },
      orderBy: { created_at: 'desc' },
    });
    assertTrue(logs.length > 0, 'Audit logs exist for ETA updates');
    const latest = logs[0];
    const after = latest.after_value as any;
    assertTrue(after.alert_triggered !== undefined, 'Audit log captures alert state');
  });

  // ── Test 11: Supplier unauthorized update blocked ────────────────────────
  await testCase('Test 11 — Supplier cannot update ETA', async () => {
    try {
      await updateBomEta(criticalItem.id, { forecast_eta: new Date('2026-11-01') }, supplierUser.id, 'supplier');
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('FORBIDDEN'), 'Throws FORBIDDEN');
    }
  });

  // ── Test 12: Update non-existent BOM → NOT_FOUND ───────────────────────
  await testCase('Test 12 — Update non-existent BOM rejected', async () => {
    try {
      await updateBomEta('non-existent-id', { planned_eta: new Date() }, dongmei.id, 'dongmei');
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('NOT_FOUND'), 'Throws NOT_FOUND');
    }
  });

  // ── Test 13: Forecast later than planned on critical → alert ───────────
  const forecastItem = await prisma.bom_items.create({
    data: {
      project_id: project.id,
      item_code: 'ETA-FORE',
      product_name: 'Forecast Alert Item',
      quantity: 1,
      is_critical: true,
      planned_eta: new Date('2026-11-01'),
      approval_status: 'approved',
    }
  });

  await testCase('Test 13 — Forecast delay on critical triggers alert', async () => {
    const result = await updateBomEta(
      forecastItem.id,
      { forecast_eta: new Date('2026-11-10') },
      dongmei.id,
      'dongmei'
    );
    assertTrue(result.alertTriggered, 'Alert triggered for forecast delay on critical');
  });

  // ── Test 14: On-time critical item → no alert ──────────────────────────
  const onTimeItem = await prisma.bom_items.create({
    data: {
      project_id: project.id,
      item_code: 'ETA-ONTM',
      product_name: 'On Time Critical Item',
      quantity: 1,
      is_critical: true,
      planned_eta: new Date('2026-12-01'),
      approval_status: 'approved',
    }
  });

  await testCase('Test 14 — On-time critical item has no alert', async () => {
    const result = await updateBomEta(
      onTimeItem.id,
      { actual_arrival: new Date('2026-12-01') },
      dongmei.id,
      'dongmei'
    );
    assertEqual(result.varianceDays, 0, 'Variance is 0');
    assertTrue(!result.alertTriggered, 'No alert for on-time delivery');
  });

  // ── Test 15: Ahead-of-schedule item → negative variance ────────────────
  await testCase('Test 15 — Ahead-of-schedule has negative variance', async () => {
    const result = await updateBomEta(
      onTimeItem.id,
      { actual_arrival: new Date('2026-11-25') },
      dongmei.id,
      'dongmei'
    );
    assertEqual(result.varianceDays, -6, 'Variance = -6 days (ahead)');
  });

  // ── Cleanup ────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('Cleaning up test data...');
  await prisma.audit_logs.deleteMany({ where: { action: 'eta_updated' } });
  await prisma.eta_tracking.deleteMany({ where: { project_id: project.id } });
  await prisma.risks.deleteMany({ where: { project_id: project.id } });
  await prisma.bom_items.deleteMany({ where: { project_id: project.id } });
  await prisma.suppliers.delete({ where: { id: supplier.id } });
  await prisma.projects.delete({ where: { id: project.id } });
  await prisma.customers.delete({ where: { id: customer.id } });
  await prisma.users.deleteMany({
    where: { email: { in: [
      'test-eta-founder@ees.sg',
      'test-eta-dongmei@ees.sg',
      'test-eta-pm@ees.sg',
      'test-eta-cammy@ees.sg',
      'test-eta-supplier@ees.sg',
    ]}}
  });
  console.log('Cleanup complete.');

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('ETA Tracking — Test Results');
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
