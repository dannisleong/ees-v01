/**
 * Pilot Seed Script — PRJ-2026-001 Dongmei Home
 * Run with: npx tsx api/src/seed-pilot.ts
 */

import { prisma } from './lib/prisma';

async function main() {
  const founder = await prisma.users.findUnique({ where: { email: 'founder@ees.sg' } });
  const dongmei = await prisma.users.findUnique({ where: { email: 'dongmei@ees.sg' } });
  const cammy = await prisma.users.findUnique({ where: { email: 'cammy@ees.sg' } });
  const pm = await prisma.users.findUnique({ where: { email: 'pm@ees.sg' } });

  if (!founder || !dongmei || !cammy || !pm) {
    console.error('❌ Required users not found. Run seed.ts first.');
    process.exit(1);
  }

  const customer = await prisma.customers.upsert({
    where: { customer_code: 'CUST-2026-001' },
    update: {},
    create: { customer_code: 'CUST-2026-001', name: 'Dongmei Home', contact_person: 'Dongmei Chen', email: 'dongmei@example.com', phone: '+65 9123 4567', address: '123 Serangoon Gardens, Singapore 554123' },
  });
  console.log('✅ Customer:', customer.name);

  const project = await prisma.projects.upsert({
    where: { project_code: 'PRJ-2026-001' },
    update: {},
    create: {
      project_code: 'PRJ-2026-001', name_en: 'Dongmei Home — Full Renovation', name_zh: '冬梅之家 — 全屋翻新',
      customer_id: customer.id, current_stage: 5, current_gate: 3, status: 'active',
      cammy_id: cammy.id, dongmei_id: dongmei.id, pm_id: pm.id,
      target_margin_percent: 25.0, selling_price: 185000.00, started_at: new Date('2026-02-15'),
    },
  });
  console.log('✅ Project:', project.project_code);

  const stages = [
    { stage_number: 1, stage_name: 'Inquiry', status: 'completed' },
    { stage_number: 2, stage_name: 'Proposal', status: 'completed' },
    { stage_number: 3, stage_name: 'Measurement', status: 'completed' },
    { stage_number: 4, stage_name: 'Commercial', status: 'completed' },
    { stage_number: 5, stage_name: 'Procurement', status: 'in_progress' },
    { stage_number: 6, stage_name: 'Production/QC', status: 'pending' },
    { stage_number: 7, stage_name: 'Shipping', status: 'pending' },
    { stage_number: 8, stage_name: 'Installation', status: 'pending' },
    { stage_number: 9, stage_name: 'Handover', status: 'pending' },
  ];
  for (const s of stages) {
    await prisma.project_stages.create({ data: { project_id: project.id, ...s } }).catch(() => {});
  }
  console.log('✅ Project stages seeded');

  const gates = await prisma.gates.findMany();
  for (const g of gates) {
    const result = g.gate_number <= 2 ? 'go' : 'pending';
    await prisma.gate_results.create({
      data: { project_id: project.id, gate_id: g.id, result, evaluated_by: founder.id, evaluated_at: new Date() },
    }).catch(() => {});
  }
  console.log('✅ Gate results seeded');

  const supplierData = [
    { supplier_code: 'SUP-WOOD-01', name: 'Guangzhou Fine Woodworks Ltd', category: 'woodwork', contact_person: 'Mr. Zhang', email: 'zhang@gzwood.com', phone: '+86 138 0000 1111' },
    { supplier_code: 'SUP-TILE-01', name: 'Foshan Premium Ceramics', category: 'tiles', contact_person: 'Ms. Li', email: 'li@foshantile.com', phone: '+86 139 0000 2222' },
    { supplier_code: 'SUP-HARD-01', name: 'Shenzhen Hardware Solutions', category: 'hardware', contact_person: 'Mr. Wang', email: 'wang@szhardware.com', phone: '+86 137 0000 3333' },
    { supplier_code: 'SUP-GLAS-01', name: 'Dongguan Glass & Mirror Co', category: 'glass', contact_person: 'Ms. Chen', email: 'chen@dgglass.com', phone: '+86 136 0000 4444' },
    { supplier_code: 'SUP-FABR-01', name: 'Hangzhou Fabric & Upholstery', category: 'fabric', contact_person: 'Mr. Liu', email: 'liu@hzfabric.com', phone: '+86 135 0000 5555' },
  ];
  const createdSuppliers: Record<string, string> = {};
  for (const s of supplierData) {
    const sup = await prisma.suppliers.upsert({ where: { supplier_code: s.supplier_code }, update: {}, create: s });
    createdSuppliers[s.supplier_code] = sup.id;
  }
  console.log('✅ Suppliers seeded');

  const bomData = [
    { item_code: 'BOM-001', product_name: 'Solid Oak Kitchen Cabinet', specification: '2100x600x900mm, Solid oak, Blum hinges', quantity: 12, unit: 'pcs', supplier_code: 'SUP-WOOD-01', unit_cost: 850.00, lead_time_days: 28, is_critical: true, planned_eta: '2026-05-15' },
    { item_code: 'BOM-002', product_name: 'Quartz Kitchen Countertop', specification: '3000x600x30mm, Calacatta white', quantity: 3, unit: 'slabs', supplier_code: 'SUP-TILE-01', unit_cost: 1200.00, lead_time_days: 21, is_critical: true, planned_eta: '2026-05-10' },
    { item_code: 'BOM-003', product_name: 'Brushed Nickel Faucet Set', specification: 'Pull-out spray, ceramic disc valve', quantity: 4, unit: 'sets', supplier_code: 'SUP-HARD-01', unit_cost: 180.00, lead_time_days: 14, is_critical: false, planned_eta: '2026-04-20' },
    { item_code: 'BOM-004', product_name: 'Frameless Shower Enclosure', specification: '1200x900x2000mm, 10mm tempered glass', quantity: 2, unit: 'sets', supplier_code: 'SUP-GLAS-01', unit_cost: 650.00, lead_time_days: 18, is_critical: true, planned_eta: '2026-05-20' },
    { item_code: 'BOM-005', product_name: 'Velvet Upholstery Sofa', specification: '3-seater, Emerald green velvet, solid timber frame', quantity: 1, unit: 'pcs', supplier_code: 'SUP-FABR-01', unit_cost: 2200.00, lead_time_days: 35, is_critical: false, planned_eta: '2026-06-01' },
    { item_code: 'BOM-006', product_name: 'Engineered Oak Flooring', specification: '190x15x1820mm, ABC grade, UV lacquer', quantity: 85, unit: 'sqm', supplier_code: 'SUP-WOOD-01', unit_cost: 65.00, lead_time_days: 21, is_critical: true, planned_eta: '2026-05-12' },
    { item_code: 'BOM-007', product_name: 'LED Mirror Cabinet', specification: '800x600mm, Anti-fog, touch sensor', quantity: 3, unit: 'pcs', supplier_code: 'SUP-HARD-01', unit_cost: 320.00, lead_time_days: 14, is_critical: false, planned_eta: '2026-04-25' },
    { item_code: 'BOM-008', product_name: 'Marble Bathroom Vanity Top', specification: '1200x500x20mm, Carrara white', quantity: 3, unit: 'pcs', supplier_code: 'SUP-TILE-01', unit_cost: 480.00, lead_time_days: 21, is_critical: false, planned_eta: '2026-05-08' },
  ];

  for (const b of bomData) {
    await prisma.bom_items.create({
      data: {
        project_id: project.id, item_code: b.item_code, product_name: b.product_name, specification: b.specification,
        quantity: b.quantity, unit: b.unit, supplier_id: createdSuppliers[b.supplier_code], unit_cost: b.unit_cost,
        total_cost: b.unit_cost * b.quantity, lead_time_days: b.lead_time_days, is_critical: b.is_critical,
        planned_eta: new Date(b.planned_eta), status: 'pending', qc_status: 'pending', approval_status: 'draft',
      },
    }).catch(() => {});
  }
  console.log('✅ BOM items seeded');

  const order = await prisma.customer_orders.upsert({
    where: { order_number: 'ORD-2026-001' },
    update: {},
    create: {
      project_id: project.id, order_number: 'ORD-2026-001', order_date: new Date('2026-02-20'),
      order_amount: 185000.00, deposit_required: 55500.00, payment_status: 'deposit_received',
      customer_approved: true, customer_approval_date: new Date('2026-02-18'),
      confirmed_by: founder.id, confirmed_at: new Date('2026-02-20'),
    },
  });
  await prisma.customer_deposits.create({
    data: { order_id: order.id, deposit_amount: 55500.00, received_date: new Date('2026-02-20'), payment_method: 'Bank Transfer', reference_number: 'TT-20260220-001', received_by: cammy.id },
  }).catch(() => {});
  console.log('✅ Customer order & deposit seeded');

  const partner = await prisma.partners.upsert({
    where: { partner_code: 'SG-INSTALL-01' },
    update: {},
    create: { partner_code: 'SG-INSTALL-01', name: 'SG Interior Installations Pte Ltd', type: 'installer', contact_person: 'Rajesh Kumar', phone: '+65 9876 5432', email: 'rajesh@sginstall.sg', is_active: true },
  });
  await prisma.project_partners.create({
    data: { project_id: project.id, partner_id: partner.id, assigned_stage: 8, assigned_date: new Date('2026-02-25'), status: 'active', responsibility: 'Full interior installation including cabinetry, flooring, and fixtures' },
  }).catch(() => {});
  console.log('✅ Singapore partner seeded');

  const qfType = await prisma.qualification_types.upsert({
    where: { type_code: 'licence_hdb' },
    update: {},
    create: { type_code: 'licence_hdb', name_zh: 'HDB牌照', name_en: 'HDB Renovation Licence', applicable_partner_types: ['installer'], is_required: true },
  });
  await prisma.qualifications.create({
    data: { partner_id: partner.id, qualification_type_id: qfType.id, licence_number: 'HB-06-12345A', issuing_authority: 'HDB Singapore', issue_date: new Date('2024-01-15'), expiry_date: new Date('2027-01-14'), status: 'valid' },
  }).catch(() => {});
  console.log('✅ Partner qualifications seeded');

  await prisma.landed_costs.create({
    data: {
      project_id: project.id, version: 1, factory_cost: 85000.00, china_inland_transport: 2500.00, qc_cost: 1500.00,
      packing_cost: 1800.00, consolidation_cost: 1200.00, international_freight: 6500.00, insurance: 850.00, import_customs: 3200.00,
      taxes: 0.00, singapore_delivery: 800.00, installation_cost: 12000.00, warranty_provision: 1850.00, project_management_cost: 5500.00,
      company_overhead: 4300.00, total_landed_cost: 126000.00, selling_price: 185000.00, gross_margin: 59000.00, margin_percent: 31.89,
      is_current: true, created_by: dongmei.id,
    },
  }).catch(() => {});
  console.log('✅ Landed cost seeded');

  await prisma.risks.create({
    data: {
      project_id: project.id, risk_number: 'RSK-2026-001', category: 'supplier',
      description: 'Oak kitchen cabinet supplier may delay due to CNY holiday backlog',
      probability: 4, impact: 4, risk_level: 'high', owner_id: dongmei.id,
      mitigation_plan: 'Order placed early with buffer. Weekly follow-up calls scheduled.', status: 'open', created_by: dongmei.id,
    },
  }).catch(() => {});
  console.log('✅ Risks seeded');

  console.log('\n🎉 PRJ-2026-001 Pilot seed complete!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
