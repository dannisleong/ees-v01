import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import {
  AlertTriangle,
  Ban,
  Box,
  CalendarClock,
  CheckCircle2,
  Clock,
  DollarSign,
  FileWarning,
  Gauge,
  Info,
  Package,
  ShieldAlert,
  TrendingDown,
} from 'lucide-react';
import { Link } from 'react-router';

interface DashboardData {
  summary: {
    noGoCount: number;
    criticalRiskCount: number;
    criticalBomDelayCount: number;
    overdueActionCount: number;
    qcFailureCount: number;
    complianceIssueCount: number;
    costVarianceCount: number;
    upcomingDeadlineCount: number;
    totalAttentionItems: number;
  };
  alerts: AlertItem[];
  byCategory: {
    noGo: AlertItem[];
    criticalRisks: AlertItem[];
    bomDelays: AlertItem[];
    overdueActions: AlertItem[];
    qcFailures: AlertItem[];
    complianceIssues: AlertItem[];
    costVariances: AlertItem[];
    upcomingDeadlines: AlertItem[];
  };
}

interface KpiData {
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

interface AlertItem {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  projectId?: string;
  projectName?: string;
  entityId?: string;
  entityType?: string;
  linkPath?: string;
  dueDate?: string;
  daysOverdue?: number;
}

type AttentionLevel = 'critical' | 'attention' | 'allClear' | 'info';

const severityStyles = {
  critical: 'border-red-300 bg-red-50 text-red-900',
  high: 'border-orange-300 bg-orange-50 text-orange-900',
  medium: 'border-amber-300 bg-amber-50 text-amber-900',
  low: 'border-blue-300 bg-blue-50 text-blue-900',
};

const severityBadge = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
};

const typeIcon: Record<string, React.ElementType> = {
  no_go: Ban,
  critical_risk: ShieldAlert,
  bom_delay: Package,
  overdue_action: Clock,
  qc_failure: FileWarning,
  compliance_issue: ShieldAlert,
  cost_variance: TrendingDown,
  upcoming_deadline: CalendarClock,
};

function computeAttentionLevel(data: DashboardData['summary'], kpi: KpiData | null): AttentionLevel {
  // Critical = Action Required
  if (data.noGoCount > 0) return 'critical';
  if (data.criticalRiskCount > 0) return 'critical';
  if (data.qcFailureCount > 0) return 'critical';
  if (data.criticalBomDelayCount > 0) return 'critical';
  if ((kpi?.bomItemsDelayed || 0) > 0) return 'critical';
  if ((kpi?.projectsAtRisk || 0) > 0) return 'critical';

  // Attention Required
  if (data.overdueActionCount > 0) return 'attention';
  if (data.costVarianceCount > 0) return 'attention';
  if (data.complianceIssueCount > 0) return 'attention';

  // Upcoming deadlines only = Informational
  if (data.upcomingDeadlineCount > 0) return 'info';

  return 'allClear';
}

