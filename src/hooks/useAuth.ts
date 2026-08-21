import { useState, useEffect, useCallback } from 'react';

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
