/**
 * Dashboard Engine — Management Attention Layer
 *
 * Aggregates real-time data across:
 *   Project → Gates → BOM → ETA → Cost → Quality → Risk → Compliance
 *
 * Design principle: "What needs my attention today?"
 * No mock data. All KPIs compute from live DB queries.
 */

import { prisma } from '../lib/prisma';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AttentionAlert {
  type:
    | 'no_go'
    | 'critical_risk'
    | 'bom_delay'
    | 'overdue_action'
    | 'qc_failure'
    | 'compliance_issue'
    | 'cost_variance'
    | 'upcoming_deadline';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  projectId?: string;
  projectName?: string;
  entityId?: string;
  entityType?: string;
  linkPath?: string;
  dueDate?: Date;
  daysOverdue?: number;
}

export interface DashboardSummary {
  noGoCount: number;
  criticalRiskCount: number;
  criticalBomDelayCount: number;
  overdueActionCount: number;
  qcFailureCount: number;
  complianceIssueCount: number;
  costVarianceCount: number;
  upcomingDeadlineCount: number;
  totalAttentionItems: number;
}

export interface KpiData {
  activeProjects: number;
  projectsAtRisk: number;
  avgMarginPercent: number | null;
  totalLandedCost: number | null;
  totalSellingPrice: number | null;
  bomItemsTotal: number;
  bomItemsApproved: number;
  bomItemsDelayed: number;
  openIssues: number;
  openRisks: number;
}

// ── RBAC: Build project visibility filter ──────────────────────────────────

async function getVisibleProjectIds(userId: string, role: string): Promise<string[] | null> {
  if (role === 'founder' || role === 'dongmei') return null;

  const conditions: any[] = [];
  if (role === 'project_manager') conditions.push({ pm_id: userId });
  if (role === 'cammy') conditions.push({ cammy_id: userId });

  if (conditions.length === 0) {
    conditions.push(
      { cammy_id: userId },
      { dongmei_id: userId },
      { pm_id: userId },
    );
  }

  const projects = await prisma.projects.findMany({
    where: { OR: conditions, status: 'active' },
    select: { id: true },
  });

  return projects.map((p) => p.id);
}

function projectFilter(visibleIds: string[] | null) {
  if (visibleIds === null) return {};
  return { project_id: { in: visibleIds } };
}

// ── 1. NO-GO / Blocked Projects ────────────────────────────────────────────

async function getNoGoAlerts(visibleIds: string[] | null): Promise<AttentionAlert[]> {
  const results = await prisma.gate_results.findMany({
    where: { result: 'NO-GO', ...projectFilter(visibleIds) },
    include: { project: true, gate: true },
    orderBy: { evaluated_at: 'desc' },
  });

  return results.map((r) => ({
    type: 'no_go' as const,
    severity: 'critical' as const,
    title: `Gate ${r.gate.gate_number} NO-GO: ${r.project.name_en || r.project.project_code}`,
    description: r.reason || `Project blocked at Gate ${r.gate.gate_number}: ${r.gate.name_en || ''}`,
    projectId: r.project_id,
    projectName: r.project.name_en || r.project.project_code,
    entityId: r.id,
    entityType: 'gate_result',
    linkPath: `/project-cockpit`,
  }));
}

// ── 2. Critical Risks ──────────────────────────────────────────────────────

async function getCriticalRiskAlerts(visibleIds: string[] | null): Promise<AttentionAlert[]> {
  const risks = await prisma.risks.findMany({
    where: { status: 'open', risk_level: 'critical', ...projectFilter(visibleIds) },
    include: { project: true },
    orderBy: { created_at: 'desc' },
  });

  return risks.map((r) => ({
    type: 'critical_risk' as const,
    severity: 'critical' as const,
    title: `Critical Risk: ${r.description.slice(0, 60)}${r.description.length > 60 ? '...' : ''}`,
    description: `Project: ${r.project?.name_en || r.project_id} | Probability: ${r.probability || '-'} | Impact: ${r.impact || '-'}`,
    projectId: r.project_id,
    projectName: r.project?.name_en || r.project_id,
    entityId: r.id,
    entityType: 'risk',
    linkPath: `/project-cockpit`,
    dueDate: r.due_date ?? undefined,
    daysOverdue: r.due_date && r.due_date < new Date()
      ? Math.floor((Date.now() - r.due_date.getTime()) / (1000 * 60 * 60 * 24))
      : undefined,
  }));
}