export function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/attention'),
      api.get('/dashboard/kpi'),
    ])
      .then(([attentionData, kpiData]) => {
        setData(attentionData);
        setKpi(kpiData);
      })
      .catch((err) => {
        console.error(err);
        setError(err.error || t('dashboard.failedToLoad'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!data) return <div className="p-8 text-center text-red-500">{t('common.error')}</div>;

  const { summary, alerts, byCategory } = data;
  const level = computeAttentionLevel(summary, kpi);
  const hasAttention = level === 'critical' || level === 'attention' || level === 'info';

  const priorityOrder: Array<keyof typeof byCategory> = [
    'noGo',
    'criticalRisks',
    'bomDelays',
    'overdueActions',
    'qcFailures',
    'complianceIssues',
    'costVariances',
    'upcomingDeadlines',
  ];

  const categoryTitle = (cat: string) => {
    const map: Record<string, string> = {
      criticalRisks: t('dashboard.criticalRisks'),
      bomDelays: t('dashboard.delayedBom'),
      overdueActions: t('dashboard.overdueActions'),
      qcFailures: t('dashboard.qcFailures'),
      complianceIssues: t('dashboard.complianceIssues'),
      costVariances: t('dashboard.marginAlerts'),
      upcomingDeadlines: t('dashboard.upcomingDeadlines'),
      noGo: t('dashboard.noGoGates'),
    };
    return map[cat] || cat;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gauge className="h-6 w-6" />
          {t('dashboard.title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Management Attention Banner */}
      <AttentionBanner level={level} t={t} activeProjects={kpi?.activeProjects || 0} />

      {kpi && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <KpiCard icon={<Box className="h-5 w-5 text-blue-600" />} label={t('dashboard.activeProjects')} value={kpi.activeProjects} />
          <KpiCard icon={<AlertTriangle className="h-5 w-5 text-red-600" />} label={t('dashboard.atRisk')} value={kpi.projectsAtRisk} highlight={kpi.projectsAtRisk > 0} />
          <KpiCard icon={<Package className="h-5 w-5 text-indigo-600" />} label={t('dashboard.bomItems')} value={`${kpi.bomItemsApproved}/${kpi.bomItemsTotal}`} />
          <KpiCard icon={<TrendingDown className="h-5 w-5 text-orange-600" />} label={t('dashboard.bomDelayed')} value={kpi.bomItemsDelayed} highlight={kpi.bomItemsDelayed > 0} />
          <KpiCard icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label={t('dashboard.avgMargin')} value={kpi.avgMarginPercent !== null ? `${kpi.avgMarginPercent.toFixed(1)}%` : '-'} />
          <KpiCard icon={<FileWarning className="h-5 w-5 text-amber-600" />} label={t('dashboard.openIssues')} value={kpi.openIssues} highlight={kpi.openIssues > 0} />
        </div>
      )}

      {hasAttention && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {summary.noGoCount > 0 && <AttentionCard icon={<Ban className="h-8 w-8 text-red-600" />} count={summary.noGoCount} label={t('dashboard.noGoGates')} color="red" />}
          {summary.criticalRiskCount > 0 && <AttentionCard icon={<ShieldAlert className="h-8 w-8 text-red-600" />} count={summary.criticalRiskCount} label={t('dashboard.criticalRisks')} color="red" />}
          {(summary.criticalBomDelayCount > 0 || (kpi?.bomItemsDelayed || 0) > 0) && (
            <AttentionCard icon={<Package className="h-8 w-8 text-red-600" />} count={Math.max(summary.criticalBomDelayCount, kpi?.bomItemsDelayed || 0)} label={t('dashboard.criticalBomDelays')} color="red" />
          )}
          {summary.overdueActionCount > 0 && <AttentionCard icon={<Clock className="h-8 w-8 text-amber-600" />} count={summary.overdueActionCount} label={t('dashboard.overdueActions')} color="amber" />}
          {summary.qcFailureCount > 0 && <AttentionCard icon={<FileWarning className="h-8 w-8 text-rose-600" />} count={summary.qcFailureCount} label={t('dashboard.qcFailures')} color="rose" />}
          {summary.complianceIssueCount > 0 && <AttentionCard icon={<ShieldAlert className="h-8 w-8 text-purple-600" />} count={summary.complianceIssueCount} label={t('dashboard.complianceIssues')} color="purple" />}
          {summary.costVarianceCount > 0 && <AttentionCard icon={<TrendingDown className="h-8 w-8 text-orange-600" />} count={summary.costVarianceCount} label={t('dashboard.marginAlerts')} color="orange" />}
          {summary.upcomingDeadlineCount > 0 && <AttentionCard icon={<CalendarClock className="h-8 w-8 text-blue-600" />} count={summary.upcomingDeadlineCount} label={t('dashboard.upcomingDeadlines')} color="blue" />}
        </div>
      )}

      {hasAttention && (
        <Tabs defaultValue="priority" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
            <TabsTrigger value="priority">{t('dashboard.priorityView')}</TabsTrigger>
            <TabsTrigger value="noGo">{t('dashboard.noGo')}</TabsTrigger>
            <TabsTrigger value="risks">{t('dashboard.risks')}</TabsTrigger>
            <TabsTrigger value="bom">{t('dashboard.bom')}</TabsTrigger>
            <TabsTrigger value="all">{t('dashboard.allAlerts')}</TabsTrigger>
          </TabsList>

          <TabsContent value="priority" className="space-y-4">
            {alerts.length === 0 ? <EmptyState /> : (
              <div className="space-y-3">
                {alerts.map((alert, idx) => <AlertRow key={idx} alert={alert} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="noGo" className="space-y-3">
            {byCategory.noGo.length === 0 ? <EmptyState message={t('dashboard.noNoGoGates')} /> : byCategory.noGo.map((alert, idx) => <AlertRow key={idx} alert={alert} />)}
          </TabsContent>

          <TabsContent value="risks" className="space-y-3">
            {byCategory.criticalRisks.length === 0 ? <EmptyState message={t('dashboard.noCriticalRisks')} /> : byCategory.criticalRisks.map((alert, idx) => <AlertRow key={idx} alert={alert} />)}
          </TabsContent>

          <TabsContent value="bom" className="space-y-3">
            {byCategory.bomDelays.length === 0 ? <EmptyState message={t('dashboard.noCriticalBomDelays')} /> : byCategory.bomDelays.map((alert, idx) => <AlertRow key={idx} alert={alert} />)}
          </TabsContent>

          <TabsContent value="all" className="space-y-3">
            {alerts.length === 0 ? <EmptyState /> : (
              priorityOrder.map((category) =>
                byCategory[category].length > 0 ? (
                  <div key={category} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{categoryTitle(category)}</h3>
                    {byCategory[category].map((alert, idx) => <AlertRow key={`${category}-${idx}`} alert={alert} />)}
                  </div>
                ) : null
              )
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function AttentionBanner({ level, t, activeProjects }: { level: AttentionLevel; t: any; activeProjects: number }) {
  const config = {
    critical: {
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      title: t('dashboard.actionRequired'),
      detail: `${activeProjects} ${t('dashboard.activeProjects')} — ${t('dashboard.actionRequired')}`,
    },
    attention: {
      icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      title: t('dashboard.attentionRequired'),
      detail: `${activeProjects} ${t('dashboard.activeProjects')} — ${t('dashboard.attentionRequired')}`,
    },
    info: {
      icon: <Info className="h-6 w-6 text-blue-600" />,
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      title: t('dashboard.informational'),
      detail: `${activeProjects} ${t('dashboard.activeProjects')} — ${t('dashboard.informational')}`,
    },
    allClear: {
      icon: <CheckCircle2 className="h-6 w-6 text-green-600" />,
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      title: t('dashboard.allClear'),
      detail: t('dashboard.allClearDetail', { count: activeProjects }),
    },
  };

  const c = config[level];

  return (
    <Card className={`${c.bg} ${c.text}`}>
      <CardContent className="pt-4 flex items-center gap-3">
        {c.icon}
        <div>
          <p className="font-semibold">{c.title}</p>
          <p className="text-sm opacity-90">{c.detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-red-200' : ''}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">{icon}</div>
          <div className={`text-2xl font-bold ${highlight ? 'text-red-600' : ''}`}>{value}</div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function AttentionCard({ icon, count, label, color }: { icon: React.ReactNode; count: number; label: string; color: string }) {
  const colorMap: Record<string, string> = {
    red: 'border-red-200 bg-red-50', orange: 'border-orange-200 bg-orange-50',
    amber: 'border-amber-200 bg-amber-50', rose: 'border-rose-200 bg-rose-50',
    purple: 'border-purple-200 bg-purple-50', blue: 'border-blue-200 bg-blue-50',
  };
  return (
    <Card className={colorMap[color] || ''}>
      <CardContent className="pt-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-sm">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const Icon = typeIcon[alert.type] || Info;
  const { t } = useTranslation();

  return (
    <div className={`rounded-lg border p-3 ${severityStyles[alert.severity]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{alert.title}</span>
              <Badge variant="outline" className={severityBadge[alert.severity]}>{alert.severity.toUpperCase()}</Badge>
            </div>
            <p className="text-xs mt-1 opacity-90">{alert.description}</p>
            {alert.projectName && (
              <p className="text-xs mt-0.5 opacity-75">
                {t('dashboard.projectLabel')}: {alert.projectName}
                {alert.daysOverdue !== undefined && alert.daysOverdue > 0 && (
                  <span className="ml-2 font-medium">({t('dashboard.daysOverdue', { days: alert.daysOverdue })})</span>
                )}
              </p>
            )}
          </div>
        </div>
        {alert.linkPath && (
          <Button size="sm" variant="outline" className="shrink-0" asChild>
            <Link to={alert.linkPath}>{t('common.view')}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <Card className="border-dashed">
      <CardContent className="pt-6 text-center text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
        <p>{message || t('dashboard.noItemsToDisplay')}</p>
      </CardContent>
    </Card>
  );
}
