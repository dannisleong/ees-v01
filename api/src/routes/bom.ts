/**
 * BOM API Routes
 *
 * Endpoints:
 * GET  /api/bom/project/:projectId    — List BOM items for a project
 * GET  /api/bom/:id                   — Get single BOM item
 * POST /api/bom/                      — Create BOM item
 * PUT  /api/bom/:id                   — Update BOM item
 * POST /api/bom/:id/submit            — Submit for approval
 * POST /api/bom/:id/approve           — Approve (Dongmei / Founder only)
 * POST /api/bom/:id/reject            — Reject (Dongmei / Founder only)
 * DELETE /api/bom/:id                 — Delete BOM item
 * GET  /api/bom/project/:projectId/summary — BOM summary
 *
 * RBAC:
 * - Dongmei: full CRUD + approve/reject
 * - Founder: full CRUD + approve/reject
 * - PM: create/update (no approve/reject)
 * - Cammy: read-only
 * - Supplier: read-only their own items
 * - Quality Reviewer: read-only
 */

import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import {
  createBomItem,
  updateBomItem,
  submitBomItem,
  approveBomItem,
  rejectBomItem,
  deleteBomItem,
  listBomItems,
  getBomItem,
  getBomSummary,
} from '../services/bomEngine';

const router = Router();
router.use(authenticate);

// ── Helpers ──────────────────────────────────────────────────────────────

function isReadRole(role: string): boolean {
  return ['cammy', 'supplier', 'quality_reviewer', 'founder', 'dongmei', 'project_manager'].includes(role);
}

function isWriteRole(role: string): boolean {
  return ['dongmei', 'founder', 'project_manager'].includes(role);
}

function isApproveRole(role: string): boolean {
  return ['dongmei', 'founder'].includes(role);
}

// ── GET /project/:projectId ──────────────────────────────────────────────
router.get('/project/:projectId', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!isReadRole(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    const projectId = req.params.projectId;
    let items = await listBomItems(projectId);

    // Supplier: filter to only their own items
    if (role === 'supplier') {
      items = items.filter(i => i.supplier_id === req.user.id);
    }

    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /project/:projectId/summary ──────────────────────────────────────
router.get('/project/:projectId/summary', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!isReadRole(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    const summary = await getBomSummary(req.params.projectId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!isReadRole(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    const item = await getBomItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    if (role === 'supplier' && item.supplier_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: not your BOM item' });
    }

    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST / ───────────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!isWriteRole(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    const item = await createBomItem(req.body, req.user.id);
    res.status(201).json(item);
  } catch (e: any) {
    if (e.message?.startsWith('VALIDATION_ERROR')) {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /:id ─────────────────────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!isWriteRole(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    const item = await updateBomItem(req.params.id, req.body, req.user.id);
    res.json(item);
  } catch (e: any) {
    if (e.message?.startsWith('NOT_FOUND')) {
      return res.status(404).json({ error: e.message });
    }
    if (e.message?.startsWith('FORBIDDEN')) {
      return res.status(403).json({ error: e.message });
    }
    if (e.message?.startsWith('VALIDATION_ERROR')) {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

// ── POST /:id/submit ─────────────────────────────────────────────────────
router.post('/:id/submit', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!isWriteRole(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    const item = await submitBomItem(req.params.id, req.user.id);
    res.json(item);
  } catch (e: any) {
    if (e.message?.startsWith('NOT_FOUND')) {
      return res.status(404).json({ error: e.message });
    }
    if (e.message?.startsWith('VALIDATION_ERROR')) {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

// ── POST /:id/approve ────────────────────────────────────────────────────
router.post('/:id/approve', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!isApproveRole(role)) {
      return res.status(403).json({ error: 'Forbidden: only Dongmei or Founder can approve' });
    }

    const item = await approveBomItem(req.params.id, req.user.id, role);
    res.json(item);
  } catch (e: any) {
    if (e.message?.startsWith('NOT_FOUND')) {
      return res.status(404).json({ error: e.message });
    }
    if (e.message?.startsWith('FORBIDDEN')) {
      return res.status(403).json({ error: e.message });
    }
    if (e.message?.startsWith('VALIDATION_ERROR')) {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

// ── POST /:id/reject ─────────────────────────────────────────────────────
router.post('/:id/reject', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!isApproveRole(role)) {
      return res.status(403).json({ error: 'Forbidden: only Dongmei or Founder can reject' });
    }

    const { reason } = req.body;
    const item = await rejectBomItem(req.params.id, req.user.id, role, reason);
    res.json(item);
  } catch (e: any) {
    if (e.message?.startsWith('NOT_FOUND')) {
      return res.status(404).json({ error: e.message });
    }
    if (e.message?.startsWith('FORBIDDEN')) {
      return res.status(403).json({ error: e.message });
    }
    if (e.message?.startsWith('VALIDATION_ERROR')) {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /:id ──────────────────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const role = req.user.role.name;
    if (!isWriteRole(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    const result = await deleteBomItem(req.params.id, req.user.id, role);
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
