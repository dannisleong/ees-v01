/**
 * Quality Audit Engine — Strict Checklist Validation
 *
 * Rev.1.2 Rules:
 * 1. All audit_items must have result ≠ 'pending' before submission
 * 2. FAIL items must have non-empty finding_details
 * 3. Critical item FAIL → overall FAIL immediately (one-strike)
 * 4. Submitted audits are immutable (no further changes)
 * 5. Re-audit creates a new audit with copied items
 * 6. System blocks incomplete submissions with specific error messages
 */

import { prisma } from '../lib/prisma';


export interface ChecklistValidationResult {
  valid: boolean;
  errors: string[];
  pendingCount: number;
  failWithoutDetails: number;
  criticalFails: number;
}

export interface AuditSubmissionResult {
  audit_id: string;
  result: 'pass' | 'fail' | 'pending';
  overall_message: string;
  critical_item_failed: boolean;
  items_evaluated: number;
  items_passed: number;
  items_failed: number;
  items_na: number;
}

/**
 * Validate a checklist before submission.
 * Returns detailed error information if validation fails.
 */
export function validateChecklist(items: Array<{
  id: string;
  result: string;
  finding_details?: string | null;
  is_critical: boolean;
  item_name: string;
}>): ChecklistValidationResult {
  const errors: string[] = [];
  let pendingCount = 0;
  let failWithoutDetails = 0;
  let criticalFails = 0;

  for (const item of items) {
    // Rule 1: No pending items
    if (item.result === 'pending' || !item.result) {
      pendingCount++;
    }

    // Rule 2: FAIL must have finding_details
    if (item.result === 'fail' && (!item.finding_details || item.finding_details.trim().length === 0)) {
      failWithoutDetails++;
      errors.push(`"${item.item_name}": FAIL requires finding_details`);
    }

    // Rule 3: Track critical fails
    if (item.is_critical && item.result === 'fail') {
      criticalFails++;
    }
  }

  if (pendingCount > 0) {
    errors.push(`${pendingCount} item(s) still pending`);
  }

  return {
    valid: pendingCount === 0 && failWithoutDetails === 0,
    errors,
    pendingCount,
    failWithoutDetails,
    criticalFails
  };
}

/**
 * Calculate the overall audit result from items.
 * Returns immediately if critical item fails (one-strike rule).
 */
export function calculateAuditResult(items: Array<{
  result: string;
  is_critical: boolean;
}>): { result: 'pass' | 'fail'; message: string; critical_triggered: boolean } {
  // Rule 3: Critical item FAIL = immediate overall FAIL
  const criticalFail = items.find(i => i.is_critical && i.result === 'fail');
  if (criticalFail) {
    return {
      result: 'fail',
      message: 'Critical item failed — overall audit FAIL',
      critical_triggered: true
    };
  }

  // Any FAIL = overall FAIL
  const anyFail = items.some(i => i.result === 'fail');
  if (anyFail) {
    return {
      result: 'fail',
      message: 'One or more items failed',
      critical_triggered: false
    };
  }

  // All pass or N/A = overall PASS
  const allResolved = items.every(i => i.result === 'pass' || i.result === 'na');
  if (allResolved) {
    return {
      result: 'pass',
      message: 'All items passed',
      critical_triggered: false
    };
  }

  // Should not reach here if validation passed
  return {
    result: 'fail',
    message: 'Unresolved items detected',
    critical_triggered: false
  };
}

/**
 * Submit an audit after validation.
 * Updates all items, marks audit as submitted, and returns result.
 */
export async function submitAudit(
  auditId: string,
  items: Array<{
    id: string;
    result: string;
    finding_details?: string | null;
    photo_evidence?: string | null;
  }>
): Promise<AuditSubmissionResult> {
  // Fetch current audit items for validation
  const dbItems = await prisma.audit_items.findMany({
    where: { audit_id: auditId }
  });

  // Map submitted data to full items for validation
  const validationItems = dbItems.map(dbItem => {
    const submitted = items.find(i => i.id === dbItem.id);
    return {
      id: dbItem.id,
      result: submitted?.result ?? dbItem.result,
      finding_details: submitted?.finding_details ?? dbItem.finding_details,
      is_critical: dbItem.is_critical,
      item_name: dbItem.item_name
    };
  });

  // Validate
  const validation = validateChecklist(validationItems);
  if (!validation.valid) {
    throw new Error(`Audit validation failed: ${validation.errors.join('; ')}`);
  }

  // Check if audit was already submitted
  const audit = await prisma.quality_audits.findUnique({
    where: { id: auditId }
  });
  if (audit?.result !== 'pending') {
    throw new Error('Audit has already been submitted and is immutable');
  }

  // Update all items
  for (const item of items) {
    await prisma.audit_items.update({
      where: { id: item.id },
      data: {
        result: item.result,
        finding_details: item.finding_details,
        photo_evidence: item.photo_evidence
      }
    });
  }

  // Calculate overall result
  const updatedItems = await prisma.audit_items.findMany({
    where: { audit_id: auditId }
  });

  const calc = calculateAuditResult(updatedItems);

  // Update audit
  await prisma.quality_audits.update({
    where: { id: auditId },
    data: {
      result: calc.result,
      audit_date: new Date()
    }
  });

  return {
    audit_id: auditId,
    result: calc.result,
    overall_message: calc.message,
    critical_item_failed: calc.critical_triggered,
    items_evaluated: updatedItems.length,
    items_passed: updatedItems.filter(i => i.result === 'pass').length,
    items_failed: updatedItems.filter(i => i.result === 'fail').length,
    items_na: updatedItems.filter(i => i.result === 'na').length
  };
}

/**
 * Create a Re-Audit by copying items from an existing audit.
 * The original audit remains immutable.
 */
export async function createReAudit(originalAuditId: string, newAuditNumber: string): Promise<any> {
  const original = await prisma.quality_audits.findUnique({
    where: { id: originalAuditId },
    include: { audit_items: true }
  });

  if (!original) {
    throw new Error('Original audit not found');
  }

  const newAudit = await prisma.quality_audits.create({
    data: {
      project_id: original.project_id,
      audit_number: newAuditNumber,
      stage_number: original.stage_number,
      result: 'pending',
      next_audit_id: null // will be linked after creation
    }
  });

  // Copy items with reset results
  for (const item of original.audit_items) {
    await prisma.audit_items.create({
      data: {
        audit_id: newAudit.id,
        item_name: item.item_name,
        category: item.category,
        expected_standard: item.expected_standard,
        is_critical: item.is_critical,
        sort_order: item.sort_order,
        result: 'pending',
        finding_details: null,
        photo_evidence: null
      }
    });
  }

  // Link original to new audit
  await prisma.quality_audits.update({
    where: { id: originalAuditId },
    data: { next_audit_id: newAudit.id }
  });

  return prisma.quality_audits.findUnique({
    where: { id: newAudit.id },
    include: { audit_items: true }
  });
}

/**
 * Check if an audit is immutable (already submitted).
 */
export async function isAuditImmutable(auditId: string): Promise<boolean> {
  const audit = await prisma.quality_audits.findUnique({
    where: { id: auditId },
    select: { result: true }
  });
  return audit?.result !== 'pending';
}
