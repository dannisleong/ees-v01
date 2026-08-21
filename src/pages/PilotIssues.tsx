import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Filter, Eye, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface PilotIssue {
  id: string; project_id: string; title: string; description: string | null;
  category: string; priority: string; owner_id: string | null; action: string | null;
  status: string; resolution: string | null; created_at: string; updated_at: string;
}

const CATEGORIES = ['business_rule', 'sop', 'ux', 'software_defect'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

export function PilotIssues() {
  const { t } = useTranslation();
  const [issues, setIssues] = useState<PilotIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [viewIssue, setViewIssue] = useState<PilotIssue | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchProjects = useCallback(async () => {
    const data = await api.get('/projects');
    setProjects(data);
    if (data.length > 0 && !projectId) setProjectId(data[0].id);
  }, [projectId]);

  const fetchIssues = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { const data = await api.get(`/pilot-issues/project/${projectId}`); setIssues(data); }
    catch (e: any) { toast.error(e.error || t('common.error')); }
    finally { setLoading(false); }
  }, [projectId, t]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  const filteredIssues = issues.filter(issue => {
    if (filterCategory !== 'all' && issue.category !== filterCategory) return false;
    if (filterPriority !== 'all' && issue.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && issue.status !== filterStatus) return false;
    if (search && !issue.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const priorityColor = (p: string) => ({ critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-blue-100 text-blue-800' }[p] || 'bg-gray-100');
  const statusColor = (s: string) => ({ open: 'bg-red-100 text-red-800', in_progress: 'bg-blue-100 text-blue-800', resolved: 'bg-green-100 text-green-800', closed: 'bg-gray-100 text-gray-800' }[s] || 'bg-gray-100');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t('pilot.issuesTitle')}</h1>
        <div className="flex items-center gap-2">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-64"><SelectValue placeholder={t('bom.selectProject')} /></SelectTrigger>
            <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_code}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Input placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-32"><SelectValue placeholder={t('pilot.issueCategory')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{t(`pilot.categories.${c}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-32"><SelectValue placeholder={t('pilot.issuePriority')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}>{t(`pilot.priorities.${p}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue placeholder={t('pilot.issueStatus')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{t(`pilot.statuses.${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
        <div className="space-y-3">
          {filteredIssues.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center text-muted-foreground">
                {t('pilot.noIssues')}
              </CardContent>
            </Card>
          )}
          {filteredIssues.map(issue => (
            <Card key={issue.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Column 1: Title + Category */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{issue.title}</span>
                      <Badge className={priorityColor(issue.priority)}>{t(`pilot.categories.${issue.category}`)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{issue.description || '—'}</p>
                  </div>

                  {/* Column 2: Priority + Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={priorityColor(issue.priority)}>{t(`pilot.priorities.${issue.priority}`)}</Badge>
                    <Badge className={statusColor(issue.status)}>{t(`pilot.statuses.${issue.status}`)}</Badge>
                  </div>

                  {/* Column 3: Owner + Action */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <UserCheck className="h-3 w-3" />
                    <span>{issue.owner_id || t('pilot.issueOwner')}</span>
                    {issue.action && <span className="max-w-[150px] truncate">| {issue.action}</span>}
                  </div>

                  {/* Column 4: View */}
                  <div className="shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setViewIssue(issue)}>
                      <Eye className="h-4 w-4 mr-1" />{t('common.view')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewIssue} onOpenChange={() => setViewIssue(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{viewIssue?.title}</DialogTitle></DialogHeader>
          {viewIssue && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">{t('pilot.issueCategory')}:</span> {t(`pilot.categories.${viewIssue.category}`)}</div>
                <div><span className="text-muted-foreground">{t('pilot.issuePriority')}:</span> {t(`pilot.priorities.${viewIssue.priority}`)}</div>
                <div><span className="text-muted-foreground">{t('pilot.issueStatus')}:</span> {t(`pilot.statuses.${viewIssue.status}`)}</div>
                <div><span className="text-muted-foreground">{t('pilot.issueOwner')}:</span> {viewIssue.owner_id || '—'}</div>
              </div>
              <div><span className="text-muted-foreground">{t('pilot.issueAction')}:</span> {viewIssue.action || '—'}</div>
              <div><span className="text-muted-foreground">{t('pilot.issueResolution')}:</span> {viewIssue.resolution || '—'}</div>
              <div><span className="text-muted-foreground">{t('pilot.issueDescription')}:</span> {viewIssue.description || '—'}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
