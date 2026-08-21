import { prisma } from './api/src/lib/prisma';
import bcrypt from 'bcryptjs';

async function testAuth() {
  const founder = await prisma.users.findUnique({ where: { email: 'founder@ees.sg' } });
  if (!founder) {
    console.log('Founder not found');
    process.exit(1);
  }
  console.log('Founder exists:', founder.name_en, founder.email);

  // Test password
  const match = await bcrypt.compare('password123', founder.password_hash);
  console.log('Password match:', match);

  // Check project
  const project = await prisma.projects.findUnique({
    where: { project_code: 'PRJ-2026-001' },
    include: { customer: true, bom_items: true }
  });
  if (project) {
    console.log('Project found:', project.project_code, project.name_en);
    console.log('BOM items:', project.bom_items.length);
  }

  await prisma.$disconnect();
}

testAuth().catch(e => { console.error(e); process.exit(1); });
