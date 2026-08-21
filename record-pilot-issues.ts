import { prisma } from './api/src/lib/prisma';

async function recordIssues() {
  const founder = await prisma.users.findUnique({ where: { email: 'founder@ees.sg' } });
  if (!founder) { console.error('Founder not found'); process.exit(1); }

  const project = await prisma.projects.findUnique({ where: { project_code: 'PRJ-2026-001' } });
  if (!project) { console.error('Project not found'); process.exit(1); }

  const existing = await prisma.pilot_issues.findMany({ where: { project_id: project.id } });
  const existingTitles = new Set(existing.map(i => i.title));

  const issues = [
    {
      project_id: project.id,
      title: 'PILOT-001: Duplicate project stages created by re-running seed script',
      description: 'The seed-pilot.ts script was executed more than once, resulting in 18 project_stage records instead of the expected 9. Each stage appears twice. The .catch(() => {}) suppressed errors but did not prevent insertion because there is no unique constraint on (project_id, stage_number). This affects stage progression tracking and could confuse the operational workflow.',
      category: 'software_defect',
      priority: 'high',
      status: 'open',
      owner_id: founder.id,
      action: 'Add a unique constraint on project_stages(project_id, stage_number) and clean up duplicate rows. Update seed script to use upsert instead of create with catch.',
      resolution: 'Root cause: Missing database-level unique constraint on project_id + stage_number combination. Seed script used create() with error suppression instead of upsert().',
    },
    {
      project_id: project.id,
      title: 'PILOT-002: Seed script lacks idempotency for BOM items and project partners',
      description: 'Similar to PILOT-001, the seed script uses .create().catch(() => {}) for BOM items, project_partners, and other entities. Re-running the seed will create duplicates or silent failures. This makes it unsafe to re-seed during pilot recovery.',
      category: 'software_defect',
      priority: 'medium',
      status: 'open',
      owner_id: founder.id,
      action: 'Refactor seed-pilot.ts to use upsert() for all entities with deterministic where clauses (e.g., item_code for BOM, partner_code for partners).',
      resolution: 'Root cause: Seed script was written for one-time execution without idempotency design.',
    },
    {
      project_id: project.id,
      title: 'PILOT-003: Project current_stage = 5 but Gate 3 is still PENDING — stage/gate misalignment',
      description: 'PRJ-2026-001 has current_stage = 5 (Procurement) and current_gate = 3. However, Gate 3 result is PENDING. Per the gate logic, the project should not advance to stage 5 until Gate 3 evaluates GO. Either the seed data is inconsistent, or the stage advancement logic is not being enforced during seeding.',
      category: 'business_rule',
      priority: 'high',
      status: 'open',
      owner_id: founder.id,
      action: 'Clarify whether seed data should reflect a realistic mid-project state (stage 5 with gate 3 pending = realistic for ongoing procurement) or enforce strict gate progression. If strict: seed should set current_stage = 3 until Gate 3 passes. If realistic: document that current_stage reflects operational reality, not gate result.',
      resolution: 'Root cause: Seed data modeled a mid-project state without explicit documentation of the stage/gate decoupling rationale.',
    },
  ];

  for (const issue of issues) {
    if (existingTitles.has(issue.title)) {
      console.log(`⏭️ Skipped (already exists): ${issue.title}`);
      continue;
    }
    await prisma.pilot_issues.create({ data: issue });
    console.log(`✅ Recorded: ${issue.title}`);
  }

  console.log('\n🎉 Pilot issues recorded.');
  await prisma.$disconnect();
}

recordIssues().catch(e => { console.error(e); process.exit(1); });
