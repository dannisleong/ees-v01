/**
 * BOM Engine — Business Logic Service
 *
 * Responsibilities:
 * - CRUD operations for BOM items with validation
 * - Auto-calculate total_cost = quantity × unit_cost
 * - Approval workflow: draft → submitted → approved / rejected
 * - Block modifications after approval
 * - Write audit_logs on every create, update, approve, reject, delete
 * - Integrate with Smart Gate (Gate 03 checks bom_approved)
 */

import { prisma } from '../lib/prisma';

export interface CreateBomItemInput {
  project_id: string;
  item_code: string;
  product_name: string;
  specification?: string;
  quantity: number;
  unit?: string;
  supplier_id?: string;
  unit_cost?: number;
  lead_time_days?: number;
  is_critical?: boolean;
  planned_eta?: Date | string;
}

export interface UpdateBomItemInput {
  product_name?: string;
  specification?: string;
  quantity?: number;
  unit?: string;
  supplier_id?: string | null;
  unit_cost?: number;
  lead_time_days?: number;
  is_critical?: boolean;
  planned_eta?: Date | string | null;
  forecast_eta?: Date | string | null;
  actual_arrival?: Date | string | null;
  status?: string;
  qc_status?: string;
}

function calculateTotalCost(quantity: number, unitCost: number | undefined | null): number | undefined {
  if (unitCost === undefined || unitCost === null) return undefined;
  return Math.round(quantity * unitCost * 100) / 100;
}

function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().split('T')[0];
}

async function writeAuditLog(
  userId: string | undefined,
  action: string,
  resourceId: string,
  beforeValue?: any,
  afterValue?: any,
  reason?: string
) {
  await prisma.audit_logs.create({
    data: {
      user_id: userId,
      action,
      resource_type: 'bom_item',
      resource_id: resourceId,
      before_value: beforeValue ?? null,
      after_value: afterValue ?? null,
      reason: reason ?? null,
    },
  });
}

export async function createBomItem(input: CreateBomItemInput, userId: string) {
  const errors: string[] = [];
  if (!input.item_code?.trim()) errors.push('item_code is required');
  if (!input.product_name?.trim()) errors.push('product_name is required');
  if (input.quantity === undefined || input.quantity === null) errors.push('quantity is required');
  if (typeof input.quantity !== 'number' || input.quantity <= 0 || !Number.isInteger(input.quantity)) {
    errors.push('quantity must be a positive integer');
  }
  if (input.unit_cost !== undefined && input.unit_cost !== null && (typeof input.unit_cost !== 'number' || input.unit_cost < 0)) {
    errors.push('unit_cost must be a non-negative number');
  }

  if (errors.length > 0) {
    throw new Error(`VALIDATION_ERROR: ${errors.join('; ')}`);
  }

  const totalCost = calculateTotalCost(input.quantity, input.unit_cost);

  const bomItem = await prisma.bom_items.create({
    data: {
      project_id: input.project_id,
      item_code: input.item_code.trim(),
      product_name: input.product_name.trim(),
      specification: input.specification?.trim() ?? null,
      quantity: input.quantity,
      unit: input.unit?.trim() ?? null,
      supplier_id: input.supplier_id ?? null,
      unit_cost: input.unit_cost ?? null,
      total_cost: totalCost ?? null,
      lead_time_days: input.lead_time_days ?? null,
      is_critical: input.is_critical ?? false,
      planned_eta: input.planned_eta ? new Date(input.planned_eta) : null,
      status: 'pending',
      qc_status: 'pending',
      approval_status: 'draft',
    },
    include: { supplier: true },
  });

  await writeAuditLog(
    userId,
    'bom_item_created',
    bomItem.id,
    null,
    { item_code: bomItem.item_code, product_name: bomItem.product_name, quantity: bomItem.quantity, unit_cost: bomItem.unit_cost?.toString() }
  );

  return bomItem;
}

