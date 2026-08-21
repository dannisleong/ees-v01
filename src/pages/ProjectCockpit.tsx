import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProject } from '@/contexts/ProjectContext';
import { api } from '@/lib/api';
import {
  Package, Clock, DollarSign, ShieldAlert,
  CheckCircle2, Gauge, ArrowRight, Ban, FileText,
  ClipboardList
} from 'lucide-react';

interface CockpitData {
  project: {
    id: string;
    code: string;
    name: string | null;
    customer: string | null;
    status: string;
    currentStage: number | null;
    currentGate: number | null;
  };
  gateStatus: {
    latestGate: { number: number; result: string; evaluatedAt: Date } | null;
    isBlocked: boolean;
  };
  bomStatus: {
    totalItems: number;
    approvedItems: number;
    criticalItems: number;
    delayedItems: number;
  };
  etaSummary: {
    total_bom: number;
    critical_bom: number;
    arrived: number;
    delayed: number;
    next_eta: Date | null;
  };
  riskSummary: {
    openRisks: number;
    criticalRisks: number;
  };
  issueSummary: {
    openIssues: number;
    overdueIssues: number;
  };
  costSummary: {
    totalLandedCost: number;
    sellingPrice: number | null;
    marginPercent: number | null;
    targetMargin: number | null;
  } | null;
  partners: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
  }>;
}

const SEMANTIC = {
  green: { border: 'border-green-200', text: 'text-green-600', bg: 'bg-green-100', label: 'text-green-700' },
  yellow: { border: 'border-amber-200', text: 'text-amber-600', bg: 'bg-amber-100', label: 'text-amber-700' },
  red: { border: 'border-red-200', text: 'text-red-600', bg: 'bg-red-100', label: 'text-red-700' },
  neutral: { border: 'border-slate-200', text: 'text-slate-500', bg: 'bg-slate-100', label: 'text-slate-700' },
};

