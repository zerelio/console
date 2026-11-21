const AT_KEY = 'zerelio_at';
const RT_KEY = 'zerelio_rt';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AT_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(RT_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(AT_KEY, accessToken);
  localStorage.setItem(RT_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(AT_KEY);
  localStorage.removeItem(RT_KEY);
}

export function parseOIDCFragment(): { access_token?: string; refresh_token?: string } | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token') ?? undefined;
  const refresh_token = params.get('refresh_token') ?? undefined;
  if (!access_token && !refresh_token) return null;
  return { access_token, refresh_token };
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}
