import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import {
  submitAudit,
  createReAudit,
  validateChecklist,
  calculateAuditResult,
  isAuditImmutable
} from '../services/auditEngine';

const router = Router();
router.use(authenticate);

/**
 * GET /api/audits/project/:projectId
 * List audits for a project
 */
router.get('/project/:projectId', async (req: AuthRequest, res) => {
  const audits = await prisma.quality_audits.findMany({
    where: { project_id: req.params.projectId },
    include: { audit_items: true },
    orderBy: { created_at: 'desc' }
  });
  res.json(audits);
});

/**
 * GET /api/audits/:id
 * Get single audit with items
 */
router.get('/:id', async (req: AuthRequest, res) => {
  const audit = await prisma.quality_audits.findUnique({
    where: { id: req.params.id },
    include: { audit_items: true }
  });
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  res.json(audit);
});

/**
 * POST /api/audits
 * Create a new audit with checklist items.
 * Only PM or Quality Reviewer can create.
 */
router.post(
  '/',
  requireRole('founder', 'project_manager', 'quality_reviewer'),
  async (req: AuthRequest, res) => {
    try {
      const { project_id, audit_number, stage_number, items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'At least one checklist item is required' });
      }

      const audit = await prisma.quality_audits.create({
        data: {
          project_id,
          audit_number,
          stage_number,
          auditor_id: req.user.id,
          result: 'pending',
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

      res.status(201).json(audit);
    } catch (err: any) {
      console.error('Audit creation error:', err);
      res.status(500).json({ error: err.message || 'Failed to create audit' });
    }
  }
);

/**
 * POST /api/audits/:id/submit
 * Submit an audit after completing all checklist items.
 * Strict validation enforced (Rev.1.2):
 * - All items must be completed (no pending)
 * - FAIL items must have finding_details
 * - Critical item FAIL = overall FAIL
 * - Immutable after submission
 */
router.post(
  '/:id/submit',
  requireRole('founder', 'quality_reviewer'),
  async (req: AuthRequest, res) => {
    try {
      const auditId = req.params.id;
      const { items } = req.body;

      // Check immutability
      const immutable = await isAuditImmutable(auditId);
      if (immutable) {
        return res.status(400).json({
          error: 'Audit has already been submitted and is immutable',
          code: 'AUDIT_IMMUTABLE'
        });
      }

      // Submit with strict validation
      const result = await submitAudit(auditId, items);

      res.json(result);
    } catch (err: any) {
      console.error('Audit submission error:', err);
      res.status(400).json({
        error: err.message || 'Audit submission failed',
        code: 'AUDIT_VALIDATION_FAILED'
      });
    }
  }
);

/**
 * POST /api/audits/:id/reaudit
 * Create a Re-Audit from an existing audit.
 * Copies all items with reset status.
 */
router.post(
  '/:id/reaudit',
  requireRole('founder', 'project_manager', 'quality_reviewer'),
  async (req: AuthRequest, res) => {
    try {
      const { audit_number } = req.body;
      const reAudit = await createReAudit(req.params.id, audit_number);
      res.json(reAudit);
    } catch (err: any) {
      console.error('Re-audit error:', err);
      res.status(500).json({ error: err.message || 'Failed to create re-audit' });
    }
  }
);

/**
 * PUT /api/audits/:id/items/:itemId
 * Update a single checklist item (before submission only).
 */
router.put(
  '/:id/items/:itemId',
  requireRole('founder', 'quality_reviewer'),
  async (req: AuthRequest, res) => {
    try {
      const { id: auditId, itemId } = req.params;

      // Check immutability
      const immutable = await isAuditImmutable(auditId);
      if (immutable) {
        return res.status(400).json({
          error: 'Audit is immutable after submission',
          code: 'AUDIT_IMMUTABLE'
        });
      }

      const { result, finding_details, photo_evidence } = req.body;

      const updated = await prisma.audit_items.update({
        where: { id: itemId },
        data: { result, finding_details, photo_evidence }
      });

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

/**
 * POST /api/audits/validate
 * Dry-run validation without persisting.
 * Useful for frontend "pre-submit" check.
 */
router.post('/validate', async (req: AuthRequest, res) => {
  const { items } = req.body;
  const result = validateChecklist(items);
  res.json(result);
});

export default router;
