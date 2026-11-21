import { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { useNavigate } from 'react-router-dom';
import { timeAgo } from '../lib/format';

export function Discovery() {
  const navigate = useNavigate();
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [scopes, setScopes] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [hiddenRuns, setHiddenRuns] = useState<Set<string>>(new Set(JSON.parse(localStorage.getItem('kt_hidden_runs') || '[]')));
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    document.title = 'Discovery - Zerelio';
    Promise.all([
      fetch('/api/v1/discovery/scopes').then(r => r.json()).catch(() => { console.warn("Discovery: scopes unavailable"); return { data: [] }; }),
      fetch('/api/v1/discovery/runs?limit=50').then(r => r.json()).catch(() => { console.warn("Discovery: runs unavailable"); return { data: [] }; }),
      fetch('/api/v1/discovery/status').then(r => r.json()).catch(() => { console.warn("Discovery: status unavailable"); return {}; }),
    ]).then(([s, r, st]) => {
      setScopes(s && s.data ? s.data : Array.isArray(s) ? s : []);
      setRuns(r && r.data ? r.data : Array.isArray(r) ? r : []);
      setStatus(st && st.data ? st.data : st || {});
    }).finally(() => setLoading(false));
  }, []);

  function hideRun(runId: string) {
    const next = new Set(hiddenRuns);
    next.add(runId);
    setHiddenRuns(next);
    localStorage.setItem('kt_hidden_runs', JSON.stringify([...next]));
  }

  async function deleteRun(runId: string) {
    try {
      await fetch(`/api/v1/discovery/runs/${runId}`, { method: 'DELETE' });
      setRuns(prev => prev.filter((r: any) => (r.id || r.ID) !== runId));
    } catch {}
  }

  function getScopeName(scopeId: string): string {
    const scope = scopes.find((s: any) => (s.id || s.ID) === scopeId);
    return scope ? (scope.name || scope.Name) : scopeId;
  }

  async function runDiscovery(scopeId: string) {
    setRunning(scopeId);
    try {
      const res = await fetch('/api/v1/discovery/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope_id: scopeId }),
      });
      if (!res.ok) {
        setRunning(null);
        return;
      }

      // Extract run ID from the response so we can track this specific run
      let runId: string | null = null;
      try {
        const result = await res.json();
        runId = result?.data?.id || result?.id || null;
      } catch { /* response may not have a body */ }

      const startTime = Date.now();
      const MAX_POLL_TIME = 30000;
      const POLL_INTERVAL = 2000;

      const poll = async () => {
        try {
          const r = await fetch('/api/v1/discovery/runs?limit=20').then(r => r.json());
          const newRuns = r && r.data ? r.data : Array.isArray(r) ? r : [];
          setRuns(newRuns);

          const elapsed = Date.now() - startTime;
          if (elapsed >= MAX_POLL_TIME) {
            setRunning(null);
            return;
          }

          // Check if our specific run (or any run) is still RUNNING
          let isDone = false;
          if (runId) {
            const targetRun = newRuns.find((run: any) => (run.id || run.ID) === runId);
            isDone = !targetRun || (targetRun.status || targetRun.Status) !== 'RUNNING';
          } else {
            isDone = !newRuns.some((run: any) => (run.status || run.Status) === 'RUNNING');
          }

          if (isDone) {
            setRunning(null);
          } else {
            setTimeout(poll, POLL_INTERVAL);
          }
        } catch {
          setRunning(null);
        }
      };

      setTimeout(poll, POLL_INTERVAL);
    } catch (e) { console.warn("Discovery: run failed", e); setRunning(null); }
  }

  if (loading) return <div className="p-8 space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-[hsl(var(--card))] animate-shimmer" />)}</div>;

  return (
    <div className="p-8 space-y-8 animate-fade animate-slide-up max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Discovery</h1>
        <p className="text-[#8b8b8e] mt-1">Run infrastructure discovery and monitor results</p>
      </div>

      {/* Status overview */}
      {status && (
        <div className="grid grid-cols-3 gap-4">
          <GlassCard className="!p-4">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Total Runs</div>
            <div className="text-2xl font-semibold mt-1">{status.total_runs || status.totalRuns || 0}</div>
          </GlassCard>
          <GlassCard className="!p-4">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Resources Found</div>
            <div className="text-2xl font-semibold mt-1">{status.total_resources || status.totalResources || 0}</div>
          </GlassCard>
          <GlassCard className="!p-4">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Active Scopes</div>
            <div className="text-2xl font-semibold mt-1">{scopes.length}</div>
          </GlassCard>
        </div>
      )}

      {/* Scopes */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e] mb-3">Discovery Scopes</h2>
        <div className="space-y-2">
          {scopes.length === 0 ? (
            <p className="text-sm text-[#5c5c5e] py-4">No scopes configured. <button onClick={() => navigate('/connectors')} className="text-[#6c5ce7] hover:underline">Add connectors first.</button></p>
          ) : scopes.map((s: any) => (
            <GlassCard key={s.id || s.ID} className="!p-4 !py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.name || s.Name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7]">{s.plugin_name || s.PluginName}</span>
                  {s.resource_count > 0 && <span className="text-xs text-[#5c5c5e]">{s.resource_count} resources</span>}
                </div>
                {s.last_run && (
                  <p className="text-[10px] text-[#5c5c5e] mt-0.5">Last run: {timeAgo(s.last_run)}</p>
                )}
              </div>
              <button onClick={() => runDiscovery(s.id || s.ID)} disabled={running === (s.id || s.ID)}
                className="px-3 py-1.5 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:opacity-50 text-white text-xs rounded-lg">
                {running === (s.id || s.ID) ? 'Running...' : 'Run Discovery'}
              </button>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Recent runs with details */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5c5c5e] mb-3">Discovery Run Details</h2>
        <div className="flex gap-1 mb-3">
          {['', 'COMPLETED', 'RUNNING', 'FAILED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === s ? 'bg-[#6c5ce7] text-white' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {runs.length === 0 ? (
            <p className="text-sm text-[#5c5c5e] py-4">No discovery runs yet</p>
          ) : runs.filter((r: any) => !hiddenRuns.has(r.id || r.ID) && (!statusFilter || (r.status || r.Status || '').toUpperCase() === statusFilter)).map((r: any) => {
            const status = (r.status || r.Status || '').toUpperCase();
            const statusBadge = status === 'COMPLETED'
              ? 'bg-[hsl(143,64%,50%,0.2)] text-[hsl(143,64%,50%)]'
              : status === 'RUNNING'
              ? 'bg-[hsl(50,100%,55%,0.2)] text-[hsl(50,100%,55%)]'
              : status === 'FAILED'
              ? 'bg-[hsl(0,85%,60%,0.2)] text-[hsl(0,85%,60%)]'
              : 'bg-[#6c5ce7]/10 text-[#6c5ce7]';
            const resourcesFound = r.resources_found || r.ResourcesFound || 0;
            const errors = r.errors || (r.Errors ? (Array.isArray(r.Errors) ? r.Errors : [r.Errors]) : []);
            const logLines = r.logs || r.Logs || [];
            const hasZeroWarning = status === 'COMPLETED' && resourcesFound === 0;
            return (
            <div key={r.id || r.ID}>
              <GlassCard className="!p-0 flex items-center justify-between !py-2.5 !px-4 cursor-pointer transition-all"
                onClick={() => setExpandedRun(expandedRun === (r.id || r.ID) ? null : (r.id || r.ID))}>
                <div className="flex items-center gap-3 text-sm">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusBadge}`}>{status || r.status || r.Status}</span>
                  <span className="text-[#8b8b8e]">{resourcesFound} resources</span>
                  <span className="text-[#5c5c5e]">{r.relationships_found || r.RelationshipsFound || 0} relationships</span>
                </div>
                <span className="text-xs text-[#5c5c5e]">{expandedRun === (r.id || r.ID) ? '▲' : '▼'}</span>
              </GlassCard>
              {expandedRun === (r.id || r.ID) && (
                <div className="mx-4 px-4 py-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] border-t-0 text-xs text-[hsl(var(--muted-foreground))] space-y-2">
                  <p><span className="text-[#5c5c5e]">Scope:</span> {getScopeName(r.scope_id || r.ScopeID)}</p>
                  <p><span className="text-[#5c5c5e]">Run ID:</span> {r.id || r.ID}</p>
                  <p><span className="text-[#5c5c5e]">Status:</span> <span className={`px-1.5 py-0.5 rounded ${statusBadge}`}>{status || r.status || r.Status}</span></p>
                  <p><span className="text-[#5c5c5e]">Started:</span> {r.started_at || r.StartedAt || 'N/A'}</p>
                  <p><span className="text-[#5c5c5e]">Completed:</span> {r.completed_at || r.CompletedAt || 'N/A'}</p>
                  <p><span className="text-[#5c5c5e]">Resources:</span> {resourcesFound}</p>
                  <p><span className="text-[#5c5c5e]">Relationships:</span> {r.relationships_found || r.RelationshipsFound || 0}</p>

                  {/* Warning: zero resources found */}
                  {hasZeroWarning && (
                    <div className="px-3 py-2 rounded-lg bg-[hsl(39,100%,55%,0.15)] border border-[hsl(39,100%,55%,0.25)] text-[hsl(39,100%,50%)] flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <span>Discovery completed but found 0 resources. Check your credentials.</span>
                    </div>
                  )}

                  {/* Error list */}
                  {errors.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[#5c5c5e] font-semibold text-[10px] uppercase tracking-wider">Errors</p>
                      <div className="space-y-1">
                        {errors.map((err: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-[hsl(0,85%,60%,0.1)] border border-[hsl(0,85%,60%,0.2)]">
                            <svg className="w-3 h-3 mt-0.5 shrink-0 text-[hsl(0,85%,60%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-[hsl(0,85%,60%)] text-[11px]">{err}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Log lines */}
                  {logLines.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[#5c5c5e] font-semibold text-[10px] uppercase tracking-wider">Logs</p>
                      <div className="max-h-32 overflow-y-auto space-y-0.5 font-mono text-[10px]">
                        {logLines.map((line: string, i: number) => {
                          const isError = line.toLowerCase().includes('error') || line.toLowerCase().includes('fail');
                          const isWarn = line.toLowerCase().includes('warn');
                          return (
                            <div key={i} className={`flex items-start gap-2 px-2 py-0.5 rounded ${
                              isError ? 'text-[hsl(0,85%,60%)]' : isWarn ? 'text-[hsl(39,100%,55%)]' : 'text-[#8b8b8e]'
                            }`}>
                              <span className="text-[#5c5c5e] shrink-0">[{i + 1}]</span>
                              <span className="break-all">{line}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {errors.length === 0 && logLines.length === 0 && !hasZeroWarning && (
                    <p className="text-[#5c5c5e] italic text-[10px]">No errors or logs recorded for this run.</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border))]">
                    <button onClick={(e) => { e.stopPropagation(); hideRun(r.id || r.ID); }}
                      className="px-3 py-1 text-[10px] rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[#5c5c5e] hover:text-[hsl(var(--foreground))]">
                      Hide
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteRun(r.id || r.ID); setExpandedRun(null); }}
                      className="px-3 py-1 text-[10px] rounded-lg bg-[hsl(0,85%,60%,0.1)] border border-[hsl(0,85%,60%,0.2)] text-[hsl(0,85%,60%)] hover:bg-[hsl(0,85%,60%,0.2)]">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
