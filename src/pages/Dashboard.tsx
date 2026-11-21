import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { timeAgo } from '../lib/format';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Scope {
  id: string;
  name: string;
  plugin_name: string;
  status: string;
  resource_count: number;
  last_run?: string;
  schedule?: string;
}

interface DiscoveryRun {
  id: string;
  scope_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  resources_found: number;
  relationships_found: number;
  errors?: string[];
}

interface Finding {
  id: string;
  severity: string;
  status: string;
  rule_id: string;
  message: string;
  resource_id?: string;
}

interface HealthStatus {
  status: string;
  version: string;
  time: string;
  components: Record<string, { status: string; message?: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLUGIN_COLORS: Record<string, string> = {
  aws:        '#FF9900',
  azure:      '#0078D4',
  gcp:        '#4285F4',
  github:     '#6e40c9',
  kubernetes: '#326CE5',
  grafana:    '#F46800',
  pagerduty:  '#06AC38',
  slack:      '#4A154B',
  dns:        '#00B388',
};

function pluginColor(name: string) {
  return PLUGIN_COLORS[name?.toLowerCase()] ?? '#6c5ce7';
}

function statusColor(s: string) {
  if (!s) return '#5c5c5e';
  const l = s.toLowerCase();
  if (l === 'success' || l === 'completed' || l === 'active') return '#2ed573';
  if (l === 'running'  || l === 'pending')                   return '#ffa502';
  if (l === 'failed'   || l === 'error')                     return '#ff4757';
  return '#8b8b8e';
}

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: statusColor(status), marginRight: 5, flexShrink: 0,
    }} />
  );
}

