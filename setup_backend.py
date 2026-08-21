import os

BASE = r"C:\Users\danni\Documents\kimi\workspace\ees-v01-alpha"

def write(path, content):
    full = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Written: {path}")

# ─────────────────────────────────────────────────────────────────────────────
# Backend: Express + Prisma
# ─────────────────────────────────────────────────────────────────────────────

write("api/src/index.ts", '''import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import gateRoutes from './routes/gates';
import auditRoutes from './routes/audits';
import partnerRoutes from './routes/partners';
import documentRoutes from './routes/documents';
import dashboardRoutes from './routes/dashboard';

dotenv.config({ path: '.env.local' });

const app = express();
export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/gates', gateRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`EES API server running on port ${PORT}`);
});
''')

write("api/src/utils/jwt.ts", '''import jwt from 'jsonwebtoken';
const SECRET = process.env.JWT_SECRET || 'ees-dev-secret';

export const signToken = (payload: object) => jwt.sign(payload, SECRET, { expiresIn: '7d' });
export const verifyToken = (token: string) => jwt.verify(token, SECRET) as any;
''')

write("api/src/middleware/auth.ts", '''import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../index';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: { role: true }
    });
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role.name)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
};
''')

write("api/src/routes/auth.ts", '''import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { signToken } from '../utils/jwt';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.users.findUnique({
    where: { email },
    include: { role: true }
  });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ userId: user.id, role: user.role.name });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name_zh: user.name_zh,
      name_en: user.name_en,
      role: user.role.name,
      preferred_language: 'en'
    }
  });
});

router.post('/seed', async (req, res) => {
  // Seed initial roles and a test user
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
    await prisma.roles.upsert({
      where: { name: r.name },
      update: {},
      create: r
    });
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
    await prisma.users.upsert({
      where: { email: u.email },
      update: {},
      create: u
    });
  }

  // Seed gates
  const gateData = [
    { gate_number: 1, name_en: 'Proposal GO / NO-GO', name_zh: '方案关卡', trigger_stage: 2 },
    { gate_number: 2, name_en: 'Commercial GO / NO-GO', name_zh: '商务关卡', trigger_stage: 4 },
    { gate_number: 3, name_en: 'Procurement GO / NO-GO', name_zh: '采购关卡', trigger_stage: 5 },
    { gate_number: 4, name_en: 'Production / QC GO / NO-GO', name_zh: '生产质检关卡', trigger_stage: 6 },
    { gate_number: 5, name_en: 'Installation GO / NO-GO', name_zh: '安装关卡', trigger_stage: 8 },
    { gate_number: 6, name_en: 'Handover GO / NO-GO', name_zh: '移交关卡', trigger_stage: 9 },
  ];
  for (const g of gateData) {
    await prisma.gates.upsert({
      where: { gate_number: g.gate_number },
      update: {},
      create: g
    });
  }

  res.json({ message: 'Seed completed' });
});

export default router;
''')

write("api/src/routes/projects.ts", '''import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  const projects = await prisma.projects.findMany({
    include: {
      customer: true,
      cammy: { select: { name_en: true, name_zh: true } },
      dongmei: { select: { name_en: true, name_zh: true } },
      pm: { select: { name_en: true, name_zh: true } },
      _count: { select: { issues: true, risks: true } }
    },
    orderBy: { created_at: 'desc' }
  });
  res.json(projects);
});

router.get('/:id', async (req: AuthRequest, res) => {
  const project = await prisma.projects.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      cammy: { select: { name_en: true, name_zh: true } },
      dongmei: { select: { name_en: true, name_zh: true } },
      pm: { select: { name_en: true, name_zh: true } },
      project_stages: true,
      gate_results: { include: { gate: true } },
      issues: true,
      bom_items: { include: { supplier: true } },
      risks: true,
      customer_orders: { include: { customer_deposits: true } },
      quality_audits: { include: { audit_items: true } },
      project_partners: { include: { partner: { include: { qualifications: { include: { qualification_type: true } } } } } },
      landed_costs: { where: { is_current: true } },
      documents: true,
      lessons_learned: true,
    }
  });
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

router.post('/', requireRole('founder', 'cammy', 'project_manager'), async (req: AuthRequest, res) => {
  const { project_code, name_en, name_zh, customer_id, target_margin_percent, cammy_id, dongmei_id, pm_id } = req.body;
  const project = await prisma.projects.create({
    data: {
      project_code,
      name_en,
      name_zh,
      customer_id,
      target_margin_percent: target_margin_percent ? parseFloat(target_margin_percent) : null,
      cammy_id,
      dongmei_id,
      pm_id,
      created_by: req.user.id
    }
  });
  res.json(project);
});

router.put('/:id', requireRole('founder', 'cammy', 'project_manager'), async (req: AuthRequest, res) => {
  const project = await prisma.projects.update({
    where: { id: req.params.id },
    data: { ...req.body, updated_by: req.user.id }
  });
  res.json(project);
});

export default router;
''')

