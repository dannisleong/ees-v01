import { prisma } from './api/src/lib/prisma';

async function verify() {
  console.log('═══ PRJ-2026-001 Pilot Data Verification ═══\n');

  const project = await prisma.projects.findUnique({
    where: { project_code: 'PRJ-2026-001' },
    include: {
      customer: true,
      project_stages: true,
      gate_results: { include: { gate: true } },
      bom_items: { include: { supplier: true } },
      customer_orders: { include: { customer_deposits: true } },
      landed_costs: true,
      risks: true,
      project_partners: { include: { partner: { include: { qualifications: { include: { qualification_type: true } } } } } },
    },
  });

  if (!project) {
    console.error('❌ PRJ-2026-001 NOT FOUND');
    process.exit(1);
  }

  console.log(`✅ Project: ${project.project_code} — ${project.name_en}`);
  console.log(`   Status: ${project.status} | Stage: ${project.current_stage} | Gate: ${project.current_gate}`);
  console.log(`   Customer: ${project.customer.name} (${project.customer.customer_code})`);
  console.log(`   Selling Price: $${project.selling_price?.toLocaleString()}`);
  console.log(`   Target Margin: ${project.target_margin_percent}%`);
  console.log();

  console.log(`✅ Project Stages: ${project.project_stages.length}`);
  for (const s of project.project_stages.sort((a, b) => a.stage_number - b.stage_number)) {
    console.log(`   Stage ${s.stage_number}: ${s.stage_name} — ${s.status}`);
  }
  console.log();

  console.log(`✅ Gate Results: ${project.gate_results.length}`);
  for (const g of project.gate_results.sort((a, b) => a.gate.gate_number - b.gate.gate_number)) {
    console.log(`   Gate ${g.gate.gate_number}: ${g.result.toUpperCase()}`);
  }
  console.log();

  console.log(`✅ BOM Items: ${project.bom_items.length}`);
  let totalBomCost = 0;
  for (const b of project.bom_items) {
    totalBomCost += b.total_cost || 0;
    const critical = b.is_critical ? '★ CRITICAL' : '';
    console.log(`   ${b.item_code}: ${b.product_name} | Qty: ${b.quantity} | Cost: $${b.total_cost?.toLocaleString()} | Supplier: ${b.supplier?.name} ${critical}`);
  }
  console.log(`   Total BOM Cost: $${totalBomCost.toLocaleString()}`);
  console.log();

  const order = project.customer_orders[0];
  if (order) {
    console.log(`✅ Customer Order: ${order.order_number}`);
    console.log(`   Amount: $${order.order_amount?.toLocaleString()}`);
    console.log(`   Deposit Required: $${order.deposit_required?.toLocaleString()}`);
    console.log(`   Payment Status: ${order.payment_status}`);
    console.log(`   Deposits Received: ${order.customer_deposits.length}`);
    for (const d of order.customer_deposits) {
      console.log(`   — $${d.deposit_amount.toLocaleString()} via ${d.payment_method} on ${d.received_date.toISOString().split('T')[0]}`);
    }
  }
  console.log();

  const lc = project.landed_costs.find(l => l.is_current);
  if (lc) {
    console.log(`✅ Landed Cost (Current):`);
    console.log(`   Factory Cost: $${lc.factory_cost?.toLocaleString()}`);
    console.log(`   Total Landed: $${lc.total_landed_cost?.toLocaleString()}`);
    console.log(`   Selling Price: $${lc.selling_price?.toLocaleString()}`);
    console.log(`   Gross Margin: $${lc.gross_margin?.toLocaleString()}`);
    console.log(`   Margin %: ${lc.margin_percent}%`);
  }
  console.log();

  console.log(`✅ Risks: ${project.risks.length}`);
  for (const r of project.risks) {
    console.log(`   ${r.risk_number}: ${r.description} [${r.risk_level.toUpperCase()}]`);
  }
  console.log();

  const pp = project.project_partners[0];
  if (pp) {
    console.log(`✅ Singapore Partner: ${pp.partner.name}`);
    console.log(`   Type: ${pp.partner.type}`);
    console.log(`   Contact: ${pp.partner.contact_person}`);
    console.log(`   Responsibility: ${pp.responsibility}`);
    for (const q of pp.partner.qualifications) {
      console.log(`   Qualification: ${q.qualification_type.name_en} — ${q.licence_number} (expires ${q.expiry_date.toISOString().split('T')[0]})`);
    }
  }
  console.log();

  // Check pilot_issues table exists
  const issueCount = await prisma.pilot_issues.count();
  console.log(`✅ Pilot Issues Log: ${issueCount} recorded`);
  console.log();

  console.log('═══ Verification Complete ═══');
  await prisma.$disconnect();
}

verify().catch(e => { console.error(e); process.exit(1); });
