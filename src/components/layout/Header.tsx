import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe, LogOut, User } from 'lucide-react';
import type { User as UserType } from '@/hooks/useAuth';
import { useProject } from '@/contexts/ProjectContext';

interface HeaderProps {
  user: UserType | null;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { projects, selectedProject, setSelectedProjectId } = useProject();

  const toggleLang = () => {
    const next = i18n.language === 'zh-CN' ? 'en' : 'zh-CN';
    i18n.changeLanguage(next);
  };

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-bold text-lg tracking-tight">{t('app.nameShort')}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">V0.1 Alpha</span>
        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="hidden md:flex items-center gap-1 ml-4">
            <span className="text-xs text-muted-foreground">{t('projectSelector.label')}:</span>
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              className="text-sm border rounded px-2 py-1 bg-white hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              <option value="">{t('projectSelector.allProjects')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code} — {p.name_en || p.name_zh || p.project_code}
                </option>
              ))}
            </select>
          </div>
        )}
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