write("api/src/routes/gates.ts", '''import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/project/:projectId', async (req: AuthRequest, res) => {
  const results = await prisma.gate_results.findMany({
    where: { project_id: req.params.projectId },
    include: { gate: true, gate_overrides: true }
  });
  res.json(results);
});

router.post('/evaluate', requireRole('founder', 'cammy', 'dongmei', 'project_manager', 'quality_reviewer'), async (req: AuthRequest, res) => {
  const { project_id, gate_id, result, reason } = req.body;

  const gateResult = await prisma.gate_results.create({
    data: {
      project_id,
      gate_id,
      result,
      reason,
      evaluated_by: req.user.id,
      evaluated_at: new Date()
    }
  });

  if (result === 'NO-GO') {
    await prisma.issues.create({
      data: {
        project_id,
        issue_number: `ISS-${Date.now()}`,
        title: `Gate ${gate_id} NO-GO`,
        description: reason || 'Gate condition not met',
        category: 'gate_failure',
        severity: 'high',
        created_by: req.user.id
      }
    });
  }

  res.json(gateResult);
});

router.post('/override', requireRole('founder'), async (req: AuthRequest, res) => {
  const { gate_result_id, project_id, original_result, new_result, reason, risk_acceptance, approver_name } = req.body;

  const override = await prisma.gate_overrides.create({
    data: {
      gate_result_id,
      project_id,
      overridden_by: req.user.id,
      original_result,
      new_result,
      reason,
      risk_acceptance,
      approver_name
    }
  });

  await prisma.audit_logs.create({
    data: {
      user_id: req.user.id,
      action: 'exceptional_override',
      resource_type: 'gate',
      resource_id: gate_result_id,
      before_value: { result: original_result },
      after_value: { result: new_result },
      reason
    }
  });

  res.json(override);
});

export default router;
''')

write("api/src/routes/audits.ts", '''import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/project/:projectId', async (req: AuthRequest, res) => {
  const audits = await prisma.quality_audits.findMany({
    where: { project_id: req.params.projectId },
    include: { audit_items: true }
  });
  res.json(audits);
});

router.post('/', requireRole('founder', 'project_manager', 'quality_reviewer'), async (req: AuthRequest, res) => {
  const { project_id, audit_number, stage_number, audit_items: items } = req.body;
  const audit = await prisma.quality_audits.create({
    data: {
      project_id,
      audit_number,
      stage_number,
      auditor_id: req.user.id,
      audit_items: {
        create: items.map((item: any, idx: number) => ({
          item_name: item.item_name,
          category: item.category,
          expected_standard: item.expected_standard,
          is_critical: item.is_critical || false,
          sort_order: idx
        }))
      }
    },
    include: { audit_items: true }
  });
  res.json(audit);
});

router.post('/:id/submit', requireRole('founder', 'quality_reviewer'), async (req: AuthRequest, res) => {
  const { items } = req.body;
  const auditId = req.params.id;

  // Strict checklist validation
  const pendingItems = items.filter((i: any) => i.result === 'pending' || !i.result);
  if (pendingItems.length > 0) {
    return res.status(400).json({
      error: 'Audit incomplete',
      message: `${pendingItems.length} items are still pending`,
      pendingItems: pendingItems.map((i: any) => i.item_name)
    });
  }

  const failWithoutDetails = items.filter((i: any) => i.result === 'fail' && !i.finding_details);
  if (failWithoutDetails.length > 0) {
    return res.status(400).json({
      error: 'Missing finding details',
      message: 'FAIL items must have finding_details',
      items: failWithoutDetails.map((i: any) => i.item_name)
    });
  }

  // Update all items
  for (const item of items) {
    await prisma.audit_items.update({
      where: { id: item.id },
      data: {
        result: item.result,
        finding_details: item.finding_details,
        photo_evidence: item.photo_evidence
      }
    });
  }

  // Determine overall result
  const hasCriticalFail = items.some((i: any) => i.is_critical && i.result === 'fail');
  const hasAnyFail = items.some((i: any) => i.result === 'fail');
  const overallResult = hasCriticalFail ? 'fail' : hasAnyFail ? 'fail' : 'pass';

  const audit = await prisma.quality_audits.update({
    where: { id: auditId },
    data: {
      result: overallResult,
      audit_date: new Date()
    },
    include: { audit_items: true }
  });

  res.json(audit);
});

export default router;
''')

