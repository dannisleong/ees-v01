import { prisma } from './api/src/lib/prisma';

async function check() {
  const issues = await prisma.pilot_issues.findMany({
    include: { project: true },
    orderBy: { created_at: 'asc' },
  });

  console.log(`═══ Pilot Issues Log: ${issues.length} recorded ═══\n`);
  for (const i of issues) {
    console.log(`📋 ${i.title}`);
    console.log(`   Category: ${i.category} | Priority: ${i.priority} | Status: ${i.status}`);
    console.log(`   Owner ID: ${i.owner_id || 'Unassigned'}`);
    console.log(`   Action: ${i.action}`);
    console.log(`   Root Cause: ${i.resolution}`);
    console.log();
  }
  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
