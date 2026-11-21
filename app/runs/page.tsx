'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { apiGet } from '@/app/lib/api';
import type { DiscoveryRun, Scope } from '@/app/lib/api';

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return '—';
  const diffMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const s = Math.floor(diffMs / 1000);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
        style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        completed
      </span>
    );
  }
  if (status === 'running') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
        running
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
        style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        failed
      </span>
    );
  }
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full"
      style={{ background: '#262626', color: '#71717a' }}
    >
      {status}
    </span>
  );
}

export default function RunsPage() {
  const { token } = useAuth();

  const [runs, setRuns] = useState<DiscoveryRun[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiGet<DiscoveryRun[] | null>('/discovery/runs', token),
      apiGet<{scopes: Scope[]}>('/discovery/scopes', token),
    ])
      .then(([r, s]) => {
        setRuns(Array.isArray(r) ? r : []);
        setScopes(s?.scopes ?? []);
        setError(null);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load runs'),
      )
      .finally(() => setLoading(false));
  }, [token]);

  const scopeMap = new Map(scopes.map((s) => [s.id, s]));
  const totalResources = runs.reduce((s, r) => s + r.resources_found, 0);
  const totalRelationships = runs.reduce((s, r) => s + r.relationships_found, 0);

  return (
    <main className="flex-1 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Run History</h1>
          <p className="text-sm mt-1" style={{ color: '#71717a' }}>
            Discovery run log ·{' '}
            {loading ? '…' : `${runs.length} run${runs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-3 py-1.5 rounded-md border transition-colors"
            style={{ borderColor: '#2a2a2a', color: '#71717a' }}
          >
            Export CSV
          </button>
        </div>
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

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Total Runs',
            value: loading ? '…' : runs.length.toString(),
            sub: 'all time',
          },
          {
            label: 'Resources Found',
            value: loading ? '…' : totalResources.toLocaleString(),
            sub: 'across all runs',
          },
          {
            label: 'Relationships Found',
            value: loading ? '…' : totalRelationships.toLocaleString(),
            sub: 'resource edges discovered',
          },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-xl border px-5 py-4"
            style={{ background: '#1a1a1a', borderColor: '#262626', opacity: loading ? 0.6 : 1 }}
          >
            <div className="text-xs mb-1" style={{ color: '#52525b' }}>
              {label}
            </div>
            <div className="text-2xl font-semibold text-white">{value}</div>
            <div className="text-xs mt-1" style={{ color: '#3f3f46' }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: '#1a1a1a', borderColor: '#262626', opacity: loading ? 0.6 : 1 }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #262626' }}>
              {[
                'Run ID',
                'Scope',
                'Plugin',
                'Status',
                'Started',
                'Duration',
                'Resources',
                'Relationships',
                'Errors',
              ].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#52525b' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-5 py-8 text-center text-xs"
                  style={{ color: '#52525b' }}
                >
                  Loading runs…
                </td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-5 py-8 text-center text-xs"
                  style={{ color: '#52525b' }}
                >
                  No runs yet
                </td>
              </tr>
            ) : (
              runs.map((run, i) => {
                const scope = scopeMap.get(run.scope_id);
                return (
                  <tr
                    key={run.id}
                    style={{
                      borderBottom: i < runs.length - 1 ? '1px solid #1f1f1f' : 'none',
                    }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs" style={{ color: '#6366f1' }}>
                      {run.id.slice(0, 12)}…
                    </td>
                    <td className="px-5 py-3.5 font-medium text-white text-sm">
                      {scope?.name ?? run.scope_id}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs" style={{ color: '#a1a1aa' }}>
                        {scope?.plugin_name ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={run.status} />
                    </td>
                    <td
                      className="px-5 py-3.5 text-xs"
                      style={{ color: '#71717a' }}
                    >
                      {timeAgo(run.started_at)}
                    </td>
                    <td
                      className="px-5 py-3.5 text-xs font-mono"
                      style={{ color: '#a1a1aa' }}
                    >
                      {formatDuration(run.started_at, run.completed_at)}
                    </td>
                    <td
                      className="px-5 py-3.5 text-sm font-mono font-semibold"
                      style={{ color: '#818cf8' }}
                    >
                      {run.resources_found.toLocaleString()}
                    </td>
                    <td
                      className="px-5 py-3.5 text-xs font-mono"
                      style={{ color: '#71717a' }}
                    >
                      {run.relationships_found.toLocaleString()}
                    </td>
                    <td
                      className="px-5 py-3.5 text-xs font-mono"
                      style={{ color: run.errors > 0 ? '#f87171' : '#3f3f46' }}
                    >
                      {run.errors}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
