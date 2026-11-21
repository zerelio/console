// API client that attaches auth token to every request.
// Uses localStorage directly to avoid circular dependencies with AuthContext.

// Base URL: set VITE_ZERELIO_API_URL for production; in dev, proxy handles /api → http://localhost:8080
export const apiBase = (import.meta.env.VITE_ZERELIO_API_URL as string) || '';

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('zerelio_at');
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    localStorage.removeItem('zerelio_at');
    localStorage.removeItem('zerelio_user');
    window.location.href = '/login';
  }

  return res;
}
