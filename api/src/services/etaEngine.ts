/**
 * ETA Engine — Business Logic Service
 *
 * Extends the BOM data model (bom_items remains SSOT for current ETA).
 * eta_tracking records capture ETA change history.
 * Critical delay detection auto-creates Risk entries.
 *
 * Flow: Planned ETA → Forecast ETA → Actual Arrival → Variance → Risk/Alert
 */

import { prisma } from '../lib/prisma';

export interface UpdateEtaInput {
  planned_eta?: Date | string | null;
  forecast_eta?: Date | string | null;
  actual_arrival?: Date | string | null;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
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
      resource_type: 'eta_tracking',
      resource_id: resourceId,
      before_value: beforeValue ?? null,
      after_value: afterValue ?? null,
      reason: reason ?? null,
    },
  });
}

/**
 * Update ETA fields on a BOM item.
 * Creates an eta_tracking history record.
 * Calculates variance if actual_arrival is provided.
 * Auto-creates Risk for critical items with delays.
 */
export async function updateBomEta(
  bomItemId: string,
  input: UpdateEtaInput,
  userId: string,
  role: string
) {
  // RBAC check
  const writeRoles = ['dongmei', 'founder'];
  if (!writeRoles.includes(role)) {
    throw new Error('FORBIDDEN: Insufficient role to update ETA');
  }

  const bomItem = await prisma.bom_items.findUnique({
    where: { id: bomItemId },
    include: { supplier: true, project: true },
  });

  if (!bomItem) {
    throw new Error('NOT_FOUND: BOM item not found');
  }

  // Prepare update data for bom_items
  const updateData: any = {};
  const newPlanned = toDate(input.planned_eta);
  const newForecast = toDate(input.forecast_eta);
  const newActual = toDate(input.actual_arrival);

  if (input.planned_eta !== undefined) updateData.planned_eta = newPlanned;
  if (input.forecast_eta !== undefined) updateData.forecast_eta = newForecast;
  if (input.actual_arrival !== undefined) updateData.actual_arrival = newActual;
  updateData.updated_at = new Date();

  // Update BOM item (SSOT)
  const updatedBomItem = await prisma.bom_items.update({
    where: { id: bomItemId },
    data: updateData,
    include: { supplier: true },
  });

  // Calculate variance if actual arrival is known
  let varianceDays: number | null = null;
  let alertTriggered = false;

  const planned = newPlanned ?? bomItem.planned_eta;
  const actual = newActual ?? bomItem.actual_arrival;

  if (planned && actual) {
    varianceDays = daysBetween(planned, actual);
    // Alert if delayed (variance > 0) and item is critical
    if (varianceDays > 0 && bomItem.is_critical) {
      alertTriggered = true;
    }
  }

  // Also alert if forecast is later than planned (predicted delay on critical item)
  const forecast = newForecast ?? bomItem.forecast_eta;
  if (planned && forecast && !actual) {
    const forecastVariance = daysBetween(planned, forecast);
    if (forecastVariance > 0 && bomItem.is_critical) {
      alertTriggered = true;
    }
  }

  // Create eta_tracking history record
  const etaRecord = await prisma.eta_tracking.create({
    data: {
      project_id: bomItem.project_id,
      bom_item_id: bomItemId,
      planned_eta: planned,
      forecast_eta: forecast,
      actual_arrival: actual,
      variance_days: varianceDays,
      alert_triggered: alertTriggered,
    },
  });

  // Auto-create Risk for critical delays
  if (alertTriggered) {
    const existingRisk = await prisma.risks.findFirst({
      where: {
        project_id: bomItem.project_id,
        description: { contains: bomItem.item_code },
        category: 'eta_delay',
        status: 'open',
      },
    });

    if (!existingRisk) {
      const riskNumber = `RISK-${Date.now()}`;
      await prisma.risks.create({
        data: {
          project_id: bomItem.project_id,
          risk_number: riskNumber,
          category: 'eta_delay',
          description: `Critical BOM item ${bomItem.item_code} (${bomItem.product_name}) delayed by ${varianceDays ?? 'forecasted'} days.`,
          probability: actual ? 100 : 80,
          impact: Math.min((varianceDays ?? 5) * 10, 100),
          risk_level: 'high',
          owner_id: bomItem.project.pm_id ?? userId,
          status: 'open',
          created_by: userId,
        },
      });
    }
  }

  // Audit log
  await writeAuditLog(
    userId,
    'eta_updated',
    etaRecord.id,
    {
      planned_eta: bomItem.planned_eta?.toISOString().split('T')[0] ?? null,
      forecast_eta: bomItem.forecast_eta?.toISOString().split('T')[0] ?? null,
      actual_arrival: bomItem.actual_arrival?.toISOString().split('T')[0] ?? null,
    },
    {
      planned_eta: updatedBomItem.planned_eta?.toISOString().split('T')[0] ?? null,
      forecast_eta: updatedBomItem.forecast_eta?.toISOString().split('T')[0] ?? null,
      actual_arrival: updatedBomItem.actual_arrival?.toISOString().split('T')[0] ?? null,
      variance_days: varianceDays,
      alert_triggered: alertTriggered,
    }
  );

  return { bomItem: updatedBomItem, etaRecord, varianceDays, alertTriggered };
}

