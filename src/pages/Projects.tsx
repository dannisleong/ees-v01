import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

export function Projects() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects')
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('projects.title')}</h1>
      </div>
      <div className="grid gap-3">
        {projects.map(p => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.project_code}</span>
                  <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{p.name_en || p.name_zh}</p>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{t('projects.stageLabel', { stage: p.current_stage })}</span>
                  <span>{t('projects.gateLabel', { gate: p.current_gate })}</span>
                  {p._count?.issues > 0 && <span className="text-red-500">{t('projects.issuesCount', { count: p._count.issues })}</span>}
                  {p._count?.risks > 0 && <span className="text-orange-500">{t('projects.risksCount', { count: p._count.risks })}</span>}
                </div>
              </div>
              <Button size="sm" asChild>
                <Link to={`/projects/${p.id}`}>{t('projects.view')}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {projects.length === 0 && <p className="text-center text-muted-foreground py-8">{t('projects.noProjects')}</p>}
      </div>
    </div>
  );
}
