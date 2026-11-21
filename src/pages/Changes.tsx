import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { timeAgo } from '../lib/format';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Change {
  id: string;
  type: string;
  resourceType: string;
  resourceName: string;
  scope: string;
  description: string;
  impact: string;
  timestamp: string;
  author: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { border: string; bg: string; icon: string; dot: string }> = {
  deployed:  { border: 'border-[#2ed573]/30', bg: 'bg-[#2ed573]/5',   icon: 'text-[#2ed573]', dot: 'bg-[#2ed573]' },
  modified:  { border: 'border-[#0097e6]/30', bg: 'bg-[#0097e6]/5',   icon: 'text-[#0097e6]', dot: 'bg-[#0097e6]' },
  created:   { border: 'border-[#ffa502]/30', bg: 'bg-[#ffa502]/5',   icon: 'text-[#ffa502]', dot: 'bg-[#ffa502]' },
  deleted:   { border: 'border-[#e84393]/30', bg: 'bg-[#e84393]/5',   icon: 'text-[#e84393]', dot: 'bg-[#e84393]' },
};

const SEVERITY_ICONS: Record<string, string> = {
  deployed: '↑',
  modified: '✎',
  created: '+',
  deleted: '×',
};

const AUTHOR_COLORS = ['#6c5ce7', '#2ed573', '#0097e6', '#ffa502', '#e84393', '#00cec9', '#fd79a8', '#fdcb6e'];

function pickAuthorColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AUTHOR_COLORS[Math.abs(h) % AUTHOR_COLORS.length];
}

function initials(name: string): string {
  return name.charAt(0).toUpperCase();
}

