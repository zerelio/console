'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { apiGet } from '@/app/lib/api';
import type { Plugin, Scope } from '@/app/lib/api';

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PluginsPage() {
  const { token } = useAuth();

  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiGet<Plugin[]>('/discovery/plugins', token),
      apiGet<Scope[]>('/discovery/scopes', token),
    ])
      .then(([p, s]) => {
        setPlugins(p);
        setScopes(s);
        setError(null);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load plugins'),
      )
      .finally(() => setLoading(false));
  }, [token]);

  // For each plugin, find the most-recently-run scope with that plugin_name
  const latestRunByPlugin = (pluginName: string): string => {
    const matching = scopes
      .filter((s) => s.plugin_name === pluginName && s.last_run)
      .sort((a, b) => {
        const ta = a.last_run ? new Date(a.last_run).getTime() : 0;
        const tb = b.last_run ? new Date(b.last_run).getTime() : 0;
        return tb - ta;
      });
    return matching.length > 0 ? timeAgo(matching[0].last_run) : '—';
  };

  return (
    <main className="flex-1 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Plugins</h1>
          <p className="text-sm mt-1" style={{ color: '#71717a' }}>
            {loading
              ? 'Loading…'
              : `${plugins.length} plugin${plugins.length !== 1 ? 's' : ''} registered`}
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: '#6366f1' }}
        >
          + Register Plugin
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

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: '#1a1a1a', borderColor: '#262626', opacity: loading ? 0.6 : 1 }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #262626' }}>
              {['Plugin', 'Version', 'Status', 'Resource Types', 'Last Discovered', 'Actions'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: '#52525b' }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-xs"
                  style={{ color: '#52525b' }}
                >
                  Loading plugins…
                </td>
              </tr>
            ) : plugins.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-xs"
                  style={{ color: '#52525b' }}
                >
                  No plugins registered
                </td>
              </tr>
            ) : (
              plugins.map((p, i) => (
                <tr
                  key={p.name}
                  style={{
                    borderBottom: i < plugins.length - 1 ? '1px solid #1f1f1f' : 'none',
                  }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  {/* Plugin name */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(99,102,241,0.12)' }}
                      >
                        <span
                          className="text-xs font-mono font-bold"
                          style={{ color: '#818cf8' }}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-white">{p.name}</div>
                        {p.description && (
                          <div
                            className="text-xs mt-0.5 truncate max-w-[180px]"
                            style={{ color: '#52525b' }}
                          >
                            {p.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Version */}
                  <td className="px-5 py-3.5">
                    {p.version ? (
                      <span
                        className="font-mono text-xs px-2 py-0.5 rounded"
                        style={{ background: '#262626', color: '#a1a1aa' }}
                      >
                        v{p.version}
                      </span>
                    ) : (
                      <span style={{ color: '#3f3f46' }}>—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
                    >
                      <span className="w-1 h-1 rounded-full bg-green-400" />
                      enabled
                    </span>
                  </td>

                  {/* Resource types */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {p.resource_types && p.resource_types.length > 0 ? (
                        p.resource_types.slice(0, 3).map((rt) => (
                          <span
                            key={rt}
                            className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: '#262626', color: '#71717a' }}
                          >
                            {rt}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#3f3f46' }}>—</span>
                      )}
                      {p.resource_types && p.resource_types.length > 3 && (
                        <span
                          className="inline-block text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: '#262626', color: '#52525b' }}
                        >
                          +{p.resource_types.length - 3}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Last discovered */}
                  <td className="px-5 py-3.5 text-xs" style={{ color: '#71717a' }}>
                    {latestRunByPlugin(p.name)}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs px-3 py-1 rounded-md border transition-colors hover:border-indigo-500/50 hover:text-indigo-400"
                        style={{ borderColor: '#2a2a2a', color: '#71717a' }}
                      >
                        Discover
                      </button>
                      <button
                        className="text-xs px-3 py-1 rounded-md border transition-colors"
                        style={{ borderColor: '#2a2a2a', color: '#52525b' }}
                      >
                        Config
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* gRPC transport note */}
      <div
        className="mt-4 flex items-center gap-2 text-xs rounded-lg px-4 py-3 border"
        style={{
          background: 'rgba(99,102,241,0.05)',
          borderColor: 'rgba(99,102,241,0.2)',
          color: '#818cf8',
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        Plugins connect via gRPC (hashicorp/go-plugin). Events: ResourceEvent ·
        RelationshipEvent · ProgressEvent · ErrorEvent
      </div>
    </main>
  );
}
