/**
 * BOM Management — Automated Tests
 *
 * Tests cover:
 * 1.  Create BOM item with valid data
 * 2.  Auto-calculate total_cost = quantity × unit_cost
 * 3.  Update BOM item (recalculates total_cost)
 * 4.  Submit BOM item for approval
 * 5.  Approve BOM item (Dongmei / Founder)
 * 6.  Reject BOM item (Dongmei / Founder)
 * 7.  List BOM items for project
 * 8.  Get BOM summary
 * 9.  Audit log created on create
 * 10. Audit log created on update
 * 11. Audit log created on approve
 * 12. Create BOM without item_code → VALIDATION_ERROR
 * 13. Create BOM without product_name → VALIDATION_ERROR
 * 14. Create BOM with invalid quantity (negative) → VALIDATION_ERROR
 * 15. Create BOM with invalid quantity (zero) → VALIDATION_ERROR
 * 16. Create BOM with invalid quantity (non-integer) → VALIDATION_ERROR
 * 17. Create BOM with invalid unit_cost (negative) → VALIDATION_ERROR
 * 18. Update approved BOM → FORBIDDEN
 * 19. Approve by PM → FORBIDDEN
 * 20. Delete approved BOM by non-Founder → FORBIDDEN
 * 21. BOM approval status progression: draft → submitted → approved
 * 22. All BOM items approved check
 * 23. Audit log created on reject
 * 24. Delete draft BOM allowed for Dongmei
 * 25. Founder can delete approved BOM
 * 26. ETA data integrity and audit logging (regression)
 *
 * Run: npm run test:bom
 */

