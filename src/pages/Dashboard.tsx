import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { BoxIcon, DocSmallIcon, AlertIcon } from '../components/ui/Icons';
import { timeAgo } from '../lib/format';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CoverageStats {
  total: number;
  covered: number;
  gaps: number;
}

interface ChangeItem {
  id: string;
  type: string;
  resourceType: string;
  resourceName: string;
  description: string;
  timestamp: string;
  author: string;
}

interface ScopeItem {
  id: string;
  name: string;
  plugin_name: string;
  status: string;
  last_run_status: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_BADGES: Record<string, string> = {
  deployed:  'text-[#2ed573]',
  modified:  'text-[#0097e6]',
  created:   'text-[#ffa502]',
  deleted:   'text-[#e84393]',
};

const SEVERITY_ICONS: Record<string, string> = {
  deployed: '↑',
  modified: '✎',
  created: '+',
  deleted: '×',
};

function shortResourceType(t: string): string {
  const s = t.split('.').pop() || t;
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function providerColor(p: string): string {
  const colors: Record<string, string> = { aws: '#ff9900', azure: '#0078d4', gcp: '#4285f4', kubernetes: '#326ce5', github: '#6e5494', grafana: '#f46800', prometheus: '#e6522c', cloudflare: '#f38020', datadog: '#632ca6', default: '#6c5ce7' };
  return colors[p.toLowerCase()] || colors.default;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate();

  // Coverage state
  const [stats, setStats] = useState<CoverageStats>({ total: 0, covered: 0, gaps: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  // Changes state
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [changesLoading, setChangesLoading] = useState(true);

  // Connectors state
  const [scopes, setScopes] = useState<ScopeItem[]>([]);
  const [lastRun, setLastRun] = useState<any>(null);
  const [lastRunLoading, setLastRunLoading] = useState(true);
  const [scopesLoading, setScopesLoading] = useState(true);

  // Provider coverage
  const [providerCoverage, setProviderCoverage] = useState<Record<string, number>>({});
  const [providerLoading, setProviderLoading] = useState(true);
  const [showAllProviders, setShowAllProviders] = useState(false);

  // Coverage history sparkline
  const [coverageHistory, setCoverageHistory] = useState<{date: string; resources: number}[]>([]);
  const [coverageHistoryLoading, setCoverageHistoryLoading] = useState(true);

  useEffect(() => {
    document.title = 'Dashboard - Zerelio';
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [gapsRes, searchRes] = await Promise.all([
          fetch('/api/v1/knowledge/gaps').then(r => r.json()),
          fetch('/api/v1/search?limit=1').then(r => r.json()),
        ]);
        if (!mounted) return;
        const gaps = gapsRes.data || gapsRes;
        const search = searchRes.data || searchRes;
        setStats({
          total: gaps.total || search.total || (search.results?.length || 0),
          covered: gaps.covered || 0,
          gaps: (gaps.total || 0) - (gaps.covered || 0),
        });
        setStatsError(false);
      } catch {
        if (!mounted) return;
        setStatsError(true);
      } finally {
        if (mounted) setStatsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/v1/changes?limit=5')
      .then(r => r.json())
      .then(d => { if (mounted) setChanges(d?.data ?? d?.changes ?? (Array.isArray(d) ? d : [])); })
      .catch(() => {})
      .finally(() => { if (mounted) setChangesLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/v1/discovery/scopes')
      .then(r => r.json())
      .then(d => { if (mounted) setScopes(d?.data ?? (Array.isArray(d) ? d : [])); })
      .catch(() => {})
      .finally(() => { if (mounted) setScopesLoading(false); });
    fetch('/api/v1/discovery/runs?limit=1')
      .then(r => r.json())
      .then(d => { if (mounted) { const runs = d?.data ?? (Array.isArray(d) ? d : []); if (runs.length > 0) setLastRun(runs[0]); } })
      .catch(() => {})
      .finally(() => { if (mounted) setLastRunLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Coverage history sparkline
  useEffect(() => {
    let mounted = true;
    fetch('/api/v1/knowledge/coverage-history')
      .then(r => r.json())
      .then(d => { if (mounted) setCoverageHistory(d?.data ?? (Array.isArray(d) ? d : [])); })
      .catch(() => {})
      .finally(() => { if (mounted) setCoverageHistoryLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Provider coverage
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/v1/search?limit=10000');
        const d = await res.json();
        if (!mounted) return;
        const data = d?.data ?? d ?? {};
        const results = Array.isArray(data.results) ? data.results : [];
        const providers: Record<string, number> = {};
        for (const r of results) {
          const p = r.provider || r.Provider || 'unknown';
          providers[p] = (providers[p] || 0) + 1;
        }
        setProviderCoverage(providers);
      } catch {}
      finally { if (mounted) setProviderLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const pct = stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0;
  const healthyScopes = scopes.filter(s => (s.status || '') !== 'error' && (s.last_run_status || '') !== 'FAILED');
  const errorScopes = scopes.filter(s => (s.last_run_status || '') === 'FAILED');
  const hasData = stats.total > 0;

  // ── Loading state ──
  if (statsLoading) {
    return (
      <div className="p-8 space-y-6 animate-fade">
        {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-[hsl(var(--card))] animate-pulse" />)}
      </div>
    );
  }

  // ── Empty / Error state ──
  if (!hasData && !statsLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full animate-fade animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6c5ce7]/20 to-[#a29bfe]/10 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-[#6c5ce7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        {statsError ? (
          <>
            <h1 className="text-2xl font-semibold mb-2">Failed to load dashboard</h1>
            <p className="text-[#8b8b8e] mb-8 text-center max-w-md">Could not reach the server. Check that the API is running.</p>
            <button onClick={() => { setStatsLoading(true); setStatsError(false); Promise.all([fetch('/api/v1/knowledge/gaps').then(r=>r.json()), fetch('/api/v1/search?limit=1').then(r=>r.json())]).then(([gapsRes, searchRes]) => { const gaps = gapsRes.data || gapsRes; const search = searchRes.data || searchRes; setStats({ total: gaps.total || search.total || 0, covered: gaps.covered || 0, gaps: (gaps.total || 0) - (gaps.covered || 0) }); setStatsError(false); }).catch(() => setStatsError(true)).finally(() => setStatsLoading(false)); }}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-sm rounded-xl border border-[hsl(var(--border))] transition-all">Retry</button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-2">No infrastructure discovered yet</h1>
            <p className="text-[#8b8b8e] mb-8 text-center max-w-md">Connect your first cloud provider to start mapping your infrastructure and auto-generating documentation.</p>
            <div className="rounded-xl border border-[hsl(var(--border))] p-6 w-full max-w-md space-y-4" style={{ background: 'hsl(var(--card))' }}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e]">Getting Started</h3>
              <div className="space-y-3">
                <button onClick={() => navigate('/connectors')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-left transition-all hover:bg-[hsl(var(--border))] group">
                  <span className="w-6 h-6 rounded-full border-2 border-[#6c5ce7]/40 flex items-center justify-center text-xs font-semibold text-[#6c5ce7]">1</span>
                  <div className="flex-1">
                    <span className="font-medium">Connect a Cloud Provider</span>
                    <p className="text-[#8b8b8e] text-xs mt-0.5">AWS, Azure, GCP, Kubernetes, or 20+ others</p>
                  </div>
                  <span className="text-xs text-[#6c5ce7] opacity-0 group-hover:opacity-100 transition-opacity">Connect &rarr;</span>
                </button>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm opacity-50">
                  <span className="w-6 h-6 rounded-full border-2 border-[#5c5c5e]/40 flex items-center justify-center text-xs font-semibold text-[#5c5c5e]">2</span>
                  <div className="flex-1">
                    <span className="font-medium">Run Discovery</span>
                    <p className="text-[#5c5c5e] text-xs mt-0.5">Scans and maps your infrastructure</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm opacity-50">
                  <span className="w-6 h-6 rounded-full border-2 border-[#5c5c5e]/40 flex items-center justify-center text-xs font-semibold text-[#5c5c5e]">3</span>
                  <div className="flex-1">
                    <span className="font-medium">Generate Documentation</span>
                    <p className="text-[#5c5c5e] text-xs mt-0.5">Auto-create docs and runbooks with AI</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="p-8 space-y-8 animate-fade animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-[#8b8b8e] mt-1">Your infrastructure knowledge base</p>
      </div>

      {/* Last run banner */}
      {!lastRunLoading && lastRun && (
        <div className="rounded-xl p-4 flex items-center justify-between" style={{background: lastRun.status === 'COMPLETED' ? 'rgba(46,213,115,0.1)' : lastRun.status === 'RUNNING' ? 'rgba(108,92,231,0.1)' : 'rgba(255,71,87,0.1)', border: '1px solid ' + (lastRun.status === 'COMPLETED' ? 'rgba(46,213,115,0.3)' : lastRun.status === 'RUNNING' ? 'rgba(108,92,231,0.3)' : 'rgba(255,71,87,0.3)')}}>
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${lastRun.status === 'RUNNING' ? 'animate-pulse bg-[#6c5ce7]' : lastRun.status === 'COMPLETED' ? 'bg-[#2ed573]' : 'bg-[#ff4757]'}`} />
            <div>
              <p className="text-sm font-medium" style={{color: 'hsl(var(--foreground))'}}>Last Discovery Run: {lastRun.status}</p>
              <p className="text-xs" style={{color: 'hsl(var(--muted-foreground))'}}>{lastRun.resources_found || 0} resources found · {lastRun.started_at ? timeAgo(lastRun.started_at) : ''}</p>
            </div>
          </div>
          <button onClick={() => navigate('/discovery')} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))'}}>View Runs</button>
        </div>
      )}

      {/* Coverage card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#6c5ce7]/5 to-[#a29bfe]/5 border border-[hsl(var(--border))] p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Knowledge Coverage</h2>
            <p className="text-sm text-[#8b8b8e] mt-1">{stats.covered}/{stats.total} resources documented</p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-bold text-white">{pct}%</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-[hsl(var(--border))] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-6 mt-6">
          {stats.total > stats.covered && (
            <button onClick={() => navigate("/docs")} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-sm text-[hsl(var(--foreground))] rounded-xl border border-[hsl(var(--border))] transition-all duration-200 font-medium">
              Generate Missing Documentation ({stats.gaps} remaining)
            </button>
          )}
          {/* Coverage sparkline */}
          {!coverageHistoryLoading && coverageHistory.length > 1 && (
            <div className="flex items-center gap-3 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <div className="flex items-end gap-0.5 h-8">
                {coverageHistory.slice(-14).map((p, i) => {
                  const max = Math.max(...coverageHistory.slice(-14).map(x => x.resources), 1);
                  const h = Math.max((p.resources / max) * 28, 2);
                  return <div key={i} className="w-2 rounded-t" style={{ height: `${h}px`, background: 'hsl(var(--primary))', opacity: 0.4 + (i / 14) * 0.6 }} title={`${p.date}: ${p.resources} resources`} />;
                })}
              </div>
              <span>{coverageHistory[coverageHistory.length-1].resources} resources</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction onClick={() => navigate('/discovery')} label="Run Discovery" icon={<ActivityIcon />} />
        <QuickAction onClick={() => navigate('/docs')} label="Generate Docs" icon={<DocSmallIcon />} />
        <QuickAction onClick={() => navigate('/graph')} label="View Graph" icon={<GraphIcon />} />
        <QuickAction onClick={() => navigate('/connectors')} label="Manage Connectors" icon={<PlugIcon />} />
      </div>

      {/* Stats grid + Recent Changes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stat cards */}
        <div className="space-y-3">
          <StatCard title="Resources" value={stats.total} subtitle="discovered" icon={<BoxIcon />} />
          <StatCard title="Documented" value={stats.covered} subtitle="resources with docs" icon={<DocSmallIcon />} />
          <StatCard title="Gaps" value={stats.gaps} subtitle="needs documentation" icon={<AlertIcon />} />

          {/* Connector health summary */}
          {!scopesLoading && scopes.length > 0 && (
            <div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5c5c5e]">Connectors</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Active</span>
                <span className="font-medium">{healthyScopes.length}/{scopes.length}</span>
              </div>
              {errorScopes.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[hsl(0,85%,60%)]">Errors</span>
                  <span className="font-medium text-[hsl(0,85%,60%)]">{errorScopes.length}</span>
                </div>
              )}
              <button onClick={() => navigate('/connectors')} className="text-xs text-[#6c5ce7] hover:underline pt-1">View all connectors</button>
            </div>
          )}
        </div>

        {/* Recent changes */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e] mb-3">Recent Changes</h2>
          {changesLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-[hsl(var(--card))] animate-pulse" />)}</div>
          ) : changes.length === 0 ? (
            <div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-8 text-center">
              <p className="text-sm text-[#8b8b8e]">No recent changes</p>
              <p className="text-xs text-[#5c5c5e] mt-1">Changes will appear here after discovery runs detect infrastructure drift.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {changes.map(c => {
                const icon = SEVERITY_ICONS[c.type] || '?';
                const color = SEVERITY_BADGES[c.type] || 'text-[#8b8b8e]';
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))/30] transition-all">
                    <span className={`w-6 h-6 rounded-full bg-[hsl(var(--background))] flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{c.resourceName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] shrink-0">{shortResourceType(c.resourceType)}</span>
                      </div>
                      <p className="text-xs text-[#8b8b8e] truncate mt-0.5">{c.description}</p>
                    </div>
                    <span className="text-xs text-[#5c5c5e] shrink-0">{timeAgo(c.timestamp)}</span>
                  </div>
                );
              })}
              <button onClick={() => navigate('/changes')} className="text-xs text-[#6c5ce7] hover:underline pt-1">
                View all changes &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Provider coverage breakdown */}
      {!providerLoading && Object.keys(providerCoverage).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e] mb-3">Provider Breakdown</h2>
          <div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-5 space-y-3">
            {Object.entries(providerCoverage).sort(([,a], [,b]) => b - a).slice(0, showAllProviders ? undefined : 5).map(([provider, count]) => {
              const total = Object.values(providerCoverage).reduce((s, c) => s + c, 0);
              const pct = Math.round((count / total) * 100);
              return (
                <div key={provider}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: providerColor(provider) }} />
                      <span className="capitalize">{provider}</span>
                    </div>
                    <span className="text-[hsl(var(--muted-foreground))]">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: providerColor(provider) }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(providerCoverage).length > 5 && (
              <button onClick={() => setShowAllProviders(!showAllProviders)} className="text-xs text-[#6c5ce7] hover:underline pt-1">
                {showAllProviders ? 'Show less' : `Show all ${Object.keys(providerCoverage).length} providers`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function StatCard({ title, value, subtitle, icon }: { title: string; value: number; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-5 hover:border-[hsl(var(--muted-foreground))/30] transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center">{icon}</div>
        <span className="text-sm text-[hsl(var(--muted-foreground))]">{title}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-[#5c5c5e] mt-1">{subtitle}</div>
    </div>
  );
}

function QuickAction({ onClick, label, icon }: { onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 flex items-center gap-3 hover:border-[#6c5ce7]/30 hover:bg-[#6c5ce7]/5 transition-all group text-left">
      <div className="w-9 h-9 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center group-hover:bg-[#6c5ce7]/10 transition-all shrink-0">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// ─── Icons (inline, no dependency on Icons.tsx for new icons) ────────────────

function ActivityIcon() {
  return (
    <svg className="w-5 h-5 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg className="w-5 h-5 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg className="w-5 h-5 text-[hsl(var(--muted-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0zM15 12l-3-3m3 3l-3 3" />
    </svg>
  );
}
