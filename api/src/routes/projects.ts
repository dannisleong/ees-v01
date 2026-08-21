import { Router } from 'express';
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