import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import {
  createBomItem,
  updateBomItem,
  submitBomItem,
  approveBomItem,
  rejectBomItem,
  deleteBomItem,
  listBomItems,
  getBomSummary,
  areAllBomItemsApproved,
} from '../services/bomEngine';

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
  console.log('BOM Management — Automated Tests');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── Seed roles ─────────────────────────────────────────────────────────
  const roles = [
    { name: 'founder', name_zh: '创始人', name_en: 'Founder', level: 100 },
    { name: 'dongmei', name_zh: '冬梅', name_en: 'Dongmei', level: 80 },
    { name: 'project_manager', name_zh: '项目经理', name_en: 'Project Manager', level: 60 },
    { name: 'cammy', name_zh: 'Cammy', name_en: 'Cammy', level: 80 },
    { name: 'supplier', name_zh: '供应商', name_en: 'Supplier', level: 40 },
    { name: 'quality_reviewer', name_zh: '审核员', name_en: 'Quality Reviewer', level: 70 },
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
    where: { email: 'test-bom-founder@ees.sg' },
    update: {},
    create: { email: 'test-bom-founder@ees.sg', password_hash: hash, name_en: 'Test Founder', role_id: founderRole!.id }
  });
  const dongmei = await prisma.users.upsert({
    where: { email: 'test-bom-dongmei@ees.sg' },
    update: {},
    create: { email: 'test-bom-dongmei@ees.sg', password_hash: hash, name_en: 'Test Dongmei', role_id: dongmeiRole!.id }
  });
  const pm = await prisma.users.upsert({
    where: { email: 'test-bom-pm@ees.sg' },
    update: {},
    create: { email: 'test-bom-pm@ees.sg', password_hash: hash, name_en: 'Test PM', role_id: pmRole!.id }
  });
  const cammy = await prisma.users.upsert({
    where: { email: 'test-bom-cammy@ees.sg' },
    update: {},
    create: { email: 'test-bom-cammy@ees.sg', password_hash: hash, name_en: 'Test Cammy', role_id: cammyRole!.id }
  });
  const supplierUser = await prisma.users.upsert({
    where: { email: 'test-bom-supplier@ees.sg' },
    update: {},
    create: { email: 'test-bom-supplier@ees.sg', password_hash: hash, name_en: 'Test Supplier', role_id: supplierRole!.id }
  });

  // ── Create project and supplier ────────────────────────────────────────
  const customer = await prisma.customers.create({
    data: { name: 'BOM Test Customer', customer_code: 'BOMC-' + Date.now() }
  });

  const project = await prisma.projects.create({
    data: {
      project_code: 'PRJ-BOM-' + Date.now(),
      name_en: 'Dongmei Home',
      customer_id: customer.id,
      status: 'active',
      dongmei_id: dongmei.id,
      pm_id: pm.id,
    }
  });

  const supplier = await prisma.suppliers.create({
    data: {
      supplier_code: 'SUP-BOM-' + Date.now(),
      name: 'Test Supplier Co.',
      category: 'A',
    }
  });

  // ── Test 1: Create BOM item with valid data ────────────────────────────
  let bomItemId = '';
  await testCase('Test 01 — Create BOM item with valid data', async () => {
    const item = await createBomItem({
      project_id: project.id,
      item_code: 'BOM-001',
      product_name: 'Solid Wood Door',
      specification: '2100x900x45mm, Oak veneer',
      quantity: 5,
      unit: 'pcs',
      supplier_id: supplier.id,
      unit_cost: 250.00,
      lead_time_days: 14,
      is_critical: true,
      planned_eta: new Date('2026-09-01'),
    }, dongmei.id);

    bomItemId = item.id;
    assertEqual(item.item_code, 'BOM-001', 'Item code correct');
    assertEqual(item.product_name, 'Solid Wood Door', 'Product name correct');
    assertEqual(item.quantity, 5, 'Quantity correct');
    assertEqual(item.approval_status, 'draft', 'Status starts as draft');
    assertTrue(item.is_critical, 'Critical flag set');
  });

  // ── Test 2: Auto-calculate total_cost ──────────────────────────────────
  await testCase('Test 02 — Auto-calculate total_cost = qty × unit_cost', async () => {
    const item = await prisma.bom_items.findUnique({ where: { id: bomItemId } });
    assertEqual(Number(item?.total_cost), 1250.00, 'Total cost = 5 × 250 = 1250');
  });

  // ── Test 3: Update BOM item (recalculates total_cost) ──────────────────
  await testCase('Test 03 — Update BOM item recalculates total_cost', async () => {
    const updated = await updateBomItem(bomItemId, { quantity: 10, unit_cost: 300 }, dongmei.id);
    assertEqual(updated.quantity, 10, 'Quantity updated');
    assertEqual(Number(updated.total_cost), 3000.00, 'Total cost = 10 × 300 = 3000');
  });

  // ── Test 4: Submit for approval ────────────────────────────────────────
  await testCase('Test 04 — Submit BOM item for approval', async () => {
    const submitted = await submitBomItem(bomItemId, dongmei.id);
    assertEqual(submitted.approval_status, 'submitted', 'Status is submitted');
  });

  // ── Test 5: Approve BOM item (Dongmei) ─────────────────────────────────
  await testCase('Test 05 — Approve BOM item by Dongmei', async () => {
    const approved = await approveBomItem(bomItemId, dongmei.id, 'dongmei');
    assertEqual(approved.approval_status, 'approved', 'Status is approved');
    assertEqual(approved.approved_by, dongmei.id, 'Approved by Dongmei');
    assertTrue(approved.approved_at !== null, 'Approved at timestamp set');
  });

  // ── Test 6: Reject BOM item (create new one, submit, then reject) ──────
  let rejectItemId = '';
  await testCase('Test 06 — Reject BOM item', async () => {
    const item = await createBomItem({
      project_id: project.id,
      item_code: 'BOM-002',
      product_name: 'Kitchen Cabinet',
      quantity: 2,
      unit_cost: 800,
    }, dongmei.id);
    rejectItemId = item.id;

    await submitBomItem(rejectItemId, dongmei.id);
    const rejected = await rejectBomItem(rejectItemId, dongmei.id, 'dongmei', 'Specification unclear');
    assertEqual(rejected.approval_status, 'rejected', 'Status is rejected');
    assertEqual(rejected.approved_by, null, 'Approved by cleared');
  });

  // ── Test 7: List BOM items ─────────────────────────────────────────────
  await testCase('Test 07 — List BOM items for project', async () => {
    const items = await listBomItems(project.id);
    assertEqual(items.length, 2, 'Two BOM items in project');
    assertTrue(items.some(i => i.item_code === 'BOM-001'), 'Contains BOM-001');
    assertTrue(items.some(i => i.item_code === 'BOM-002'), 'Contains BOM-002');
  });

  // ── Test 8: Get BOM summary ────────────────────────────────────────────
  await testCase('Test 08 — BOM summary calculates correctly', async () => {
    const summary = await getBomSummary(project.id);
    assertEqual(summary.total_items, 2, 'Total items = 2');
    assertEqual(summary.approved_items, 1, 'Approved items = 1');
    assertEqual(summary.pending_approval, 1, 'Pending approval = 1');
    assertTrue(Number(summary.total_cost) > 0, 'Total cost > 0');
    assertEqual(summary.critical_items, 1, 'Critical items = 1');
  });

  // ── Test 9: Audit log on create ────────────────────────────────────────
  await testCase('Test 09 — Audit log created on BOM create', async () => {
    const log = await prisma.audit_logs.findFirst({
      where: { action: 'bom_item_created', resource_id: bomItemId }
    });
    assertTrue(!!log, 'Audit log exists for create');
    assertEqual(log?.user_id, dongmei.id, 'Audit log records creator');
  });

  // ── Test 10: Audit log on update ───────────────────────────────────────
  await testCase('Test 10 — Audit log created on BOM update', async () => {
    const logs = await prisma.audit_logs.findMany({
      where: { action: 'bom_item_updated', resource_id: bomItemId }
    });
    assertTrue(logs.length > 0, 'At least one update audit log exists');
  });

  // ── Test 11: Audit log on approve ──────────────────────────────────────
  await testCase('Test 11 — Audit log created on BOM approve', async () => {
    const log = await prisma.audit_logs.findFirst({
      where: { action: 'bom_item_approved', resource_id: bomItemId }
    });
    assertTrue(!!log, 'Audit log exists for approve');
    assertEqual(log?.user_id, dongmei.id, 'Audit log records approver');
  });

  // ── Test 12: Create without item_code → VALIDATION_ERROR ───────────────
  await testCase('Test 12 — Create BOM without item_code rejected', async () => {
    try {
      await createBomItem({
        project_id: project.id,
        item_code: '',
        product_name: 'Test',
        quantity: 1,
      }, dongmei.id);
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('VALIDATION_ERROR'), 'Throws VALIDATION_ERROR');
      assertTrue(e.message.includes('item_code'), 'Error mentions item_code');
    }
  });

  // ── Test 13: Create without product_name → VALIDATION_ERROR ────────────
  await testCase('Test 13 — Create BOM without product_name rejected', async () => {
    try {
      await createBomItem({
        project_id: project.id,
        item_code: 'BOM-003',
        product_name: '',
        quantity: 1,
      }, dongmei.id);
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('VALIDATION_ERROR'), 'Throws VALIDATION_ERROR');
      assertTrue(e.message.includes('product_name'), 'Error mentions product_name');
    }
  });

  // ── Test 14: Invalid quantity (negative) → VALIDATION_ERROR ────────────
  await testCase('Test 14 — Negative quantity rejected', async () => {
    try {
      await createBomItem({
        project_id: project.id,
        item_code: 'BOM-004',
        product_name: 'Test',
        quantity: -5,
      }, dongmei.id);
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('VALIDATION_ERROR'), 'Throws VALIDATION_ERROR');
      assertTrue(e.message.includes('quantity'), 'Error mentions quantity');
    }
  });

  // ── Test 15: Invalid quantity (zero) → VALIDATION_ERROR ────────────────
  await testCase('Test 15 — Zero quantity rejected', async () => {
    try {
      await createBomItem({
        project_id: project.id,
        item_code: 'BOM-005',
        product_name: 'Test',
        quantity: 0,
      }, dongmei.id);
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('VALIDATION_ERROR'), 'Throws VALIDATION_ERROR');
    }
  });

  // ── Test 16: Invalid quantity (non-integer) → VALIDATION_ERROR ─────────
  await testCase('Test 16 — Non-integer quantity rejected', async () => {
    try {
      await createBomItem({
        project_id: project.id,
        item_code: 'BOM-006',
        product_name: 'Test',
        quantity: 3.5,
      }, dongmei.id);
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('VALIDATION_ERROR'), 'Throws VALIDATION_ERROR');
    }
  });

  // ── Test 17: Invalid unit_cost (negative) → VALIDATION_ERROR ───────────
  await testCase('Test 17 — Negative unit_cost rejected', async () => {
    try {
      await createBomItem({
        project_id: project.id,
        item_code: 'BOM-007',
        product_name: 'Test',
        quantity: 1,
        unit_cost: -100,
      }, dongmei.id);
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('VALIDATION_ERROR'), 'Throws VALIDATION_ERROR');
      assertTrue(e.message.includes('unit_cost'), 'Error mentions unit_cost');
    }
  });

  // ── Test 18: Update approved BOM → FORBIDDEN ───────────────────────────
  await testCase('Test 18 — Modify approved BOM blocked', async () => {
    try {
      await updateBomItem(bomItemId, { quantity: 99 }, dongmei.id);
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('FORBIDDEN'), 'Throws FORBIDDEN');
      assertTrue(e.message.includes('approved'), 'Error mentions approved');
    }
  });

  // ── Test 19: Approve by PM → FORBIDDEN ─────────────────────────────────
  await testCase('Test 19 — PM cannot approve BOM', async () => {
    try {
      await approveBomItem(rejectItemId, pm.id, 'project_manager');
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('FORBIDDEN'), 'Throws FORBIDDEN');
    }
  });

  // ── Test 20: Delete approved BOM by non-Founder → FORBIDDEN ────────────
  await testCase('Test 20 — Non-Founder cannot delete approved BOM', async () => {
    try {
      await deleteBomItem(bomItemId, dongmei.id, 'dongmei');
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('FORBIDDEN'), 'Throws FORBIDDEN');
      assertTrue(e.message.includes('Founder'), 'Error mentions Founder');
    }
  });

  // ── Test 21: Approval status progression ───────────────────────────────
  await testCase('Test 21 — BOM approval status progression', async () => {
    const item = await createBomItem({
      project_id: project.id,
      item_code: 'BOM-008',
      product_name: 'Progression Test',
      quantity: 1,
    }, dongmei.id);

    assertEqual(item.approval_status, 'draft', 'Starts as draft');

    const submitted = await submitBomItem(item.id, dongmei.id);
    assertEqual(submitted.approval_status, 'submitted', 'After submit → submitted');

    const approved = await approveBomItem(item.id, founder.id, 'founder');
    assertEqual(approved.approval_status, 'approved', 'After approve → approved');
  });

  // ── Test 22: areAllBomItemsApproved ────────────────────────────────────
  await testCase('Test 22 — All BOM items approved check', async () => {
    const allApproved = await areAllBomItemsApproved(project.id);
    assertEqual(allApproved, false, 'Not all items approved (one rejected)');
  });

  // ── Test 23: Audit log on reject ───────────────────────────────────────
  await testCase('Test 23 — Audit log created on BOM reject', async () => {
    const log = await prisma.audit_logs.findFirst({
      where: { action: 'bom_item_rejected', resource_id: rejectItemId }
    });
    assertTrue(!!log, 'Audit log exists for reject');
    assertEqual(log?.reason, 'Specification unclear', 'Reason recorded');
  });

  // ── Test 24: Delete non-approved BOM by Dongmei (allowed) ──────────────
  let deletableItemId = '';
  await testCase('Test 24 — Delete draft BOM allowed for Dongmei', async () => {
    const item = await createBomItem({
      project_id: project.id,
      item_code: 'BOM-DEL',
      product_name: 'Deletable Item',
      quantity: 1,
    }, dongmei.id);
    deletableItemId = item.id;

    const result = await deleteBomItem(deletableItemId, dongmei.id, 'dongmei');
    assertEqual(result.deleted, true, 'Draft item deleted successfully');
  });

  // ── Test 25: Founder can delete approved BOM ───────────────────────────
  await testCase('Test 25 — Founder can delete approved BOM', async () => {
    const result = await deleteBomItem(bomItemId, founder.id, 'founder');
    assertEqual(result.deleted, true, 'Founder deleted approved item');
  });

  // ── Test 26: ETA data integrity and audit logging (regression) ─────────
  await testCase('Test 26 — ETA update preserves data integrity + audit log', async () => {
    const item = await createBomItem({
      project_id: project.id,
      item_code: 'BOM-ETA',
      product_name: 'ETA Regression Test Item',
      quantity: 1,
      unit_cost: 100,
      planned_eta: new Date('2026-10-01'),
    }, dongmei.id);

    const updated = await updateBomItem(item.id, {
      planned_eta: new Date('2026-10-15'),
      forecast_eta: new Date('2026-10-20'),
      actual_arrival: new Date('2026-10-22'),
    }, dongmei.id);

    assertEqual(updated.planned_eta?.toISOString().split('T')[0], '2026-10-15', 'Planned ETA stored correctly');
    assertEqual(updated.forecast_eta?.toISOString().split('T')[0], '2026-10-20', 'Forecast ETA stored correctly');
    assertEqual(updated.actual_arrival?.toISOString().split('T')[0], '2026-10-22', 'Actual arrival stored correctly');

    const auditLogs = await prisma.audit_logs.findMany({
      where: { action: 'bom_item_updated', resource_id: item.id },
      orderBy: { created_at: 'desc' },
    });
    assertTrue(auditLogs.length > 0, 'Audit log exists for ETA update');

    const latestLog = auditLogs[0];
    const afterValue = latestLog.after_value as any;
    assertTrue(
      afterValue.planned_eta === '2026-10-15' || afterValue.forecast_eta === '2026-10-20' || afterValue.actual_arrival === '2026-10-22',
      'Audit log captures ETA fields'
    );

    await prisma.audit_logs.deleteMany({ where: { resource_id: item.id } });
    await prisma.bom_items.delete({ where: { id: item.id } });
  });

  // ── Cleanup ────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('Cleaning up test data...');
  await prisma.audit_logs.deleteMany({
    where: { resource_type: 'bom_item', resource_id: { in: [bomItemId, rejectItemId, deletableItemId] } }
  });
  await prisma.bom_items.deleteMany({ where: { project_id: project.id } });
  await prisma.suppliers.delete({ where: { id: supplier.id } });
  await prisma.projects.delete({ where: { id: project.id } });
  await prisma.customers.delete({ where: { id: customer.id } });
  await prisma.users.deleteMany({
    where: { email: { in: [
      'test-bom-founder@ees.sg',
      'test-bom-dongmei@ees.sg',
      'test-bom-pm@ees.sg',
      'test-bom-cammy@ees.sg',
      'test-bom-supplier@ees.sg',
    ]}}
  });
  console.log('Cleanup complete.');

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('BOM Management — Test Results');
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
