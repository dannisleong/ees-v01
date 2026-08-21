/**
 * Smart Gate Engine — Core Business Logic
 *
 * Evaluates Gate conditions against project data.
 * Returns GO only when ALL required conditions are met.
 * Returns NO-GO immediately when any required condition fails.
 *
 * Rev.1.2 Rules:
 * - Exceptional Override: only Founder, mandatory fields, audit logged
 * - NO-GO automatically creates an Issue
 * - Gate 02 uses payment_status from Deposit SSOT
 * - Gate 04 uses quality_audits with strict checklist
 * - Gate 05 checks role-specific partner compliance
 * - Gate 06 requires lessons_learned
 */

import { prisma } from '../lib/prisma';


export interface GateConditionResult {
  condition_type: string;
  passed: boolean;
  required: boolean;
  message: string;
  data?: any;
}

export interface GateEvaluationResult {
  gate_id: string;
  gate_number: number;
  result: 'GO' | 'NO-GO' | 'PENDING';
  condition_results: GateConditionResult[];
  failed_conditions: GateConditionResult[];
  message: string;
}

/**
 * Evaluate a single gate for a project.
 */
export async function evaluateGate(
  projectId: string,
  gateId: string
): Promise<GateEvaluationResult> {
  const gate = await prisma.gates.findUnique({
    where: { id: gateId },
    include: { gate_conditions: { orderBy: { sort_order: 'asc' } } }
  });

  if (!gate) {
    throw new Error(`Gate not found: ${gateId}`);
  }

  const conditionResults: GateConditionResult[] = [];

  for (const condition of gate.gate_conditions) {
    const result = await evaluateCondition(projectId, condition.condition_type, condition.config);
    conditionResults.push({
      condition_type: condition.condition_type,
      passed: result.passed,
      required: condition.required,
      message: result.message,
      data: result.data
    });
  }

  const failedConditions = conditionResults.filter(
    c => c.required && !c.passed
  );

  const allRequiredPassed = failedConditions.length === 0;

  let result: 'GO' | 'NO-GO' | 'PENDING';
  let message: string;

  if (allRequiredPassed) {
    result = 'GO';
    message = `Gate ${gate.gate_number} passed all conditions.`;
  } else {
    result = 'NO-GO';
    const failedNames = failedConditions.map(c => c.condition_type).join(', ');
    message = `Gate ${gate.gate_number} failed: ${failedNames}`;
  }

  return {
    gate_id: gateId,
    gate_number: gate.gate_number,
    result,
    condition_results: conditionResults,
    failed_conditions: failedConditions,
    message
  };
}

/**
 * Evaluate a single condition type against project data.
 */
