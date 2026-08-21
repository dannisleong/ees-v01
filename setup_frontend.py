import os

BASE = r"C:\Users\danni\Documents\kimi\workspace\ees-v01-alpha"

def write(path, content):
    full = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Written: {path}")

# ─────────────────────────────────────────────────────────────────────────────
# API Client
# ─────────────────────────────────────────────────────────────────────────────

write("src/lib/api.ts", '''const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('ees_token');
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('ees_token');
    localStorage.removeItem('ees_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw err;
  }
  return res.json();
}

export const api = {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body: any) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: any) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};
''')

# ─────────────────────────────────────────────────────────────────────────────
# Auth Hook
# ─────────────────────────────────────────────────────────────────────────────

write("src/hooks/useAuth.ts", '''import { useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  email: string;
  name_en: string | null;
  name_zh: string | null;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('ees_user');
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback((token: string, userData: User) => {
    localStorage.setItem('ees_token', token);
    localStorage.setItem('ees_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ees_token');
    localStorage.removeItem('ees_user');
    setUser(null);
  }, []);

  return { user, loading, login, logout, isAuthenticated: !!user };
}
''')

# ─────────────────────────────────────────────────────────────────────────────
# Layout Components
# ─────────────────────────────────────────────────────────────────────────────

write("src/components/layout/Header.tsx", '''import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe, LogOut, User } from 'lucide-react';
import type { User as UserType } from '@/hooks/useAuth';

interface HeaderProps {
  user: UserType | null;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    const next = i18n.language === 'zh-CN' ? 'en' : 'zh-CN';
    i18n.changeLanguage(next);
  };

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg tracking-tight">{t('app.nameShort')}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">V0.1 Alpha</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={toggleLang} className="gap-1">
          <Globe className="h-4 w-4" />
          <span className="text-xs">{i18n.language === 'zh-CN' ? '中文' : 'EN'}</span>
        </Button>
        {user && (
          <>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{user.name_en || user.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout} className="gap-1 text-red-500">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
''')

write("src/components/layout/AppLayout.tsx", '''import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { Header } from './Header';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, FolderKanban, Truck, Users, AlertTriangle,
  FileText, Settings
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/projects', icon: FolderKanban, labelKey: 'nav.projects' },
  { path: '/suppliers', icon: Truck, labelKey: 'nav.suppliers' },
  { path: '/partners', icon: Users, labelKey: 'nav.partners' },
  { path: '/risks', icon: AlertTriangle, labelKey: 'nav.risks' },
  { path: '/audit-logs', icon: FileText, labelKey: 'nav.auditLogs' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header user={user} onLogout={logout} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 border-r bg-white flex flex-col overflow-y-auto shrink-0">
          <nav className="p-2 space-y-1">
            {navItems.map(item => {
              const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
''')

# ─────────────────────────────────────────────────────────────────────────────
# Pages
# ─────────────────────────────────────────────────────────────────────────────

write("src/pages/Login.tsx", '''import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.token, res.user);
      navigate('/');
    } catch (err: any) {
      setError(err.error || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('app.nameShort')}</CardTitle>
          <p className="text-sm text-muted-foreground">V0.1 Alpha — {t('auth.login')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('auth.email')}</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="founder@ees.sg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('auth.password')}</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="password123"
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('auth.loggingIn') : t('auth.loginButton')}
            </Button>
          </form>
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p>Demo accounts:</p>
            <p>founder@ees.sg / cammy@ees.sg / dongmei@ees.sg / reviewer@ees.sg / pm@ees.sg</p>
            <p>Password: password123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
''')

