import { prisma } from './lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const roles = [
    { name: 'founder', name_zh: '创始人/管理层', name_en: 'Founder / Management', level: 100 },
    { name: 'cammy', name_zh: '设计与客户负责人', name_en: 'Design & Customer Lead', level: 80 },
    { name: 'dongmei', name_zh: '中国供应链负责人', name_en: 'China Supply Chain Director', level: 80 },
    { name: 'quality_reviewer', name_zh: '质量审核员', name_en: 'Quality Reviewer', level: 70 },
    { name: 'project_manager', name_zh: '项目经理', name_en: 'Project Manager', level: 60 },
    { name: 'supplier', name_zh: '供应商', name_en: 'Supplier', level: 40 },
    { name: 'partner', name_zh: '专业合作伙伴', name_en: 'Partner', level: 40 },
    { name: 'installer', name_zh: '安装人员', name_en: 'Installer', level: 30 },
  ];

  for (const r of roles) {
    await prisma.roles.upsert({ where: { name: r.name }, update: {}, create: r });
  }

  const founderRole = await prisma.roles.findUnique({ where: { name: 'founder' } });
  const cammyRole = await prisma.roles.findUnique({ where: { name: 'cammy' } });
  const dongmeiRole = await prisma.roles.findUnique({ where: { name: 'dongmei' } });
  const reviewerRole = await prisma.roles.findUnique({ where: { name: 'quality_reviewer' } });
  const pmRole = await prisma.roles.findUnique({ where: { name: 'project_manager' } });

  const hash = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'founder@ees.sg', password_hash: hash, name_en: 'Founder', name_zh: '创始人', role_id: founderRole!.id },
    { email: 'cammy@ees.sg', password_hash: hash, name_en: 'Cammy', name_zh: 'Cammy', role_id: cammyRole!.id },
    { email: 'dongmei@ees.sg', password_hash: hash, name_en: 'Dongmei', name_zh: '冬梅', role_id: dongmeiRole!.id },
    { email: 'reviewer@ees.sg', password_hash: hash, name_en: 'Reviewer', name_zh: '审核员', role_id: reviewerRole!.id },
    { email: 'pm@ees.sg', password_hash: hash, name_en: 'Project Manager', name_zh: '项目经理', role_id: pmRole!.id },
  ];

  for (const u of users) {
    await prisma.users.upsert({ where: { email: u.email }, update: {}, create: u });
  }

  const gateData = [
    { gate_number: 1, name_en: 'Proposal GO / NO-GO', name_zh: '方案关卡', trigger_stage: 2 },
    { gate_number: 2, name_en: 'Commercial GO / NO-GO', name_zh: '商务关卡', trigger_stage: 4 },
    { gate_number: 3, name_en: 'Procurement GO / NO-GO', name_zh: '采购关卡', trigger_stage: 5 },
    { gate_number: 4, name_en: 'Production / QC GO / NO-GO', name_zh: '生产质检关卡', trigger_stage: 6 },
    { gate_number: 5, name_en: 'Installation GO / NO-GO', name_zh: '安装关卡', trigger_stage: 8 },
    { gate_number: 6, name_en: 'Handover GO / NO-GO', name_zh: '移交关卡', trigger_stage: 9 },
  ];
  for (const g of gateData) {
    await prisma.gates.upsert({ where: { gate_number: g.gate_number }, update: {}, create: g });
  }

  console.log('Seed completed');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