async function evaluateCondition(
  projectId: string,
  conditionType: string,
  config: any
): Promise<{ passed: boolean; message: string; data?: any }> {
  switch (conditionType) {
    case 'order_confirmed':
      return checkOrderConfirmed(projectId);

    case 'customer_approved':
      return checkCustomerApproved(projectId);

    case 'deposit_received':
      return checkDepositReceived(projectId);

    case 'cost_calculated':
      return checkCostCalculated(projectId);

    case 'margin_above_target':
      return checkMarginAboveTarget(projectId);

    case 'bom_approved':
      return checkBoMApproved(projectId);

    case 'qc_passed':
      return checkQcPassed(projectId);

    case 'compliance_valid':
      return checkComplianceValid(projectId);

    case 'lessons_recorded':
      return checkLessonsRecorded(projectId);

    case 'document_uploaded':
      return checkDocumentUploaded(projectId, config?.document_type);

    case 'no_damage_reported':
      return checkNoDamage(projectId);

    case 'shipment_list_complete':
      return checkShipmentList(projectId);

    case 'installation_time_recorded':
      return checkInstallationTime(projectId);

    case 'warranty_issued':
      return checkWarrantyIssued(projectId);

    default:
      return {
        passed: false,
        message: `Unknown condition type: ${conditionType}`,
        data: { conditionType }
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Condition Checkers
// ─────────────────────────────────────────────────────────────────────────────

async function checkOrderConfirmed(projectId: string) {
  const order = await prisma.customer_orders.findFirst({
    where: { project_id: projectId }
  });
  const passed = !!order;
  return {
    passed,
    message: passed ? 'Order confirmed' : 'No customer order found',
    data: { order_id: order?.id }
  };
}

async function checkCustomerApproved(projectId: string) {
  const order = await prisma.customer_orders.findFirst({
    where: { project_id: projectId }
  });
  const passed = order?.customer_approved === true;
  return {
    passed,
    message: passed
      ? 'Customer approval confirmed'
      : 'Customer has not approved the order',
    data: { customer_approved: order?.customer_approved }
  };
}

async function checkDepositReceived(projectId: string) {
  const order = await prisma.customer_orders.findFirst({
    where: { project_id: projectId }
  });
  // SSOT: payment_status is derived from customer_deposits via trigger
  const passed = order?.payment_status === 'deposit_received' || order?.payment_status === 'fully_paid';
  return {
    passed,
    message: passed
      ? `Deposit received (${order?.payment_status})`
      : `Deposit not received (status: ${order?.payment_status || 'pending_deposit'})`,
    data: { payment_status: order?.payment_status }
  };
}

async function checkCostCalculated(projectId: string) {
  const cost = await prisma.landed_costs.findFirst({
    where: { project_id: projectId, is_current: true }
  });
  const passed = !!cost && cost.total_landed_cost !== null;
  return {
    passed,
    message: passed ? 'Landed cost calculated' : 'Landed cost not calculated',
    data: { cost_id: cost?.id, total: cost?.total_landed_cost }
  };
}

async function checkMarginAboveTarget(projectId: string) {
  const [project, cost] = await Promise.all([
    prisma.projects.findUnique({ where: { id: projectId } }),
    prisma.landed_costs.findFirst({ where: { project_id: projectId, is_current: true } })
  ]);

  const target = project?.target_margin_percent;
  const actual = cost?.margin_percent;

  let passed = false;
  let message: string;

  if (target === null || target === undefined) {
    message = 'No target margin set';
  } else if (actual === null || actual === undefined) {
    message = 'No actual margin calculated';
  } else {
    passed = (actual as any) >= (target as any);
    message = passed
      ? `Margin ${actual}% >= target ${target}%`
      : `Margin ${actual}% < target ${target}%`;
  }

  return { passed, message, data: { target, actual } };
}

async function checkBoMApproved(projectId: string) {
  const bomItems = await prisma.bom_items.findMany({
    where: { project_id: projectId }
  });
  const hasItems = bomItems.length > 0;
  // In V0.1, BOM approval is simplified: all items must have a supplier assigned
  const allAssigned = bomItems.every(item => item.supplier_id !== null);

  const passed = hasItems && allAssigned;
  return {
    passed,
    message: passed
      ? 'BOM complete with all suppliers assigned'
      : hasItems
        ? 'BOM items missing supplier assignment'
        : 'No BOM items found',
    data: { total_items: bomItems.length, assigned: bomItems.filter(i => i.supplier_id).length }
  };
}

async function checkQcPassed(projectId: string) {
  const audit = await prisma.quality_audits.findFirst({
    where: { project_id: projectId },
    orderBy: { created_at: 'desc' }
  });

  const passed = audit?.result === 'pass';
  return {
    passed,
    message: passed
      ? 'QC audit passed'
      : audit?.result === 'fail'
        ? 'QC audit failed'
        : 'No QC audit completed',
    data: { audit_id: audit?.id, result: audit?.result }
  };
}

async function checkComplianceValid(projectId: string) {
  const projectPartners = await prisma.project_partners.findMany({
    where: { project_id: projectId },
    include: {
      partner: {
        include: {
          qualifications: {
            include: { qualification_type: true }
          }
        }
      }
    }
  });

  const now = new Date();
  const invalidPartners: any[] = [];

  for (const pp of projectPartners) {
    const partner = pp.partner;
    const validQuals = partner.qualifications.filter(
      q => q.expiry_date > now && q.status !== 'expired'
    );

    // Check role-specific compliance
    const requiredTypes = await prisma.qualification_types.findMany({
      where: {
        applicable_partner_types: { array_contains: partner.type },
        is_required: true
      }
    });

    const hasRequired = requiredTypes.every(reqType =>
      validQuals.some(vq => vq.qualification_type_id === reqType.id)
    );

    if (!hasRequired || validQuals.length === 0) {
      invalidPartners.push({
        partner_id: partner.id,
        partner_name: partner.name,
        type: partner.type,
        reason: !hasRequired ? 'Missing required qualification type' : 'No valid qualifications'
      });
    }
  }

  const passed = invalidPartners.length === 0;
  return {
    passed,
    message: passed
      ? 'All partner qualifications valid'
      : `${invalidPartners.length} partner(s) with invalid/expired qualifications`,
    data: { total_partners: projectPartners.length, invalid: invalidPartners }
  };
}

async function checkLessonsRecorded(projectId: string) {
  const lessons = await prisma.lessons_learned.findMany({
    where: { project_id: projectId }
  });
  const passed = lessons.length > 0;
  return {
    passed,
    message: passed
      ? `${lessons.length} lesson(s) recorded`
      : 'No lessons learned recorded',
    data: { count: lessons.length }
  };
}

async function checkDocumentUploaded(projectId: string, documentType?: string) {
  const where: any = { project_id: projectId };
  if (documentType) {
    where.document_type = documentType;
  }
  const docs = await prisma.documents.findMany({ where });
  const passed = docs.length > 0;
  return {
    passed,
    message: passed
      ? `${docs.length} document(s) uploaded`
      : `No ${documentType || ''} documents uploaded`,
    data: { count: docs.length, types: docs.map(d => d.document_type) }
  };
}

async function checkNoDamage(projectId: string) {
  // Simplified: check no issues with category 'damage'
  const damageIssues = await prisma.issues.findMany({
    where: { project_id: projectId, category: 'damage', status: { in: ['open', 'in_progress'] } }
  });
  const passed = damageIssues.length === 0;
  return {
    passed,
    message: passed
      ? 'No damage reported'
      : `${damageIssues.length} damage issue(s) open`,
    data: { open_damage_issues: damageIssues.length }
  };
}

async function checkShipmentList(projectId: string) {
  const shipments = await prisma.shipments.findMany({
    where: { project_id: projectId }
  });
  const passed = shipments.length > 0;
  return {
    passed,
    message: passed
      ? `${shipments.length} shipment(s) recorded`
      : 'No shipments recorded',
    data: { count: shipments.length }
  };
}

async function checkInstallationTime(projectId: string) {
  // Simplified: check if any project_partners in installation stage are completed
  const installers = await prisma.project_partners.findMany({
    where: { project_id: projectId, status: 'completed' }
  });
  const passed = installers.length > 0;
  return {
    passed,
    message: passed
      ? `${installers.length} installation step(s) completed`
      : 'No installation completion records',
    data: { completed_installers: installers.length }
  };
}

async function checkWarrantyIssued(projectId: string) {
  const docs = await prisma.documents.findMany({
    where: { project_id: projectId, document_type: 'warranty' }
  });
  const passed = docs.length > 0;
  return {
    passed,
    message: passed
      ? 'Warranty document issued'
      : 'No warranty document found',
    data: { warranty_docs: docs.length }
  };
}

/**
 * Execute an Exceptional Override.
 * Only Founder can call this. Creates audit log.
 */
export async function executeOverride(params: {
  gate_result_id: string;
  project_id: string;
  overridden_by: string;
  original_result: string;
  new_result: string;
  reason: string;
  risk_acceptance: string;
  approver_name: string;
}) {
  const override = await prisma.gate_overrides.create({
    data: {
      gate_result_id: params.gate_result_id,
      project_id: params.project_id,
      overridden_by: params.overridden_by,
      original_result: params.original_result,
      new_result: params.new_result,
      reason: params.reason,
      risk_acceptance: params.risk_acceptance,
      approver_name: params.approver_name
    }
  });

  await prisma.audit_logs.create({
    data: {
      user_id: params.overridden_by,
      action: 'exceptional_override',
      resource_type: 'gate_result',
      resource_id: params.gate_result_id,
      before_value: { result: params.original_result },
      after_value: { result: params.new_result },
      reason: params.reason
    }
  });

  return override;
}

/**
 * Auto-create an Issue when Gate evaluates NO-GO.
 */
export async function createGateFailureIssue(
  projectId: string,
  gateNumber: number,
  reason: string,
  createdBy: string
) {
  return prisma.issues.create({
    data: {
      project_id: projectId,
      issue_number: `ISS-G${gateNumber}-${Date.now()}`,
      title: `Gate ${gateNumber} NO-GO`,
      description: reason,
      category: 'gate_failure',
      severity: 'high',
      status: 'open',
      created_by: createdBy
    }
  });
}
