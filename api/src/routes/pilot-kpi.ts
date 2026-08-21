import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// Pilot KPI & Lessons Learned Report for a project
router.get('/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        bom_items: { include: { supplier: true } },
        landed_costs: { where: { is_current: true } },
        risks: true,
        customer_variations: true,
        quality_audits: { include: { audit_items: true } },
        lessons_learned: true,
        project_partners: { include: { partner: true } },
      },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const currentCost = project.landed_costs[0];

    // ETA performance
    const bomWithEta = project.bom_items.filter(b => b.planned_eta);
    const arrivedOnTime = bomWithEta.filter(b => b.actual_arrival && b.planned_eta && new Date(b.actual_arrival) <= new Date(b.planned_eta));
    const arrivedLate = bomWithEta.filter(b => b.actual_arrival && b.planned_eta && new Date(b.actual_arrival) > new Date(b.planned_eta));

    // QC performance
    const totalAudits = project.quality_audits.length;
    const passedAudits = project.quality_audits.filter(a => a.result === 'pass').length;
    const failedAudits = project.quality_audits.filter(a => a.result === 'fail').length;

    // Supplier performance (simplified)
    const supplierPerformance = project.bom_items
      .filter(b => b.supplier_id)
      .reduce((acc: any[], b) => {
        const existing = acc.find(s => s.supplierId === b.supplier_id);
        if (existing) {
          existing.itemCount++;
          existing.totalCost += Number(b.total_cost || 0);
        } else {
          acc.push({ supplierId: b.supplier_id, supplierName: b.supplier?.name, itemCount: 1, totalCost: Number(b.total_cost || 0) });
        }
        return acc;
      }, []);

    res.json({
      project: { id: project.id, project_code: project.project_code, name_en: project.name_en, name_zh: project.name_zh },
      cost: {
        sellingPrice: currentCost?.selling_price ? Number(currentCost.selling_price) : null,
        totalLandedCost: currentCost?.total_landed_cost ? Number(currentCost.total_landed_cost) : null,
        grossMargin: currentCost?.gross_margin ? Number(currentCost.gross_margin) : null,
        marginPercent: currentCost?.margin_percent ? Number(currentCost.margin_percent) : null,
      },
      etaPerformance: {
        totalTracked: bomWithEta.length,
        onTime: arrivedOnTime.length,
        late: arrivedLate.length,
        pending: bomWithEta.filter(b => !b.actual_arrival).length,
      },
      qcPerformance: {
        totalAudits,
        passed: passedAudits,
        failed: failedAudits,
        passRate: totalAudits > 0 ? ((passedAudits / totalAudits) * 100).toFixed(1) : null,
      },
      risks: {
        total: project.risks.length,
        open: project.risks.filter(r => r.status === 'open').length,
        high: project.risks.filter(r => r.risk_level === 'high').length,
      },
      variations: {
        total: project.customer_variations.length,
        approved: project.customer_variations.filter(v => v.customer_approved).length,
        totalCostImpact: project.customer_variations.reduce((sum, v) => sum + Number(v.cost_impact), 0),
      },
      supplierPerformance,
      partners: project.project_partners.map(pp => ({
        name: pp.partner.name,
        type: pp.partner.type,
        assignedStage: pp.assigned_stage,
        status: pp.status,
      })),
      lessonsLearned: project.lessons_learned.map(l => ({
        category: l.category,
        content: l.content,
        isSop: l.is_sop,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to load pilot KPI' });
  }
});

export default router;
