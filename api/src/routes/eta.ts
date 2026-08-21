/**
 * ETA Tracking API Routes
 *
 * Endpoints:
 * GET  /api/eta/project/:projectId           — List ETA tracking history
 * GET  /api/eta/project/:projectId/summary   — ETA summary for dashboard
 * GET  /api/eta/project/:projectId/latest    — Latest ETA status per BOM item
 * PUT  /api/eta/bom/:bomItemId               — Update ETA fields on BOM item
 *
 * RBAC:
 * - Dongmei / Founder: write + read
 * - PM / Cammy / Supplier / Quality Reviewer: read-only
 * - Dongmei / Founder / PM: write + read
 * - Cammy / Supplier / Quality Reviewer: read-only
 */

import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import {
  updateBomEta,
  listEtaTrackingWithBom,
  getEtaSummary,
  getLatestEtaByBomItem,
} from '../services/etaEngine';

const router = Router();
router.use(authenticate);

const readRoles = ['dongmei', 'founder', 'project_manager', 'cammy', 'supplier', 'quality_reviewer'];
const writeRoles = ['dongmei', 'founder'];

// ── GET /project/:projectId ──────────────────────────────────────────────
router.get('/project/:projectId', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!readRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    const records = await listEtaTrackingWithBom(req.params.projectId);
    res.json(records);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /project/:projectId/summary ──────────────────────────────────────
router.get('/project/:projectId/summary', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!readRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    const summary = await getEtaSummary(req.params.projectId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /project/:projectId/latest ───────────────────────────────────────
router.get('/project/:projectId/latest', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!readRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    const latest = await getLatestEtaByBomItem(req.params.projectId);
    res.json(latest);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /bom/:bomItemId ──────────────────────────────────────────────────
router.put('/bom/:bomItemId', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!writeRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role to update ETA' });
    }

    const { planned_eta, forecast_eta, actual_arrival } = req.body;
    const result = await updateBomEta(
      req.params.bomItemId,
      { planned_eta, forecast_eta, actual_arrival },
      req.user.id,
      role
    );
    res.json(result);
  } catch (e: any) {
    if (e.message?.startsWith('NOT_FOUND')) {
      return res.status(404).json({ error: e.message });
    }
    if (e.message?.startsWith('FORBIDDEN')) {
      return res.status(403).json({ error: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

export default router;