/**
 * List ETA tracking history for a project.
 */
export async function listEtaTracking(projectId: string) {
  return prisma.eta_tracking.findMany({
    where: { project_id: projectId },
    include: {
      project: { select: { project_code: true, name_en: true } },
    },
    orderBy: { created_at: 'desc' },
  });
}

/**
 * Get ETA tracking with BOM item details.
 */
export async function listEtaTrackingWithBom(projectId: string) {
  const records = await prisma.eta_tracking.findMany({
    where: { project_id: projectId },
    orderBy: { created_at: 'desc' },
  });

  const bomItemIds = [...new Set(records.map(r => r.bom_item_id).filter(Boolean))];
  const bomItems = await prisma.bom_items.findMany({
    where: { id: { in: bomItemIds as string[] } },
    include: { supplier: true },
  });

  const bomMap = new Map(bomItems.map(b => [b.id, b]));

  return records.map(r => ({
    ...r,
    bom_item: r.bom_item_id ? bomMap.get(r.bom_item_id) : null,
  }));
}

/**
 * Get ETA summary for dashboard.
 */
export async function getEtaSummary(projectId: string) {
  const bomItems = await prisma.bom_items.findMany({
    where: { project_id: projectId },
    select: {
      id: true,
      item_code: true,
      product_name: true,
      is_critical: true,
      planned_eta: true,
      forecast_eta: true,
      actual_arrival: true,
      status: true,
    },
  });

  const totalItems = bomItems.length;
  const itemsWithPlannedEta = bomItems.filter(i => i.planned_eta).length;
  const itemsWithForecastEta = bomItems.filter(i => i.forecast_eta).length;
  const itemsArrived = bomItems.filter(i => i.actual_arrival).length;

  let delayedItems = 0;
  let criticalDelayedItems = 0;
  let totalVarianceDays = 0;

  for (const item of bomItems) {
    if (item.planned_eta && item.actual_arrival) {
      const variance = daysBetween(item.planned_eta, item.actual_arrival);
      if (variance > 0) {
        delayedItems++;
        totalVarianceDays += variance;
        if (item.is_critical) criticalDelayedItems++;
      }
    } else if (item.planned_eta && item.forecast_eta && !item.actual_arrival) {
      const forecastVariance = daysBetween(item.planned_eta, item.forecast_eta);
      if (forecastVariance > 0) {
        delayedItems++;
        totalVarianceDays += forecastVariance;
        if (item.is_critical) criticalDelayedItems++;
      }
    }
  }

  // Count active ETA alerts
  const alertCount = await prisma.eta_tracking.count({
    where: { project_id: projectId, alert_triggered: true },
  });

  // Count auto-created ETA risks
  const etaRisks = await prisma.risks.count({
    where: { project_id: projectId, category: 'eta_delay', status: 'open' },
  });

  return {
    total_items: totalItems,
    items_with_planned_eta: itemsWithPlannedEta,
    items_with_forecast_eta: itemsWithForecastEta,
    items_arrived: itemsArrived,
    delayed_items: delayedItems,
    critical_delayed_items: criticalDelayedItems,
    total_variance_days: totalVarianceDays,
    alert_count: alertCount,
    open_eta_risks: etaRisks,
  };
}

/**
 * Get latest ETA status for each BOM item in a project.
 */
export async function getLatestEtaByBomItem(projectId: string) {
  const bomItems = await prisma.bom_items.findMany({
    where: { project_id: projectId },
    include: { supplier: true },
    orderBy: { item_code: 'asc' },
  });

  return bomItems.map(item => {
    let status: 'on_time' | 'delayed' | 'ahead' | 'pending' = 'pending';
    let varianceDays: number | null = null;

    if (item.planned_eta && item.actual_arrival) {
      varianceDays = daysBetween(item.planned_eta, item.actual_arrival);
      status = varianceDays > 0 ? 'delayed' : varianceDays < 0 ? 'ahead' : 'on_time';
    } else if (item.planned_eta && item.forecast_eta) {
      varianceDays = daysBetween(item.planned_eta, item.forecast_eta);
      status = varianceDays > 0 ? 'delayed' : varianceDays < 0 ? 'ahead' : 'on_time';
    }

    return {
      ...item,
      eta_status: status,
      variance_days: varianceDays,
    };
  });
}
