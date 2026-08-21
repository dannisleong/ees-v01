import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { AlertCircle, CheckCircle, Clock, Ban, UserCheck, Wrench } from 'lucide-react';

export function ProjectDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/projects/${id}`)
      .then(setProject)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>;
  if (!project) return <div className="p-8 text-center">{t('common.error')}</div>;

  const order = project.customer_orders?.[0];
  const deposits = order?.customer_deposits || [];
  const totalDeposits = deposits.reduce((sum: number, d: any) => sum + parseFloat(d.deposit_amount), 0);

  // Compute gate overall status per Amendment #1
  const gateResults = project.gate_results || [];
  const latestGate = gateResults.sort(
    (a: any, b: any) => (new Date(b.evaluated_at).getTime() || 0) - (new Date(a.evaluated_at).getTime() || 0)
  )[0];
  const gateOverall = computeGateOverall(latestGate, t);

  // Compute margin status per Amendment #4
  const currentCost = project.landed_costs?.[0];
  const marginStatus = computeMarginStatus(
    currentCost?.margin_percent ? Number(currentCost.margin_percent) : null,
    project.target_margin_percent ? Number(project.target_margin_percent) : null,
    t
  );
    project.target_margin_percent ? Number(project.target_margin_percent) : null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name_en || project.name_zh || project.project_code}</h1>
          <p className="text-sm text-muted-foreground">{project.project_code} — {t('projects.stageLabel', { stage: project.current_stage })} / {t('projects.gateLabel', { gate: project.current_gate })}</p>
        </div>
        <div className="flex items-center gap-2">
          <GateOverallBadge status={gateOverall.status} label={gateOverall.label} />
          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>{project.status}</Badge>
        </div>
      </div>

      {/* Ownership Banner per Amendment #2 */}
      <OwnershipBanner t={t} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('projects.overview')}</TabsTrigger>
          <TabsTrigger value="order">{t('projects.order')}</TabsTrigger>
          <TabsTrigger value="gates">{t('projectCockpit.gates')}</TabsTrigger>
          <TabsTrigger value="audits">{t('projects.audits')}</TabsTrigger>
          <TabsTrigger value="issues">{t('projects.issues')}</TabsTrigger>
          <TabsTrigger value="partners">{t('projects.partners')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <Card>
            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t('owners.cammy')}</p>
                <p className="font-medium">{project.cammy?.name_en || '-'}</p>
                <p className="text-[10px] text-muted-foreground">{t('ownership.cammy')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('owners.dongmei')}</p>
                <p className="font-medium">{project.dongmei?.name_en || '-'}</p>
                <p className="text-[10px] text-muted-foreground">{t('ownership.dongmei')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('owners.pm')}</p>
                <p className="font-medium">{project.pm?.name_en || '-'}</p>
                <p className="text-[10px] text-muted-foreground">{t('ownership.pm')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('projects.name')}</p>
                <p className="font-medium">{project.customer?.name || '-'}</p>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('projectCockpit.cost')}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">${currentCost?.selling_price ? Number(currentCost.selling_price).toLocaleString() : '0'}</p>
                <p className="text-xs text-muted-foreground">{t('projects.order')} {t('projectCockpit.cost')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('pilot.projectCost')}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">${currentCost?.total_landed_cost ? Number(currentCost.total_landed_cost).toLocaleString() : '0'}</p>
                <p className="text-xs text-muted-foreground">{t('pilot.projectCost')}</p>
              </CardContent>
            </Card>
            <Card className={marginStatus.borderClass}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('pilot.margin')}</CardTitle></CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${marginStatus.textClass}`}>
                  {currentCost?.margin_percent != null ? `${Number(currentCost.margin_percent).toFixed(1)}%` : '-'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {project.target_margin_percent != null && (
                    <span>{t('projectCockpit.target')}: {Number(project.target_margin_percent).toFixed(1)}%</span>
                  )}
                  {marginStatus.label && (
                    <span className={`ml-2 font-medium ${marginStatus.textClass}`}>{marginStatus.label}</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="order" className="space-y-3">
          {order ? (
            <>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between"><span>{t('projects.order')} {t('common.amount')}</span><span className="font-bold">${order.order_amount}</span></div>
                  <div className="flex justify-between"><span>{t('projects.order')} {t('gate.depositRequired')}</span><span className="font-bold">${order.deposit_required}</span></div>
                  <div className="flex justify-between"><span>{t('projects.order')} {t('projectCockpit.totalDeposits')}</span><span className="font-bold">${totalDeposits}</span></div>
                  <div className="flex justify-between"><span>{t('projects.order')} {t('projectCockpit.balance')}</span><span className="font-bold">${parseFloat(order.order_amount) - totalDeposits}</span></div>
                  <div className="flex justify-between"><span>{t('projects.order')} {t('projectCockpit.paymentStatus')}</span>
                    <Badge variant={order.payment_status === 'deposit_received' ? 'default' : order.payment_status === 'fully_paid' ? 'default' : 'destructive'}>
                      {t('finance.' + ({ pending_deposit: 'pendingDeposit', partial_deposit: 'partialDeposit', deposit_received: 'depositReceived', fully_paid: 'fullyPaid' } as Record<string, string>)[order.payment_status] || order.payment_status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">{t('projectCockpit.depositRecords')}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {deposits.map((d: any) => (
                    <div key={d.id} className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>${d.deposit_amount}</span>
                      <span className="text-sm text-muted-foreground">{d.received_date}</span>
                    </div>
                  ))}
                  {deposits.length === 0 && <p className="text-sm text-muted-foreground">{t('projectCockpit.noDeposits')}</p>}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-muted-foreground">{t('projectCockpit.noOrder')}</p>
          )}
        </TabsContent>

        <TabsContent value="gates" className="space-y-3">
          {gateResults.map((gr: any) => {
            const gateColor = gr.result === 'NO-GO' ? 'red' : gr.result === 'GO' ? 'green' : 'yellow';
            const owner = gr.gate?.gate_number <= 2 ? t('owners.cammy') : t('owners.dongmei');
            const escalation = gr.result === 'NO-GO' ? t('owners.founder') : '-';
            return (
              <Card key={gr.id} className={
                gateColor === 'red' ? 'border-red-300' :
                gateColor === 'green' ? 'border-green-300' :
                'border-amber-300'
              }>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {gateColor === 'green' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                       gateColor === 'red' ? <Ban className="h-5 w-5 text-red-600" /> :
                       <Clock className="h-5 w-5 text-amber-600" />}
                      <div>
                        <p className="font-medium">Gate {gr.gate?.gate_number}: {gr.gate?.name_en}</p>
                        <p className="text-xs text-muted-foreground">{gr.reason || t('projectCockpit.noReason')}</p>
                      </div>
                    </div>
                    <Badge variant={gr.result === 'GO' ? 'default' : gr.result === 'NO-GO' ? 'destructive' : 'secondary'}>
                      {gr.result}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> {t('projectCockpit.owner')}: {owner}</span>
                    {escalation !== '-' && (
                      <span className="flex items-center gap-1 text-red-600"><AlertCircle className="h-3 w-3" /> {t('projectCockpit.escalation')}: {escalation}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {gateResults.length === 0 && (
            <p className="text-muted-foreground">{t('projectCockpit.noGateEvaluations')}</p>
          )}
        </TabsContent>

        <TabsContent value="audits" className="space-y-3">
          {project.quality_audits?.map((audit: any) => (
            <Card key={audit.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{audit.audit_number}</span>
                  <Badge variant={audit.result === 'pass' ? 'default' : audit.result === 'fail' ? 'destructive' : 'secondary'}>
                    {audit.result}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{audit.audit_items?.length || 0} items</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/audits/${audit.id}`}>{t('audit.checklist')}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="issues" className="space-y-3">
          {project.issues?.map((issue: any) => (
            <Card key={issue.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{issue.issue_number}: {issue.title}</span>
                  <Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}>{issue.severity}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{issue.status}</p>
                {issue.assigned_to && (
                  <p className="text-xs text-muted-foreground mt-1">{t('projectCockpit.owner')}: {issue.assigned_to}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="partners" className="space-y-3">
          {project.project_partners?.map((pp: any) => (
            <Card key={pp.partner_id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{pp.partner?.name}</span>
                  <Badge variant={pp.status === 'active' ? 'default' : 'secondary'}>{pp.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{pp.partner?.type}</p>
                {/* Amendment #3: Singapore Partner ownership separation */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t">
                  <span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> {t('projectCockpit.executionOwner')}: {t('owners.singaporePartner')}</span>
                  <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> {t('projectCockpit.eesOwner')}: {t('owners.cammy')} / {t('owners.dongmei')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!project.project_partners || project.project_partners.length === 0) && (
            <p className="text-muted-foreground">{t('projectCockpit.noPartners')}</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeGateOverall(latestGate: any, t: any) {
  if (!latestGate) return { status: 'yellow' as const, label: t('gate.pending') };
  if (latestGate.result === 'NO-GO') return { status: 'red' as const, label: t('gate.noGo') };
  if (latestGate.result === 'GO') {
    // Amendment #1: If latest gate is GO but not Gate 06, overall is yellow (in progress)
    if (latestGate.gate?.gate_number < 6) {
      return { status: 'yellow' as const, label: t('gate.pending') };
    }
    return { status: 'green' as const, label: t('gate.go') };
  }
  return { status: 'yellow' as const, label: t('gate.pending') };
}

function computeMarginStatus(marginPercent: number | null, targetPercent: number | null, t: any) {
  if (marginPercent == null || targetPercent == null) {
    return { color: 'gray' as const, label: '', textClass: '', borderClass: '' };
  }
  const diff = targetPercent - marginPercent; // percentage points below target

  if (marginPercent >= targetPercent) {
    return { color: 'green' as const, label: t('finance.onTarget'), textClass: 'text-green-600', borderClass: 'border-green-200' };
  }
  if (diff <= 5) {
    return { color: 'yellow' as const, label: t('finance.ppBelow', { diff: diff.toFixed(1) }), textClass: 'text-amber-600', borderClass: 'border-amber-200' };
  }
  return { color: 'red' as const, label: t('finance.ppBelow', { diff: diff.toFixed(1) }), textClass: 'text-red-600', borderClass: 'border-red-200' };
}

function GateOverallBadge({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    green: 'bg-green-100 text-green-700 border-green-200',
    yellow: 'bg-amber-100 text-amber-700 border-amber-200',
    red: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <Badge variant="outline" className={styles[status] || styles.yellow}>
      {label}
    </Badge>
  );
}

function OwnershipBanner({ t }: { t: any }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground bg-slate-100 rounded-lg p-3">
      <span><strong>{t('owners.cammy')}</strong>: {t('ownership.cammy')}</span>
      <span className="hidden sm:inline">|</span>
      <span><strong>{t('owners.dongmei')}</strong>: {t('ownership.dongmei')}</span>
      <span className="hidden sm:inline">|</span>
      <span><strong>{t('owners.founder')}</strong>: {t('ownership.founder')}</span>
      <span className="hidden sm:inline">|</span>
      <span><strong>{t('owners.singaporePartner')}</strong>: {t('ownership.singaporePartner')}</span>
    </div>
  );
}