// ── 3. Critical BOM Delays ─────────────────────────────────────────────────

async function getCriticalBomDelayAlerts(visibleIds: string[] | null): Promise<AttentionAlert[]> {
  const now = new Date();

  const items = await prisma.bom_items.findMany({
    where: { is_critical: true, approval_status: 'approved', ...projectFilter(visibleIds) },
    include: { project: true, supplier: true },
  });

  const delayedItems = items.filter((item) => {
    const planned = item.planned_eta;
    if (!planned) return false;
    if (item.actual_arrival && item.actual_arrival > planned) return true;
    if (item.forecast_eta && !item.actual_arrival && item.forecast_eta > planned) return true;
    if (!item.actual_arrival && planned < now) return true;
    return false;
  });

  return delayedItems.map((item) => {
    const planned = item.planned_eta;
    const actualOrForecast = item.actual_arrival || item.forecast_eta;
    let daysOverdue = 0;

    if (actualOrForecast && planned) {
      daysOverdue = Math.floor((actualOrForecast.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
    } else if (!item.actual_arrival && planned && planned < now) {
      daysOverdue = Math.floor((now.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      type: 'bom_delay' as const,
      severity: daysOverdue > 7 ? 'critical' : 'high',
      title: `Critical BOM Delay: ${item.item_code} — ${item.product_name}`,
      description: `Supplier: ${item.supplier?.name || 'TBD'} | Planned: ${planned?.toISOString().split('T')[0] || '-'} | ${item.actual_arrival ? 'Actual' : 'Forecast'}: ${actualOrForecast?.toISOString().split('T')[0] || 'Overdue'} | ${daysOverdue} days late`,
      projectId: item.project_id,
      projectName: item.project?.name_en || item.project_id,
      entityId: item.id,
      entityType: 'bom_item',
      linkPath: `/project-cockpit`,
      daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
    };
  });
}

// ── 4. Overdue Actions ─────────────────────────────────────────────────────

async function getOverdueActionAlerts(visibleIds: string[] | null): Promise<AttentionAlert[]> {
  const now = new Date();
  const issues = await prisma.issues.findMany({
    where: { status: { in: ['open', 'in_progress'] }, due_date: { lt: now }, ...projectFilter(visibleIds) },
    include: { project: true },
    orderBy: { due_date: 'asc' },
  });

  return issues.map((issue) => {
    const daysOverdue = issue.due_date
      ? Math.floor((now.getTime() - issue.due_date.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      type: 'overdue_action' as const,
      severity: daysOverdue > 14 ? 'critical' : daysOverdue > 7 ? 'high' : 'medium',
      title: `Overdue: ${issue.title}`,
      description: `Project: ${issue.project?.name_en || issue.project_id} | Category: ${issue.category} | Severity: ${issue.severity} | ${daysOverdue} days overdue`,
      projectId: issue.project_id,
      projectName: issue.project?.name_en || issue.project_id,
      entityId: issue.id,
      entityType: 'issue',
      linkPath: `/project-cockpit`,
      dueDate: issue.due_date ?? undefined,
      daysOverdue,
    };
  });
}

// ── 5. Quality Failures ────────────────────────────────────────────────────

async function getQualityFailureAlerts(visibleIds: string[] | null): Promise<AttentionAlert[]> {
  const audits = await prisma.quality_audits.findMany({
    where: { result: 'fail', ...projectFilter(visibleIds) },
    include: { project: true },
    orderBy: { audit_date: 'desc' },
  });

  return audits.map((audit) => ({
    type: 'qc_failure' as const,
    severity: 'high' as const,
    title: `QC Failed: ${audit.project?.name_en || audit.project_id} (Stage ${audit.stage_number})`,
    description: audit.findings_summary || `Quality audit failed at Stage ${audit.stage_number}`,
    projectId: audit.project_id,
    projectName: audit.project?.name_en || audit.project_id,
    entityId: audit.id,
    entityType: 'quality_audit',
    linkPath: `/project-cockpit`,
  }));
}

// ── 6. Partner / Licence Compliance Issues ─────────────────────────────────

async function getComplianceAlerts(visibleIds: string[] | null): Promise<AttentionAlert[]> {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const quals = await prisma.qualifications.findMany({
    where: {
      OR: [
        { status: 'expired' },
        { expiry_date: { lte: thirtyDays, gte: now }, status: 'valid' },
      ],
    },
    include: { partner: true, qualification_type: true },
  });

  const partnerIds = quals.map((q) => q.partner_id);
  const projectPartners = partnerIds.length
    ? await prisma.project_partners.findMany({
        where: { partner_id: { in: partnerIds }, status: 'active', ...projectFilter(visibleIds) },
        include: { project: true, partner: true },
      })
    : [];

  const alerts: AttentionAlert[] = [];

  for (const qual of quals) {
    const affectedProjects = projectPartners.filter((pp) => pp.partner_id === qual.partner_id);
    const isExpired = qual.status === 'expired' || (qual.expiry_date && qual.expiry_date < now);

    for (const pp of affectedProjects) {
      alerts.push({
        type: 'compliance_issue' as const,
        severity: isExpired ? 'critical' : 'high',
        title: `${isExpired ? 'Expired' : 'Expiring'} Licence: ${qual.qualification_type.name_zh || qual.qualification_type.type_code}`,
        description: `Partner: ${qual.partner.name} | Licence: ${qual.licence_number || 'N/A'} | ${isExpired ? 'Expired' : `Expires ${qual.expiry_date?.toISOString().split('T')[0]}`} | Project: ${pp.project?.name_en || pp.project_id}`,
        projectId: pp.project_id,
        projectName: pp.project?.name_en || pp.project_id,
        entityId: qual.id,
        entityType: 'qualification',
        linkPath: `/project-cockpit`,
        dueDate: qual.expiry_date ?? undefined,
      });
    }
  }

  return alerts;
}

// ── 7. Cost / Margin Variance ──────────────────────────────────────────────

async function getCostVarianceAlerts(visibleIds: string[] | null): Promise<AttentionAlert[]> {
  const projects = await prisma.projects.findMany({
    where: { status: 'active', ...(visibleIds ? { id: { in: visibleIds } } : {}) },
    include: { landed_costs: { where: { is_current: true }, take: 1 } },
  });

  const alerts: AttentionAlert[] = [];

  for (const project of projects) {
    const lc = project.landed_costs[0];
    if (!lc || !lc.margin_percent || !project.target_margin_percent) continue;

    const marginPct = Number(lc.margin_percent);
    const targetPct = Number(project.target_margin_percent);

    if (marginPct < targetPct) {
      const variance = targetPct - marginPct;
      alerts.push({
        type: 'cost_variance' as const,
        severity: variance > 10 ? 'critical' : variance > 5 ? 'high' : 'medium',
        title: `Margin Alert: ${project.name_en || project.project_code}`,
        description: `Actual margin ${marginPct.toFixed(1)}% vs target ${targetPct.toFixed(1)}% (${variance.toFixed(1)}% below target) | Selling price: $${Number(lc.selling_price || 0).toLocaleString()} | Landed cost: $${Number(lc.total_landed_cost).toLocaleString()}`,
        projectId: project.id,
        projectName: project.name_en || project.project_code,
        entityId: lc.id,
        entityType: 'landed_cost',
        linkPath: `/project-cockpit`,
      });
    }
  }

  return alerts;
}

// ── 8. Upcoming Critical Deadlines ─────────────────────────────────────────

async function getUpcomingDeadlineAlerts(visibleIds: string[] | null): Promise<AttentionAlert[]> {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const filter = projectFilter(visibleIds);

  const [bomItems, issues, risks] = await Promise.all([
    prisma.bom_items.findMany({
      where: { is_critical: true, planned_eta: { gte: now, lte: sevenDays }, actual_arrival: null, ...filter },
      include: { project: true },
    }),
    prisma.issues.findMany({
      where: { status: { in: ['open', 'in_progress'] }, due_date: { gte: now, lte: sevenDays }, ...filter },
      include: { project: true },
    }),
    prisma.risks.findMany({
      where: { status: 'open', due_date: { gte: now, lte: sevenDays }, ...filter },
      include: { project: true },
    }),
  ]);

  const alerts: AttentionAlert[] = [];

  for (const item of bomItems) {
    const daysLeft = item.planned_eta
      ? Math.ceil((item.planned_eta.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    alerts.push({
      type: 'upcoming_deadline' as const,
      severity: daysLeft <= 2 ? 'critical' : 'high',
      title: `BOM ETA Due: ${item.item_code}`,
      description: `Project: ${item.project?.name_en || item.project_id} | Planned arrival: ${item.planned_eta?.toISOString().split('T')[0]} | ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`,
      projectId: item.project_id,
      projectName: item.project?.name_en || item.project_id,
      entityId: item.id,
      entityType: 'bom_item',
      linkPath: `/project-cockpit`,
      dueDate: item.planned_eta ?? undefined,
    });
  }

  for (const issue of issues) {
    const daysLeft = issue.due_date
      ? Math.ceil((issue.due_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    alerts.push({
      type: 'upcoming_deadline' as const,
      severity: daysLeft <= 2 ? 'critical' : 'high',
      title: `Issue Due: ${issue.title}`,
      description: `Project: ${issue.project?.name_en || issue.project_id} | Due: ${issue.due_date?.toISOString().split('T')[0]} | ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`,
      projectId: issue.project_id,
      projectName: issue.project?.name_en || issue.project_id,
      entityId: issue.id,
      entityType: 'issue',
      linkPath: `/project-cockpit`,
      dueDate: issue.due_date ?? undefined,
    });
  }

  for (const risk of risks) {
    const daysLeft = risk.due_date
      ? Math.ceil((risk.due_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    alerts.push({
      type: 'upcoming_deadline' as const,
      severity: daysLeft <= 2 ? 'critical' : 'high',
      title: `Risk Due: ${risk.description.slice(0, 40)}...`,
      description: `Project: ${risk.project?.name_en || risk.project_id} | Due: ${risk.due_date?.toISOString().split('T')[0]} | ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`,
      projectId: risk.project_id,
      projectName: risk.project?.name_en || risk.project_id,
      entityId: risk.id,
      entityType: 'risk',
      linkPath: `/project-cockpit`,
      dueDate: risk.due_date ?? undefined,
    });
  }

  return alerts;
}

// ── Main Dashboard Aggregation ─────────────────────────────────────────────

export async function getAttentionDashboard(userId: string, role: string) {
  const visibleIds = await getVisibleProjectIds(userId, role);

  const [
    noGoAlerts,
    criticalRiskAlerts,
    bomDelayAlerts,
    overdueAlerts,
    qcFailureAlerts,
    complianceAlerts,
    costVarianceAlerts,
    deadlineAlerts,
  ] = await Promise.all([
    getNoGoAlerts(visibleIds),
    getCriticalRiskAlerts(visibleIds),
    getCriticalBomDelayAlerts(visibleIds),
    getOverdueActionAlerts(visibleIds),
    getQualityFailureAlerts(visibleIds),
    getComplianceAlerts(visibleIds),
    getCostVarianceAlerts(visibleIds),
    getUpcomingDeadlineAlerts(visibleIds),
  ]);

  const summary: DashboardSummary = {
    noGoCount: noGoAlerts.length,
    criticalRiskCount: criticalRiskAlerts.length,
    criticalBomDelayCount: bomDelayAlerts.length,
    overdueActionCount: overdueAlerts.length,
    qcFailureCount: qcFailureAlerts.length,
    complianceIssueCount: complianceAlerts.length,
    costVarianceCount: costVarianceAlerts.length,
    upcomingDeadlineCount: deadlineAlerts.length,
    totalAttentionItems:
      noGoAlerts.length +
      criticalRiskAlerts.length +
      bomDelayAlerts.length +
      overdueAlerts.length +
      qcFailureAlerts.length +
      complianceAlerts.length +
      costVarianceAlerts.length,
  };

  const allAlerts = [
    ...noGoAlerts,
    ...criticalRiskAlerts,
    ...bomDelayAlerts,
    ...overdueAlerts,
    ...qcFailureAlerts,
    ...complianceAlerts,
    ...costVarianceAlerts,
    ...deadlineAlerts,
  ].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return {
    summary,
    alerts: allAlerts,
    byCategory: {
      noGo: noGoAlerts,
      criticalRisks: criticalRiskAlerts,
      bomDelays: bomDelayAlerts,
      overdueActions: overdueAlerts,
      qcFailures: qcFailureAlerts,
      complianceIssues: complianceAlerts,
      costVariances: costVarianceAlerts,
      upcomingDeadlines: deadlineAlerts,
    },
  };
}

// ── KPI Summary ────────────────────────────────────────────────────────────

export async function getKpiSummary(userId: string, role: string): Promise<KpiData> {
  const visibleIds = await getVisibleProjectIds(userId, role);
  const pFilter = visibleIds ? { id: { in: visibleIds } } : {};

  const [activeProjects, allProjects, bomAgg, issueCount, riskCount] = await Promise.all([
    prisma.projects.count({ where: { ...pFilter, status: 'active' } }),
    prisma.projects.findMany({
      where: { ...pFilter, status: 'active' },
      include: {
        landed_costs: { where: { is_current: true } },
        bom_items: true,
        risks: { where: { status: 'open' } },
        issues: { where: { status: { in: ['open', 'in_progress'] } } },
      },
    }),
    prisma.bom_items.aggregate({
      where: visibleIds ? { project_id: { in: visibleIds } } : {},
      _count: { id: true },
    }),
    prisma.issues.count({
      where: { status: { in: ['open', 'in_progress'] }, ...projectFilter(visibleIds) },
    }),
    prisma.risks.count({
      where: { status: 'open', ...projectFilter(visibleIds) },
    }),
  ]);

  let totalLandedCost = 0;
  let totalSellingPrice = 0;
  let totalMarginPct = 0;
  let marginCount = 0;
  let bomItemsApproved = 0;
  let bomItemsDelayed = 0;
  let projectsAtRisk = 0;

  for (const project of allProjects) {
    const lc = project.landed_costs[0];
    if (lc) {
      totalLandedCost += Number(lc.total_landed_cost);
      if (lc.selling_price) totalSellingPrice += Number(lc.selling_price);
      if (lc.margin_percent) {
        totalMarginPct += Number(lc.margin_percent);
        marginCount++;
      }
    }

    for (const bi of project.bom_items) {
      if (bi.approval_status === 'approved') bomItemsApproved++;
      if (bi.is_critical && bi.actual_arrival && bi.planned_eta && bi.actual_arrival > bi.planned_eta) {
        bomItemsDelayed++;
      } else if (bi.is_critical && !bi.actual_arrival && bi.planned_eta && bi.planned_eta < new Date()) {
        bomItemsDelayed++;
      }
    }

    if (project.risks.some((r) => r.risk_level === 'critical')) {
      projectsAtRisk++;
    }
  }

  return {
    activeProjects,
    projectsAtRisk,
    avgMarginPercent: marginCount > 0 ? totalMarginPct / marginCount : null,
    totalLandedCost: totalLandedCost > 0 ? totalLandedCost : null,
    totalSellingPrice: totalSellingPrice > 0 ? totalSellingPrice : null,
    bomItemsTotal: bomAgg._count.id,
    bomItemsApproved,
    bomItemsDelayed,
    openIssues: issueCount,
    openRisks: riskCount,
  };
}

// ── Project Drill-Down ─────────────────────────────────────────────────────

export async function getProjectDashboard(projectId: string) {
  const project = await prisma.projects.findUnique({
    where: { id: projectId },
    include: {
      customer: true,
      gate_results: { include: { gate: true } },
      bom_items: { include: { supplier: true } },
      risks: true,
      issues: true,
      quality_audits: true,
      landed_costs: { where: { is_current: true } },
      project_partners: { include: { partner: true } },
    },
  });

  if (!project) return null;

  const now = new Date();
  const latestGate = project.gate_results.sort(
    (a, b) => (b.evaluated_at?.getTime() || 0) - (a.evaluated_at?.getTime() || 0)
  )[0];

  const criticalBom = project.bom_items.filter((b) => b.is_critical);
  const bomDelayed = criticalBom.filter((b) => {
    if (b.actual_arrival && b.planned_eta) return b.actual_arrival > b.planned_eta;
    if (!b.actual_arrival && b.planned_eta) return b.planned_eta < now;
    return false;
  });

  const etaSummary = {
    total_bom: project.bom_items.length,
    critical_bom: criticalBom.length,
    arrived: project.bom_items.filter((b) => b.actual_arrival !== null).length,
    delayed: bomDelayed.length,
    next_eta: criticalBom
      .filter((b) => !b.actual_arrival && b.planned_eta)
      .sort((a, b) => (a.planned_eta!.getTime() - b.planned_eta!.getTime()))[0]?.planned_eta,
  };

  const currentCost = project.landed_costs[0];

  return {
    project: {
      id: project.id,
      code: project.project_code,
      name: project.name_en,
      customer: project.customer?.name,
      status: project.status,
      currentStage: project.current_stage,
      currentGate: project.current_gate,
    },
    gateStatus: {
      latestGate: latestGate
        ? { number: latestGate.gate.gate_number, result: latestGate.result, evaluatedAt: latestGate.evaluated_at }
        : null,
      isBlocked: latestGate?.result === 'NO-GO',
    },
    bomStatus: {
      totalItems: project.bom_items.length,
      approvedItems: project.bom_items.filter((b) => b.approval_status === 'approved').length,
      criticalItems: criticalBom.length,
      delayedItems: bomDelayed.length,
    },
    etaSummary,
    riskSummary: {
      openRisks: project.risks.filter((r) => r.status === 'open').length,
      criticalRisks: project.risks.filter((r) => r.status === 'open' && r.risk_level === 'critical').length,
    },
    issueSummary: {
      openIssues: project.issues.filter((i) => ['open', 'in_progress'].includes(i.status)).length,
      overdueIssues: project.issues.filter(
        (i) => ['open', 'in_progress'].includes(i.status) && i.due_date && i.due_date < now
      ).length,
    },
    costSummary: currentCost
      ? {
          totalLandedCost: Number(currentCost.total_landed_cost),
          sellingPrice: currentCost.selling_price ? Number(currentCost.selling_price) : null,
          marginPercent: currentCost.margin_percent ? Number(currentCost.margin_percent) : null,
          targetMargin: project.target_margin_percent ? Number(project.target_margin_percent) : null,
        }
      : null,
    partners: project.project_partners.map((pp) => ({
      id: pp.partner_id,
      name: pp.partner.name,
      type: pp.partner.type,
      status: pp.status,
    })),
  };
}
