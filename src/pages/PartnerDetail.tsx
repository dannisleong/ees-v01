import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Users, ArrowLeft, Wrench, UserCheck, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export function PartnerDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const [project, setProject] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !id) return;
    setLoading(true);
    api.get(`/projects/${projectId}`)
      .then((data: any) => {
        setProject(data);
        const pp = (data.project_partners || []).find((p: any) => p.partner_id === id);
        setPartnerData(pp);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, id]);

  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>;
  if (!project || !partnerData) return <div className="p-8 text-center">{t('common.error')}</div>;

  const partner = partnerData.partner;
  const relatedIssues = (project.issues || []).filter((i: any) => i.assigned_to === id || i.category === 'installation');
  const relatedRisks = (project.risks || []).filter((r: any) => r.category === 'installation');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={projectId ? `/project-cockpit?tab=partners` : '/project-cockpit'}>
            <ArrowLeft className="h-4 w-4 mr-1" />{t('common.back')}
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold">{partner?.name || t('nav.partners')}</h1>
          <p className="text-sm text-muted-foreground">{partner?.type} | {project.project_code}</p>
        </div>
      </div>

      {/* Ownership Banner */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground bg-slate-100 rounded-lg p-3">
        <span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> {t('projectCockpit.executionOwner')}: {t('owners.singaporePartner')}</span>
        <span className="hidden sm:inline">|</span>
        <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> {t('projectCockpit.eesOwner')}: {t('owners.cammy')} / {t('owners.dongmei')}</span>
        <span className="hidden sm:inline">|</span>
        <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> {t('projectCockpit.escalation')}: {t('owners.founder')}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{partnerData.status}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('projects.status')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{relatedIssues.length}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('projects.issues')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{relatedRisks.length}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('projects.risks')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{partnerData.assigned_stage || '—'}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('projects.stage')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Qualifications */}
      {partner?.qualifications && partner.qualifications.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('nav.partners')} — {t('projectCockpit.quality')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {partner.qualifications.map((q: any) => (
              <div key={q.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm">{q.qualification_type?.name_en || q.qualification_type?.type_code}</span>
                <Badge variant={q.status === 'valid' ? 'default' : q.status === 'expired' ? 'destructive' : 'secondary'}>{q.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Related Issues */}
      {relatedIssues.length > 0 && (
        <>
          <h3 className="text-lg font-semibold">{t('projects.issues')}</h3>
          <div className="space-y-2">
            {relatedIssues.map((i: any) => (
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
        </>
      )}
    </div>
  );
}