function durationLabel(run: DiscoveryRun): string {
  if (!run.completed_at) return '';
  const ms = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
  if (ms < 1000)  return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate();

  const [scopes,         setScopes]         = useState<Scope[]>([]);
  const [runs,           setRuns]           = useState<DiscoveryRun[]>([]);
  const [findings,       setFindings]       = useState<Finding[]>([]);
  const [health,         setHealth]         = useState<HealthStatus | null>(null);
  const [totalResources, setTotalResources] = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [lastFetch,      setLastFetch]      = useState<Date | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const safeJson = (r: Response) => r.ok ? r.json() : Promise.resolve(null);
    Promise.all([
      fetch('/api/v1/discovery/scopes').then(safeJson).catch(() => null),
      fetch('/api/v1/discovery/runs?limit=10').then(safeJson).catch(() => null),
      fetch('/api/v1/compliance/findings').then(safeJson).catch(() => null),
      fetch('/api/v1/resources?limit=1').then(safeJson).catch(() => null),
      fetch('/api/v1/health').then(safeJson).catch(() => null),
    ]).then(([s, r, f, res, h]) => {
      setScopes(s?.scopes ?? []);
      setRuns(r?.runs ?? []);
      setFindings(Array.isArray(f) ? f : (f?.findings ?? []));
      setTotalResources(res?.total ?? 0);
      setHealth(h);
      setLastFetch(new Date());
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.title = 'Dashboard — Zerelio';
    load();
    const interval = setInterval(() => {
      const hasActiveRun = runs.some(r => r.status === 'running' || r.status === 'pending');
      if (hasActiveRun) load();
    }, 30000);
    return () => clearInterval(interval);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ─────────────────────────────────────────────────────────────────
  const openFindings  = findings.filter(f => f.status === 'open' || !f.status);
  const critFindings  = openFindings.filter(f => f.severity === 'critical');
  const lastRun       = runs[0] ?? null;
  const totalResCount = scopes.reduce((n, s) => n + (s.resource_count || 0), 0) || totalResources;
  const resourcesByPlugin = scopes.reduce((acc, s) => {
    if (s.resource_count > 0) acc[s.plugin_name] = (acc[s.plugin_name] || 0) + s.resource_count;
    return acc;
  }, {} as Record<string, number>);

  const card = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 12,
  } as const;

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading && scopes.length === 0) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-white/5" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl" style={{ background: 'hsl(var(--card))' }} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-56 rounded-xl" style={{ background: 'hsl(var(--card))' }} />
          <div className="h-56 rounded-xl" style={{ background: 'hsl(var(--card))' }} />
        </div>
      </div>
    );
  }

  // ── Empty state (no scopes configured yet) ────────────────────────────────
  if (!loading && scopes.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6 animate-fade">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-[#8b8b8e] mt-1 text-sm">Infrastructure discovery overview</p>
        </div>

        <div className="rounded-2xl p-8 text-center space-y-6" style={card}>
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(108,92,231,.2),rgba(162,155,254,.08))' }}>
            <svg className="w-7 h-7 text-[#6c5ce7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">No infrastructure discovered yet</h2>
            <p className="text-[#8b8b8e] text-sm max-w-sm mx-auto">
              Create a scope to tell Zerelio what to discover, then trigger a run.
              Resources, relationships, and compliance findings will appear here.
            </p>
          </div>
          <div className="text-left space-y-2 max-w-sm mx-auto">
            <p className="text-xs uppercase tracking-wider text-[#5c5c5e] font-semibold mb-3">Get started</p>
            {[
              { n: 1, label: 'Create a scope',    sub: 'Pick a plugin and configure credentials', path: '/discovery' },
              { n: 2, label: 'Run discovery',     sub: 'Zerelio scans and indexes your infrastructure', path: '/discovery' },
              { n: 3, label: 'Browse resources',  sub: 'Search, graph, and compliance analysis',  path: '/resources' },
            ].map(step => (
              <div key={step.n}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm cursor-pointer hover:bg-white/5 transition-colors"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}
                onClick={() => navigate(step.path)}>
                <span className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(108,92,231,.15)', color: '#6c5ce7', border: '1.5px solid rgba(108,92,231,.3)' }}>
                  {step.n}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{step.label}</div>
                  <div className="text-[#8b8b8e] text-xs">{step.sub}</div>
                </div>
                <span className="text-[#6c5ce7] text-xs opacity-60">→</span>
              </div>
            ))}
          </div>
        </div>

        {health && <SystemHealth health={health} />}
      </div>
    );
  }

  // ── Main dashboard ───────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5 animate-fade">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-[#8b8b8e] text-sm mt-0.5">
            {lastFetch ? `Updated ${timeAgo(lastFetch.toISOString())}` : 'Loading…'}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
          style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Resources"  icon="📦"
          value={totalResCount}
          sub={`across ${scopes.length} scope${scopes.length !== 1 ? 's' : ''}`}
          onClick={() => navigate('/resources')} />
        <StatTile label="Scopes"     icon="🔭"
          value={scopes.length}
          sub={lastRun ? `last run ${timeAgo(lastRun.started_at)}` : 'no runs yet'}
          onClick={() => navigate('/discovery')} />
        <StatTile label="Findings"   icon="⚠️"
          value={openFindings.length}
          sub={critFindings.length > 0 ? `${critFindings.length} critical` : 'no critical issues'}
          accent={critFindings.length > 0 ? '#ff4757' : undefined}
          onClick={() => navigate('/compliance')} />
        <StatTile label="Last Run"   icon={lastRun?.status === 'running' ? '⚡' : '🕐'}
          value={lastRun ? (lastRun.status === 'running' ? 'Running…' : timeAgo(lastRun.started_at)) : '—'}
          sub={lastRun ? `${lastRun.resources_found} resources found` : 'go to Discovery to run'}
          accent={lastRun?.status === 'failed' ? '#ff4757' : undefined}
          valueSmall={!lastRun || lastRun.status !== 'running'}
          onClick={() => navigate('/changes')} />
      </div>

      {/* Middle row: runs + right sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent runs */}
        <div className="lg:col-span-2 rounded-xl p-5" style={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e]">Recent Discovery Runs</h2>
            <button className="text-xs text-[#6c5ce7] hover:underline" onClick={() => navigate('/changes')}>View all →</button>
          </div>
          {runs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[#5c5c5e] text-sm">No runs yet.</p>
              <button className="mt-2 text-xs text-[#6c5ce7] hover:underline"
                onClick={() => navigate('/discovery')}>
                Trigger a run from Discovery →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.slice(0, 6).map(run => {
                const scope = scopes.find(s => s.id === run.scope_id);
                const dur   = durationLabel(run);
                return (
                  <div key={run.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                    style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
                    <span className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `${pluginColor(scope?.plugin_name ?? '')}22`,
                        color: pluginColor(scope?.plugin_name ?? ''),
                      }}>
                      {(scope?.plugin_name ?? '?')[0].toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">{scope?.name ?? run.scope_id}</span>
                      {run.errors?.length ? (
                        <span className="ml-2 text-xs text-[#ff4757]">{run.errors[0]}</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      {run.resources_found > 0 && (
                        <span className="text-[#8b8b8e]">{run.resources_found} res</span>
                      )}
                      {dur && <span className="text-[#5c5c5e]">{dur}</span>}
                      <span className="text-[#5c5c5e]">{timeAgo(run.started_at)}</span>
                      <span className="flex items-center">
                        <StatusDot status={run.status} />
                        <span style={{ color: statusColor(run.status) }} className="capitalize">{run.status || 'unknown'}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Resources by plugin */}
          <div className="rounded-xl p-5" style={card}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e] mb-3">By Plugin</h2>
            {Object.keys(resourcesByPlugin).length === 0 ? (
              <p className="text-[#5c5c5e] text-sm py-1">
                {scopes.length > 0 ? 'Run discovery to index resources.' : 'No scopes yet.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(resourcesByPlugin).sort(([,a],[,b]) => b - a).map(([plugin, count]) => {
                  const max = Math.max(...Object.values(resourcesByPlugin), 1);
                  return (
                    <div key={plugin}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium capitalize">{plugin}</span>
                        <span className="text-[#8b8b8e] tabular-nums">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--secondary))' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${(count / max) * 100}%`, background: pluginColor(plugin) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Compliance snapshot */}
          <div className="rounded-xl p-5" style={card}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e]">Compliance</h2>
              <button className="text-xs text-[#6c5ce7] hover:underline" onClick={() => navigate('/compliance')}>View →</button>
            </div>
            {openFindings.length === 0 ? (
              <p className="text-[#5c5c5e] text-sm py-1">
                {findings.length === 0 ? 'No findings yet.' : '✓ No open findings.'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {(['critical','high','medium','low'] as const).map(sev => {
                  const n = openFindings.filter(f => f.severity === sev).length;
                  if (n === 0) return null;
                  const color = { critical: '#ff4757', high: '#ff6b35', medium: '#ffa502', low: '#8b8b8e' }[sev];
                  return (
                    <div key={sev} className="flex items-center justify-between text-sm">
                      <span className="capitalize" style={{ color }}>{sev}</span>
                      <span className="font-semibold tabular-nums" style={{ color }}>{n}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scopes strip */}
      <div className="rounded-xl p-5" style={card}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e]">Scopes</h2>
          <button className="text-xs text-[#6c5ce7] hover:underline" onClick={() => navigate('/discovery')}>Manage →</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {scopes.map(scope => (
            <div key={scope.id}
              className="px-3 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-white/5 transition-colors"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}
              onClick={() => navigate('/discovery')}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${pluginColor(scope.plugin_name)}22`, color: pluginColor(scope.plugin_name) }}>
                  {(scope.plugin_name ?? '?')[0].toUpperCase()}
                </span>
                <span className="font-medium truncate text-xs">{scope.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#8b8b8e]">
                <span>{scope.resource_count} resources</span>
                <span>{scope.schedule || 'manual'}</span>
              </div>
            </div>
          ))}
          <div
            className="px-3 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-white/5 transition-colors flex items-center gap-2 opacity-40 hover:opacity-80"
            style={{ border: '1px dashed hsl(var(--border))' }}
            onClick={() => navigate('/discovery')}>
            <span className="text-[#6c5ce7] text-base">+</span>
            <span className="text-[#8b8b8e] text-xs">Add scope</span>
          </div>
        </div>
      </div>

      {/* System health */}
      {health && <SystemHealth health={health} />}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatTile({ label, value, sub, icon, accent, onClick, valueSmall }: {
  label: string;
  value: number | string;
  sub: string;
  icon: string;
  accent?: string;
  onClick?: () => void;
  valueSmall?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      onClick={onClick}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-lg leading-none">{icon}</span>
        <span className="text-xs text-[#5c5c5e] uppercase tracking-wider">{label}</span>
      </div>
      <div
        className={`font-bold tabular-nums leading-tight ${valueSmall ? 'text-xl' : 'text-3xl'}`}
        style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="text-xs text-[#8b8b8e] mt-1 truncate">{sub}</div>
    </div>
  );
}

function SystemHealth({ health }: { health: HealthStatus }) {
  const components = Object.entries(health.components);
  const allOk = health.status === 'ok';
  return (
    <div className="rounded-xl p-4" style={{
      background: 'hsl(var(--card))',
      border: `1px solid ${allOk ? 'hsl(var(--border))' : 'rgba(255,71,87,.3)'}`,
    }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full"
            style={{ background: allOk ? '#2ed573' : '#ff4757' }} />
          <span className="text-sm font-medium">
            {allOk ? 'All systems operational' : 'System degraded'}
          </span>
          <span className="text-xs text-[#5c5c5e]">v{health.version}</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {components.map(([name, comp]) => (
            <div key={name} className="flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full" style={{
                background: comp.status === 'ok' ? '#2ed573' : comp.status === 'disabled' ? '#5c5c5e' : '#ff4757',
              }} />
              <span className="capitalize text-[#8b8b8e]">{name}</span>
              {comp.status !== 'ok' && (
                <span style={{ color: comp.status === 'disabled' ? '#5c5c5e' : '#ff4757' }}>
                  {comp.status}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
