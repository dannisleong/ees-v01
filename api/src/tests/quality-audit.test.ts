/**
 * Quality Audit Engine — Automated Tests
 *
 * Tests cover:
 * 1. Checklist validation — all items completed
 * 2. Checklist validation — FAIL without details rejected
 * 3. Checklist validation — partial completion rejected
 * 4. Critical item FAIL = overall FAIL (one-strike)
 * 5. All PASS = overall PASS
 * 6. Mixed PASS/FAIL with details = overall FAIL
 * 7. Audit immutable after submission
 * 8. Re-audit creates copy with reset items
 * 9. Dry-run validation endpoint
 * 10. N/A items count as completed
 *
 * Run: npm run test:quality-audit
 */

import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import {
  validateChecklist,
  calculateAuditResult,
  submitAudit,
  createReAudit,
  isAuditImmutable
} from '../services/auditEngine';


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
  console.log('Quality Audit Engine — Automated Tests');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── Setup ──────────────────────────────────────────────────────────────
  const reviewerRole = await prisma.roles.upsert({
    where: { name: 'quality_reviewer' },
    update: {},
    create: { name: 'quality_reviewer', name_zh: '质量审核员', name_en: 'Quality Reviewer', level: 70 }
  });

  const hash = await bcrypt.hash('password123', 10);
  const reviewer = await prisma.users.upsert({
    where: { email: 'test-qa-reviewer@ees.sg' },
    update: {},
    create: { email: 'test-qa-reviewer@ees.sg', password_hash: hash, name_en: 'QA Reviewer', role_id: reviewerRole.id }
  });

  const customer = await prisma.customers.create({
    data: { name: 'QA Test Customer', customer_code: 'QAC-' + Date.now() }
  });

  const project = await prisma.projects.create({
    data: {
      project_code: 'PRJ-QA-' + Date.now(),
      name_en: 'QA Test Project',
      customer_id: customer.id,
      status: 'active'
    }
  });

  // ── Test 1: All items pending → validation fails ───────────────────────
  await testCase('Test 01 — All pending items rejected', async () => {
    const items = [
      { id: '1', result: 'pending', finding_details: null, is_critical: false, item_name: 'Alignment' },
      { id: '2', result: 'pending', finding_details: null, is_critical: false, item_name: 'Surface' }
    ];
    const result = validateChecklist(items);
    assertEqual(result.valid, false, 'Validation fails with all pending');
    assertEqual(result.pendingCount, 2, '2 pending items detected');
    assertTrue(result.errors.some(e => e.includes('pending')), 'Error mentions pending items');
  });

  // ── Test 2: FAIL without finding_details → rejected ────────────────────
  await testCase('Test 02 — FAIL without details rejected', async () => {
    const items = [
      { id: '1', result: 'pass', finding_details: null, is_critical: false, item_name: 'Alignment' },
      { id: '2', result: 'fail', finding_details: null, is_critical: false, item_name: 'Surface' }
    ];
    const result = validateChecklist(items);
    assertEqual(result.valid, false, 'Validation fails without finding_details');
    assertEqual(result.failWithoutDetails, 1, '1 item missing details');
    assertTrue(result.errors.some(e => e.includes('finding_details')), 'Error mentions finding_details');
  });

  // ── Test 3: FAIL with finding_details → valid ──────────────────────────
  await testCase('Test 03 — FAIL with details accepted', async () => {
    const items = [
      { id: '1', result: 'pass', finding_details: null, is_critical: false, item_name: 'Alignment' },
      { id: '2', result: 'fail', finding_details: 'Scratch found on panel B3', is_critical: false, item_name: 'Surface' }
    ];
    const result = validateChecklist(items);
    assertEqual(result.valid, true, 'Validation passes with details');
    assertEqual(result.failWithoutDetails, 0, 'No items missing details');
  });

  // ── Test 4: Critical item FAIL = overall FAIL ──────────────────────────
  await testCase('Test 04 — Critical item FAIL = one-strike overall FAIL', async () => {
    const items = [
      { id: '1', result: 'pass', is_critical: false },
      { id: '2', result: 'pass', is_critical: false },
      { id: '3', result: 'fail', is_critical: true } // Critical fail
    ];
    const result = calculateAuditResult(items);
    assertEqual(result.result, 'fail', 'Overall result is FAIL');
    assertEqual(result.critical_triggered, true, 'Critical item triggered failure');
    assertTrue(result.message.includes('Critical'), 'Message mentions critical item');
  });

  // ── Test 5: All PASS = overall PASS ────────────────────────────────────
  await testCase('Test 05 — All PASS = overall PASS', async () => {
    const items = [
      { id: '1', result: 'pass', is_critical: false },
      { id: '2', result: 'pass', is_critical: true },
      { id: '3', result: 'pass', is_critical: false }
    ];
    const result = calculateAuditResult(items);
    assertEqual(result.result, 'pass', 'Overall result is PASS');
    assertEqual(result.critical_triggered, false, 'No critical trigger');
  });

  // ── Test 6: Mixed PASS/FAIL (non-critical) = FAIL ──────────────────────
  await testCase('Test 06 — Non-critical FAIL still = overall FAIL', async () => {
    const items = [
      { id: '1', result: 'pass', is_critical: false },
      { id: '2', result: 'fail', is_critical: false },
      { id: '3', result: 'pass', is_critical: false }
    ];
    const result = calculateAuditResult(items);
    assertEqual(result.result, 'fail', 'Overall result is FAIL');
    assertEqual(result.critical_triggered, false, 'Not triggered by critical');
  });

  // ── Test 7: N/A items count as completed ───────────────────────────────
  await testCase('Test 07 — N/A items count as completed', async () => {
    const items = [
      { id: '1', result: 'pass', finding_details: null, is_critical: false, item_name: 'A' },
      { id: '2', result: 'na', finding_details: null, is_critical: false, item_name: 'B' },
      { id: '3', result: 'pass', finding_details: null, is_critical: false, item_name: 'C' }
    ];
    const result = validateChecklist(items);
    assertEqual(result.valid, true, 'N/A counts as completed');
    assertEqual(result.pendingCount, 0, 'No pending items');
  });

  // ── Test 8: Full audit submission (PASS) ───────────────────────────────
  await testCase('Test 08 — Full audit submission → PASS', async () => {
    const audit = await prisma.quality_audits.create({
      data: {
        project_id: project.id,
        audit_number: 'AUD-PASS-' + Date.now(),
        stage_number: 6,
        auditor_id: reviewer.id,
        audit_items: {
          create: [
            { item_name: 'Cabinet alignment', is_critical: false, sort_order: 1 },
            { item_name: 'Surface finish', is_critical: true, sort_order: 2 },
            { item_name: 'Door hinges', is_critical: false, sort_order: 3 }
          ]
        }
      },
      include: { audit_items: true }
    });

    const items = audit.audit_items.map((item: any) => ({
      id: item.id,
      result: 'pass',
      finding_details: null
    }));

    const result = await submitAudit(audit.id, items);
    assertEqual(result.result, 'pass', 'Submission result is PASS');
    assertEqual(result.items_passed, 3, '3 items passed');
    assertEqual(result.items_failed, 0, '0 items failed');

    // Verify audit is immutable
    const immutable = await isAuditImmutable(audit.id);
    assertEqual(immutable, true, 'Audit is immutable after submission');
  });

  // ── Test 9: Full audit submission (FAIL via critical) ──────────────────
  await testCase('Test 09 — Critical FAIL submission → overall FAIL', async () => {
    const audit = await prisma.quality_audits.create({
      data: {
        project_id: project.id,
        audit_number: 'AUD-FAIL-' + Date.now(),
        stage_number: 6,
        auditor_id: reviewer.id,
        audit_items: {
          create: [
            { item_name: 'Cabinet alignment', is_critical: false, sort_order: 1 },
            { item_name: 'Surface damage', is_critical: true, sort_order: 2 },
            { item_name: 'Door hinges', is_critical: false, sort_order: 3 }
          ]
        }
      },
      include: { audit_items: true }
    });

    const items = audit.audit_items.map((item: any) => {
      if (item.item_name === 'Surface damage') {
        return { id: item.id, result: 'fail', finding_details: 'Deep scratch on main panel' };
      }
      return { id: item.id, result: 'pass', finding_details: null };
    });

    const result = await submitAudit(audit.id, items);
    assertEqual(result.result, 'fail', 'Submission result is FAIL');
    assertEqual(result.critical_item_failed, true, 'Critical item triggered failure');
    assertEqual(result.items_failed, 1, '1 item failed');
  });

  // ── Test 10: Incomplete submission blocked ─────────────────────────────
  await testCase('Test 10 — Incomplete submission blocked', async () => {
    const audit = await prisma.quality_audits.create({
      data: {
        project_id: project.id,
        audit_number: 'AUD-INC-' + Date.now(),
        stage_number: 6,
        auditor_id: reviewer.id,
        audit_items: {
          create: [
            { item_name: 'Item A', is_critical: false, sort_order: 1 },
            { item_name: 'Item B', is_critical: false, sort_order: 2 }
          ]
        }
      },
      include: { audit_items: true }
    });

    // Leave one item pending
    const items = [
      { id: audit.audit_items[0].id, result: 'pass', finding_details: null },
      { id: audit.audit_items[1].id, result: 'pending', finding_details: null }
    ];

    try {
      await submitAudit(audit.id, items);
      throw new Error('Should have thrown validation error');
    } catch (e: any) {
      assertTrue(e.message.includes('pending'), 'Error mentions pending items');
    }
  });

  // ── Test 11: Re-audit creates copy with reset items ────────────────────
  await testCase('Test 11 — Re-audit copies and resets items', async () => {
    const original = await prisma.quality_audits.create({
      data: {
        project_id: project.id,
        audit_number: 'AUD-ORIG-' + Date.now(),
        stage_number: 6,
        result: 'fail',
        auditor_id: reviewer.id,
        audit_items: {
          create: [
            { item_name: 'Alignment', is_critical: false, result: 'pass', sort_order: 1 },
            { item_name: 'Surface', is_critical: true, result: 'fail', finding_details: 'Scratch', sort_order: 2 }
          ]
        }
      },
      include: { audit_items: true }
    });

    const reAudit = await createReAudit(original.id, 'AUD-RE-' + Date.now());
    assertEqual(reAudit.result, 'pending', 'Re-audit starts as pending');
    assertEqual(reAudit.audit_items.length, 2, 'Re-audit has 2 items');
    assertEqual(reAudit.audit_items[0].result, 'pending', 'Item 1 reset to pending');
    assertEqual(reAudit.audit_items[1].result, 'pending', 'Item 2 reset to pending');
    assertEqual(reAudit.audit_items[1].finding_details, null, 'Finding details cleared');

    // Verify original is linked
    const updatedOriginal = await prisma.quality_audits.findUnique({
      where: { id: original.id }
    });
    assertEqual(updatedOriginal?.next_audit_id, reAudit.id, 'Original linked to re-audit');
  });

  // ── Test 12: Immutable audit cannot be modified ────────────────────────
  await testCase('Test 12 — Immutable audit blocks updates', async () => {
    const audit = await prisma.quality_audits.create({
      data: {
        project_id: project.id,
        audit_number: 'AUD-IMM-' + Date.now(),
        stage_number: 6,
        result: 'pass', // Already submitted
        auditor_id: reviewer.id,
        audit_items: {
          create: [
            { item_name: 'Check A', is_critical: false, result: 'pass', sort_order: 1 }
          ]
        }
      },
      include: { audit_items: true }
    });

    const immutable = await isAuditImmutable(audit.id);
    assertEqual(immutable, true, 'Completed audit is immutable');

    // Attempt to submit again should fail
    try {
      await submitAudit(audit.id, [{ id: audit.audit_items[0].id, result: 'fail', finding_details: 'Oops' }]);
      throw new Error('Should have thrown');
    } catch (e: any) {
      assertTrue(e.message.includes('immutable'), 'Error mentions immutability');
    }
  });

  // ── Test 13: Validation dry-run (no DB needed) ─────────────────────────
  await testCase('Test 13 — validateChecklist dry-run', async () => {
    const items = [
      { id: '1', result: 'pass', finding_details: null, is_critical: false, item_name: 'A' },
      { id: '2', result: 'fail', finding_details: '', is_critical: false, item_name: 'B' },
      { id: '3', result: 'pending', finding_details: null, is_critical: true, item_name: 'C' }
    ];
    const result = validateChecklist(items);
    assertEqual(result.valid, false, 'Validation fails');
    assertEqual(result.pendingCount, 1, '1 pending');
    assertEqual(result.failWithoutDetails, 1, '1 missing details');
    assertEqual(result.criticalFails, 0, 'Critical not yet failed (pending)');
  });

  // ── Cleanup ────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('Cleaning up test data...');
  await prisma.audit_items.deleteMany({
    where: { audit: { project_id: project.id } }
  });
  await prisma.quality_audits.deleteMany({ where: { project_id: project.id } });
  await prisma.projects.delete({ where: { id: project.id } });
  await prisma.customers.delete({ where: { id: customer.id } });
  await prisma.users.deleteMany({ where: { email: 'test-qa-reviewer@ees.sg' } });
  console.log('Cleanup complete.');

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Quality Audit Engine — Test Results');
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
