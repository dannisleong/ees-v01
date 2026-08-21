import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus, Pencil, Trash2, CheckCircle, XCircle, Send,
  Package, AlertTriangle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface Supplier { id: string; supplier_code: string; name: string; category: string; }
interface BomItem {
  id: string; item_code: string; product_name: string; specification: string | null;
  quantity: number; unit: string | null; supplier_id: string | null; supplier: Supplier | null;
  unit_cost: string | null; total_cost: string | null; lead_time_days: number | null;
  is_critical: boolean; planned_eta: string | null; forecast_eta: string | null;
  actual_arrival: string | null; status: string; qc_status: string; approval_status: string;
  approved_by: string | null; approved_at: string | null; created_at: string; updated_at: string;
}
interface Project { id: string; project_code: string; name_en: string | null; name_zh: string | null; }

const emptyForm = { project_id: '', item_code: '', product_name: '', specification: '', quantity: 1, unit: 'pcs', supplier_id: '', unit_cost: '', lead_time_days: '', is_critical: false, planned_eta: '' };

export function BomManagement() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const role = user?.role ?? '';
  const [searchParams] = useSearchParams();
  const projectFromUrl = searchParams.get('project');

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectFromUrl || '');
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [summary, setSummary] = useState<any>(null);

  const canWrite = ['dongmei', 'founder', 'project_manager'].includes(role);
  const canApprove = ['dongmei', 'founder'].includes(role);
  const canRead = ['cammy', 'supplier', 'quality_reviewer', 'founder', 'dongmei', 'project_manager'].includes(role);

  const fetchProjects = useCallback(async () => {
    try { const data = await api.get('/projects'); setProjects(data); if (data.length > 0 && !selectedProjectId) setSelectedProjectId(data[0].id); }
    catch (e) { toast.error(t('bom.toast.loadProjectsFailed')); }
  }, [selectedProjectId, t]);

  const fetchSuppliers = useCallback(async () => {
    try { const data = await api.get('/partners'); setSuppliers(data.filter((s: any) => s.type === 'supplier') || []); }
    catch (e) { setSuppliers([]); }
  }, []);

  const fetchBom = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try { const items = await api.get(`/bom/project/${selectedProjectId}`); setBomItems(items); const sum = await api.get(`/bom/project/${selectedProjectId}/summary`); setSummary(sum); }
    catch (e: any) { toast.error(e.error || t('bom.toast.loadBomFailed')); }
    finally { setLoading(false); }
  }, [selectedProjectId, t]);

  useEffect(() => { fetchProjects(); fetchSuppliers(); }, [fetchProjects, fetchSuppliers]);
  useEffect(() => { fetchBom(); }, [fetchBom]);

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm, project_id: selectedProjectId }); setDialogOpen(true); };
  const openEdit = (item: BomItem) => {
    setEditingId(item.id);
    setForm({ project_id: item.supplier?.id ?? '', item_code: item.item_code, product_name: item.product_name, specification: item.specification ?? '', quantity: item.quantity, unit: item.unit ?? 'pcs', supplier_id: item.supplier_id ?? '', unit_cost: item.unit_cost ?? '', lead_time_days: item.lead_time_days?.toString() ?? '', is_critical: item.is_critical, planned_eta: item.planned_eta ? item.planned_eta.split('T')[0] : '' });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = { project_id: selectedProjectId, item_code: form.item_code, product_name: form.product_name, specification: form.specification || undefined, quantity: Number(form.quantity), unit: form.unit || undefined, supplier_id: form.supplier_id || undefined, unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : undefined, lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : undefined, is_critical: form.is_critical, planned_eta: form.planned_eta || undefined };
      if (editingId) { await api.put(`/bom/${editingId}`, payload); toast.success(t('bom.toast.itemUpdated')); }
      else { await api.post('/bom', payload); toast.success(t('bom.toast.itemCreated')); }
      setDialogOpen(false); fetchBom();
    } catch (e: any) { toast.error(e.error || t('bom.toast.saveFailed')); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('bom.toast.deleteConfirm'))) return;
    try { await api.delete(`/bom/${id}`); toast.success(t('bom.toast.itemDeleted')); fetchBom(); }
    catch (e: any) { toast.error(e.error || t('bom.toast.deleteFailed')); }
  };

  const handleSubmitForApproval = async (id: string) => {
    try { await api.post(`/bom/${id}/submit`, {}); toast.success(t('bom.toast.submitted')); fetchBom(); }
    catch (e: any) { toast.error(e.error || t('bom.toast.submitFailed')); }
  };

  const handleApprove = async (id: string) => {
    try { await api.post(`/bom/${id}/approve`, {}); toast.success(t('bom.toast.approved')); fetchBom(); }
    catch (e: any) { toast.error(e.error || t('bom.toast.approveFailed')); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt(t('bom.toast.rejectionReason'));
    try { await api.post(`/bom/${id}/reject`, { reason }); toast.success(t('bom.toast.rejected')); fetchBom(); }
    catch (e: any) { toast.error(e.error || t('bom.toast.rejectFailed')); }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = { draft: 'bg-slate-200 text-slate-800', submitted: 'bg-blue-100 text-blue-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', pending: 'bg-yellow-100 text-yellow-800', in_production: 'bg-purple-100 text-purple-800', completed: 'bg-green-100 text-green-800', pass: 'bg-green-100 text-green-800', fail: 'bg-red-100 text-red-800' };
    const labelMap: Record<string, string> = {
      draft: t('bom.statusDraft'),
      submitted: t('bom.statusSubmitted'),
      approved: t('bom.statusApproved'),
      rejected: t('bom.statusRejected'),
      pending: t('bom.statusPending'),
      in_production: t('bom.statusInProduction'),
      completed: t('bom.statusCompleted'),
      pass: t('bom.qcPass'),
      fail: t('bom.qcFail'),
      na: t('bom.qcNa'),
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{labelMap[status] || status}</Badge>;
  };

  if (!canRead) return <div className="p-8 text-center text-muted-foreground">{t('bom.noPermissionBom')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />{t('bom.title')}
        </h1>
        <div className="flex items-center gap-2">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-64"><SelectValue placeholder={t('bom.selectProject')} /></SelectTrigger>
            <SelectContent>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_code} — {p.name_en || p.name_zh || 'Untitled'}</SelectItem>)}
            </SelectContent>
          </Select>
          {canWrite && <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t('bom.addItem')}</Button>}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-5 gap-4">
          <SummaryCard label={t('bom.totalItems')} value={summary.total_items} />
          <SummaryCard label={t('bom.approved')} value={summary.approved_items} className="text-green-600" />
          <SummaryCard label={t('bom.pendingApproval')} value={summary.pending_approval} className="text-yellow-600" />
          <SummaryCard label={t('bom.totalCost')} value={`$${Number(summary.total_cost).toLocaleString()}`} />
          <SummaryCard label={t('bom.criticalItems')} value={summary.critical_items} className="text-red-600" />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('bom.itemCode')}</TableHead><TableHead>{t('bom.product')}</TableHead><TableHead>{t('bom.specification')}</TableHead>
                <TableHead>{t('bom.qty')}</TableHead><TableHead>{t('bom.unitCost')}</TableHead><TableHead>{t('bom.totalCost')}</TableHead>
                <TableHead>{t('bom.supplier')}</TableHead><TableHead>{t('bom.leadTime')}</TableHead><TableHead>{t('bom.status')}</TableHead>
                <TableHead>{t('bom.qc')}</TableHead><TableHead>{t('bom.approval')}</TableHead><TableHead className="text-right">{t('bom.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bomItems.length === 0 && (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">{t('bom.noBomItems')}</TableCell></TableRow>
              )}
              {bomItems.map(item => (
                <TableRow key={item.id} className={item.is_critical ? 'bg-red-50/50' : ''}>
                  <TableCell className="font-medium">{item.item_code}</TableCell>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell className="max-w-[150px] truncate" title={item.specification || ''}>{item.specification || t('bom.none')}</TableCell>
                  <TableCell>{item.quantity} {item.unit}</TableCell>
                  <TableCell>${item.unit_cost ? Number(item.unit_cost).toLocaleString() : t('bom.none')}</TableCell>
                  <TableCell className="font-medium">${item.total_cost ? Number(item.total_cost).toLocaleString() : t('bom.none')}</TableCell>
                  <TableCell>{item.supplier?.name || t('bom.none')}</TableCell>
                  <TableCell>{item.lead_time_days ? t('bom.days', { days: item.lead_time_days }) : t('bom.none')}</TableCell>
                  <TableCell>{statusBadge(item.status)}</TableCell>
                  <TableCell>{statusBadge(item.qc_status)}</TableCell>
                  <TableCell>{statusBadge(item.approval_status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.is_critical && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {canWrite && item.approval_status === 'draft' && (<><Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleSubmitForApproval(item.id)}><Send className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></>)}
                      {canApprove && item.approval_status === 'submitted' && (<><Button variant="ghost" size="icon" onClick={() => handleApprove(item.id)}><CheckCircle className="h-4 w-4 text-green-600" /></Button><Button variant="ghost" size="icon" onClick={() => handleReject(item.id)}><XCircle className="h-4 w-4 text-red-600" /></Button></>)}
                      {canWrite && item.approval_status === 'rejected' && <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? t('bom.editBomItem') : t('bom.addBomItem')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>{t('bom.itemCodeRequired')}</Label><Input value={form.item_code} onChange={e => setForm(f => ({ ...f, item_code: e.target.value }))} placeholder={t('bom.placeholderItemCode')} /></div>
              <div className="space-y-1"><Label>{t('bom.productNameRequired')}</Label><Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder={t('bom.placeholderProduct')} /></div>
            </div>
            <div className="space-y-1"><Label>{t('bom.specification')}</Label><Input value={form.specification} onChange={e => setForm(f => ({ ...f, specification: e.target.value }))} placeholder={t('bom.placeholderSpec')} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1"><Label>{t('bom.quantityRequired')}</Label><Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} /></div>
              <div className="space-y-1"><Label>{t('bom.unit')}</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder={t('bom.placeholderUnit')} /></div>
              <div className="space-y-1"><Label>{t('bom.unitCost')}</Label><Input type="number" min={0} step="0.01" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder={t('bom.placeholderCost')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t('bom.supplier')}</Label>
                <Select value={form.supplier_id} onValueChange={v => setForm(f => ({ ...f, supplier_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('bom.selectSupplier')} /></SelectTrigger>
                  <SelectContent><SelectItem value="">{t('bom.noSupplier')}</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.supplier_code})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>{t('bom.leadTimeDays')}</Label><Input type="number" min={0} value={form.lead_time_days} onChange={e => setForm(f => ({ ...f, lead_time_days: e.target.value }))} placeholder={t('bom.placeholderLeadTime')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>{t('bom.plannedEta')}</Label><Input type="date" value={form.planned_eta} onChange={e => setForm(f => ({ ...f, planned_eta: e.target.value }))} /></div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="is_critical" checked={form.is_critical} onChange={e => setForm(f => ({ ...f, is_critical: e.target.checked }))} className="h-4 w-4" />
                <Label htmlFor="is_critical" className="cursor-pointer">{t('bom.criticalItemCheckbox')}</Label>
              </div>
            </div>
            {form.quantity && form.unit_cost && (
              <div className="bg-slate-50 border rounded p-3 text-sm">
                <span className="text-muted-foreground">{t('bom.autoCalculatedTotal')} </span>
                <span className="font-bold">${(parseFloat(form.unit_cost || '0') * form.quantity).toLocaleString()}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!form.item_code || !form.product_name || !form.quantity}>{editingId ? t('common.update') : t('common.create')}</Button>
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
