import { prisma } from './api/src/lib/prisma';

async function cleanup() {
  const project = await prisma.projects.findUnique({ where: { project_code: 'PRJ-2026-001' } });
  if (!project) { console.error('Project not found'); process.exit(1); }

  // Find all stages for this project
  const stages = await prisma.project_stages.findMany({
    where: { project_id: project.id },
    orderBy: { stage_number: 'asc' },
  });

  console.log(`Found ${stages.length} stage records for PRJ-2026-001`);

  // Group by stage_number and keep only the first of each
  const seen = new Set<number>();
  const toDelete: string[] = [];

  for (const stage of stages) {
    if (seen.has(stage.stage_number)) {
      toDelete.push(stage.id);
    } else {
      seen.add(stage.stage_number);
    }
  }

  if (toDelete.length === 0) {
    console.log('✅ No duplicates found. Data is clean.');
  } else {
    console.log(`Deleting ${toDelete.length} duplicate stage records...`);
    const result = await prisma.project_stages.deleteMany({
      where: { id: { in: toDelete } },
    });
    console.log(`✅ Deleted ${result.count} duplicate stage records.`);
  }

  // Verify
  const after = await prisma.project_stages.findMany({
    where: { project_id: project.id },
    orderBy: { stage_number: 'asc' },
  });
  console.log(`\nAfter cleanup: ${after.length} stage records`);
  for (const s of after) {
    console.log(`  Stage ${s.stage_number}: ${s.stage_name} — ${s.status}`);
  }

  await prisma.$disconnect();
}

cleanup().catch(e => { console.error(e); process.exit(1); });
