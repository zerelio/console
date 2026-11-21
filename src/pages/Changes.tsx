import { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { timeAgo } from '../lib/format';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Run {
  id: string;
  scope_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  resources_found?: number;
  relationships_found?: number;
  errors?: string[];
}

interface Scope {
  id: string;
  name?: string;
  plugin_name?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Changes() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  useEffect(() => { document.title = 'Changes - Zerelio'; }, []);

  async function fetchData() {
    try {
      const [runsRes, scopesRes] = await Promise.all([
        fetch('/api/v1/discovery/runs').then(r => r.ok ? r.json() : Promise.resolve({})).catch(() => ({})),
        fetch('/api/v1/discovery/scopes').then(r => r.ok ? r.json() : Promise.resolve({})).catch(() => ({})),
      ]);
      const runList: Run[] = runsRes?.runs ?? runsRes?.data ?? (Array.isArray(runsRes) ? runsRes : []);
      const scopeList: Scope[] = scopesRes?.data ?? (Array.isArray(scopesRes) ? scopesRes : []);
      setRuns(Array.isArray(runList) ? runList : []);
      setScopes(Array.isArray(scopeList) ? scopeList : []);
      setError(null);
    } catch {
      setError('Failed to load run history. The server may be unavailable.');
    }
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      await fetchData();
      if (!mounted) return;
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  function getScopeName(scopeId: string): string {
    const scope = scopes.find(s => s.id === scopeId);
    return scope?.name || scopeId;
  }

  const filtered = useMemo(() => {
    return runs.filter(r => {
      if (filterStatus && (r.status || '').toUpperCase() !== filterStatus) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const name = getScopeName(r.scope_id).toLowerCase();
        if (!name.includes(q) && !r.id.toLowerCase().includes(q) && !(r.scope_id || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [runs, scopes, filterStatus, filterSearch]);

  const grouped = useMemo(() => {
    const map = new Map<string, Run[]>();
    for (const r of filtered) {
      const key = new Date(r.started_at || Date.now()).toISOString().split('T')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  function dateLabel(dateKey: string): string {
    const todayKey = new Date().toISOString().split('T')[0];
    if (dateKey === todayKey) return 'Today';
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (dateKey === y.toISOString().split('T')[0]) return 'Yesterday';
    const d = new Date(dateKey + 'T12:00:00Z');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function statusBadge(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED') return 'bg-[hsl(143,64%,50%,0.2)] text-[hsl(143,64%,50%)]';
    if (s === 'RUNNING') return 'bg-[hsl(50,100%,55%,0.2)] text-[hsl(50,100%,55%)]';
    if (s === 'FAILED') return 'bg-[hsl(0,85%,60%,0.2)] text-[hsl(0,85%,60%)]';
    return 'bg-[#6c5ce7]/10 text-[#6c5ce7]';
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-fade">
        <div><div className="h-7 w-48 rounded-lg bg-[hsl(var(--card))] animate-pulse mb-2" /><div className="h-4 w-72 rounded-lg bg-[hsl(var(--card))] animate-pulse" /></div>
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-[hsl(var(--card))] animate-pulse" />)}</div>
      </div>
    );
  }

  if (error && runs.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full animate-fade">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2">Unable to load run history</h1>
        <p className="text-[#8b8b8e] mb-8 text-center max-w-md">{error}</p>
        <button onClick={() => { setLoading(true); setError(null); fetchData().finally(() => setLoading(false)); }}
          className="px-6 py-3 bg-[#6c5ce7] hover:bg-[#5a4bd1] text-white rounded-xl font-medium transition-all">Try Again</button>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full animate-fade">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6c5ce7]/20 to-[#a29bfe]/10 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-[#6c5ce7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2">No discovery runs yet</h1>
        <p className="text-[#8b8b8e] mb-2 text-center max-w-md">Discovery run history will appear here as runs complete.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade">
      <div>
        <h1 className="text-2xl font-semibold">Discovery Run History</h1>
        <p className="text-[#8b8b8e] mt-1">Recent discovery runs and their outcomes</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold">{runs.length}</span>
          <span className="text-[#8b8b8e]">total runs</span>
        </div>
        <div className="w-px h-8 bg-[hsl(var(--border))]" />
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold">{runs.filter(r => (r.status || '').toUpperCase() === 'COMPLETED').length}</span>
          <span className="text-[#8b8b8e]">completed</span>
        </div>
        <div className="w-px h-8 bg-[hsl(var(--border))]" />
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold">{runs.filter(r => (r.status || '').toUpperCase() === 'FAILED').length}</span>
          <span className="text-[#8b8b8e]">failed</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-[#5c5c5e] mb-1.5">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] outline-none focus:border-[#6c5ce7]/50 transition-colors">
            <option value="">All Statuses</option>
            {['COMPLETED', 'RUNNING', 'FAILED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-[#5c5c5e] mb-1.5">Search</label>
          <input type="text" placeholder="Search by scope name or run ID..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] outline-none focus:border-[#6c5ce7]/50 transition-colors placeholder:text-[#5c5c5e]" />
        </div>
        {(filterStatus || filterSearch) && (
          <button onClick={() => { setFilterStatus(''); setFilterSearch(''); }}
            className="px-3 py-2 text-xs text-[#8b8b8e] hover:text-[hsl(var(--foreground))] transition-colors">Clear</button>
        )}
      </div>

      {/* Run list grouped by date */}
      {grouped.length === 0 ? (
        <div className="text-center py-12 text-[#8b8b8e] text-sm">No runs match your filters</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dateKey, dayRuns]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{dateLabel(dateKey)}</span>
                <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                <span className="text-xs text-[#5c5c5e]">{dayRuns.length} run{dayRuns.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {dayRuns.map(r => {
                  const st = (r.status || '').toUpperCase();
                  return (
                    <GlassCard key={r.id} className="!p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge(st)}`}>{st || r.status}</span>
                            <span className="text-sm font-medium truncate">{getScopeName(r.scope_id)}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-[#5c5c5e]">
                            {r.resources_found !== undefined && (
                              <span>{r.resources_found} resources</span>
                            )}
                            {r.relationships_found !== undefined && (
                              <span>{r.relationships_found} relationships</span>
                            )}
                            {r.errors && r.errors.length > 0 && (
                              <span className="text-[hsl(0,85%,60%)]">{r.errors.length} error{r.errors.length !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-[#5c5c5e] shrink-0 text-right">
                          <div>{timeAgo(r.started_at)}</div>
                          <div className="font-mono text-[10px] mt-0.5 truncate max-w-[120px]">{r.id}</div>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
