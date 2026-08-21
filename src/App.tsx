import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Projects } from '@/pages/Projects';
import { ProjectDetail } from '@/pages/ProjectDetail';
import { ProjectCockpit } from '@/pages/ProjectCockpit';
import { AuditChecklist } from '@/pages/AuditChecklist';
import { BomManagement } from '@/pages/BomManagement';
import { EtaTracking } from '@/pages/EtaTracking';
import { PilotExecution } from '@/pages/PilotExecution';
import { PilotIssues } from '@/pages/PilotIssues';
import { PilotKpi } from '@/pages/PilotKpi';
import { SupplierDetail } from '@/pages/SupplierDetail';
import { PartnerDetail } from '@/pages/PartnerDetail';
import { NotFound } from '@/pages/NotFound';
import { useAuth } from '@/hooks/useAuth';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function ComingSoon({ module }: { module: string }) {
  const { t } = useTranslation();
  return <div className="p-8 text-center text-muted-foreground">{t('common.comingSoon', { module })}</div>;
}

function App() {
  const { t } = useTranslation();

  return (
    <BrowserRouter>
      <ProjectProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
          <Route path="/projects/:id" element={<PrivateRoute><ProjectDetail /></PrivateRoute>} />
          <Route path="/project-cockpit" element={<PrivateRoute><ProjectCockpit /></PrivateRoute>} />
          <Route path="/audits/:id" element={<PrivateRoute><AuditChecklist /></PrivateRoute>} />
          <Route path="/bom" element={<PrivateRoute><BomManagement /></PrivateRoute>} />
          <Route path="/eta" element={<PrivateRoute><EtaTracking /></PrivateRoute>} />
          <Route path="/pilot-execution" element={<PrivateRoute><PilotExecution /></PrivateRoute>} />
          <Route path="/pilot-issues" element={<PrivateRoute><PilotIssues /></PrivateRoute>} />
          <Route path="/pilot-kpi" element={<PrivateRoute><PilotKpi /></PrivateRoute>} />
          <Route path="/suppliers" element={<PrivateRoute><ComingSoon module={t('nav.suppliers')} /></PrivateRoute>} />
          <Route path="/suppliers/:id" element={<PrivateRoute><SupplierDetail /></PrivateRoute>} />
          <Route path="/partners" element={<PrivateRoute><ComingSoon module={t('nav.partners')} /></PrivateRoute>} />
          <Route path="/partners/:id" element={<PrivateRoute><PartnerDetail /></PrivateRoute>} />
          <Route path="/risks" element={<PrivateRoute><ComingSoon module={t('nav.risks')} /></PrivateRoute>} />
          <Route path="/audit-logs" element={<PrivateRoute><ComingSoon module={t('nav.auditLogs')} /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><ComingSoon module={t('nav.settings')} /></PrivateRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ProjectProvider>
    </BrowserRouter>
  );
}

export default App;