write("api/src/routes/partners.ts", '''import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  const partners = await prisma.partners.findMany({
    include: { qualifications: { include: { qualification_type: true } } }
  });
  res.json(partners);
});

router.post('/qualification', async (req: AuthRequest, res) => {
  const { partner_id, qualification_type_id, licence_number, issuing_authority, issue_date, expiry_date } = req.body;

  const partner = await prisma.partners.findUnique({ where: { id: partner_id } });
  const qType = await prisma.qualification_types.findUnique({ where: { id: qualification_type_id } });

  if (!partner || !qType) {
    return res.status(400).json({ error: 'Partner or qualification type not found' });
  }

  const applicable = qType.applicable_partner_types as string[];
  if (!applicable.includes(partner.type)) {
    return res.status(400).json({
      error: 'Qualification type mismatch',
      message: `Partner type '${partner.type}' does not match qualification requirements`,
      required: applicable
    });
  }

  const qual = await prisma.qualifications.create({
    data: {
      partner_id,
      qualification_type_id,
      licence_number,
      issuing_authority,
      issue_date: issue_date ? new Date(issue_date) : null,
      expiry_date: new Date(expiry_date)
    }
  });

  res.json(qual);
});

export default router;
''')

write("api/src/routes/documents.ts", '''import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/project/:projectId', async (req: AuthRequest, res) => {
  const roleName = req.user.role.name;
  const docs = await prisma.documents.findMany({
    where: { project_id: req.params.projectId }
  });

  const perms = await prisma.document_type_permissions.findMany({
    where: { role: roleName, can_read: true }
  });
  const allowedTypes = new Set(perms.map(p => p.document_type));

  const filtered = docs.filter(d => allowedTypes.has(d.document_type));
  res.json(filtered);
});

export default router;
''')

write("api/src/routes/dashboard.ts", '''import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/attention', async (req: AuthRequest, res) => {
  const [noGoGates, criticalRisks, expiringQuals, openIssues, qcFails] = await Promise.all([
    prisma.gate_results.findMany({
      where: { result: 'NO-GO' },
      include: { project: true, gate: true }
    }),
    prisma.risks.findMany({
      where: { status: 'open', risk_level: 'critical' },
      include: { project: true }
    }),
    prisma.qualifications.findMany({
      where: {
        expiry_date: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        status: { not: 'expired' }
      },
      include: { partner: true, qualification_type: true }
    }),
    prisma.issues.findMany({
      where: { status: { in: ['open', 'in_progress'] } },
      include: { project: true },
      orderBy: { severity: 'asc' }
    }),
    prisma.quality_audits.findMany({
      where: { result: 'fail' },
      include: { project: true }
    })
  ]);

  res.json({
    noGoGates,
    criticalRisks,
    expiringQualifications: expiringQuals,
    openIssues,
    qcFailures: qcFails,
    summary: {
      noGoCount: noGoGates.length,
      criticalRiskCount: criticalRisks.length,
      expiringCount: expiringQuals.length,
      openIssueCount: openIssues.length,
      qcFailureCount: qcFails.length
    }
  });
});

export default router;
''')

# ─────────────────────────────────────────────────────────────────────────────
# Frontend: i18n
# ─────────────────────────────────────────────────────────────────────────────

write("src/i18n/index.ts", '''import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import zhCN from './zh-CN.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'zh-CN': { translation: zhCN }
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
''')

print("Backend and i18n setup files written.")