export async function updateBomItem(id: string, input: UpdateBomItemInput, userId: string) {
  const existing = await prisma.bom_items.findUnique({
    where: { id },
    include: { supplier: true },
  });

  if (!existing) {
    throw new Error('NOT_FOUND: BOM item not found');
  }

  if (existing.approval_status === 'approved') {
    throw new Error('FORBIDDEN: Cannot modify an approved BOM item. Reject or create a new version.');
  }

  const errors: string[] = [];
  if (input.quantity !== undefined && (typeof input.quantity !== 'number' || input.quantity <= 0 || !Number.isInteger(input.quantity))) {
    errors.push('quantity must be a positive integer');
  }
  if (input.unit_cost !== undefined && input.unit_cost !== null && (typeof input.unit_cost !== 'number' || input.unit_cost < 0)) {
    errors.push('unit_cost must be a non-negative number');
  }
  if (errors.length > 0) {
    throw new Error(`VALIDATION_ERROR: ${errors.join('; ')}`);
  }

  const newQuantity = input.quantity !== undefined ? input.quantity : existing.quantity;
  const newUnitCost = input.unit_cost !== undefined ? input.unit_cost : (existing.unit_cost ? Number(existing.unit_cost) : null);
  const totalCost = calculateTotalCost(newQuantity, newUnitCost);

  const updateData: any = {};
  if (input.product_name !== undefined) updateData.product_name = input.product_name;
  if (input.specification !== undefined) updateData.specification = input.specification?.trim() ?? null;
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.unit !== undefined) updateData.unit = input.unit?.trim() ?? null;
  if (input.supplier_id !== undefined) updateData.supplier_id = input.supplier_id;
  if (input.unit_cost !== undefined) updateData.unit_cost = input.unit_cost ?? null;
  if (totalCost !== undefined) updateData.total_cost = totalCost;
  if (input.lead_time_days !== undefined) updateData.lead_time_days = input.lead_time_days;
  if (input.is_critical !== undefined) updateData.is_critical = input.is_critical;
  if (input.planned_eta !== undefined) updateData.planned_eta = input.planned_eta ? new Date(input.planned_eta) : null;
  if (input.forecast_eta !== undefined) updateData.forecast_eta = input.forecast_eta ? new Date(input.forecast_eta) : null;
  if (input.actual_arrival !== undefined) updateData.actual_arrival = input.actual_arrival ? new Date(input.actual_arrival) : null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.qc_status !== undefined) updateData.qc_status = input.qc_status;
  updateData.updated_at = new Date();

  const bomItem = await prisma.bom_items.update({
    where: { id },
    data: updateData,
    include: { supplier: true },
  });

  await writeAuditLog(
    userId,
    'bom_item_updated',
    id,
    {
      product_name: existing.product_name,
      quantity: existing.quantity,
      unit_cost: existing.unit_cost?.toString(),
      supplier_id: existing.supplier_id,
      planned_eta: formatDate(existing.planned_eta),
      forecast_eta: formatDate(existing.forecast_eta),
      actual_arrival: formatDate(existing.actual_arrival),
    },
    {
      product_name: bomItem.product_name,
      quantity: bomItem.quantity,
      unit_cost: bomItem.unit_cost?.toString(),
      supplier_id: bomItem.supplier_id,
      planned_eta: formatDate(bomItem.planned_eta),
      forecast_eta: formatDate(bomItem.forecast_eta),
      actual_arrival: formatDate(bomItem.actual_arrival),
    }
  );

  return bomItem;
}

export async function submitBomItem(id: string, userId: string) {
  const existing = await prisma.bom_items.findUnique({ where: { id } });
  if (!existing) throw new Error('NOT_FOUND: BOM item not found');
  if (existing.approval_status !== 'draft') {
    throw new Error('VALIDATION_ERROR: Only draft items can be submitted');
  }

  const bomItem = await prisma.bom_items.update({
    where: { id },
    data: { approval_status: 'submitted', updated_at: new Date() },
    include: { supplier: true },
  });

  await writeAuditLog(userId, 'bom_item_submitted', id, { approval_status: 'draft' }, { approval_status: 'submitted' });
  return bomItem;
}

