import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Truck, ArrowLeft, Package, Clock, DollarSign, CheckCircle2 } from 'lucide-react';

export function SupplierDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const [project, setProject] = useState<any>(null);
  const [supplierItems, setSupplierItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !id) return;
    setLoading(true);
    api.get(`/projects/${projectId}`)
      .then((data: any) => {
        setProject(data);
        const items = (data.bom_items || []).filter((item: any) => item.supplier_id === id);
        setSupplierItems(items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, id]);

  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>;
  if (!project) return <div className="p-8 text-center">{t('common.error')}</div>;

  const supplier = supplierItems[0]?.supplier;
  const totalCost = supplierItems.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0);
  const delayedItems = supplierItems.filter((item: any) => !item.actual_arrival && item.planned_eta && new Date(item.planned_eta) < new Date());
  const arrivedItems = supplierItems.filter((item: any) => item.actual_arrival);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={projectId ? `/project-cockpit?tab=suppliers` : '/project-cockpit'}>
            <ArrowLeft className="h-4 w-4 mr-1" />{t('common.back')}
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Truck className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">{supplier?.name || t('nav.suppliers')}</h1>
          <p className="text-sm text-muted-foreground">{supplier?.supplier_code} | {project.project_code}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{supplierItems.length}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('bom.totalItems')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{t('finance.currency')} {totalCost.toLocaleString()}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('finance.totalLandedCost')}</p>
          </CardContent>
        </Card>
        <Card className={delayedItems.length > 0 ? 'border-red-200' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className={`text-2xl font-bold ${delayedItems.length > 0 ? 'text-red-600' : ''}`}>{delayedItems.length}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('eta.delayed')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{arrivedItems.length}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('eta.arrived')}</p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-lg font-semibold">{t('projectCockpit.bom')} — {supplier?.name}</h3>
      <div className="space-y-2">
        {supplierItems.map(item => (
          <Card key={item.id} className={!item.actual_arrival && item.planned_eta && new Date(item.planned_eta) < new Date() ? 'border-red-200' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{item.item_code} — {item.product_name}</span>
                <div className="flex items-center gap-2">
                  {item.is_critical && <Badge className="bg-red-100 text-red-700">{t('bom.criticalItem')}</Badge>}
                  <Badge variant={item.approval_status === 'approved' ? 'default' : 'secondary'}>{item.approval_status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>{t('bom.plannedEta')}: {item.planned_eta?.split('T')[0] || '—'}</span>
                <span>{t('bom.qc')}: {item.qc_status}</span>
                <span>{t('bom.unitCost')}: {t('finance.currency')} {item.unit_cost ? Number(item.unit_cost).toLocaleString() : '0'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {supplierItems.length === 0 && <p className="text-muted-foreground">{t('bom.noBomItems')}</p>}
      </div>
    </div>
  );
}
