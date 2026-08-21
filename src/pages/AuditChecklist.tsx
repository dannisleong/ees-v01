import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { CheckCircle, XCircle } from 'lucide-react';

export function AuditChecklist() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [audit, setAudit] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/audits/project/${id}`)
      .then((data: any[]) => {
        const a = data.find(x => x.id === id);
        if (a) {
          setAudit(a);
          setItems(a.audit_items || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const updateItem = (itemId: string, updates: any) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i));
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post(`/audits/${id}/submit`, { items });
      setAudit(res);
      setItems(res.audit_items);
    } catch (err: any) {
      setError(err.message || err.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>;
  if (!audit) return <div className="p-8 text-center">Audit not found</div>;

  const isSubmitted = audit.result !== 'pending';

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('audit.title')}</h1>
          <p className="text-sm text-muted-foreground">{audit.audit_number}</p>
        </div>
        <Badge variant={audit.result === 'pass' ? 'default' : audit.result === 'fail' ? 'destructive' : 'secondary'}>
          {t('audit.result' + (audit.result.charAt(0).toUpperCase() + audit.result.slice(1)))}
        </Badge>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id} className={item.is_critical ? 'border-orange-300' : ''}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.item_name}</span>
                    {item.is_critical && <Badge variant="destructive" className="text-xs">{t('audit.critical')}</Badge>}
                  </div>
                  {item.expected_standard && (
                    <p className="text-xs text-muted-foreground mt-1">{item.expected_standard}</p>
                  )}
                </div>
                {!isSubmitted && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant={item.result === 'pass' ? 'default' : 'outline'}
                      onClick={() => updateItem(item.id, { result: 'pass' })}>
                      <CheckCircle className="h-3 w-3 mr-1" />{t('audit.pass')}
                    </Button>
                    <Button size="sm" variant={item.result === 'fail' ? 'destructive' : 'outline'}
                      onClick={() => updateItem(item.id, { result: 'fail' })}>
                      <XCircle className="h-3 w-3 mr-1" />{t('audit.fail')}
                    </Button>
                    <Button size="sm" variant={item.result === 'na' ? 'secondary' : 'outline'}
                      onClick={() => updateItem(item.id, { result: 'na' })}>
                      {t('audit.resultNa')}
                    </Button>
                  </div>
                )}
                {isSubmitted && (
                  <Badge variant={item.result === 'pass' ? 'default' : item.result === 'fail' ? 'destructive' : 'secondary'}>
                    {t('audit.result' + (item.result.charAt(0).toUpperCase() + item.result.slice(1)))}
                  </Badge>
                )}
              </div>

              {(item.result === 'fail' || isSubmitted) && (
                <div className="space-y-2">
                  {!isSubmitted && (
                    <textarea
                      className="w-full p-2 text-sm border rounded-md"
                      placeholder={t('audit.findingDetails')}
                      value={item.finding_details || ''}
                      onChange={e => updateItem(item.id, { finding_details: e.target.value })}
                      rows={2}
                    />
                  )}
                  {isSubmitted && item.finding_details && (
                    <div className="p-2 bg-slate-50 rounded text-sm">
                      <span className="font-medium">{t('audit.findingDetails')}:</span> {item.finding_details}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!isSubmitted && (
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            {submitting ? t('common.loading') : t('audit.submitAudit')}
          </Button>
        </div>
      )}
    </div>
  );
}