write("src/pages/Dashboard.tsx", '''import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { AlertCircle, AlertTriangle, Clock, FileWarning, Package } from 'lucide-react';
import { Link } from 'react-router';

interface DashboardData {
  summary: {
    noGoCount: number;
    criticalRiskCount: number;
    expiringCount: number;
    openIssueCount: number;
    qcFailureCount: number;
  };
  noGoGates: any[];
  criticalRisks: any[];
  openIssues: any[];
}

export function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/attention')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>;
  if (!data) return <div className="p-8 text-center text-red-500">{t('common.error')}</div>;

  const { summary } = data;
  const hasAttention = summary.noGoCount + summary.criticalRiskCount + summary.openIssueCount > 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {hasAttention && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {summary.noGoCount > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4 flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{summary.noGoCount}</p>
                  <p className="text-sm text-red-700">{t('dashboard.noGoGates')}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {summary.criticalRiskCount > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{summary.criticalRiskCount}</p>
                  <p className="text-sm text-orange-700">{t('dashboard.criticalRisks')}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {summary.openIssueCount > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4 flex items-center gap-3">
                <FileWarning className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-amber-600">{summary.openIssueCount}</p>
                  <p className="text-sm text-amber-700">{t('dashboard.openIssues')}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {summary.qcFailureCount > 0 && (
            <Card className="border-rose-200 bg-rose-50">
              <CardContent className="pt-4 flex items-center gap-3">
                <Package className="h-8 w-8 text-rose-600" />
                <div>
                  <p className="text-2xl font-bold text-rose-600">{summary.qcFailureCount}</p>
                  <p className="text-sm text-rose-700">{t('dashboard.qcFailures')}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!hasAttention && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium text-green-700">{t('dashboard.subtitle')} — ✅ All Clear</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.noGoGates')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.noGoGates.length === 0 && <p className="text-sm text-muted-foreground">No NO-GO gates</p>}
            {data.noGoGates.map(g => (
              <div key={g.id} className="flex items-center justify-between p-2 rounded bg-red-50 border border-red-100">
                <div>
                  <p className="font-medium text-sm">{g.project?.name_en || g.project_id}</p>
                  <p className="text-xs text-muted-foreground">Gate {g.gate?.gate_number}: {g.gate?.name_en}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/projects/${g.project_id}`}>{t('common.view')}</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.openIssues')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.openIssues.length === 0 && <p className="text-sm text-muted-foreground">No open issues</p>}
            {data.openIssues.slice(0, 5).map(issue => (
              <div key={issue.id} className="flex items-center justify-between p-2 rounded bg-amber-50 border border-amber-100">
                <div>
                  <p className="font-medium text-sm">{issue.title}</p>
                  <p className="text-xs text-muted-foreground">{issue.project?.name_en || issue.project_id} — {issue.severity}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
''')

write("src/pages/Projects.tsx", '''import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
                  <span>Stage {p.current_stage}</span>
                  <span>Gate {p.current_gate}</span>
                  {p._count?.issues > 0 && <span className="text-red-500">{p._count.issues} issues</span>}
                  {p._count?.risks > 0 && <span className="text-orange-500">{p._count.risks} risks</span>}
                </div>
              </div>
              <Button size="sm" asChild>
                <Link to={`/projects/${p.id}`}>{t('projects.view')}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {projects.length === 0 && <p className="text-center text-muted-foreground py-8">No projects yet.</p>}
      </div>
    </div>
  );
}
''')

