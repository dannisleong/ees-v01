import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// Pilot Execution View — "Today's Actions" for a project
router.get('/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        gate_results: { include: { gate: true } },
        bom_items: true,
        risks: true,
        customer_variations: true,
      },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Pending gates
    const pendingGates = project.gate_results.filter(g => g.result === 'pending' || g.result === 'no_go');

    // Pending BOM approvals
    const pendingBom = project.bom_items.filter(b => b.approval_status === 'submitted');

    // Delayed ETAs
    const delayedEtas = project.bom_items.filter(b =>
      b.is_critical && b.planned_eta && !b.actual_arrival && new Date(b.planned_eta) < new Date()
    );

    // Open risks
    const openRisks = project.risks.filter(r => r.status === 'open');

    // Overdue actions (simplified: issues with due date passed)
    const overdueIssues = await prisma.issues.findMany({
      where: { project_id: projectId, status: 'open', due_date: { lt: new Date() } },
    });

    res.json({
      project: { id: project.id, project_code: project.project_code, name_en: project.name_en, name_zh: project.name_zh, current_stage: project.current_stage, current_gate: project.current_gate },
      pendingGates: pendingGates.map(g => ({ gateNumber: g.gate.gate_number, gateName: g.gate.name_en, result: g.result })),
      pendingBomApprovals: pendingBom.map(b => ({ id: b.id, itemCode: b.item_code, productName: b.product_name })),
      delayedEtas: delayedEtas.map(b => ({ id: b.id, itemCode: b.item_code, productName: b.product_name, plannedEta: b.planned_eta })),
      openRisks: openRisks.map(r => ({ id: r.id, riskNumber: r.risk_number, description: r.description, riskLevel: r.risk_level })),
      overdueActions: overdueIssues.map(i => ({ id: i.id, issueNumber: i.issue_number, title: i.title, dueDate: i.due_date })),
      totalActions: pendingGates.length + pendingBom.length + delayedEtas.length + openRisks.length + overdueIssues.length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to load pilot execution' });
  }
});

export default router;
