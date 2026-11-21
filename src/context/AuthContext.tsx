import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
  user_id: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('zerelio_at'));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('zerelio_user');
    if (stored) {
      try { return JSON.parse(stored); } catch {}
    }
    return null;
  });

  // Sync with localStorage changes (e.g. from apiFetch 401 clearing)
  useEffect(() => {
    const check = () => {
      const stored = localStorage.getItem('zerelio_at');
      if (!stored && token) {
        setToken(null);
      }
    };
    window.addEventListener('storage', check);
    window.addEventListener('focus', check);
    return () => {
      window.removeEventListener('storage', check);
      window.removeEventListener('focus', check);
    };
  }, [token]);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const u = { user_id: payload.user_id, email: payload.email, roles: payload.roles || [] };
        setUser(u);
        localStorage.setItem('zerelio_user', JSON.stringify(u));
        localStorage.setItem('zerelio_at', token);
      } catch {
        setToken(null);
        setUser(null);
        localStorage.removeItem('zerelio_at');
        localStorage.removeItem('zerelio_user');
      }
    } else {
      setUser(null);
      localStorage.removeItem('zerelio_at');
      localStorage.removeItem('zerelio_user');
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.data?.error || 'Login failed');
    }
    setToken(data.access_token);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('zerelio_at');
    localStorage.removeItem('zerelio_user');
  }, []);

  const hasRole = useCallback((role: string) => {
    return user?.roles?.includes(role) || false;
  }, [user]);

  const isAdmin = user?.roles?.includes('admin') || false;
  const isEditor = user?.roles?.includes('editor') || isAdmin;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isAdmin, isEditor, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
