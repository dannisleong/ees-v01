import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { Header } from './Header';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, FolderKanban, Gauge, Zap, Bug, BarChart3,
  FileText, Settings
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/projects', icon: FolderKanban, labelKey: 'nav.projects' },
  { path: '/project-cockpit', icon: Gauge, labelKey: 'nav.projectCockpit' },
  { path: '/pilot-execution', icon: Zap, labelKey: 'nav.pilotExecution' },
  { path: '/pilot-issues', icon: Bug, labelKey: 'nav.pilotIssues' },
  { path: '/pilot-kpi', icon: BarChart3, labelKey: 'nav.pilotKpi' },
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