function dateLabel(dateKey: string): string {
  const todayKey = new Date().toISOString().split('T')[0];
  if (dateKey === todayKey) return 'Today';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (dateKey === y.toISOString().split('T')[0]) return 'Yesterday';
  const d = new Date(dateKey + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function shortResourceType(t: string): string {
  const s = t.split('.').pop() || t;
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Changes() {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { document.title = 'Changes - Zerelio'; }, []);

  const [filterResourceType, setFilterResourceType] = useState('');
  const [filterChangeType, setFilterChangeType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  async function fetchChanges() {
    try {
      const res = await fetch('/api/v1/changes');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      const list = d?.data ?? d?.changes ?? [];
      setChanges(Array.isArray(list) ? list : []);
      setError(null);
      return list;
    } catch {
      setError('Failed to load changes. The server may be unavailable.');
      return [];
    }
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      await fetchChanges();
      if (!mounted) return;
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const resourceTypes = useMemo(() => {
    return Array.from(new Set(changes.map(c => c.resourceType))).sort();
  }, [changes]);

  const stats = useMemo(() => {
    const resources = new Set(changes.map(c => c.resourceName));
    return { total: changes.length, resources: resources.size };
  }, [changes]);

  const filtered = useMemo(() => {
    return changes.filter(c => {
      if (filterResourceType && c.resourceType !== filterResourceType) return false;
      if (filterChangeType && c.type !== filterChangeType) return false;
      if (filterFrom && new Date(c.timestamp) < new Date(filterFrom + 'T00:00:00Z')) return false;
      if (filterTo) {
        const end = new Date(filterTo + 'T23:59:59Z');
        if (new Date(c.timestamp) > end) return false;
      }
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        if (!c.resourceName.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [changes, filterResourceType, filterChangeType, filterFrom, filterTo, filterSearch]);

  const grouped = useMemo(() => {
    const map = new Map<string, Change[]>();
    for (const c of filtered) {
      const key = new Date(c.timestamp).toISOString().split('T')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    for (const [, items] of map) {
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-fade">
        <div><div className="h-7 w-48 rounded-lg bg-[hsl(var(--card))] animate-pulse mb-2" /><div className="h-4 w-72 rounded-lg bg-[hsl(var(--card))] animate-pulse" /></div>
        <div className="flex gap-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 flex-1 rounded-lg bg-[hsl(var(--card))] animate-pulse" />)}</div>
        <div className="space-y-2"><div className="h-5 w-40 rounded bg-[hsl(var(--card))] animate-pulse" />{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-[hsl(var(--card))] animate-pulse" />)}</div>
      </div>
    );
  }

  // ── Error state ──
  if (error && changes.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full animate-fade">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2">Unable to load changes</h1>
        <p className="text-[#8b8b8e] mb-8 text-center max-w-md">{error}</p>
        <button onClick={() => { setLoading(true); setError(null); fetchChanges(); }}
          className="px-6 py-3 bg-[#6c5ce7] hover:bg-[#5a4bd1] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#6c5ce7]/20">Try Again</button>
      </div>
    );
  }

  // ── Empty state ──
  if (changes.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full animate-fade">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6c5ce7]/20 to-[#a29bfe]/10 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-[#6c5ce7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2">No changes detected yet</h1>
        <p className="text-[#8b8b8e] mb-2 text-center max-w-md">Changes to your infrastructure will appear here as they happen.</p>
        <p className="text-sm text-[#5c5c5e] text-center max-w-md">Discovery runs and Terraform drift detection automatically track modifications.</p>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="p-8 space-y-6 animate-fade">
      <div>
        <h1 className="text-2xl font-semibold">Change Timeline</h1>
        <p className="text-[#8b8b8e] mt-1">Activity timeline for your infrastructure</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold">{stats.total}</span>
          <span className="text-[#8b8b8e]">changes</span>
        </div>
        <div className="w-px h-8 bg-[hsl(var(--border))]" />
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold">{stats.resources}</span>
          <span className="text-[#8b8b8e]">resources affected</span>
        </div>
        {error && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs ml-auto">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{error}</span>
            <button onClick={() => fetchChanges()} className="underline hover:no-underline ml-1">Retry</button>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-[#5c5c5e] mb-1.5">Resource Type</label>
          <select value={filterResourceType} onChange={e => setFilterResourceType(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] outline-none focus:border-[#6c5ce7]/50 transition-colors min-w-[150px]">
            <option value="">All Types</option>
            {resourceTypes.map(t => <option key={t} value={t}>{shortResourceType(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#5c5c5e] mb-1.5">Change Type</label>
          <select value={filterChangeType} onChange={e => setFilterChangeType(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] outline-none focus:border-[#6c5ce7]/50 transition-colors min-w-[140px]">
            <option value="">All Changes</option>
            {Object.keys(SEVERITY_STYLES).map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#5c5c5e] mb-1.5">From</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] outline-none focus:border-[#6c5ce7]/50 transition-colors" />
        </div>
        <div>
          <label className="block text-xs text-[#5c5c5e] mb-1.5">To</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] outline-none focus:border-[#6c5ce7]/50 transition-colors" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-[#5c5c5e] mb-1.5">Search</label>
          <input type="text" placeholder="Search by name or description..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] outline-none focus:border-[#6c5ce7]/50 transition-colors placeholder:text-[#5c5c5e]" />
        </div>
        {(filterResourceType || filterChangeType || filterFrom || filterTo || filterSearch) && (
          <button onClick={() => { setFilterResourceType(''); setFilterChangeType(''); setFilterFrom(''); setFilterTo(''); setFilterSearch(''); }}
            className="px-3 py-2 text-xs text-[#8b8b8e] hover:text-[hsl(var(--foreground))] transition-colors">Clear</button>
        )}
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 animate-fade">
          <div className="w-12 h-12 rounded-xl bg-[hsl(var(--card))] flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-[#5c5c5e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-sm text-[#8b8b8e]">No changes match your filters</p>
          <button onClick={() => { setFilterResourceType(''); setFilterChangeType(''); setFilterFrom(''); setFilterTo(''); setFilterSearch(''); }}
            className="mt-3 text-xs text-[#6c5ce7] hover:underline">Clear all filters</button>
        </div>
      ) : (
        <div className="relative max-w-4xl">
          {/* Vertical timeline line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-[hsl(var(--border))]" />
          <div className="space-y-6">
            {grouped.map(([dateKey, items], gi) => (
              <div key={dateKey}>
                {/* Date header */}
                <div className="relative pl-12 mb-4">
                  <div className="absolute left-[10px] top-1.5 w-[18px] h-[18px] rounded-full bg-[hsl(var(--card))] border-2 border-[#6c5ce7]/50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#6c5ce7]" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{dateLabel(dateKey)}</span>
                    <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                    <span className="text-xs text-[#5c5c5e]">{items.length} change{items.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Items */}
                <AnimatePresence>
                  <div className="space-y-3">
                    {items.map((c, i) => {
                      const sev = SEVERITY_STYLES[c.type] || SEVERITY_STYLES.modified;
                      const icon = SEVERITY_ICONS[c.type] || '?';
                      return (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: (gi * 0.1) + (i * 0.05) }}
                          className="relative pl-12"
                        >
                          {/* Timeline dot */}
                          <div className={`absolute left-[11px] top-5 w-4 h-4 rounded-full border-2 border-[hsl(var(--background))] flex items-center justify-center ${sev.bg}`}>
                            <span className={`text-[8px] font-bold ${sev.icon}`}>{icon}</span>
                          </div>

                          {/* Card */}
                          <GlassCard className={`${sev.border} ${sev.bg} !p-4`}>
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 mb-1.5">
                              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                                {c.resourceName}
                                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sev.icon}`}>
                                  {c.type.charAt(0).toUpperCase() + c.type.slice(1)}
                                </span>
                              </h3>
                              <span className="flex-shrink-0 text-xs text-[#5c5c5e] whitespace-nowrap">{timeAgo(c.timestamp)}</span>
                            </div>
                            <p className="text-sm text-[#8b8b8e] leading-relaxed mb-2">{c.description}</p>
                            <div className="flex items-center gap-4 text-xs text-[#5c5c5e]">
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                                {shortResourceType(c.resourceType)}
                              </span>
                              <span className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: pickAuthorColor(c.author) }}>
                                  {initials(c.author)}
                                </div>
                                {c.author}
                              </span>
                            </div>
                          </GlassCard>
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
