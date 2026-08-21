import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle2, ClipboardCheck, Clock, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router';

interface ExecutionData {
  project: { id: string; project_code: string; name_en: string | null; name_zh: string | null; current_stage: number; current_gate: number };
  pendingGates: any[];
  pendingBomApprovals: any[];
  delayedEtas: any[];
  openRisks: any[];
  overdueActions: any[];
  totalActions: number;
}

export function PilotExecution() {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [data, setData] = useState<ExecutionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/projects').then((ps) => { setProjects(ps); if (ps.length > 0 && !projectId) setProjectId(ps[0].id); });
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.get(`/pilot-execution/${projectId}`).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('pilot.executionTitle')}</h1>
          <p className="text-muted-foreground text-sm">{t('pilot.executionSubtitle')}</p>
        </div>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-64"><SelectValue placeholder={t('bom.selectProject')} /></SelectTrigger>
          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_code}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !data ? (
        <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
      ) : data.totalActions === 0 ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center flex flex-col items-center gap-2">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <p className="text-lg font-medium text-green-700">{t('pilot.noActions')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.pendingGates.length > 0 && (
            <ActionSection icon={<AlertCircle className="h-5 w-5 text-amber-600" />} title={t('pilot.pendingGates')} count={data.pendingGates.length}>
              {data.pendingGates.map((g, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{t('gate.title')} {g.gateNumber} — {g.gateName}</span>
                  <Badge variant={g.result === 'no_go' ? 'destructive' : 'outline'}>{g.result.toUpperCase()}</Badge>
                </div>
              ))}
            </ActionSection>
          )}

          {data.pendingBomApprovals.length > 0 && (
            <ActionSection icon={<ClipboardCheck className="h-5 w-5 text-blue-600" />} title={t('pilot.pendingBomApprovals')} count={data.pendingBomApprovals.length}>
              {data.pendingBomApprovals.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{b.itemCode} — {b.productName}</span>
                  <Button size="sm" variant="outline" asChild><Link to="/bom">{t('dashboard.view')}</Link></Button>
                </div>
              ))}
            </ActionSection>
          )}

          {data.delayedEtas.length > 0 && (
            <ActionSection icon={<Clock className="h-5 w-5 text-red-600" />} title={t('pilot.delayedEtas')} count={data.delayedEtas.length}>
              {data.delayedEtas.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{b.itemCode} — {b.productName}</span>
                  <span className="text-xs text-red-600">{b.plannedEta?.split('T')[0]}</span>
                </div>
              ))}
            </ActionSection>
          )}

          {data.openRisks.length > 0 && (
            <ActionSection icon={<ShieldAlert className="h-5 w-5 text-orange-600" />} title={t('pilot.openRisks')} count={data.openRisks.length}>
              {data.openRisks.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{r.riskNumber}: {r.description}</span>
                  <Badge variant="outline" className="text-orange-600">{r.riskLevel}</Badge>
                </div>
              ))}
            </ActionSection>
          )}

          {data.overdueActions.length > 0 && (
            <ActionSection icon={<AlertTriangle className="h-5 w-5 text-red-600" />} title={t('pilot.overdueActions')} count={data.overdueActions.length}>
              {data.overdueActions.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{a.issueNumber}: {a.title}</span>
                  <span className="text-xs text-red-600">{a.dueDate?.split('T')[0]}</span>
                </div>
              ))}
            </ActionSection>
          )}
        </div>
      )}
    </div>
  );
}

function ActionSection({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="font-semibold">{title}</h3>
          <Badge variant="secondary">{count}</Badge>
        </div>
        <div className="space-y-1">{children}</div>
      </CardContent>
    </Card>
  );
}
