'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  parseOIDCFragment,
} from '@/app/lib/auth';
import { apiPost } from '@/app/lib/api';

interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface AuthContextType {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname() ?? '';

  const logout = useCallback(() => {
    clearTokens();
    setToken(null);
    router.push('/login');
  }, [router]);

  const tryRefresh = useCallback(async (): Promise<boolean> => {
    const rt = getRefreshToken();
    if (!rt) return false;
    try {
      const data = await apiPost<AuthTokenResponse>(
        '/auth/refresh',
        { refresh_token: rt },
        null,
      );
      setTokens(data.access_token, data.refresh_token);
      setToken(data.access_token);
      return true;
    } catch {
      return false;
    }
  }, []);

  // On mount: parse OIDC fragment or restore from localStorage
  useEffect(() => {
    const fragment = parseOIDCFragment();
    if (fragment?.access_token && fragment?.refresh_token) {
      setTokens(fragment.access_token, fragment.refresh_token);
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      );
      setToken(fragment.access_token);
      setIsLoading(false);
      return;
    }
    setToken(getAccessToken());
    setIsLoading(false);
  }, []);

  // Listen for 401 → try refresh → else logout
  useEffect(() => {
    const handle = async () => {
      const refreshed = await tryRefresh();
      if (!refreshed) logout();
    };
    window.addEventListener('zerelio:unauthorized', handle);
    return () => window.removeEventListener('zerelio:unauthorized', handle);
  }, [tryRefresh, logout]);

  // Redirect unauthenticated users to /login
  useEffect(() => {
    if (!isLoading && !token && pathname !== '/login') {
      router.push('/login');
    }
  }, [isLoading, token, pathname, router]);

  // Redirect authenticated users away from /login
  useEffect(() => {
    if (!isLoading && token && pathname === '/login') {
      router.push('/');
    }
  }, [isLoading, token, pathname, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiPost<AuthTokenResponse>(
        '/auth/login',
        { email, password },
        null,
      );
      setTokens(data.access_token, data.refresh_token);
      setToken(data.access_token);
      router.push('/');
    },
    [router],
  );

  // Show full-screen spinner while resolving auth (except on /login)
  const showSpinner = isLoading && pathname !== '/login';
  // Block children render if unauthed on a protected page
  const blockRender = !isLoading && !token && pathname !== '/login';

  return (
    <AuthContext.Provider value={{ token, login, logout, isLoading }}>
      {showSpinner ? (
        <div
          className="flex-1 flex items-center justify-center"
          style={{ background: '#0a0a0a' }}
        >
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }}
          />
        </div>
      ) : blockRender ? null : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
