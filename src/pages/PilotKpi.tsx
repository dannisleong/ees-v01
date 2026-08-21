import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, TrendingUp, ClipboardCheck, Truck, Wrench, FileText, BookOpen } from 'lucide-react';

interface KpiData {
  project: { id: string; project_code: string; name_en: string | null; name_zh: string | null };
  cost: { sellingPrice: number | null; totalLandedCost: number | null; grossMargin: number | null; marginPercent: number | null };
  etaPerformance: { totalTracked: number; onTime: number; late: number; pending: number };
  qcPerformance: { totalAudits: number; passed: number; failed: number; passRate: string | null };
  risks: { total: number; open: number; high: number };
  variations: { total: number; approved: number; totalCostImpact: number };
  supplierPerformance: any[];
  partners: any[];
  lessonsLearned: any[];
}

export function PilotKpi() {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/projects').then((ps) => { setProjects(ps); if (ps.length > 0 && !projectId) setProjectId(ps[0].id); });
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.get(`/pilot-kpi/${projectId}`).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('pilot.kpiTitle')}</h1>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-64"><SelectValue placeholder={t('bom.selectProject')} /></SelectTrigger>
          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_code}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : !data ? (
        <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
      ) : (
        <div className="space-y-4">
          {/* Cost & Margin */}
          <div className="grid grid-cols-4 gap-4">
            <KpiCard icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label={t('pilot.projectCost')} value={data.cost.totalLandedCost ? `$${data.cost.totalLandedCost.toLocaleString()}` : '—'} />
            <KpiCard icon={<DollarSign className="h-5 w-5 text-blue-600" />} label={t('projects.costs')} value={data.cost.sellingPrice ? `$${data.cost.sellingPrice.toLocaleString()}` : '—'} />
            <KpiCard icon={<TrendingUp className="h-5 w-5 text-purple-600" />} label={t('pilot.margin')} value={data.cost.marginPercent ? `${data.cost.marginPercent}%` : '—'} />
            <KpiCard icon={<DollarSign className="h-5 w-5 text-green-600" />} label="Gross Margin" value={data.cost.grossMargin ? `$${data.cost.grossMargin.toLocaleString()}` : '—'} />
          </div>

          {/* ETA & QC */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3"><Truck className="h-5 w-5 text-blue-600" /><h3 className="font-semibold">{t('pilot.etaPerformance')}</h3></div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><div className="text-2xl font-bold">{data.etaPerformance.totalTracked}</div><div className="text-xs text-muted-foreground">Tracked</div></div>
                  <div><div className="text-2xl font-bold text-green-600">{data.etaPerformance.onTime}</div><div className="text-xs text-muted-foreground">On Time</div></div>
                  <div><div className="text-2xl font-bold text-red-600">{data.etaPerformance.late}</div><div className="text-xs text-muted-foreground">Late</div></div>
                  <div><div className="text-2xl font-bold text-yellow-600">{data.etaPerformance.pending}</div><div className="text-xs text-muted-foreground">Pending</div></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3"><ClipboardCheck className="h-5 w-5 text-indigo-600" /><h3 className="font-semibold">{t('pilot.qcPerformance')}</h3></div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><div className="text-2xl font-bold">{data.qcPerformance.totalAudits}</div><div className="text-xs text-muted-foreground">Audits</div></div>
                  <div><div className="text-2xl font-bold text-green-600">{data.qcPerformance.passed}</div><div className="text-xs text-muted-foreground">Passed</div></div>
                  <div><div className="text-2xl font-bold text-red-600">{data.qcPerformance.failed}</div><div className="text-xs text-muted-foreground">Failed</div></div>
                  <div><div className="text-2xl font-bold text-blue-600">{data.qcPerformance.passRate ?? '—'}%</div><div className="text-xs text-muted-foreground">Pass Rate</div></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risks & Variations */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-5 w-5 text-orange-600" /><h3 className="font-semibold">{t('nav.risks')}</h3></div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><div className="text-2xl font-bold">{data.risks.total}</div><div className="text-xs text-muted-foreground">Total</div></div>
                  <div><div className="text-2xl font-bold text-red-600">{data.risks.open}</div><div className="text-xs text-muted-foreground">Open</div></div>
                  <div><div className="text-2xl font-bold text-orange-600">{data.risks.high}</div><div className="text-xs text-muted-foreground">High</div></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3"><FileText className="h-5 w-5 text-purple-600" /><h3 className="font-semibold">{t('pilot.variations')}</h3></div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><div className="text-2xl font-bold">{data.variations.total}</div><div className="text-xs text-muted-foreground">Total</div></div>
                  <div><div className="text-2xl font-bold text-green-600">{data.variations.approved}</div><div className="text-xs text-muted-foreground">Approved</div></div>
                  <div><div className="text-2xl font-bold text-red-600">${data.variations.totalCostImpact.toLocaleString()}</div><div className="text-xs text-muted-foreground">Cost Impact</div></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Supplier Performance */}
          {data.supplierPerformance.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3"><Truck className="h-5 w-5 text-teal-600" /><h3 className="font-semibold">{t('pilot.supplierPerformance')}</h3></div>
                <div className="grid grid-cols-3 gap-3">
                  {data.supplierPerformance.map((s: any) => (
                    <div key={s.supplierId} className="border rounded-lg p-3">
                      <div className="font-medium text-sm">{s.supplierName}</div>
                      <div className="text-xs text-muted-foreground">{s.itemCount} items · ${s.totalCost.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Partners */}
          {data.partners.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3"><Wrench className="h-5 w-5 text-cyan-600" /><h3 className="font-semibold">{t('pilot.installationPerformance')}</h3></div>
                <div className="space-y-2">
                  {data.partners.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between border-b last:border-0 pb-2">
                      <div>
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">Stage {p.assignedStage} · {p.type}</div>
                      </div>
                      <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lessons Learned */}
          {data.lessonsLearned.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3"><BookOpen className="h-5 w-5 text-amber-600" /><h3 className="font-semibold">{t('pilot.lessonsLearned')}</h3></div>
                <div className="space-y-2">
                  {data.lessonsLearned.map((l: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 border-b last:border-0 pb-2">
                      {l.isSop && <Badge variant="outline" className="shrink-0">SOP</Badge>}
                      <div className="text-sm">{l.content}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">{icon}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
