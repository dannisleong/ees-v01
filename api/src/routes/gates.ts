import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import {
  evaluateGate,
  executeOverride,
  createGateFailureIssue
} from '../services/gateEngine';

const router = Router();
router.use(authenticate);

/**
 * GET /api/gates/project/:projectId
 * List all gate results for a project
 */
router.get('/project/:projectId', async (req: AuthRequest, res) => {
  const results = await prisma.gate_results.findMany({
    where: { project_id: req.params.projectId },
    include: { gate: true, gate_overrides: true },
    orderBy: { created_at: 'desc' }
  });
  res.json(results);
});

/**
 * POST /api/gates/evaluate
 * Evaluate a gate for a project.
 * Requires: project_id, gate_id
 * Returns full evaluation result with condition breakdown.
 */
router.post(
  '/evaluate',
  requireRole('founder', 'cammy', 'dongmei', 'project_manager', 'quality_reviewer'),
  async (req: AuthRequest, res) => {
    try {
      const { project_id, gate_id } = req.body;

      if (!project_id || !gate_id) {
        return res.status(400).json({ error: 'project_id and gate_id are required' });
      }

      // Run the Smart Gate Engine
      const evaluation = await evaluateGate(project_id, gate_id);

      // Persist the result
      const gateResult = await prisma.gate_results.create({
        data: {
          project_id,
          gate_id,
          result: evaluation.result,
          reason: evaluation.message,
          evaluated_by: req.user.id,
          evaluated_at: new Date()
        }
      });

      // On NO-GO: auto-create Issue
      if (evaluation.result === 'NO-GO') {
        await createGateFailureIssue(
          project_id,
          evaluation.gate_number,
          evaluation.message,
          req.user.id
        );
      }

      // Update project current_gate if this is the latest gate
      const project = await prisma.projects.findUnique({
        where: { id: project_id },
        select: { current_gate: true }
      });

      const gate = await prisma.gates.findUnique({
        where: { id: gate_id },
        select: { gate_number: true }
      });

      if (project && gate && gate.gate_number > project.current_gate) {
        await prisma.projects.update({
          where: { id: project_id },
          data: { current_gate: gate.gate_number }
        });
      }

      res.json({
        gate_result: gateResult,
        evaluation
      });
    } catch (err: any) {
      console.error('Gate evaluation error:', err);
      res.status(500).json({ error: err.message || 'Gate evaluation failed' });
    }
  }
);

/**
 * POST /api/gates/override
 * Exceptional Override — ONLY Founder.
 * Mandatory fields: reason, risk_acceptance, approver_name
 */
router.post(
  '/override',
  requireRole('founder'),
  async (req: AuthRequest, res) => {
    try {
      const {
        gate_result_id,
        project_id,
        original_result,
        new_result,
        reason,
        risk_acceptance,
        approver_name
      } = req.body;

      // Strict validation: all mandatory fields must be present
      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({
          error: 'Override reason is required and must be at least 10 characters'
        });
      }
      if (!risk_acceptance || risk_acceptance.trim().length < 10) {
        return res.status(400).json({
          error: 'Risk acceptance statement is required and must be at least 10 characters'
        });
      }
      if (!approver_name || approver_name.trim().length === 0) {
        return res.status(400).json({
          error: 'Approver name is required'
        });
      }

      const override = await executeOverride({
        gate_result_id,
        project_id,
        overridden_by: req.user.id,
        original_result,
        new_result,
        reason,
        risk_acceptance,
        approver_name
      });

      res.json(override);
    } catch (err: any) {
      console.error('Override error:', err);
      res.status(500).json({ error: err.message || 'Override failed' });
    }
  }
);

/**
 * GET /api/gates/:gateId/conditions
 * Get conditions for a gate template
 */
router.get('/:gateId/conditions', async (req: AuthRequest, res) => {
  const conditions = await prisma.gate_conditions.findMany({
    where: { gate_id: req.params.gateId },
    orderBy: { sort_order: 'asc' }
  });
  res.json(conditions);
});

export default router;
