import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  Clock, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, Minus, Loader2, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface Project { id: string; project_code: string; name_en: string | null; name_zh: string | null; }

interface EtaItem {
  id: string; item_code: string; product_name: string;
  supplier: { name: string } | null; is_critical: boolean;
  planned_eta: string | null; forecast_eta: string | null; actual_arrival: string | null;
  eta_status: 'on_time' | 'delayed' | 'ahead' | 'pending'; variance_days: number | null;
}

interface EtaSummary {
  total_items: number; items_with_planned_eta: number; items_with_forecast_eta: number;
  items_arrived: number; delayed_items: number; critical_delayed_items: number;
  total_variance_days: number; alert_count: number; open_eta_risks: number;
}

export function EtaTracking() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const role = user?.role ?? '';
  const [searchParams] = useSearchParams();
  const projectFromUrl = searchParams.get('project');

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectFromUrl || '');
  const [etaItems, setEtaItems] = useState<EtaItem[]>([]);
  const [summary, setSummary] = useState<EtaSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EtaItem | null>(null);
  const [form, setForm] = useState({ planned_eta: '', forecast_eta: '', actual_arrival: '' });

  const canWrite = ['dongmei', 'founder'].includes(role);

  const fetchProjects = useCallback(async () => {
    try { const data = await api.get('/projects'); setProjects(data); if (data.length > 0 && !selectedProjectId) setSelectedProjectId(data[0].id); }
    catch (e) { toast.error(t('eta.toast.loadProjectsFailed')); }
  }, [selectedProjectId, t]);

  const fetchEta = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try { const items = await api.get(`/eta/project/${selectedProjectId}/latest`); setEtaItems(items); const sum = await api.get(`/eta/project/${selectedProjectId}/summary`); setSummary(sum); }
    catch (e: any) { toast.error(e.error || t('eta.toast.loadEtaFailed')); }
    finally { setLoading(false); }
  }, [selectedProjectId, t]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchEta(); }, [fetchEta]);

  const openEdit = (item: EtaItem) => {
    setEditingItem(item);
    setForm({ planned_eta: item.planned_eta ? item.planned_eta.split('T')[0] : '', forecast_eta: item.forecast_eta ? item.forecast_eta.split('T')[0] : '', actual_arrival: item.actual_arrival ? item.actual_arrival.split('T')[0] : '' });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingItem) return;
    try {
      const payload: any = {};
      if (form.planned_eta) payload.planned_eta = form.planned_eta;
      if (form.forecast_eta) payload.forecast_eta = form.forecast_eta;
      if (form.actual_arrival) payload.actual_arrival = form.actual_arrival;
      await api.put(`/eta/bom/${editingItem.id}`, payload);
      toast.success(t('eta.toast.updated'));
      setDialogOpen(false); fetchEta();
    } catch (e: any) { toast.error(e.error || t('eta.toast.updateFailed')); }
  };

  const statusBadge = (status: string, variance: number | null) => {
    const configs: Record<string, { class: string; icon: any; label: string }> = {
      on_time: { class: 'bg-green-100 text-green-800', icon: CheckCircle, label: t('eta.onTime') },
      delayed: { class: 'bg-red-100 text-red-800', icon: TrendingUp, label: variance && variance > 0 ? t('eta.delayedDays', { days: variance }) : t('eta.delayedDays', { days: 0 }) },
      ahead: { class: 'bg-blue-100 text-blue-800', icon: TrendingDown, label: variance && variance < 0 ? t('eta.ahead', { days: Math.abs(variance) }) : t('eta.ahead', { days: 0 }) },
      pending: { class: 'bg-yellow-100 text-yellow-800', icon: Minus, label: t('eta.pending') },
    };
    const cfg = configs[status] || configs.pending;
    return <Badge className={cfg.class}><cfg.icon className="h-3 w-3 mr-1" />{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6" />{t('eta.title')}</h1>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-64"><SelectValue placeholder={t('eta.selectProject')} /></SelectTrigger>
          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_code} — {p.name_en || p.name_zh || 'Untitled'}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {summary && (
        <div className="grid grid-cols-5 gap-4">
          <SummaryCard label={t('eta.totalItems')} value={summary.total_items} />
          <SummaryCard label={t('eta.arrived')} value={summary.items_arrived} className="text-green-600" />
          <SummaryCard label={t('eta.delayed')} value={summary.delayed_items} className="text-red-600" />
          <SummaryCard label={t('eta.criticalDelayed')} value={summary.critical_delayed_items} className="text-red-600" />
          <SummaryCard label={t('eta.etaRisks')} value={summary.open_eta_risks} className="text-orange-600" />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('eta.itemCode')}</TableHead><TableHead>{t('eta.product')}</TableHead>
                <TableHead>{t('eta.plannedEta')}</TableHead><TableHead>{t('eta.forecastEta')}</TableHead>
                <TableHead>{t('eta.actualArrival')}</TableHead><TableHead>{t('eta.status')}</TableHead>
                <TableHead>{t('eta.variance')}</TableHead><TableHead className="text-right">{t('eta.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {etaItems.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{t('eta.noEtaData')}</TableCell></TableRow>
              )}
              {etaItems.map(item => (
                <TableRow key={item.id} className={item.is_critical && item.eta_status === 'delayed' ? 'bg-red-50/50' : ''}>
                  <TableCell className="font-medium">{item.item_code}</TableCell>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell>{item.planned_eta ? item.planned_eta.split('T')[0] : t('eta.none')}</TableCell>
                  <TableCell>{item.forecast_eta ? item.forecast_eta.split('T')[0] : t('eta.none')}</TableCell>
                  <TableCell>{item.actual_arrival ? item.actual_arrival.split('T')[0] : t('eta.none')}</TableCell>
                  <TableCell>{statusBadge(item.eta_status, item.variance_days)}</TableCell>
                  <TableCell>
                    {item.variance_days !== null ? (
                      <span className={item.variance_days > 0 ? 'text-red-600 font-medium' : item.variance_days < 0 ? 'text-green-600 font-medium' : ''}>
                        {item.variance_days > 0 ? '+' : ''}{item.variance_days}d
                      </span>
                    ) : t('eta.none')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.is_critical && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {canWrite && <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('eta.updateEtaTitle', { itemCode: editingItem?.item_code || '' })}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>{t('eta.plannedEta')}</Label><Input type="date" value={form.planned_eta} onChange={e => setForm(f => ({ ...f, planned_eta: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('eta.forecastEta')}</Label><Input type="date" value={form.forecast_eta} onChange={e => setForm(f => ({ ...f, forecast_eta: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('eta.actualArrival')}</Label><Input type="date" value={form.actual_arrival} onChange={e => setForm(f => ({ ...f, actual_arrival: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit}>{t('eta.updateEta')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${className || ''}`}>{value}</div>
    </div>
  );
}
