export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_ZERELIO_API_URL ?? 'http://localhost:8080';
}

// ── Typed interfaces ───────────────────────────────────────────────────────

export interface Plugin {
  name: string;
  version: string;
  description: string;
  resource_types: string[];
}

export interface Scope {
  id: string;
  name: string;
  plugin_name: string;
  schedule: string;
  status: string;
  last_run: string | null;
  tenant_id: string;
  config: Record<string, unknown>;
}

export interface DiscoveryRun {
  id: string;
  scope_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  resources_found: number;
  relationships_found: number;
  errors: number;
}

export interface Resource {
  id: string;
  type: string;
  name: string;
  tenant_id: string;
  discovered_at: string;
  properties: Record<string, unknown>;
}

export interface ComponentHealth {
  status: string;
  latency?: string;
  message?: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  components: Record<string, ComponentHealth>;
}

export interface TriggeredRun {
  id: string;
  scope_id: string;
  status: string;
  started_at: string;
}

// ── Internal helpers ───────────────────────────────────────────────────────

function buildHeaders(token: string | null, withContentType = true): Record<string, string> {
  const h: Record<string, string> = {};
  if (withContentType) h['Content-Type'] = 'application/json';
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zerelio:unauthorized'));
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    let errText = res.statusText;
    try { errText = await res.text(); } catch { /* ignore */ }
    throw new Error(`API error ${res.status}: ${errText}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API helpers ─────────────────────────────────────────────────────

export async function apiGet<T>(path: string, token: string | null): Promise<T> {
  const res = await fetch(`${getApiUrl()}/api/v1${path}`, {
    headers: buildHeaders(token, false),
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body: unknown, token: string | null): Promise<T> {
  const res = await fetch(`${getApiUrl()}/api/v1${path}`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body: unknown, token: string | null): Promise<T> {
  const res = await fetch(`${getApiUrl()}/api/v1${path}`, {
    method: 'PATCH',
    headers: buildHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiDelete(path: string, token: string | null): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${getApiUrl()}/api/v1${path}`, {
    method: 'DELETE',
    headers,
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zerelio:unauthorized'));
    }
    throw new Error('Unauthorized');
  }
  if (res.status !== 204 && !res.ok) {
    let errText = res.statusText;
    try { errText = await res.text(); } catch { /* ignore */ }
    throw new Error(`API error ${res.status}: ${errText}`);
  }
}
