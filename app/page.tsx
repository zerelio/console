'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/components/AuthProvider';
import { apiGet } from '@/app/lib/api';
import type { Plugin, Scope, DiscoveryRun, HealthStatus } from '@/app/lib/api';

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'running';
  const diffMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const s = Math.floor(diffMs / 1000);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const statIcons = {
  plugins: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7h-9" /><path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
    </svg>
  ),
  scopes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  ),
  runs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  health: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
};

export default function DashboardPage() {
  const { token } = useAuth();

  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [runs, setRuns] = useState<DiscoveryRun[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiGet<Plugin[]>('/discovery/plugins', token),
      apiGet<Scope[]>('/discovery/scopes', token),
      apiGet<DiscoveryRun[]>('/discovery/runs', token),
      apiGet<HealthStatus>('/health', token),
    ])
      .then(([p, s, r, h]) => {
        setPlugins(p);
        setScopes(s);
        setRuns(r);
        setHealth(h);
        setError(null);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load dashboard'),
      )
      .finally(() => setLoading(false));
  }, [token]);

  // Build plugin → total resources map from runs × scopes
  const scopeMap = new Map(scopes.map((s) => [s.id, s]));
  const pluginResourceMap = new Map<string, number>();
  for (const run of runs) {
    const scope = scopeMap.get(run.scope_id);
    if (!scope) continue;
    pluginResourceMap.set(
      scope.plugin_name,
      (pluginResourceMap.get(scope.plugin_name) ?? 0) + run.resources_found,
    );
  }
  for (const p of plugins) {
    if (!pluginResourceMap.has(p.name)) pluginResourceMap.set(p.name, 0);
  }
  const pluginSummary = Array.from(pluginResourceMap.entries())
    .sort((a, b) => b[1] - a[1]);
  const totalResources = pluginSummary.reduce((s, [, v]) => s + v, 0);

  const recentRuns = runs.slice(0, 10);
  const completedRuns = runs.filter((r) => r.status === 'completed').length;
  const errorRuns = runs.filter((r) => r.status === 'failed').length;
  const activeScopes = scopes.filter((s) => s.status === 'active').length;
  const healthStatus = health?.status ?? (loading ? '…' : 'Unknown');
  const healthColor = healthStatus === 'healthy' ? '#4ade80' : healthStatus === '…' ? '#71717a' : '#f87171';

  const stats = [
    {
      label: 'Total Plugins',
      value: loading ? '…' : plugins.length.toString(),
      sub: loading ? '' : `${plugins.length} available`,
      href: '/plugins',
      icon: statIcons.plugins,
      color: '#6366f1',
      bgColor: 'rgba(99,102,241,0.1)',
    },
    {
      label: 'Active Scopes',
      value: loading ? '…' : scopes.length.toString(),
      sub: loading ? '' : `${activeScopes} active`,
      href: '/scopes',
      icon: statIcons.scopes,
      color: '#818cf8',
      bgColor: 'rgba(129,140,248,0.1)',
    },
    {
      label: 'Recent Runs',
      value: loading ? '…' : runs.length.toString(),
      sub: loading ? '' : `${completedRuns} completed · ${errorRuns} errors`,
      href: '/runs',
      icon: statIcons.runs,
      color: '#34d399',
      bgColor: 'rgba(52,211,153,0.1)',
    },
    {
      label: 'System Status',
      value: loading ? '…' : healthStatus,
      sub: loading ? '' : `v${health?.version ?? '—'}`,
      href: '/',
      icon: statIcons.health,
      color: healthColor,
      bgColor: 'rgba(74,222,128,0.1)',
    },
  ];

  return (
    <main className="flex-1 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
          >
            LIVE
          </span>
          <span className="text-xs" style={{ color: '#52525b' }}>
            {loading ? 'Loading…' : 'Last updated: just now'}
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#71717a' }}>
          Zerelio Infrastructure Discovery —{' '}
          {loading ? '…' : totalResources.toLocaleString()} resources indexed
        </p>
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

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, sub, href, icon, color, bgColor }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border p-5 flex flex-col gap-3 transition-all hover:border-indigo-500/30"
            style={{ background: '#1a1a1a', borderColor: '#262626', opacity: loading ? 0.6 : 1 }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: '#52525b' }}
              >
                {label}
              </span>
              <span
                className="p-1.5 rounded-lg"
                style={{ background: bgColor, color }}
              >
                {icon}
              </span>
            </div>
            <div>
              <div className="text-3xl font-semibold" style={{ color }}>
                {value}
              </div>
              <div
                className="text-xs mt-1 leading-relaxed"
                style={{ color: '#52525b' }}
              >
                {sub}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Recent runs */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Runs</h2>
            <Link
              href="/runs"
              className="text-xs transition-colors hover:text-indigo-400"
              style={{ color: '#52525b' }}
            >
              View all →
            </Link>
          </div>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: '#1a1a1a', borderColor: '#262626' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #262626' }}>
                  {['Scope', 'Plugin', 'Status', 'Resources', 'Duration', 'When'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
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
                    <td colSpan={6} className="px-4 py-6 text-center text-xs" style={{ color: '#52525b' }}>
                      Loading…
                    </td>
                  </tr>
                ) : recentRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-xs" style={{ color: '#52525b' }}>
                      No runs yet
                    </td>
                  </tr>
                ) : (
                  recentRuns.map((run, i) => {
                    const scope = scopeMap.get(run.scope_id);
                    const isCompleted = run.status === 'completed';
                    return (
                      <tr
                        key={run.id}
                        style={{
                          borderBottom:
                            i < recentRuns.length - 1 ? '1px solid #1f1f1f' : 'none',
                        }}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-white text-sm">
                          {scope?.name ?? run.scope_id}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#a1a1aa' }}>
                          {scope?.plugin_name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={
                              run.status === 'completed'
                                ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80' }
                                : run.status === 'running'
                                ? { background: 'rgba(99,102,241,0.15)', color: '#818cf8' }
                                : { background: 'rgba(248,113,113,0.1)', color: '#f87171' }
                            }
                          >
                            {isCompleted ? '✓' : run.status === 'running' ? '●' : '✕'}{' '}
                            {run.status}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 font-mono text-sm font-semibold"
                          style={{ color: '#818cf8' }}
                        >
                          {run.resources_found.toLocaleString()}
                        </td>
                        <td
                          className="px-4 py-3 font-mono text-xs"
                          style={{ color: '#71717a' }}
                        >
                          {formatDuration(run.started_at, run.completed_at)}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#52525b' }}>
                          {timeAgo(run.started_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plugin resource breakdown */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Resources by Plugin</h2>
            <Link
              href="/plugins"
              className="text-xs transition-colors hover:text-indigo-400"
              style={{ color: '#52525b' }}
            >
              Manage →
            </Link>
          </div>
          <div
            className="rounded-xl border p-4 space-y-3"
            style={{ background: '#1a1a1a', borderColor: '#262626' }}
          >
            {loading ? (
              <div className="text-xs py-4 text-center" style={{ color: '#52525b' }}>
                Loading…
              </div>
            ) : pluginSummary.length === 0 ? (
              <div className="text-xs py-4 text-center" style={{ color: '#52525b' }}>
                No data yet
              </div>
            ) : (
              pluginSummary.map(([name, resources]) => {
                const pct = totalResources > 0 ? Math.round((resources / totalResources) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-2 text-sm" style={{ color: '#a1a1aa' }}>
                        {name}
                      </span>
                      <span
                        className="font-mono text-xs font-semibold"
                        style={{ color: '#818cf8' }}
                      >
                        {resources.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: '#262626' }}>
                      <div
                        className="h-1 rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
            {!loading && pluginSummary.length > 0 && (
              <div
                className="pt-3 mt-3 border-t flex items-center justify-between text-xs"
                style={{ borderColor: '#262626' }}
              >
                <span style={{ color: '#52525b' }}>Total resources</span>
                <span className="font-mono font-bold" style={{ color: '#6366f1' }}>
                  {totalResources.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* System health */}
          <div
            className="mt-4 rounded-xl border p-4"
            style={{ background: '#1a1a1a', borderColor: '#262626' }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#52525b' }}
            >
              System Health
            </div>
            {loading ? (
              <div className="text-xs py-2" style={{ color: '#52525b' }}>Loading…</div>
            ) : !health ? (
              <div className="text-xs py-2" style={{ color: '#f87171' }}>Unavailable</div>
            ) : (
              Object.entries(health.components).map(([name, comp]) => (
                <div key={name} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background:
                          comp.status === 'healthy' ? '#4ade80' : '#f87171',
                      }}
                    />
                    <span className="text-xs" style={{ color: '#a1a1aa' }}>
                      {name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {comp.latency && (
                      <span className="text-xs font-mono" style={{ color: '#52525b' }}>
                        {comp.latency}
                      </span>
                    )}
                    <span
                      className="text-xs"
                      style={{
                        color: comp.status === 'healthy' ? '#4ade80' : '#f87171',
                      }}
                    >
                      {comp.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