write("src/pages/ProjectDetail.tsx", '''import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function ProjectDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/projects/${id}`)
      .then(setProject)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>;
  if (!project) return <div className="p-8 text-center">{t('common.error')}</div>;

  const order = project.customer_orders?.[0];
  const deposits = order?.customer_deposits || [];
  const totalDeposits = deposits.reduce((sum: number, d: any) => sum + parseFloat(d.deposit_amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name_en || project.name_zh || project.project_code}</h1>
          <p className="text-sm text-muted-foreground">{project.project_code} — Stage {project.current_stage} / Gate {project.current_gate}</p>
        </div>
        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>{project.status}</Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('projects.overview')}</TabsTrigger>
          <TabsTrigger value="order">{t('projects.order')}</TabsTrigger>
          <TabsTrigger value="gates">Gates</TabsTrigger>
          <TabsTrigger value="audits">{t('projects.audits')}</TabsTrigger>
          <TabsTrigger value="issues">{t('projects.issues')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <Card>
            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Cammy</p>
                <p className="font-medium">{project.cammy?.name_en || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dongmei</p>
                <p className="font-medium">{project.dongmei?.name_en || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PM</p>
                <p className="font-medium">{project.pm?.name_en || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{project.customer?.name || '-'}</p>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Selling Price</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">${project.selling_price || 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total Landed Cost</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">${project.total_landed_cost || 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Margin %</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{project.target_margin_percent || 0}%</p></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="order" className="space-y-3">
          {order ? (
            <>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between"><span>Order Amount</span><span className="font-bold">${order.order_amount}</span></div>
                  <div className="flex justify-between"><span>Deposit Required</span><span className="font-bold">${order.deposit_required}</span></div>
                  <div className="flex justify-between"><span>Total Deposits Received</span><span className="font-bold">${totalDeposits}</span></div>
                  <div className="flex justify-between"><span>Balance</span><span className="font-bold">${parseFloat(order.order_amount) - totalDeposits}</span></div>
                  <div className="flex justify-between"><span>Payment Status</span>
                    <Badge variant={order.payment_status === 'deposit_received' ? 'default' : order.payment_status === 'fully_paid' ? 'default' : 'destructive'}>
                      {order.payment_status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Deposit Records (SSOT)</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {deposits.map((d: any) => (
                    <div key={d.id} className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>${d.deposit_amount}</span>
                      <span className="text-sm text-muted-foreground">{d.received_date}</span>
                    </div>
                  ))}
                  {deposits.length === 0 && <p className="text-sm text-muted-foreground">No deposits recorded.</p>}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-muted-foreground">No order created yet.</p>
          )}
        </TabsContent>

        <TabsContent value="gates" className="space-y-3">
          {project.gate_results?.map((gr: any) => (
            <Card key={gr.id} className={gr.result === 'NO-GO' ? 'border-red-300' : gr.result === 'GO' ? 'border-green-300' : ''}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {gr.result === 'GO' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                   gr.result === 'NO-GO' ? <AlertCircle className="h-5 w-5 text-red-600" /> :
                   <Clock className="h-5 w-5 text-amber-600" />}
                  <div>
                    <p className="font-medium">Gate {gr.gate?.gate_number}: {gr.gate?.name_en}</p>
                    <p className="text-xs text-muted-foreground">{gr.reason || 'No reason provided'}</p>
                  </div>
                </div>
                <Badge variant={gr.result === 'GO' ? 'default' : gr.result === 'NO-GO' ? 'destructive' : 'secondary'}>
                  {gr.result}
                </Badge>
              </CardContent>
            </Card>
          ))}
          {(!project.gate_results || project.gate_results.length === 0) && (
            <p className="text-muted-foreground">No gate evaluations yet.</p>
          )}
        </TabsContent>

        <TabsContent value="audits" className="space-y-3">
          {project.quality_audits?.map((audit: any) => (
            <Card key={audit.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{audit.audit_number}</span>
                  <Badge variant={audit.result === 'pass' ? 'default' : audit.result === 'fail' ? 'destructive' : 'secondary'}>
                    {audit.result}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{audit.audit_items?.length || 0} items</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/audits/${audit.id}`}>View Checklist</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="issues" className="space-y-3">
          {project.issues?.map((issue: any) => (
            <Card key={issue.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{issue.issue_number}: {issue.title}</span>
                  <Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}>{issue.severity}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{issue.status}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
''')

write("src/pages/AuditChecklist.tsx", '''import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

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
          {audit.result}
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
                      N/A
                    </Button>
                  </div>
                )}
                {isSubmitted && (
                  <Badge variant={item.result === 'pass' ? 'default' : item.result === 'fail' ? 'destructive' : 'secondary'}>
                    {item.result}
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
''')

write("src/pages/NotFound.tsx", '''import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Button asChild>
        <Link to="/">Go Home</Link>
      </Button>
    </div>
  );
}
''')

print("Frontend pages written.")
