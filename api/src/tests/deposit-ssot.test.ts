/**
 * Deposit SSOT Automated Tests
 *
 * Run: npx ts-node --esm api/src/tests/deposit-ssot.test.ts
 *
 * Tests:
 * 1. No deposit → pending_deposit
 * 2. Partial deposit → partial_deposit
 * 3. Full deposit (>= deposit_required) → deposit_received
 * 4. Complete payment (>= order_amount) → fully_paid
 * 5. Delete deposit → rolls back to pending_deposit
 * 6. Move deposit to another order → both orders recalculate
 * 7. Gate 02 reflects payment_status from SSOT
 */

import { prisma } from '../lib/prisma';


// Test color helpers
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function assertEqual(actual: any, expected: any, message: string) {
  if (actual === expected) {
    console.log(`  ${GREEN}✓${RESET} ${message}: ${actual}`);
  } else {
    console.error(`  ${RED}✗${RESET} ${message}`);
    console.error(`    Expected: ${expected}`);
    console.error(`    Actual:   ${actual}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function getOrderStatus(orderId: string): Promise<string> {
  const order = await prisma.customer_orders.findUnique({
    where: { id: orderId },
    select: { payment_status: true }
  });
  return order?.payment_status ?? 'unknown';
}

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Deposit SSOT Automated Tests');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── Setup: create test project and order ───────────────────────────────
  const customer = await prisma.customers.create({
    data: { name: 'Test Customer', customer_code: 'TEST-' + Date.now() }
  });

  const project = await prisma.projects.create({
    data: {
      project_code: 'PRJ-TEST-' + Date.now(),
      name_en: 'Test Project for Deposit SSOT',
      customer_id: customer.id,
      current_stage: 4,
      current_gate: 2,
      status: 'active'
    }
  });

  const order = await prisma.customer_orders.create({
    data: {
      project_id: project.id,
      order_number: 'ORD-' + Date.now(),
      order_date: new Date(),
      order_amount: 50000.00,
      deposit_required: 10000.00,
      payment_status: 'pending_deposit'
    }
  });

  // Create a second order for the "move deposit" test
  const order2 = await prisma.customer_orders.create({
    data: {
      project_id: project.id,
      order_number: 'ORD2-' + Date.now(),
      order_date: new Date(),
      order_amount: 30000.00,
      deposit_required: 5000.00,
      payment_status: 'pending_deposit'
    }
  });

  console.log(`Created test order 1: ${order.id} (amount: 50000, deposit_required: 10000)`);
  console.log(`Created test order 2: ${order2.id} (amount: 30000, deposit_required: 5000)\n`);

  let testPassed = 0;
  let testFailed = 0;

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

  // ── Test 1: No deposit → pending_deposit ───────────────────────────────
  await testCase('Test 01 — No deposit → pending_deposit', async () => {
    const status = await getOrderStatus(order.id);
    assertEqual(status, 'pending_deposit', 'Initial payment_status');
  });

  // ── Test 2: Partial deposit → partial_deposit ──────────────────────────
  await testCase('Test 02 — Partial deposit → partial_deposit', async () => {
    const deposit = await prisma.customer_deposits.create({
      data: {
        order_id: order.id,
        deposit_amount: 5000.00,
        received_date: new Date()
      }
    });

    const status = await getOrderStatus(order.id);
    assertEqual(status, 'partial_deposit', 'After partial deposit (5000/10000)');

    // Cleanup for next test
    await prisma.customer_deposits.delete({ where: { id: deposit.id } });
    const statusAfterDelete = await getOrderStatus(order.id);
    assertEqual(statusAfterDelete, 'pending_deposit', 'After deleting partial deposit');
  });

  // ── Test 3: Full deposit (>= deposit_required) → deposit_received ──────
  await testCase('Test 03 — Full deposit → deposit_received', async () => {
    const deposit = await prisma.customer_deposits.create({
      data: {
        order_id: order.id,
        deposit_amount: 10000.00,
        received_date: new Date()
      }
    });

    const status = await getOrderStatus(order.id);
    assertEqual(status, 'deposit_received', 'After full deposit (10000/10000)');

    // Cleanup
    await prisma.customer_deposits.delete({ where: { id: deposit.id } });
  });

  // ── Test 4: Complete payment (>= order_amount) → fully_paid ────────────
  await testCase('Test 04 — Complete payment → fully_paid', async () => {
    const deposit = await prisma.customer_deposits.create({
      data: {
        order_id: order.id,
        deposit_amount: 50000.00,
        received_date: new Date()
      }
    });

    const status = await getOrderStatus(order.id);
    assertEqual(status, 'fully_paid', 'After full payment (50000/50000)');

    // Cleanup
    await prisma.customer_deposits.delete({ where: { id: deposit.id } });
  });

  // ── Test 5: Delete deposit → status rolls back ─────────────────────────
  await testCase('Test 05 — Deposit deletion rolls back status', async () => {
    // Start at pending_deposit
    let status = await getOrderStatus(order.id);
    assertEqual(status, 'pending_deposit', 'Before deposit');

    // Add deposit → deposit_received
    const deposit = await prisma.customer_deposits.create({
      data: {
        order_id: order.id,
        deposit_amount: 15000.00,
        received_date: new Date()
      }
    });
    status = await getOrderStatus(order.id);
    assertEqual(status, 'deposit_received', 'After deposit (15000/10000)');

    // Delete deposit → rolls back to pending_deposit
    await prisma.customer_deposits.delete({ where: { id: deposit.id } });
    status = await getOrderStatus(order.id);
    assertEqual(status, 'pending_deposit', 'After deleting deposit (rolls back)');
  });

  // ── Test 6: Move deposit between orders → both recalculate ─────────────
  await testCase('Test 06 — Move deposit recalculates both orders', async () => {
    // Create deposit on order1
    const deposit = await prisma.customer_deposits.create({
      data: {
        order_id: order.id,
        deposit_amount: 20000.00,
        received_date: new Date()
      }
    });

    let status1 = await getOrderStatus(order.id);
    let status2 = await getOrderStatus(order2.id);
    assertEqual(status1, 'deposit_received', 'Order 1 after deposit');
    assertEqual(status2, 'pending_deposit', 'Order 2 before deposit');

    // Move deposit to order2 (UPDATE order_id)
    await prisma.customer_deposits.update({
      where: { id: deposit.id },
      data: { order_id: order2.id }
    });

    status1 = await getOrderStatus(order.id);
    status2 = await getOrderStatus(order2.id);
    assertEqual(status1, 'pending_deposit', 'Order 1 after move (old order recalculated)');
    assertEqual(status2, 'deposit_received', 'Order 2 after move (new order recalculated)');

    // Cleanup
    await prisma.customer_deposits.delete({ where: { id: deposit.id } });
  });

  // ── Test 7: Gate 02 reflects payment_status from SSOT ──────────────────
  await testCase('Test 07 — Gate 02 reflects SSOT payment_status', async () => {
    // Create a deposit
    const deposit = await prisma.customer_deposits.create({
      data: {
        order_id: order.id,
        deposit_amount: 10000.00,
        received_date: new Date()
      }
    });

    // Verify payment_status
    const status = await getOrderStatus(order.id);
    assertEqual(status, 'deposit_received', 'SSOT payment_status is deposit_received');

    // Simulate Gate 02 check: query payment_status directly from customer_orders
    const gateCheck = await prisma.customer_orders.findUnique({
      where: { id: order.id },
      select: { payment_status: true }
    });
    assertEqual(gateCheck?.payment_status, 'deposit_received', 'Gate 02 reads payment_status from SSOT');

    // Simulate Gate 02 NO-GO after deletion
    await prisma.customer_deposits.delete({ where: { id: deposit.id } });
    const statusAfter = await getOrderStatus(order.id);
    assertEqual(statusAfter, 'pending_deposit', 'After deletion, Gate 02 would see pending_deposit');
  });

  // ── Test 8: Multiple deposits accumulate correctly ──────────────────────
  await testCase('Test 08 — Multiple deposits accumulate', async () => {
    const d1 = await prisma.customer_deposits.create({
      data: { order_id: order.id, deposit_amount: 3000.00, received_date: new Date() }
    });
    let status = await getOrderStatus(order.id);
    assertEqual(status, 'partial_deposit', 'After first deposit (3000)');

    const d2 = await prisma.customer_deposits.create({
      data: { order_id: order.id, deposit_amount: 3000.00, received_date: new Date() }
    });
    status = await getOrderStatus(order.id);
    assertEqual(status, 'partial_deposit', 'After second deposit (6000)');

    const d3 = await prisma.customer_deposits.create({
      data: { order_id: order.id, deposit_amount: 4000.00, received_date: new Date() }
    });
    status = await getOrderStatus(order.id);
    assertEqual(status, 'deposit_received', 'After third deposit (10000 total)');

    // Cleanup
    await prisma.customer_deposits.deleteMany({ where: { order_id: order.id } });
  });

  // ── Cleanup ────────────────────────────────────────────────────────────
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('Cleaning up test data...');
  await prisma.customer_deposits.deleteMany({ where: { order_id: { in: [order.id, order2.id] } } });
  await prisma.customer_orders.deleteMany({ where: { id: { in: [order.id, order2.id] } } });
  await prisma.projects.delete({ where: { id: project.id } });
  await prisma.customers.delete({ where: { id: customer.id } });
  console.log('Cleanup complete.');

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Test Results');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Passed: ${GREEN}${testPassed}${RESET}`);
  console.log(`Failed: ${testFailed > 0 ? RED : ''}${testFailed}${RESET}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();

  if (testFailed > 0) {
    process.exit(1);
  }
}

runTests().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