export async function approveBomItem(id: string, userId: string, role: string) {
  if (role !== 'dongmei' && role !== 'founder') {
    throw new Error('FORBIDDEN: Only Dongmei or Founder can approve BOM items');
  }

  const existing = await prisma.bom_items.findUnique({ where: { id } });
  if (!existing) throw new Error('NOT_FOUND: BOM item not found');
  if (existing.approval_status !== 'submitted') {
    throw new Error('VALIDATION_ERROR: Only submitted items can be approved');
  }

  const bomItem = await prisma.bom_items.update({
    where: { id },
    data: { approval_status: 'approved', approved_by: userId, approved_at: new Date(), updated_at: new Date() },
    include: { supplier: true },
  });

  await writeAuditLog(userId, 'bom_item_approved', id, { approval_status: 'submitted' }, { approval_status: 'approved', approved_by: userId });
  return bomItem;
}

export async function rejectBomItem(id: string, userId: string, role: string, reason?: string) {
  if (role !== 'dongmei' && role !== 'founder') {
    throw new Error('FORBIDDEN: Only Dongmei or Founder can reject BOM items');
  }

  const existing = await prisma.bom_items.findUnique({ where: { id } });
  if (!existing) throw new Error('NOT_FOUND: BOM item not found');
  if (existing.approval_status !== 'submitted') {
    throw new Error('VALIDATION_ERROR: Only submitted items can be rejected');
  }

  const bomItem = await prisma.bom_items.update({
    where: { id },
    data: { approval_status: 'rejected', approved_by: null, approved_at: null, updated_at: new Date() },
    include: { supplier: true },
  });

  await writeAuditLog(
    userId,
    'bom_item_rejected',
    id,
    { approval_status: 'submitted' },
    { approval_status: 'rejected' },
    reason ?? null
  );
  return bomItem;
}

export async function deleteBomItem(id: string, userId: string, role: string) {
  const existing = await prisma.bom_items.findUnique({ where: { id } });
  if (!existing) throw new Error('NOT_FOUND: BOM item not found');

  if (existing.approval_status === 'approved' && role !== 'founder') {
    throw new Error('FORBIDDEN: Only Founder can delete an approved BOM item');
  }

  await prisma.bom_items.delete({ where: { id } });

  await writeAuditLog(
    userId,
    'bom_item_deleted',
    id,
    { item_code: existing.item_code, product_name: existing.product_name },
    null
  );

  return { id, deleted: true };
}

export async function listBomItems(projectId: string) {
  return prisma.bom_items.findMany({
    where: { project_id: projectId },
    include: { supplier: true },
    orderBy: { created_at: 'asc' },
  });
}

export async function getBomItem(id: string) {
  return prisma.bom_items.findUnique({
    where: { id },
    include: { supplier: true },
  });
}

export async function areAllBomItemsApproved(projectId: string): Promise<boolean> {
  const totalCount = await prisma.bom_items.count({ where: { project_id: projectId } });
  if (totalCount === 0) return false;

  const approvedCount = await prisma.bom_items.count({
    where: { project_id: projectId, approval_status: 'approved' },
  });

  return totalCount === approvedCount;
}

export async function getBomSummary(projectId: string) {
  const items = await prisma.bom_items.findMany({
    where: { project_id: projectId },
    select: {
      approval_status: true,
      total_cost: true,
      is_critical: true,
      status: true,
      qc_status: true,
    },
  });

  const totalItems = items.length;
  const approvedItems = items.filter(i => i.approval_status === 'approved').length;
  const totalCost = items.reduce((sum, i) => sum + Number(i.total_cost ?? 0), 0);
  const criticalItems = items.filter(i => i.is_critical).length;
  const itemsWithSupplier = items.filter(i => i.status !== 'pending').length;

  return {
    total_items: totalItems,
    approved_items: approvedItems,
    pending_approval: totalItems - approvedItems,
    total_cost: totalCost.toFixed(2),
    critical_items: criticalItems,
    items_with_supplier: itemsWithSupplier,
  };
}
