import { useState, useEffect, useCallback } from 'react';

interface Finding {
  id: string;
  policy_id?: string;
  resource_id?: string;
  rule?: string;
  severity?: string;
  status?: string;
  message?: string;
  created_at?: string;
  framework?: string;
  description?: string;
}

function cardStyle(): React.CSSProperties {
  return { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' };
}

export function Compliance() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/compliance/findings');
      const d = await res.json();
      // Handle plain array, {findings:[...]}, or {data:{findings:[...]}} shapes
      const list: Finding[] = Array.isArray(d)
        ? d
        : (d?.data?.findings ?? d?.findings ?? d?.data ?? []);
      setFindings(Array.isArray(list) ? list : []);
    } catch {
      console.warn('Compliance: failed to load findings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Compliance - Zerelio';
    fetchFindings();
  }, [fetchFindings]);

  const sevColor = (s: string) =>
    s === 'critical' ? '#ff4757' : s === 'high' ? '#ffa502' : s === 'medium' ? '#1e90ff' : '#8b8b8e';
  const sevBg = (s: string) => sevColor(s) + '20';

  const severities = Array.from(new Set(findings.map(f => f.severity || '').filter(Boolean))).sort();
  const statuses = Array.from(new Set(findings.map(f => f.status || '').filter(Boolean))).sort();

  const filtered = findings.filter(f => {
    if (filterSeverity && f.severity !== filterSeverity) return false;
    if (filterStatus && f.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: findings.length,
    open: findings.filter(f => f.status === 'open').length,
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
  };

  return (
    <div className="p-8 animate-fade max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compliance</h1>
          <p className="text-[#8b8b8e] mt-1">Compliance findings across your infrastructure</p>
        </div>
        <button
          onClick={fetchFindings}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}
        >
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Findings', value: stats.total, color: '#6c5ce7' },
          { label: 'Open', value: stats.open, color: '#ffa502' },
          { label: 'Critical', value: stats.critical, color: '#ff4757' },
          { label: 'High', value: stats.high, color: '#ffa502' },
        ].map(card => (
          <div key={card.label} className="rounded-xl p-4" style={cardStyle()}>
            <p className="text-xs text-[#8b8b8e] uppercase tracking-wider">{card.label}</p>
            <p className="text-2xl font-semibold mt-1" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
        >
          <option value="">All Severities</option>
          {severities.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ background: 'hsl(var(--input))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
        >
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterSeverity || filterStatus) && (
          <button
            onClick={() => { setFilterSeverity(''); setFilterStatus(''); }}
            className="text-xs px-3 py-1.5 rounded-lg text-[#8b8b8e] hover:text-[hsl(var(--foreground))]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Findings list */}
      <div className="rounded-xl" style={cardStyle()}>
        <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <p className="text-xs text-[#8b8b8e] uppercase tracking-wider">
            Findings {filtered.length !== findings.length ? `(${filtered.length} of ${findings.length})` : `(${findings.length})`}
          </p>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="space-y-2">{[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
            ))}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-[#8b8b8e]">
              {findings.length === 0
                ? 'No compliance findings. Run discovery first to generate findings.'
                : 'No findings match your filters.'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {filtered.map(f => (
              <div key={f.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {f.severity && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: sevBg(f.severity), color: sevColor(f.severity) }}
                      >
                        {f.severity}
                      </span>
                    )}
                    {f.status && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5c5c5e]/10 text-[#8b8b8e]">
                        {f.status}
                      </span>
                    )}
                    {f.framework && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7]">
                        {f.framework}
                      </span>
                    )}
                    {f.rule && (
                      <span className="text-[10px] text-[#5c5c5e] font-mono">{f.rule}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{f.message || f.description || f.id}</p>
                  {f.resource_id && (
                    <p className="text-xs text-[#5c5c5e] mt-0.5 font-mono truncate">{f.resource_id}</p>
                  )}
                  {f.created_at && (
                    <p className="text-[10px] text-[#5c5c5e] mt-1">
                      {new Date(f.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
