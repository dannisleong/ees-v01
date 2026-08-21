import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';

export interface ProjectOption {
  id: string;
  project_code: string;
  name_en: string | null;
  name_zh: string | null;
  status: string;
  current_stage: number | null;
  current_gate: number | null;
}

interface ProjectContextValue {
  projects: ProjectOption[];
  selectedProjectId: string | null;
  selectedProject: ProjectOption | null;
  setSelectedProjectId: (id: string | null) => void;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(() => {
    return localStorage.getItem('ees_selected_project');
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects')
      .then((data: ProjectOption[]) => {
        setProjects(data);
        // If no project selected and there are projects, auto-select the first active one
        const stored = localStorage.getItem('ees_selected_project');
        if (!stored && data.length > 0) {
          const firstActive = data.find(p => p.status === 'active') || data[0];
          setSelectedProjectIdState(firstActive.id);
          localStorage.setItem('ees_selected_project', firstActive.id);
        } else if (stored && !data.find(p => p.id === stored)) {
          // Stored project no longer exists
          const firstActive = data.find(p => p.status === 'active') || data[0];
          if (firstActive) {
            setSelectedProjectIdState(firstActive.id);
            localStorage.setItem('ees_selected_project', firstActive.id);
          } else {
            setSelectedProjectIdState(null);
            localStorage.removeItem('ees_selected_project');
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const setSelectedProjectId = useCallback((id: string | null) => {
    setSelectedProjectIdState(id);
    if (id) {
      localStorage.setItem('ees_selected_project', id);
    } else {
      localStorage.removeItem('ees_selected_project');
    }
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  return (
    <ProjectContext.Provider value={{ projects, selectedProjectId, selectedProject, setSelectedProjectId, loading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
