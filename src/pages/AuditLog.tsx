import { useState, useEffect, useCallback } from 'react';

interface AuditEntry {
  id: number;
  event_type: string;
  actor: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  previous_hash: string;
  hash: string;
  chain_version: number;
  created_at: string;
}

interface AuditStats {
  total_events: number;
  unique_actors: number;
  events_today: number;
  by_action: Record<string, number>;
  by_actor: Record<string, number>;
  per_day: { date: string; count: number }[];
}

interface EvidenceRecord {
  id: string;
  name: string;
  description: string;
  evidence_type: string;
  file_size: number;
  content_hash: string;
  signature: string;
  resource_count: number;
  audit_count: number;
  created_by: string;
  created_at: string;
}

const EVENT_COLORS: Record<string, string> = {
  'user.login': '#2ed573',
  'user.created': '#6c5ce7',
  'user.deleted': '#ff4757',
  'scope.created': '#6c5ce7',
  'scope.deleted': '#ff4757',
  'discovery.started': '#ffa502',
  'discovery.completed': '#2ed573',
  'terraform.imported': '#1e90ff',
};

const EVENT_ICONS: Record<string, string> = {
  'user.login': '→',
  'user.created': '+',
  'user.deleted': '✕',
  'scope.created': '+',
  'scope.deleted': '✕',
  'discovery.started': '◉',
  'discovery.completed': '✓',
  'terraform.imported': '↗',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function actorInitial(email: string): string {
  return email.charAt(0).toUpperCase();
}

function actionLabel(action: string | undefined | null): string {
  if (!action) return 'Unknown';
  return action.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function cardStyle(): React.CSSProperties {
  return { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' };
}

function inputStyle(): React.CSSProperties {
  return { background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' };
}

function shortenHash(h: string | undefined | null): string {
  if (!h || h === '') return '—';
  return h.substring(0, 12) + '…';
}

export function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [chainViolations, setChainViolations] = useState<string[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [showEvidence, setShowEvidence] = useState(false);
  const [creatingEvidence, setCreatingEvidence] = useState(false);
  const pageSize = 50;

  const [filterEventType, setFilterEventType] = useState('');
  const [filterActor, setFilterActor] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('offset', String((page - 1) * pageSize));
      if (filterEventType) params.set('event_type', filterEventType);
      if (filterActor) params.set('actor', filterActor);
      if (filterResourceType) params.set('resource_type', filterResourceType);
      if (filterSearch) params.set('search', filterSearch);
      if (filterStartDate) params.set('start_date', filterStartDate);
      if (filterEndDate) params.set('end_date', filterEndDate);
      const res = await fetch(`/api/v1/admin/audit?${params.toString()}`);
      const d = await res.json();
      const data = d.data || d;
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch {
      setError('Failed to load audit log');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterEventType, filterActor, filterResourceType, filterSearch, filterStartDate, filterEndDate]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/audit/stats');
      if (!res.ok) { setStats({ total_events: 0, unique_actors: 0, events_today: 0, by_action: {}, by_actor: {}, per_day: [] }); return; }
      const d = await res.json();
      setStats(d.data || d);
    } catch { setStats({ total_events: 0, unique_actors: 0, events_today: 0, by_action: {}, by_actor: {}, per_day: [] }); }
  }, []);

  const fetchEvidence = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/evidence');
      if (!res.ok) return;
      const d = await res.json();
      const data = d.data || d;
      setEvidence(data.records || []);
    } catch { }
  }, []);

  useEffect(() => { fetchEntries(); fetchStats(); }, [fetchEntries, fetchStats]);
  useEffect(() => { const i = setInterval(() => { fetchEntries(); fetchStats(); }, 60000); return () => clearInterval(i); }, [fetchEntries, fetchStats]);

  async function handleVerify() {
    setVerifying(true);
    try {
      const res = await fetch('/api/v1/admin/audit/verify', { method: 'POST' });
      const d = await res.json();
      const data = d.data || d;
      setChainValid(data.valid);
      setChainViolations(data.violations || []);
    } catch { setChainValid(false); setChainViolations(['Failed to verify chain']); }
    finally { setVerifying(false); }
  }

  async function handleCreateEvidence() {
    setCreatingEvidence(true);
    try {
      await fetch('/api/v1/admin/evidence/snapshot', { method: 'POST' });
      await fetchEvidence();
    } catch { }
    finally { setCreatingEvidence(false); }
  }

  function resetFilters() { setFilterEventType(''); setFilterActor(''); setFilterResourceType(''); setFilterSearch(''); setFilterStartDate(''); setFilterEndDate(''); setPage(1); }
  function handleFilterChange(setter: (v: string) => void) { return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setter(e.target.value); setPage(1); }; }

  function renderChainBanner() {
    const color = chainValid === null ? (chainValid === null ? '#8b8b8e' : '#ff4757') : chainValid ? '#2ed573' : '#ff4757';
    const label = chainValid === null ? 'Not verified' : chainValid ? 'Chain intact' : 'Chain broken!';
    return (
      <div className="rounded-xl p-4 mb-6" style={{ ...cardStyle(), borderLeft: `4px solid ${color}` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#8b8b8e] uppercase tracking-wider">Audit Chain Integrity</p>
            <p className="text-sm font-medium mt-0.5" style={{ color }}>{label}</p>
            {chainViolations.length > 0 && (
              <ul className="mt-2 text-xs text-[#ff4757] space-y-0.5">
                {chainViolations.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            )}
          </div>
          <button onClick={handleVerify} disabled={verifying}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
            {verifying ? 'Verifying…' : 'Verify Chain'}
          </button>
        </div>
      </div>
    );
  }

  function renderEvidenceSection() {
    return (
      <div className="rounded-xl p-4 mb-6" style={cardStyle()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[#8b8b8e] uppercase tracking-wider">Evidence Snapshots</p>
          <div className="flex gap-2">
            <button onClick={() => setShowEvidence(!showEvidence)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>
              {showEvidence ? 'Hide' : 'Show'} ({evidence.length})
            </button>
            <button onClick={handleCreateEvidence} disabled={creatingEvidence}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: '#6c5ce7', color: '#fff', border: 'none' }}>
              {creatingEvidence ? 'Creating…' : 'New Snapshot'}
            </button>
          </div>
        </div>
        {showEvidence && (
          evidence.length === 0 ? (
            <p className="text-xs text-[#8b8b8e] py-4 text-center">No evidence snapshots yet.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {evidence.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'hsl(var(--input))' }}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{ev.name}</p>
                    <p className="text-[10px] text-[#8b8b8e]">{ev.resource_count} resources · {ev.audit_count} audits · {formatTime(ev.created_at)}</p>
                  </div>
                  <a href={`/api/v1/admin/evidence/${ev.id}/download`}
                    className="text-xs text-[#6c5ce7] hover:underline shrink-0 ml-3">Download</a>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    );
  }

  function renderStats() {
    if (!stats) return null;
    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-4" style={cardStyle()}>
          <p className="text-xs text-[#8b8b8e] uppercase tracking-wider">Total Events</p>
          <p className="text-2xl font-semibold mt-1">{(stats.total_events ?? 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl p-4" style={cardStyle()}>
          <p className="text-xs text-[#8b8b8e] uppercase tracking-wider">Unique Actors</p>
          <p className="text-2xl font-semibold mt-1">{(stats.unique_actors ?? 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl p-4" style={cardStyle()}>
          <p className="text-xs text-[#8b8b8e] uppercase tracking-wider">Events Today</p>
          <p className="text-2xl font-semibold mt-1">{(stats.events_today ?? 0).toLocaleString()}</p>
        </div>
      </div>
    );
  }

  function renderFilters() {
    const hasAnyFilter = filterEventType || filterActor || filterResourceType || filterSearch || filterStartDate || filterEndDate;
    return (
      <div className="rounded-xl p-4 mb-6 space-y-3" style={cardStyle()}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-[#8b8b8e] block mb-1">Event Type</label>
            <select value={filterEventType} onChange={handleFilterChange(setFilterEventType)} className="w-full px-2 py-1.5 rounded-lg text-xs" style={inputStyle()}>
              <option value="">All events</option>
              <option value="user.login">User Login</option>
              <option value="user.created">User Created</option>
              <option value="user.deleted">User Deleted</option>
              <option value="scope.created">Scope Created</option>
              <option value="scope.deleted">Scope Deleted</option>
              <option value="discovery.started">Discovery Started</option>
              <option value="discovery.completed">Discovery Completed</option>
              <option value="terraform.imported">Terraform Import</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#8b8b8e] block mb-1">Actor</label>
            <input type="text" value={filterActor} onChange={handleFilterChange(setFilterActor)} placeholder="Search by actor…" className="w-full px-2 py-1.5 rounded-lg text-xs" style={inputStyle()} />
          </div>
          <div>
            <label className="text-xs text-[#8b8b8e] block mb-1">Search Details</label>
            <input type="text" value={filterSearch} onChange={handleFilterChange(setFilterSearch)} placeholder="Search audit details…" className="w-full px-2 py-1.5 rounded-lg text-xs" style={inputStyle()} />
          </div>
          <div>
            <label className="text-xs text-[#8b8b8e] block mb-1">Resource ID</label>
            <input type="text" value={filterResourceType} onChange={handleFilterChange(setFilterResourceType)} placeholder="Filter by resource ID…" className="w-full px-2 py-1.5 rounded-lg text-xs" style={inputStyle()} />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-[#8b8b8e] block mb-1">Start Date</label>
            <input type="date" value={filterStartDate} onChange={handleFilterChange(setFilterStartDate)} className="w-full px-2 py-1.5 rounded-lg text-xs" style={inputStyle()} />
          </div>
          <div>
            <label className="text-xs text-[#8b8b8e] block mb-1">End Date</label>
            <input type="date" value={filterEndDate} onChange={handleFilterChange(setFilterEndDate)} className="w-full px-2 py-1.5 rounded-lg text-xs" style={inputStyle()} />
          </div>
          <div className="flex items-end">
            {hasAnyFilter && (
              <button onClick={resetFilters} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))', color: '#8b8b8e' }}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderSkeleton() {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 animate-pulse" style={cardStyle()}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#5c5c5e]/30" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[#5c5c5e]/20 rounded w-1/3" />
                <div className="h-2 bg-[#5c5c5e]/20 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderEmpty() {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-[#5c5c5e]/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-[#5c5c5e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium mb-1">No Audit Events Recorded</h3>
        <p className="text-xs text-[#8b8b8e]">Audit events will appear here as users interact with the system.</p>
      </div>
    );
  }

  function renderError() {
    return (
      <div className="rounded-xl p-6 text-center" style={{ ...cardStyle(), borderColor: '#ff4757' }}>
        <p className="text-sm text-[#ff4757]">{error}</p>
        <button onClick={fetchEntries} className="mt-3 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>Retry</button>
      </div>
    );
  }

  function renderEntry(entry: AuditEntry) {
    const color = EVENT_COLORS[entry.event_type] || '#8b8b8e';
    const icon = EVENT_ICONS[entry.event_type] || '•';
    const details = entry.details ? Object.entries(entry.details).filter(([k]) => k !== 'password').slice(0, 5) : [];
    const prevHash = entry.previous_hash || '';

    return (
      <div key={entry.id} className="rounded-xl p-4 transition-all hover:opacity-90" style={cardStyle()}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: color + '20', color }}>
            {actorInitial(entry.actor)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: color + '20', color }}>
                {icon} {actionLabel(entry.event_type)}
              </span>
              <span className="text-xs text-[#8b8b8e]">{entry.actor}</span>
              {entry.resource_type && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5c5c5e]/10 text-[#5c5c5e]">
                  {entry.resource_type}{entry.resource_id ? ': ' + entry.resource_id.substring(0, 30) : ''}
                </span>
              )}
            </div>
            {details.length > 0 && (
              <div className="mt-1.5 text-xs text-[#5c5c5e] space-x-2">
                {details.map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1">
                    <span className="text-[#8b8b8e]">{k}:</span>
                    <span>{String(v).substring(0, 50)}</span>
                  </span>
                ))}
              </div>
            )}
            {/* Hash chain info */}
            <div className="mt-1.5 flex items-center gap-3 text-[10px] font-mono text-[#5c5c5e]">
              <span title={`Previous hash: ${prevHash}`}>← {shortenHash(prevHash)}</span>
              <span title={`Entry hash: ${entry.hash}`}>{shortenHash(entry.hash)}</span>
            </div>
          </div>
          <span className="text-[10px] text-[#5c5c5e] shrink-0 whitespace-nowrap">{formatTime(entry.created_at)}</span>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-8 animate-fade max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-[#8b8b8e] mt-1">Track changes and verify chain integrity across the system</p>
      </div>
      {renderStats()}
      {renderChainBanner()}
      {renderEvidenceSection()}
      {renderFilters()}
      {loading && entries.length === 0 ? renderSkeleton() : error ? renderError() : entries.length === 0 ? renderEmpty() : (
        <>
          <div className="space-y-2">
            {entries.map(renderEntry)}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-[#8b8b8e]">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30"
                  style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>Previous</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30"
                  style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}>Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