export function ProjectCockpit() {
  const { t } = useTranslation();
  const { selectedProjectId, loading: projectLoading } = useProject();
  const [data, setData] = useState<CockpitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    if (!selectedProjectId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    api.get(`/dashboard/project/${selectedProjectId}`)
      .then((res: any) => setData(res))
      .catch((err) => setError(err.error || t('common.failedToLoad')))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  if (projectLoading || loading) return <div className="p-8 text-center">{t('common.loading')}</div>;

  if (!selectedProjectId) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">{t('projectCockpit.selectProjectPrompt')}</p>
        <Button asChild>
          <Link to="/projects">{t('projects.title')}</Link>
        </Button>
      </div>
    );
  }

  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">{t('common.error')}</div>;

  const project = data.project;
  const gateOverall = computeGateOverall(data.gateStatus, t);
  const marginStatus = computeMarginStatus(data.costSummary, t);
  const currency = t('finance.currency');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gauge className="h-6 w-6" />
            {t('projectCockpit.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {project.code} — {project.name || project.code}
            {project.customer && <span className="ml-2 text-slate-400">| {project.customer}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GateBadge status={gateOverall.status} label={gateOverall.label} />
          <Button size="sm" variant="outline" asChild>
            <Link to={`/projects/${project.id}`}>{t('projects.view')}</Link>
          </Button>
        </div>
      </div>

      {/* Ownership Banner */}
      <OwnershipBanner t={t} />

      {/* Cockpit Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">{t('projectCockpit.overview')}</TabsTrigger>
          <TabsTrigger value="order">{t('projectCockpit.orderDeposit')}</TabsTrigger>
          <TabsTrigger value="bom">{t('projectCockpit.bom')}</TabsTrigger>
          <TabsTrigger value="eta">{t('projectCockpit.eta')}</TabsTrigger>
          <TabsTrigger value="gates">{t('projectCockpit.gates')}</TabsTrigger>
          <TabsTrigger value="quality">{t('projectCockpit.quality')}</TabsTrigger>
          <TabsTrigger value="suppliers">{t('projectCockpit.suppliers')}</TabsTrigger>
          <TabsTrigger value="partners">{t('projectCockpit.partners')}</TabsTrigger>
          <TabsTrigger value="risks">{t('projectCockpit.risks')}</TabsTrigger>
          <TabsTrigger value="issues">{t('projects.issues')}</TabsTrigger>
          <TabsTrigger value="documents">{t('projectCockpit.documents')}</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          {/* KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CockpitTile icon={<Package className="h-6 w-6" />} title={t('projectCockpit.bom')} linkTo={`/project-cockpit?tab=bom`} color={data.bomStatus.delayedItems > 0 ? 'red' : data.bomStatus.approvedItems < data.bomStatus.totalItems ? 'yellow' : 'green'}>
              <div className="text-2xl font-bold">{data.bomStatus.approvedItems}/{data.bomStatus.totalItems}</div>
              <div className="text-xs text-muted-foreground">
                {data.bomStatus.criticalItems} {t('projectCockpit.critical')}
                {data.bomStatus.delayedItems > 0 && <span className="text-red-600 font-medium ml-2">{data.bomStatus.delayedItems} {t('projectCockpit.delayed')}</span>}
              </div>
            </CockpitTile>

            <CockpitTile icon={<Clock className="h-6 w-6" />} title={t('projectCockpit.eta')} linkTo={`/project-cockpit?tab=eta`} color={data.etaSummary.delayed > 0 ? 'red' : data.etaSummary.arrived < data.etaSummary.total_bom ? 'yellow' : 'green'}>
              <div className="text-2xl font-bold">{data.etaSummary.arrived}/{data.etaSummary.total_bom}</div>
              <div className="text-xs text-muted-foreground">
                {data.etaSummary.delayed > 0 ? <span className="text-red-600 font-medium">{data.etaSummary.delayed} {t('projectCockpit.delayed')}</span> : <span>{t('projectCockpit.onTrack')}</span>}
              </div>
            </CockpitTile>

            <CockpitTile icon={<DollarSign className="h-6 w-6" />} title={t('finance.grossMargin')} linkTo={`/project-cockpit?tab=order`} color={marginStatus.color}>
              <div className="text-2xl font-bold">{data.costSummary?.marginPercent != null ? `${data.costSummary.marginPercent.toFixed(1)}%` : '-'}</div>
              <div className="text-xs text-muted-foreground">
                {data.costSummary?.targetMargin != null && <span>{t('finance.targetMargin')}: {data.costSummary.targetMargin.toFixed(1)}%</span>}
                {marginStatus.label && <span className={`ml-2 font-medium ${marginStatus.textClass}`}>{marginStatus.label}</span>}
              </div>
            </CockpitTile>

            <CockpitTile icon={<ShieldAlert className="h-6 w-6" />} title={t('projectCockpit.risks')} linkTo={`/project-cockpit?tab=risks`} color={data.riskSummary.criticalRisks > 0 ? 'red' : data.riskSummary.openRisks > 0 ? 'yellow' : 'green'}>
              <div className="text-2xl font-bold">{data.riskSummary.openRisks}</div>
              <div className="text-xs text-muted-foreground">
                {data.riskSummary.criticalRisks > 0 ? <span className="text-red-600 font-medium">{data.riskSummary.criticalRisks} {t('projectCockpit.critical')}</span> : <span>{t('projectCockpit.noOpenRisks')}</span>}
              </div>
            </CockpitTile>
          </div>

          {/* Action Center */}
          <ActionCenter data={data} t={t} />
        </TabsContent>

        {/* ORDER & DEPOSIT TAB */}
        <TabsContent value="order" className="space-y-4">
          <OrderDepositTab projectId={project.id} currency={currency} t={t} />
        </TabsContent>

        {/* BOM TAB */}
        <TabsContent value="bom" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('projectCockpit.bom')}</h3>
            <Button size="sm" asChild>
              <Link to={`/bom?project=${project.id}`}>{t('common.view')} {t('projectCockpit.bom')}</Link>
            </Button>
          </div>
          <BomMiniList projectId={project.id} t={t} />
        </TabsContent>

        {/* ETA TAB */}
        <TabsContent value="eta" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('projectCockpit.eta')}</h3>
            <Button size="sm" asChild>
              <Link to={`/eta?project=${project.id}`}>{t('common.view')} {t('projectCockpit.eta')}</Link>
            </Button>
          </div>
          <EtaMiniList projectId={project.id} t={t} />
        </TabsContent>

        {/* GATES TAB */}
        <TabsContent value="gates" className="space-y-4">
          <GatesTab projectId={project.id} t={t} />
        </TabsContent>

        {/* QUALITY TAB */}
        <TabsContent value="quality" className="space-y-4">
          <QualityTab projectId={project.id} t={t} />
        </TabsContent>

        {/* SUPPLIERS TAB */}
        <TabsContent value="suppliers" className="space-y-4">
          <SuppliersTab projectId={project.id} t={t} />
        </TabsContent>

        {/* PARTNERS TAB */}
        <TabsContent value="partners" className="space-y-4">
          <PartnersTab data={data} t={t} />
        </TabsContent>

        {/* RISKS TAB */}
        <TabsContent value="risks" className="space-y-4">
          <RisksTab projectId={project.id} t={t} />
        </TabsContent>

        {/* ISSUES TAB */}
        <TabsContent value="issues" className="space-y-4">
          <IssuesTab projectId={project.id} t={t} />
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="space-y-4">
          <DocumentsTab projectId={project.id} t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Helper Components ───────────────────────────────────────────────────────

function computeGateOverall(gateStatus: CockpitData['gateStatus'], t: any) {
  if (gateStatus.isBlocked) return { status: 'red' as const, label: t('gate.noGo') };
  if (!gateStatus.latestGate) return { status: 'yellow' as const, label: t('gate.pending') };
  if (gateStatus.latestGate.result === 'GO') {
    if (gateStatus.latestGate.number < 6) return { status: 'yellow' as const, label: t('gate.pending') };
    return { status: 'green' as const, label: t('gate.go') };
  }
  return { status: 'yellow' as const, label: t('gate.pending') };
}

function computeMarginStatus(costSummary: CockpitData['costSummary'], t: any) {
  if (!costSummary || costSummary.marginPercent == null || costSummary.targetMargin == null) {
    return { color: 'neutral' as const, label: '', textClass: '', borderClass: '' };
  }
  const actual = costSummary.marginPercent;
  const target = costSummary.targetMargin;
  const diff = target - actual;
  if (actual >= target) return { color: 'green' as const, label: t('finance.onTarget'), textClass: 'text-green-600', borderClass: 'border-green-200' };
  if (diff <= 5) return { color: 'yellow' as const, label: t('finance.ppBelow', { diff: diff.toFixed(1) }), textClass: 'text-amber-600', borderClass: 'border-amber-200' };
  return { color: 'red' as const, label: t('finance.ppBelow', { diff: diff.toFixed(1) }), textClass: 'text-red-600', borderClass: 'border-red-200' };
}

function GateBadge({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    green: 'bg-green-100 text-green-700 border-green-200',
    yellow: 'bg-amber-100 text-amber-700 border-amber-200',
    red: 'bg-red-100 text-red-700 border-red-200',
  };
  return <Badge variant="outline" className={styles[status] || styles.yellow}>{label}</Badge>;
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

function CockpitTile({ icon, title, linkTo, color, children }: {
  icon: React.ReactNode; title: string; linkTo: string; color: 'green' | 'yellow' | 'red' | 'neutral';
  children: React.ReactNode;
}) {
  const c = SEMANTIC[color] || SEMANTIC.neutral;
  return (
    <Link to={linkTo} className="block">
      <Card className={`transition-colors ${c.border} hover:shadow-sm`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={c.text}>{icon}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
          {children}
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Action Center ───────────────────────────────────────────────────────────

function ActionCenter({ data, t }: { data: CockpitData; t: any }) {
  const actions: Array<{
    priority: 'critical' | 'high' | 'medium';
    action: string;
    owner: string;
    escalation: string;
    due: string;
    link: string;
  }> = [];

  if (data.bomStatus.delayedItems > 0) {
    actions.push({
      priority: 'critical',
      action: t('projectCockpit.action.bomDelay', { count: data.bomStatus.delayedItems }),
      owner: t('owners.dongmei'),
      escalation: t('owners.founder'),
      due: data.etaSummary.next_eta ? new Date(data.etaSummary.next_eta).toISOString().split('T')[0] : '—',
      link: `/project-cockpit?tab=bom`,
    });
  }
  if (data.riskSummary.criticalRisks > 0) {
    actions.push({
      priority: 'critical',
      action: t('projectCockpit.action.criticalRisk', { count: data.riskSummary.criticalRisks }),
      owner: t('owners.founder'),
      escalation: t('owners.founder'),
      due: '—',
      link: `/project-cockpit?tab=risks`,
    });
  }
  if (data.issueSummary.overdueIssues > 0) {
    actions.push({
      priority: 'high',
      action: t('projectCockpit.action.overdueIssue', { count: data.issueSummary.overdueIssues }),
      owner: t('owners.cammy'),
      escalation: t('owners.founder'),
      due: '—',
      link: `/project-cockpit?tab=issues`,
    });
  }
  if (data.gateStatus.isBlocked) {
    actions.push({
      priority: 'critical',
      action: t('projectCockpit.gateBlocked', { gate: data.gateStatus.latestGate?.number || '?' }),
      owner: t('owners.dongmei'),
      escalation: t('owners.founder'),
      due: '—',
      link: `/project-cockpit?tab=gates`,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          {t('projectCockpit.actionCenter')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">{t('pilot.noActions')}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map((a, i) => (
              <div key={i} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border ${a.priority === 'critical' ? 'border-red-200 bg-red-50' : a.priority === 'high' ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={a.priority === 'critical' ? 'border-red-300 text-red-700' : 'border-amber-300 text-amber-700'}>
                      {a.priority.toUpperCase()}
                    </Badge>
                    <span className="font-medium text-sm">{a.action}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{t('projectCockpit.owner')}: {a.owner}</span>
                    <span>{t('projectCockpit.escalation')}: {a.escalation}</span>
                    <span>{t('projectCockpit.due')}: {a.due}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to={a.link}>{t('common.view')}</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Tab Components (inline data) ────────────────────────────────────────────

function OrderDepositTab({ projectId, currency, t }: { projectId: string; currency: string; t: any }) {
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    api.get(`/projects/${projectId}`).then(setOrderData).catch(console.error);
  }, [projectId]);

  if (!orderData) return <div className="p-4 text-center">{t('common.loading')}</div>;

  const order = orderData.customer_orders?.[0];
  const deposits = order?.customer_deposits || [];
  const totalDeposits = deposits.reduce((sum: number, d: any) => sum + parseFloat(d.deposit_amount), 0);
  const currentCost = orderData.landed_costs?.[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('finance.sellingPrice')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{currency} {currentCost?.selling_price ? Number(currentCost.selling_price).toLocaleString() : '0'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('finance.totalLandedCost')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{currency} {currentCost?.total_landed_cost ? Number(currentCost.total_landed_cost).toLocaleString() : '0'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('finance.grossProfit')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{currency} {currentCost?.gross_margin ? Number(currentCost.gross_margin).toLocaleString() : '0'}</p></CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('finance.grossMargin')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{currentCost?.margin_percent ? Number(currentCost.margin_percent).toFixed(1) : '0'}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('finance.targetMargin')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{orderData.target_margin_percent ? Number(orderData.target_margin_percent).toFixed(1) : '0'}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('projectCockpit.balance')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{currency} {order ? (parseFloat(order.order_amount) - totalDeposits).toLocaleString() : '0'}</p></CardContent>
        </Card>
      </div>
      {order && (
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('projectCockpit.depositRecords')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {deposits.map((d: any) => (
              <div key={d.id} className="flex justify-between p-2 bg-slate-50 rounded">
                <span>{currency} {d.deposit_amount}</span>
                <span className="text-sm text-muted-foreground">{d.received_date}</span>
              </div>
            ))}
            {deposits.length === 0 && <p className="text-sm text-muted-foreground">{t('projectCockpit.noDeposits')}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BomMiniList({ projectId, t }: { projectId: string; t: any }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.get(`/projects/${projectId}`).then(d => setItems(d.bom_items || [])).catch(console.error); }, [projectId]);
  if (items.length === 0) return <p className="text-muted-foreground">{t('bom.noBomItems')}</p>;
  return (
    <div className="space-y-2">
      {items.map(item => (
        <Card key={item.id} className={item.is_critical && !item.actual_arrival && item.planned_eta && new Date(item.planned_eta) < new Date() ? 'border-red-200' : ''}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{item.item_code} — {item.product_name}</p>
              <p className="text-xs text-muted-foreground">{item.supplier?.name || '—'} | {t('bom.plannedEta')}: {item.planned_eta?.split('T')[0] || '—'}</p>
            </div>
            <Badge variant={item.approval_status === 'approved' ? 'default' : 'secondary'}>{item.approval_status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EtaMiniList({ projectId, t }: { projectId: string; t: any }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.get(`/projects/${projectId}`).then(d => setItems(d.bom_items || [])).catch(console.error); }, [projectId]);
  if (items.length === 0) return <p className="text-muted-foreground">{t('eta.noEtaData')}</p>;
  return (
    <div className="space-y-2">
      {items.map(item => (
        <Card key={item.id} className={item.is_critical && !item.actual_arrival && item.planned_eta && new Date(item.planned_eta) < new Date() ? 'border-red-200' : ''}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{item.item_code} — {item.product_name}</p>
              <p className="text-xs text-muted-foreground">
                {t('eta.plannedEta')}: {item.planned_eta?.split('T')[0] || '—'}
                {item.forecast_eta && <span className="ml-2">{t('eta.forecastEta')}: {item.forecast_eta.split('T')[0]}</span>}
                {item.actual_arrival && <span className="ml-2 text-green-600">{t('eta.actualArrival')}: {item.actual_arrival.split('T')[0]}</span>}
              </p>
            </div>
            {item.actual_arrival ? <Badge className="bg-green-100 text-green-700">{t('eta.onTime')}</Badge> :
             item.planned_eta && new Date(item.planned_eta) < new Date() ? <Badge className="bg-red-100 text-red-700">{t('eta.delayedDays', { days: Math.floor((Date.now() - new Date(item.planned_eta).getTime()) / (1000*60*60*24)) })}</Badge> :
             <Badge variant="secondary">{t('eta.pending')}</Badge>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function GatesTab({ projectId, t }: { projectId: string; t: any }) {
  const [gates, setGates] = useState<any[]>([]);
  useEffect(() => { api.get(`/projects/${projectId}`).then(d => setGates(d.gate_results || [])).catch(console.error); }, [projectId]);
  if (gates.length === 0) return <p className="text-muted-foreground">{t('projectCockpit.noGateEvaluations')}</p>;
  return (
    <div className="space-y-2">
      {gates.sort((a, b) => (a.gate?.gate_number || 0) - (b.gate?.gate_number || 0)).map(gr => {
        const gateColor = gr.result === 'NO-GO' ? 'red' : gr.result === 'GO' ? 'green' : 'yellow';
        const c = SEMANTIC[gateColor];
        const owner = gr.gate?.gate_number <= 2 ? t('owners.cammy') : t('owners.dongmei');
        return (
          <Card key={gr.id} className={c.border}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {gateColor === 'green' ? <CheckCircle2 className={`h-5 w-5 ${c.text}`} /> :
                   gateColor === 'red' ? <Ban className={`h-5 w-5 ${c.text}`} /> :
                   <Clock className={`h-5 w-5 ${c.text}`} />}
                  <div>
                    <p className="font-medium">Gate {gr.gate?.gate_number}: {gr.gate?.name_en}</p>
                    <p className="text-xs text-muted-foreground">{gr.reason || t('projectCockpit.noReason')}</p>
                  </div>
                </div>
                <Badge variant={gr.result === 'GO' ? 'default' : gr.result === 'NO-GO' ? 'destructive' : 'secondary'}>{gr.result}</Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span>{t('projectCockpit.owner')}: {owner}</span>
                {gr.result === 'NO-GO' && <span className="text-red-600">{t('projectCockpit.escalation')}: {t('owners.founder')}</span>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function QualityTab({ projectId, t }: { projectId: string; t: any }) {
  const [audits, setAudits] = useState<any[]>([]);
  useEffect(() => { api.get(`/projects/${projectId}`).then(d => setAudits(d.quality_audits || [])).catch(console.error); }, [projectId]);
  if (audits.length === 0) return <p className="text-muted-foreground">{t('audit.title')} — {t('projectCockpit.noGateEvaluations')}</p>;
  return (
    <div className="space-y-2">
      {audits.map(audit => (
        <Card key={audit.id} className={audit.result === 'fail' ? 'border-red-200' : audit.result === 'pass' ? 'border-green-200' : ''}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{audit.audit_number}</p>
              <p className="text-xs text-muted-foreground">{audit.audit_items?.length || 0} {t('audit.checklist')} items</p>
            </div>
            <Badge variant={audit.result === 'pass' ? 'default' : audit.result === 'fail' ? 'destructive' : 'secondary'}>{audit.result}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SuppliersTab({ projectId, t }: { projectId: string; t: any }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.get(`/projects/${projectId}`).then(d => setItems(d.bom_items || [])).catch(console.error); }, [projectId]);
  const suppliers = Array.from(new Map(items.filter(i => i.supplier).map(i => [i.supplier.id, i.supplier])).values());
  if (suppliers.length === 0) return <p className="text-muted-foreground">{t('nav.suppliers')} — {t('projectCockpit.noPartners')}</p>;
  return (
    <div className="space-y-2">
      {suppliers.map(s => (
        <Card key={s.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.category}</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/suppliers/${s.id}?project=${projectId}`}>{t('common.view')}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PartnersTab({ data, t }: { data: CockpitData; t: any }) {
  if (data.partners.length === 0) return <p className="text-muted-foreground">{t('projectCockpit.noPartners')}</p>;
  return (
    <div className="space-y-2">
      {data.partners.map(p => (
        <Card key={p.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{p.name}</span>
              <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{p.type}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t">
              <span>{t('projectCockpit.executionOwner')}: {t('owners.singaporePartner')}</span>
              <span>{t('projectCockpit.eesOwner')}: {t('owners.cammy')} / {t('owners.dongmei')}</span>
            </div>
            <div className="pt-1">
              <Button size="sm" variant="outline" asChild>
                <Link to={`/partners/${p.id}?project=${data.project.id}`}>{t('common.view')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RisksTab({ projectId, t }: { projectId: string; t: any }) {
  const [risks, setRisks] = useState<any[]>([]);
  useEffect(() => { api.get(`/projects/${projectId}`).then(d => setRisks(d.risks || [])).catch(console.error); }, [projectId]);
  if (risks.length === 0) return <p className="text-muted-foreground">{t('nav.risks')} — {t('projectCockpit.noOpenRisks')}</p>;
  return (
    <div className="space-y-2">
      {risks.map(r => (
        <Card key={r.id} className={r.risk_level === 'critical' ? 'border-red-200' : r.risk_level === 'high' ? 'border-amber-200' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{r.risk_number}</span>
              <Badge variant={r.risk_level === 'critical' ? 'destructive' : 'secondary'}>{r.risk_level}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{r.description}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('projectCockpit.owner')}: {t('owners.founder')}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function IssuesTab({ projectId, t }: { projectId: string; t: any }) {
  const [issues, setIssues] = useState<any[]>([]);
  useEffect(() => { api.get(`/projects/${projectId}`).then(d => setIssues(d.issues || [])).catch(console.error); }, [projectId]);
  if (issues.length === 0) return <p className="text-muted-foreground">{t('projects.issues')} — {t('pilot.noIssues')}</p>;
  return (
    <div className="space-y-2">
      {issues.map(i => (
        <Card key={i.id} className={i.severity === 'critical' ? 'border-red-200' : ''}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{i.issue_number}: {i.title}</p>
              <p className="text-xs text-muted-foreground">{i.status}</p>
            </div>
            <Badge variant={i.severity === 'critical' ? 'destructive' : 'secondary'}>{i.severity}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DocumentsTab({ projectId, t }: { projectId: string; t: any }) {
  const [docs, setDocs] = useState<any[]>([]);
  useEffect(() => { api.get(`/projects/${projectId}`).then(d => setDocs(d.documents || [])).catch(console.error); }, [projectId]);
  if (docs.length === 0) return <p className="text-muted-foreground">{t('projectCockpit.documents')} — {t('dashboard.noItemsToDisplay')}</p>;
  return (
    <div className="space-y-2">
      {docs.map(doc => (
        <Card key={doc.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{doc.title || doc.file_name}</span>
            </div>
            <Badge variant="outline">{doc.document_type}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
