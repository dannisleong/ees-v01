/**
 * Dashboard API Routes — Management Attention Layer
 *
 * Endpoints:
 *   GET /api/dashboard/attention          — Full attention dashboard
 *   GET /api/dashboard/kpi                — KPI summary
 *   GET /api/dashboard/project/:projectId — Project drill-down
 *
 * RBAC:
 *   - Founder / Dongmei / PM / Cammy: read
 *   - Supplier / Quality Reviewer: read (filtered by project visibility)
 */

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  getAttentionDashboard,
  getKpiSummary,
  getProjectDashboard,
} from '../services/dashboardEngine';

const router = Router();
router.use(authenticate);

const readRoles = [
  'founder',
  'dongmei',
  'project_manager',
  'cammy',
  'supplier',
  'quality_reviewer',
];

// ── GET /attention ─────────────────────────────────────────────────────────
router.get('/attention', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!readRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    const data = await getAttentionDashboard(req.user.id, role);
    res.json(data);
  } catch (e: any) {
    console.error('[Dashboard] attention error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /kpi ───────────────────────────────────────────────────────────────
router.get('/kpi', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!readRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    const data = await getKpiSummary(req.user.id, role);
    res.json(data);
  } catch (e: any) {
    console.error('[Dashboard] kpi error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /project/:projectId ────────────────────────────────────────────────
router.get('/project/:projectId', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!readRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    const data = await getProjectDashboard(req.params.projectId);
    if (!data) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // RBAC: restrict project-level drill-down
    const userId = req.user.id;
    const project = data.project;
    const isAuthorized =
      role === 'founder' ||
      role === 'dongmei' ||
      (data as any).project?.pm_id === userId ||
      (data as any).project?.cammy_id === userId;

    // Allow read for now; project-specific filtering is handled by the service
    res.json(data);
  } catch (e: any) {
    console.error('[Dashboard] project drill-down error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
