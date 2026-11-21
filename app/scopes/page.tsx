'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { apiGet, apiPost, apiDelete } from '@/app/lib/api';
import type { Scope, TriggeredRun } from '@/app/lib/api';

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type RunState = 'idle' | 'running' | 'success' | 'error';

export default function ScopesPage() {
  const { token } = useAuth();

  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runState, setRunState] = useState<Record<string, RunState>>({});
  const [runMsg, setRunMsg] = useState<Record<string, string>>({});

  const loadScopes = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiGet<{scopes: Scope[]}>('/discovery/scopes', token)
      .then((data) => {
        setScopes(data?.scopes ?? []);
        setError(null);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load scopes'),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadScopes();
  }, [loadScopes]);

  const handleTriggerRun = async (scopeId: string) => {
    setRunState((s) => ({ ...s, [scopeId]: 'running' }));
    setRunMsg((m) => ({ ...m, [scopeId]: '' }));
    try {
      await apiPost<TriggeredRun>(`/discovery/scopes/${scopeId}/run`, {}, token);
      setRunState((s) => ({ ...s, [scopeId]: 'success' }));
      setRunMsg((m) => ({ ...m, [scopeId]: 'Run triggered' }));
      setTimeout(
        () => setRunState((s) => ({ ...s, [scopeId]: 'idle' })),
        3000,
      );
    } catch (err: unknown) {
      setRunState((s) => ({ ...s, [scopeId]: 'error' }));
      setRunMsg((m) => ({
        ...m,
        [scopeId]: err instanceof Error ? err.message : 'Failed to trigger run',
      }));
    }
  };

  const handleDelete = async (scopeId: string) => {
    if (!window.confirm('Delete this scope? This cannot be undone.')) return;
    try {
      await apiDelete(`/discovery/scopes/${scopeId}`, token);
      setScopes((prev) => prev.filter((s) => s.id !== scopeId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <main className="flex-1 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Scopes</h1>
          <p className="text-sm mt-1" style={{ color: '#71717a' }}>
            Discovery scopes define what a plugin discovers and how often
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: '#6366f1' }}
        >
          + New Scope
        </button>
      </div>

      {error && (
        <div
          className="mb-6 rounded-xl border px-4 py-3 text-sm"
          style={{
            background: 'rgba(248,113,113,0.08)',
            borderColor: 'rgba(248,113,113,0.2)',
            color: '#f87171',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          className="rounded-xl border p-12 text-center text-sm"
          style={{ background: '#1a1a1a', borderColor: '#262626', color: '#52525b' }}
        >
          Loading scopes…
        </div>
      ) : scopes.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center text-sm"
          style={{ background: '#1a1a1a', borderColor: '#262626', color: '#52525b' }}
        >
          No scopes configured yet
        </div>
      ) : (
        /* Scope cards */
        <div className="grid gap-5">
          {scopes.map((scope) => {
            const rs = runState[scope.id] ?? 'idle';
            return (
              <div
                key={scope.id}
                className="rounded-xl border p-6"
                style={{ background: '#1a1a1a', borderColor: '#262626' }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: '#262626' }}
                    >
                      <span className="text-xs font-mono font-semibold" style={{ color: '#6366f1' }}>
                        {scope.plugin_name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">
                        {scope.name}
                      </h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-mono" style={{ color: '#52525b' }}>
                          plugin: {scope.plugin_name}
                        </span>
                        {scope.schedule && (
                          <>
                            <span className="text-xs" style={{ color: '#52525b' }}>·</span>
                            <span className="text-xs" style={{ color: '#52525b' }}>
                              🕒 {scope.schedule}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
                    >
                      <span className="w-1 h-1 rounded-full bg-green-400" />
                      {scope.status}
                    </span>

                    {/* Run status feedback */}
                    {rs === 'success' && (
                      <span className="text-xs" style={{ color: '#4ade80' }}>
                        ✓ {runMsg[scope.id]}
                      </span>
                    )}
                    {rs === 'error' && (
                      <span className="text-xs" style={{ color: '#f87171' }}>
                        ✕ {runMsg[scope.id]}
                      </span>
                    )}

                    <button
                      onClick={() => handleTriggerRun(scope.id)}
                      disabled={rs === 'running'}
                      className="text-xs px-3 py-1.5 rounded-md text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#6366f1' }}
                    >
                      {rs === 'running' ? '⟳ Running…' : '▶ Run Now'}
                    </button>

                    <button
                      onClick={() => handleDelete(scope.id)}
                      className="text-xs px-3 py-1.5 rounded-md border transition-colors hover:border-red-500/40 hover:text-red-400"
                      style={{ borderColor: '#2a2a2a', color: '#71717a' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {/* Config */}
                  <div>
                    <div
                      className="text-xs font-semibold uppercase tracking-wider mb-2"
                      style={{ color: '#52525b' }}
                    >
                      Config
                    </div>
                    <div
                      className="rounded-lg p-3 font-mono text-xs space-y-1"
                      style={{ background: '#111', color: '#a1a1aa' }}
                    >
                      {Object.entries(scope.config).length === 0 ? (
                        <span style={{ color: '#3f3f46' }}>No config</span>
                      ) : (
                        Object.entries(scope.config).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-4">
                            <span style={{ color: '#6366f1' }}>{k}</span>
                            <span style={{ color: '#71717a' }}>{String(v)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Plugin */}
                  <div>
                    <div
                      className="text-xs font-semibold uppercase tracking-wider mb-2"
                      style={{ color: '#52525b' }}
                    >
                      Plugin
                    </div>
                    <div
                      className="rounded-lg p-3 text-xs"
                      style={{ background: '#111', color: '#a1a1aa' }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color: '#6366f1' }}>⬡</span>
                        <span className="font-mono">{scope.plugin_name}</span>
                      </div>
                      {scope.tenant_id && (
                        <div className="mt-1.5 text-xs" style={{ color: '#3f3f46' }}>
                          tenant: {scope.tenant_id}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Last run */}
                  <div>
                    <div
                      className="text-xs font-semibold uppercase tracking-wider mb-2"
                      style={{ color: '#52525b' }}
                    >
                      Last Run
                    </div>
                    <div
                      className="rounded-lg p-3 text-xs space-y-2"
                      style={{ background: '#111' }}
                    >
                      <div className="flex justify-between">
                        <span style={{ color: '#52525b' }}>when</span>
                        <span style={{ color: '#a1a1aa' }}>
                          {timeAgo(scope.last_run)}
                        </span>
                      </div>
                      {scope.last_run && (
                        <div className="flex justify-between">
                          <span style={{ color: '#52525b' }}>timestamp</span>
                          <span className="font-mono text-[10px]" style={{ color: '#3f3f46' }}>
                            {new Date(scope.last_run).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
